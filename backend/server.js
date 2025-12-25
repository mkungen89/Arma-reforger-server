const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const si = require('systeminformation');
const { resolveSteamCmdExecutable, resolveServerExecutable, isWindows, looksLikeWindowsPath } = require('./platform');
const { createRateLimiter } = require('./rateLimit');
const { isValidInternalRequest } = require('./internalApiKey');
const { sendApiError } = require('./apiError');

// Import routers
const modManager = require('./modManager');
const diagnostics = require('./diagnostics');
const { router: authRouter, requireAuth, requireAdmin, requireRole } = require('./auth');
const battlelog = require('./battlelog');
const playerManager = require('./playerManager');
const scheduler = require('./scheduler');
const backup = require('./backup');
const { router: discordRouter } = require('./discord');
const modCollections = require('./modCollections');
const { router: achievementsRouter } = require('./achievements');
const socialRouter = require('./social');
const { router: battleReportsRouter } = require('./battleReports');
const { router: serverBrowserRouter } = require('./serverBrowser');
const BattlelogIntegration = require('./battlelogIntegration');
const { router: systemUpdateRouter, publicRouter: systemUpdatePublicRouter } = require('./systemUpdate');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.disable('x-powered-by');

// If running behind a reverse proxy (nginx / cloudflare / traefik), enable correct client IP handling.
// IMPORTANT: only set this when you actually have a trusted proxy in front of the app.
if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
}

// CORS: default to SAME-ORIGIN only. If you need cross-origin (e.g. separate battlelog domain),
// set CORS_ORIGIN="https://battlelog.example.com,https://panel.example.com"
const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
app.use(cors({
    origin: (origin, cb) => {
        // non-browser clients (curl, server-to-server) often have no Origin header
        if (!origin) return cb(null, true);
        if (allowedOrigins.length === 0) return cb(null, false);
        return cb(null, allowedOrigins.includes(origin));
    },
    credentials: true,
}));

// Basic request hardening
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Rate-limit auth endpoints (public)
const authLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 30,
    message: 'Too many auth requests, please try again shortly.'
});
app.use('/api/auth', authLimiter);

// Rate-limit public read endpoints (battlelog/server browser/etc).
// This helps for small/medium abuse; real DDoS protection should be done at the edge (Cloudflare/OVH/etc).
const publicLimiter = createRateLimiter({
    windowMs: 60_000,
    max: parseInt(process.env.PUBLIC_API_RPM || '300', 10) || 300,
    message: 'Too many requests to public API, please try again shortly.'
});
app.use('/api/battlelog', publicLimiter);
app.use('/api/server-browser', publicLimiter);
app.use('/api/battle-reports', publicLimiter);
app.use('/api/achievements', publicLimiter);
app.use('/api/system', publicLimiter);

// PUBLIC routes (no auth required) - Battlelog & Server Browser are public!
app.use('/api', battlelog);
app.use('/api', serverBrowserRouter);
app.use('/api', battleReportsRouter);
app.use('/api', achievementsRouter);
app.use('/api', systemUpdatePublicRouter); // Public system info endpoints

// Use routers (auth routes are public)
app.use('/api', authRouter);

// Protected routes - require authentication (or internal API key for local automation)
app.use('/api', (req, res, next) => {
    if (isValidInternalRequest(req)) {
        // Internal automation (scheduler) acts as admin
        req.user = { steamId: 'internal', displayName: 'Internal', role: 'admin' };
        return next();
    }
    return requireAuth(req, res, next);
});

// Server control endpoints should be admin/gm (still accessible for internal automation)
app.use('/api/server', requireRole(['admin', 'gm']));
app.use('/api', modManager);
app.use('/api', diagnostics);
app.use('/api', playerManager);
app.use('/api', scheduler);
app.use('/api', backup);
app.use('/api', discordRouter);
app.use('/api', modCollections);
app.use('/api', socialRouter);
app.use('/api', systemUpdateRouter); // Protected system update endpoint

// Load configuration
const configPath = path.join(__dirname, '../config/server-config.json');
let config = {};

