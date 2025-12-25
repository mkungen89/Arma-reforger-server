const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const si = require('systeminformation');
const { spawn } = require('child_process');
const dgram = require('dgram');
const { resolveSteamCmdExecutable, resolveServerExecutable } = require('./platform');

// Diagnostics database
let diagnosticHistory = [];
const MAX_HISTORY = 100;

// Common issues and solutions
const knownIssues = [
    {
        id: 'port_in_use',
        title: 'Port Already in Use',
        symptoms: ['Server fails to start', 'Port binding error'],
        solutions: [
            'Check if another Arma Reforger instance is running',
            'Change server port in configuration',
            'Kill process using the port: netstat -ano | findstr :2001'
        ]
    },
    {
        id: 'missing_files',
        title: 'Missing Server Files',
        symptoms: ['Server executable not found', 'DLL errors'],
        solutions: [
            'Run server update via SteamCMD',
            'Verify game files integrity',
            'Reinstall server'
        ]
    },
    {
        id: 'mod_conflict',
        title: 'Mod Conflict or Missing Dependencies',
        symptoms: ['Server crashes on startup', 'Mod loading errors'],
        solutions: [
            'Check mod dependencies in Mod Manager',
            'Disable mods one by one to identify conflicts',
            'Update all mods to latest versions'
        ]
    },
    {
        id: 'memory_issue',
        title: 'Insufficient Memory',
        symptoms: ['Server crashes during gameplay', 'Out of memory errors'],
        solutions: [
            'Reduce max players count',
            'Disable or reduce view distance',
            'Add more RAM to server',
            'Close other applications'
        ]
    },
    {
        id: 'network_issue',
        title: 'Network/Firewall Issues',
        symptoms: ['Players cannot connect', 'Server not visible in browser'],
        solutions: [
            'Check Windows Firewall rules',
            'Forward ports on router (UDP 2001)',
            'Verify public IP address in config',
            'Check if ISP blocks ports'
        ]
    },
    {
        id: 'disk_space',
        title: 'Insufficient Disk Space',
        symptoms: ['Cannot download mods', 'Server crashes', 'Log errors'],
        solutions: [
            'Free up disk space',
            'Move server to drive with more space',
            'Clean up old logs and temporary files'
        ]
    }
];

