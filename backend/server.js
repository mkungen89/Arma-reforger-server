const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const si = require('systeminformation');

// Import routers
const modManager = require('./modManager');
const diagnostics = require('./diagnostics');
const { router: authRouter, requireAuth, requireAdmin } = require('./auth');
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
const systemUpdate = require('./systemUpdate');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));

// PUBLIC routes (no auth required) - Battlelog & Server Browser are public!
app.use('/api', battlelog);
app.use('/api', serverBrowserRouter);
app.use('/api', battleReportsRouter);
app.use('/api', achievementsRouter);

// Use routers (auth routes are public)
app.use('/api', authRouter);

// Protected routes - require authentication
app.use('/api', requireAuth);
app.use('/api', modManager);
app.use('/api', diagnostics);
app.use('/api', playerManager);
app.use('/api', scheduler);
app.use('/api', backup);
app.use('/api', discordRouter);
app.use('/api', modCollections);
app.use('/api', socialRouter);
app.use('/api', systemUpdate);

// Load configuration
const configPath = path.join(__dirname, '../config/server-config.json');
let config = {};

function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } else {
            // Default configuration with all Arma Reforger settings
            config = {
                // Installation paths
                serverPath: 'C:\\ArmaReforgerServer',
                steamCmdPath: 'C:\\SteamCMD',

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
            system: systemInfo,
            config
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.post('/api/server/start', (req, res) => {
    if (serverStatus === 'running') {
        return res.status(400).json({ error: 'Server is already running' });
    }

    try {
        const serverExe = path.join(config.serverPath, 'ArmaReforgerServer.exe');

        if (!fs.existsSync(serverExe)) {
            return res.status(400).json({
                error: 'Server executable not found. Please run installation first.',
                path: serverExe
            });
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
            broadcastToClients({ type: 'status', data: { status: 'error' } });
        });

        serverProcess.on('exit', (code, signal) => {
            addLog(`Server stopped. Exit code: ${code}, Signal: ${signal}`, 'info');
            serverStatus = 'stopped';
            serverProcess = null;
            broadcastToClients({ type: 'status', data: { status: 'stopped' } });
        });

        broadcastToClients({ type: 'status', data: { status: 'running' } });
        res.json({ success: true, message: 'Server started successfully' });

    } catch (error) {
        addLog(`Failed to start server: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// Stop server
app.post('/api/server/stop', (req, res) => {
    if (serverStatus !== 'running' || !serverProcess) {
        return res.status(400).json({ error: 'Server is not running' });
    }

    try {
        addLog('Stopping server...', 'info');
        serverProcess.kill('SIGTERM');

        setTimeout(() => {
            if (serverProcess && !serverProcess.killed) {
                serverProcess.kill('SIGKILL');
            }
        }, 10000);

        res.json({ success: true, message: 'Server stop initiated' });
    } catch (error) {
        addLog(`Failed to stop server: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
app.put('/api/config', (req, res) => {
    try {
        config = { ...config, ...req.body };
        saveConfig();
        res.json({ success: true, config });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update server (via SteamCMD)
app.post('/api/server/update', (req, res) => {
    if (serverStatus === 'running') {
        return res.status(400).json({ error: 'Please stop the server before updating' });
    }

    try {
        const steamCmd = path.join(config.steamCmdPath, 'steamcmd.exe');

        if (!fs.existsSync(steamCmd)) {
            return res.status(400).json({ error: 'SteamCMD not found' });
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
        res.status(500).json({ error: error.message });
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
const server = app.listen(PORT, '0.0.0.0', () => {
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