function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } else {
            // Default configuration with all Arma Reforger settings
            const defaultServerPath = isWindows() ? 'C:\\ArmaReforgerServer' : '/opt/arma-reforger';
            const defaultSteamCmdPath = isWindows() ? 'C:\\SteamCMD' : '/usr/games/steamcmd';
            config = {
                // Installation paths
                serverPath: defaultServerPath,
                steamCmdPath: defaultSteamCmdPath,

                // Basic settings
                serverName: 'My Arma Reforger Server',
                maxPlayers: 32,
                password: '',
                adminPassword: 'admin123',
                visible: true,

                // Network settings
                webUIPort: 3001,
                serverPort: 2001,
                publicPort: 2001,

                // Steam Query (A2S)
                a2sEnabled: true,
                a2sPort: 17777,

                // Platform support
                crossPlatform: true,

                // Game properties - View distances
                serverMaxViewDistance: 2500,
                networkViewDistance: 1500,
                serverMinGrassDistance: 50,

                // Game properties - Gameplay
                battlEye: true,
                fastValidation: true,
                disableThirdPerson: false,

                // Voice chat (VON)
                vonDisableUI: false,
                vonDisableDirectSpeechUI: false,
                vonCanTransmitCrossFaction: false,

                // RCON
                rconEnabled: false,
                rconPort: 19999,
                rconPassword: '',
                rconMaxClients: 5,
                rconPermission: 'admin',

                // AI settings
                disableAI: false,
                aiLimit: -1,

                // Player & Queue
                playerSaveTime: 300,
                joinQueueMaxSize: 50,
                slotReservationTimeout: 30,

                // System options
                disableCrashReporter: false,
                disableServerShutdown: false,
                lobbyPlayerSynchronise: false,

                // Steam API
                steamApiKey: ''
            };
            saveConfig();
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

function saveConfig() {
    try {
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error saving config:', error);
    }
}

loadConfig();

// Server state
let serverProcess = null;
let serverStatus = 'stopped';
let serverLogs = [];
const MAX_LOG_LINES = 1000;
let lastExitCode = null;
let lastExitSignal = null;
let lastExitAt = null;
let lastStartAt = null;
let lastStopRequestedAt = null;
let lastError = null;

// WebSocket for real-time updates
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Send current status
    ws.send(JSON.stringify({
        type: 'status',
        data: {
            status: serverStatus,
            logs: serverLogs.slice(-100)
        }
    }));
});

function broadcastToClients(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function addLog(message, level = 'info') {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message
    };
    serverLogs.push(logEntry);
    if (serverLogs.length > MAX_LOG_LINES) {
        serverLogs.shift();
    }
    broadcastToClients({ type: 'log', data: logEntry });
    console.log(`[${level.toUpperCase()}] ${message}`);
}

// Routes

// Get server status
app.get('/api/status', async (req, res) => {
    try {
        const systemInfo = {
            cpu: await si.currentLoad(),
            mem: await si.mem(),
            disk: await si.fsSize()
        };

        res.json({
            status: serverStatus,
            pid: serverProcess ? serverProcess.pid : null,
            uptime: serverProcess ? process.uptime() : 0,
            lastExit: {
                code: lastExitCode,
                signal: lastExitSignal,
                at: lastExitAt
            },
            lastStartAt,
            lastStopRequestedAt,
            lastError,
            system: systemInfo,
            config
        });
    } catch (error) {
        return sendApiError(res, 500, 'STATUS_FAILED', 'Failed to get status', error.message);
    }
});

// Environment info (for UI banners)
app.get('/api/env', (req, res) => {
    const serverPathLooksWindows = looksLikeWindowsPath(config.serverPath);
    const steamCmdLooksWindows = looksLikeWindowsPath(config.steamCmdPath);

    res.json({
        runtime: {
            platform: process.platform,
            arch: process.arch,
            node: process.version,
            isDocker: fs.existsSync('/.dockerenv') || fs.existsSync('/run/.containerenv'),
            isWindows: isWindows()
        },
        config: {
            serverPath: config.serverPath,
            steamCmdPath: config.steamCmdPath,
            windowsPathOnLinux: !isWindows() && (serverPathLooksWindows || steamCmdLooksWindows)
        }
    });
});