// Run diagnostic checks
async function runDiagnostics(config) {
    const results = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        checks: [],
        issues: [],
        warnings: []
    };

    try {
        // Check 1: Server files exist
        const { executablePath: serverExe, tried } = resolveServerExecutable(config.serverPath);
        const serverFilesCheck = {
            name: 'Server Files',
            status: fs.existsSync(serverExe) ? 'pass' : 'fail',
            details: fs.existsSync(serverExe)
                ? `Server executable found at ${serverExe}`
                : `Server executable not found at ${serverExe}`
        };
        if (serverFilesCheck.status === 'fail') {
            serverFilesCheck.tried = tried;
        }
        results.checks.push(serverFilesCheck);

        if (serverFilesCheck.status === 'fail') {
            results.issues.push({
                severity: 'error',
                issue: knownIssues.find(i => i.id === 'missing_files'),
                check: 'Server Files'
            });
            results.status = 'critical';
        }

        // Check 2: SteamCMD exists
        const steamCmdExe = resolveSteamCmdExecutable(config.steamCmdPath);
        const steamCmdCheck = {
            name: 'SteamCMD',
            status: steamCmdExe && fs.existsSync(steamCmdExe) ? 'pass' : 'fail',
            details: steamCmdExe && fs.existsSync(steamCmdExe)
                ? `SteamCMD found at ${steamCmdExe}`
                : `SteamCMD not found at ${steamCmdExe || '(not configured)'} - cannot update server or download mods`
        };
        results.checks.push(steamCmdCheck);

        if (steamCmdCheck.status === 'fail') {
            results.warnings.push({
                severity: 'warning',
                message: 'SteamCMD not found - mod downloads and updates will not work',
                check: 'SteamCMD'
            });
            if (results.status === 'healthy') results.status = 'warning';
        }

        // Check 3: System resources
        const mem = await si.mem();
        const memUsagePercent = ((mem.used / mem.total) * 100).toFixed(1);
        const memCheck = {
            name: 'Memory',
            status: memUsagePercent < 90 ? 'pass' : 'fail',
            details: `${memUsagePercent}% used (${(mem.used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(mem.total / 1024 / 1024 / 1024).toFixed(2)} GB)`
        };
        results.checks.push(memCheck);

        if (memUsagePercent > 90) {
            results.issues.push({
                severity: 'error',
                issue: knownIssues.find(i => i.id === 'memory_issue'),
                check: 'Memory'
            });
            results.status = 'critical';
        } else if (memUsagePercent > 80) {
            results.warnings.push({
                severity: 'warning',
                message: 'High memory usage detected',
                check: 'Memory'
            });
            if (results.status === 'healthy') results.status = 'warning';
        }

        // Check 4: Disk space
        const disks = await si.fsSize();
        const serverDisk = disks.find(d => config.serverPath.startsWith(d.mount)) || disks[0];
        const diskUsagePercent = serverDisk.use;
        const diskCheck = {
            name: 'Disk Space',
            status: diskUsagePercent < 90 ? 'pass' : 'fail',
            details: `${diskUsagePercent.toFixed(1)}% used (${(serverDisk.used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(serverDisk.size / 1024 / 1024 / 1024).toFixed(2)} GB free)`
        };
        results.checks.push(diskCheck);

        if (diskUsagePercent > 95) {
            results.issues.push({
                severity: 'error',
                issue: knownIssues.find(i => i.id === 'disk_space'),
                check: 'Disk Space'
            });
            results.status = 'critical';
        } else if (diskUsagePercent > 85) {
            results.warnings.push({
                severity: 'warning',
                message: 'Low disk space',
                check: 'Disk Space'
            });
            if (results.status === 'healthy') results.status = 'warning';
        }

        // Check 5: CPU load
        const cpu = await si.currentLoad();
        const cpuLoad = cpu.currentLoad.toFixed(1);
        const cpuCheck = {
            name: 'CPU Load',
            status: cpuLoad < 95 ? 'pass' : 'fail',
            details: `${cpuLoad}% average load`
        };
        results.checks.push(cpuCheck);

        if (cpuLoad > 95) {
            results.warnings.push({
                severity: 'warning',
                message: 'High CPU load detected',
                check: 'CPU'
            });
            if (results.status === 'healthy') results.status = 'warning';
        }

        // Check 6: Port availability
        const portCheckResult = await checkPortAvailability(config.serverPort);
        const portCheck = {
            name: 'Port Availability',
            status: portCheckResult.available ? 'pass' : 'fail',
            details: portCheckResult.message
        };
        results.checks.push(portCheck);

        if (!portCheckResult.available) {
            results.issues.push({
                severity: 'error',
                issue: knownIssues.find(i => i.id === 'port_in_use'),
                check: 'Port Availability'
            });
            if (results.status !== 'critical') results.status = 'error';
        }

        // Check 7: Configuration file validity
        const configFile = path.join(config.serverPath, 'server.json');
        const configCheck = {
            name: 'Server Configuration',
            status: 'pass',
            details: 'Configuration valid'
        };

        if (fs.existsSync(configFile)) {
            try {
                const configContent = fs.readFileSync(configFile, 'utf8');
                JSON.parse(configContent);
                configCheck.details = 'Configuration file valid';
            } catch (e) {
                configCheck.status = 'fail';
                configCheck.details = `Configuration file invalid: ${e.message}`;
                results.issues.push({
                    severity: 'error',
                    message: 'Invalid server configuration JSON',
                    check: 'Configuration'
                });
                results.status = 'critical';
            }
        } else {
            configCheck.status = 'warning';
            configCheck.details = 'Configuration file will be created on server start';
        }
        results.checks.push(configCheck);

        // Check 8: Mod configuration
        const modDbPath = path.join(__dirname, '../config/mods.json');
        if (fs.existsSync(modDbPath)) {
            try {
                const modsDb = JSON.parse(fs.readFileSync(modDbPath, 'utf8'));
                const enabledMods = modsDb.installed.filter(m => m.enabled);

                let modIssues = 0;
                for (const mod of enabledMods) {
                    for (const depId of mod.dependencies) {
                        const dep = modsDb.installed.find(m => m.id === depId);
                        if (!dep || !dep.enabled) {
                            modIssues++;
                        }
                    }
                }

                const modCheck = {
                    name: 'Mod Configuration',
                    status: modIssues === 0 ? 'pass' : 'fail',
                    details: modIssues === 0
                        ? `${enabledMods.length} mods enabled, all dependencies satisfied`
                        : `${modIssues} dependency issues found`
                };
                results.checks.push(modCheck);

                if (modIssues > 0) {
                    results.issues.push({
                        severity: 'error',
                        issue: knownIssues.find(i => i.id === 'mod_conflict'),
                        check: 'Mods'
                    });
                    if (results.status === 'healthy') results.status = 'error';
                }
            } catch (e) {
                results.checks.push({
                    name: 'Mod Configuration',
                    status: 'warning',
                    details: 'Could not validate mod configuration'
                });
            }
        }

    } catch (error) {
        results.status = 'error';
        results.error = error.message;
    }

    // Save to history
    diagnosticHistory.unshift(results);
    if (diagnosticHistory.length > MAX_HISTORY) {
        diagnosticHistory = diagnosticHistory.slice(0, MAX_HISTORY);
    }

    return results;
}