// Start server
app.post('/api/server/start', (req, res) => {
    if (serverStatus === 'running' && serverProcess) {
        return res.json({ success: true, message: 'Server is already running', pid: serverProcess.pid });
    }

    try {
        if (!isWindows() && looksLikeWindowsPath(config.serverPath)) {
            return sendApiError(
                res,
                400,
                'CONFIG_PATH_MISMATCH',
                'Server path looks like a Windows path, but this process is running on Linux.',
                { serverPath: config.serverPath },
                'For Docker/Linux, set serverPath to something like /opt/arma-reforger (and install the Linux server there).'
            );
        }
        const { executablePath: serverExe, tried } = resolveServerExecutable(config.serverPath);

        if (!fs.existsSync(serverExe)) {
            return sendApiError(
                res,
                400,
                'SERVER_EXE_NOT_FOUND',
                'Server executable not found. Please run installation first.',
                { path: serverExe, tried }
            );
        }

        // Create server config file
        const serverConfigJson = {
            bindAddress: '0.0.0.0',
            bindPort: config.serverPort,
            publicAddress: '',
            publicPort: config.serverPort,
            a2s: {
                address: '0.0.0.0',
                port: config.serverPort + 1
            },
            game: {
                name: config.serverName,
                password: config.password,
                scenarioId: '{ECC61978EDCC2B5A}Missions/23_Campaign.conf',
                maxPlayers: config.maxPlayers,
                visible: true,
                gameProperties: {
                    serverMaxViewDistance: 2500,
                    serverMinGrassDistance: 50,
                    networkViewDistance: 2000,
                    disableThirdPerson: false,
                    fastValidation: true,
                    battlEye: true
                }
            }
        };

        const serverJsonPath = path.join(config.serverPath, 'server.json');
        fs.writeFileSync(serverJsonPath, JSON.stringify(serverConfigJson, null, 2));

        // Start server process
        const args = [
            '-config', 'server.json',
            '-profile', 'profile'
        ];

        addLog('Starting Arma Reforger Server...', 'info');
        serverStatus = 'starting';
        lastStartAt = new Date().toISOString();
        lastError = null;
        serverProcess = spawn(serverExe, args, {
            cwd: config.serverPath,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        serverStatus = 'running';

        serverProcess.stdout.on('data', (data) => {
            const message = data.toString().trim();
            addLog(message, 'info');
        });

        serverProcess.stderr.on('data', (data) => {
            const message = data.toString().trim();
            addLog(message, 'warn');
        });

        serverProcess.on('error', (error) => {
            addLog(`Server error: ${error.message}`, 'error');
            serverStatus = 'error';
            lastError = { message: error.message, at: new Date().toISOString() };
            broadcastToClients({ type: 'status', data: { status: 'error' } });
        });

        serverProcess.on('exit', (code, signal) => {
            addLog(`Server stopped. Exit code: ${code}, Signal: ${signal}`, 'info');
            serverStatus = 'stopped';
            serverProcess = null;
            lastExitCode = code;
            lastExitSignal = signal;
            lastExitAt = new Date().toISOString();
            broadcastToClients({ type: 'status', data: { status: 'stopped' } });
        });

        broadcastToClients({ type: 'status', data: { status: 'running' } });
        res.json({ success: true, message: 'Server started successfully' });

    } catch (error) {
        addLog(`Failed to start server: ${error.message}`, 'error');
        lastError = { message: error.message, at: new Date().toISOString() };
        return sendApiError(res, 500, 'SERVER_START_FAILED', 'Failed to start server', error.message);
    }
});

// Stop server
app.post('/api/server/stop', (req, res) => {
    if (serverStatus !== 'running' || !serverProcess) {
        return res.json({ success: true, message: 'Server is already stopped' });
    }

    try {
        addLog('Stopping server...', 'info');
        lastStopRequestedAt = new Date().toISOString();
        serverProcess.kill('SIGTERM');

        setTimeout(() => {
            if (serverProcess && !serverProcess.killed) {
                serverProcess.kill('SIGKILL');
            }
        }, 10000);

        res.json({ success: true, message: 'Server stop initiated' });
    } catch (error) {
        addLog(`Failed to stop server: ${error.message}`, 'error');
        return sendApiError(res, 500, 'SERVER_STOP_FAILED', 'Failed to stop server', error.message);
    }
});

// Restart server
app.post('/api/server/restart', async (req, res) => {
    try {
        if (serverStatus === 'running' && serverProcess) {
            serverProcess.kill('SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Trigger start via internal call
        req.app.handle({ ...req, method: 'POST', url: '/api/server/start' }, res);
    } catch (error) {
        return sendApiError(res, 500, 'SERVER_RESTART_FAILED', 'Failed to restart server', error.message);
    }
});

// Get logs
app.get('/api/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    res.json(serverLogs.slice(-limit));
});

// Clear logs
app.delete('/api/logs', (req, res) => {
    serverLogs = [];
    res.json({ success: true });
});

// Get config
app.get('/api/config', (req, res) => {
    res.json(config);
});

// Update config
app.put('/api/config', requireRole(['admin', 'gm']), (req, res) => {
    try {
        config = { ...config, ...req.body };
        saveConfig();
        res.json({ success: true, config });
    } catch (error) {
        return sendApiError(res, 500, 'CONFIG_SAVE_FAILED', 'Failed to save config', error.message);
    }
});

// Update server (via SteamCMD)
app.post('/api/server/update', (req, res) => {
    if (serverStatus === 'running') {
        return sendApiError(res, 400, 'SERVER_RUNNING', 'Please stop the server before updating');
    }

    try {
        if (!isWindows() && looksLikeWindowsPath(config.steamCmdPath)) {
            return sendApiError(
                res,
                400,
                'CONFIG_PATH_MISMATCH',
                'SteamCMD path looks like a Windows path, but this process is running on Linux.',
                { steamCmdPath: config.steamCmdPath },
                'For Docker/Linux, set steamCmdPath to /usr/games/steamcmd (or a directory containing steamcmd).'
            );
        }
        const steamCmd = resolveSteamCmdExecutable(config.steamCmdPath);

        if (!steamCmd || !fs.existsSync(steamCmd)) {
            return sendApiError(res, 400, 'STEAMCMD_NOT_FOUND', 'SteamCMD not found', { path: steamCmd || null });
        }

        addLog('Starting server update...', 'info');

        const updateProcess = spawn(steamCmd, [
            '+force_install_dir', config.serverPath,
            '+login', 'anonymous',
            '+app_update', '1874900', 'validate',
            '+quit'
        ]);

        updateProcess.stdout.on('data', (data) => {
            addLog(data.toString().trim(), 'info');
        });

        updateProcess.on('exit', (code) => {
            if (code === 0) {
                addLog('Server updated successfully', 'info');
            } else {
                addLog(`Update failed with code ${code}`, 'error');
            }
        });

        res.json({ success: true, message: 'Update started' });
    } catch (error) {
        return sendApiError(res, 500, 'SERVER_UPDATE_FAILED', 'Failed to start update', error.message);
    }
});

// Serve React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Initialize Battlelog Integration
let battlelogIntegration = null;
try {
    battlelogIntegration = new BattlelogIntegration(null, battlelog);
    battlelogIntegration.startLogMonitoring();
    console.log('Battlelog Integration: Initialized');
} catch (error) {
    console.error('Failed to initialize Battlelog Integration:', error);
}

// Start HTTP server
const LISTEN_HOST = process.env.LISTEN_HOST || '0.0.0.0';
const server = app.listen(PORT, LISTEN_HOST, () => {
    console.log(`Arma Reforger Server Manager running on port ${PORT}`);
    console.log(`Web UI: http://localhost:${PORT}`);
    console.log(`Battlelog: http://localhost:${PORT}/battlelog (PUBLIC)`);
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }
    server.close(() => {
        process.exit(0);
    });
});