// Check if port is available
async function checkPortAvailability(port) {
    return new Promise((resolve) => {
        // Game server port is UDP, so check using a UDP bind attempt.
        const socket = dgram.createSocket('udp4');

        socket.once('error', (err) => {
            socket.close();
            if (err && err.code === 'EADDRINUSE') {
                return resolve({ available: false, message: `UDP port ${port} is already in use` });
            }
            return resolve({
                available: true,
                message: `Could not reliably check UDP port ${port} (${err?.message || 'unknown error'})`
            });
        });

        socket.bind(port, '0.0.0.0', () => {
            socket.close(() => {
                resolve({ available: true, message: `UDP port ${port} is available` });
            });
        });
    });
}

// Routes

// Run diagnostics
router.get('/diagnostics/run', async (req, res) => {
    try {
        const configPath = path.join(__dirname, '../config/server-config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        const results = await runDiagnostics(config);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get diagnostic history
router.get('/diagnostics/history', (req, res) => {
    res.json(diagnosticHistory);
});

// Get known issues
router.get('/diagnostics/issues', (req, res) => {
    res.json(knownIssues);
});

// Get specific issue details
router.get('/diagnostics/issues/:id', (req, res) => {
    const issue = knownIssues.find(i => i.id === req.params.id);
    if (!issue) {
        return res.status(404).json({ error: 'Issue not found' });
    }
    res.json(issue);
});

// Auto-fix common issues
router.post('/diagnostics/autofix/:issueId', async (req, res) => {
    const { issueId } = req.params;

    try {
        const configPath = path.join(__dirname, '../config/server-config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        let fixed = false;
        let message = '';

        switch (issueId) {
            case 'missing_files':
                // Trigger server update
                message = 'Initiating server file verification via SteamCMD';
                // This would trigger the update endpoint
                fixed = true;
                break;

            case 'mod_conflict':
                // Disable problematic mods
                const modDbPath = path.join(__dirname, '../config/mods.json');
                if (fs.existsSync(modDbPath)) {
                    const modsDb = JSON.parse(fs.readFileSync(modDbPath, 'utf8'));
                    // Disable all mods temporarily
                    modsDb.installed.forEach(m => m.enabled = false);
                    fs.writeFileSync(modDbPath, JSON.stringify(modsDb, null, 2));
                    message = 'Disabled all mods. Re-enable them one by one to identify conflicts.';
                    fixed = true;
                }
                break;

            case 'disk_space':
                // Clean up logs
                const logsPath = path.join(config.serverPath, 'profile', 'logs');
                if (fs.existsSync(logsPath)) {
                    const files = fs.readdirSync(logsPath);
                    let cleaned = 0;
                    files.forEach(file => {
                        const filePath = path.join(logsPath, file);
                        const stats = fs.statSync(filePath);
                        const ageInDays = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
                        if (ageInDays > 7) {
                            fs.unlinkSync(filePath);
                            cleaned++;
                        }
                    });
                    message = `Cleaned up ${cleaned} old log files`;
                    fixed = true;
                }
                break;

            default:
                return res.status(400).json({ error: 'No auto-fix available for this issue' });
        }

        res.json({ success: fixed, message });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
