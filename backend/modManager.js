const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const workshopApi = require('./workshopApi');
const { resolveSteamCmdExecutable, isWindows, looksLikeWindowsPath } = require('./platform');
const { requireRole } = require('./auth');

// Mod database (persisted to file)
const modDbPath = path.join(__dirname, '../config/mods.json');
let modsDatabase = { installed: [], available: [] };

const METADATA_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Load mods database
function loadModsDb() {
    try {
        if (fs.existsSync(modDbPath)) {
            modsDatabase = JSON.parse(fs.readFileSync(modDbPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading mods database:', error);
    }
}

// Save mods database
function saveModsDb() {
    try {
        const configDir = path.dirname(modDbPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(modDbPath, JSON.stringify(modsDatabase, null, 2));
    } catch (error) {
        console.error('Error saving mods database:', error);
    }
}

loadModsDb();

// Parse mod ID from Workshop URL
function parseWorkshopId(url) {
    // Support multiple URL formats
    let match = url.match(/id=(\d+)/); // Steam format
    if (match) return match[1];

    match = url.match(/workshop\/([A-Z0-9]+)/i); // Arma Platform format
    if (match) return match[1];

    // If it's just an ID
    if (/^[A-Z0-9]+$/i.test(url.trim())) {
        return url.trim();
    }

    return null;
}

// Fetch mod info from Arma Reforger Workshop with dependencies
async function fetchModInfo(workshopId) {
    try {
        // Use Workshop API for Arma Reforger mods
        const modInfo = await workshopApi.getModDetails(workshopId);
        modInfo.lastFetchedAt = new Date().toISOString();
        return modInfo;
    } catch (error) {
        console.error(`Error fetching mod info for ${workshopId}:`, error.message);
        return {
            id: workshopId,
            name: 'Unknown Mod',
            error: error.message,
            dependencies: [],
            status: 'error'
        };
    }
}

function metadataIsStale(mod) {
    const ts = mod?.lastFetchedAt ? Date.parse(mod.lastFetchedAt) : 0;
    if (!ts) return true;
    return Date.now() - ts > METADATA_TTL_MS;
}

function mergeMetadata(target, fresh) {
    const fields = [
        'name',
        'author',
        'description',
        'version',
        'size',
        'fileSizeBytes',
        'gameVersion',
        'thumbnailUrl',
        'downloads',
        'rating',
        'updated',
        'dependencies'
    ];
    for (const f of fields) {
        if (fresh[f] !== undefined && fresh[f] !== null && fresh[f] !== '') {
            target[f] = fresh[f];
        }
    }
    target.lastFetchedAt = new Date().toISOString();
}

// Check if all dependencies are satisfied
function checkDependencies(modId) {
    const mod = modsDatabase.installed.find(m => m.id === modId);
    if (!mod) return { satisfied: false, missing: [] };

    const missing = [];
    const warnings = [];

    for (const depId of (mod.dependencies || [])) {
        const dependency = modsDatabase.installed.find(m => m.id === depId);

        if (!dependency) {
            missing.push({
                id: depId,
                reason: 'Not installed'
            });
        } else if (!dependency.enabled) {
            warnings.push({
                id: depId,
                name: dependency.name,
                reason: 'Installed but not enabled'
            });
        }
    }

    return {
        satisfied: missing.length === 0,
        missing,
        warnings
    };
}

// Validate mod configuration
function validateModConfiguration() {
    const issues = [];

    for (const mod of modsDatabase.installed) {
        if (!mod.enabled) continue;

        const depCheck = checkDependencies(mod.id);

        if (!depCheck.satisfied) {
            issues.push({
                type: 'error',
                modId: mod.id,
                modName: mod.name,
                message: `Missing required dependencies`,
                missing: depCheck.missing
            });
        }

        if (depCheck.warnings.length > 0) {
            issues.push({
                type: 'warning',
                modId: mod.id,
                modName: mod.name,
                message: `Dependencies not enabled`,
                warnings: depCheck.warnings
            });
        }
    }

    return issues;
}

// Routes

// Get all mods
router.get('/mods', (req, res) => {
    const validation = validateModConfiguration();
    const installed = modsDatabase.installed.map((m) => ({
        ...m,
        metadataStale: metadataIsStale(m)
    }));
    res.json({
        installed,
        available: modsDatabase.available,
        validation
    });
});

// Search for mod on Workshop
router.get('/mods/search', async (req, res) => {
    const { workshopId, url } = req.query;

    let id = workshopId;
    if (url) {
        id = parseWorkshopId(url);
    }

    if (!id) {
        return res.status(400).json({ error: 'Invalid workshop ID or URL' });
    }

    try {
        const modInfo = await fetchModInfo(id);
        res.json(modInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Refresh metadata for a single mod (admin/gm)
router.post('/mods/:id/refresh', requireRole(['admin', 'gm']), async (req, res) => {
    const { id } = req.params;
    const mod = modsDatabase.installed.find(m => m.id === id);
    if (!mod) return res.status(404).json({ error: 'Mod not found' });

    try {
        const fresh = await fetchModInfo(id);
        mergeMetadata(mod, fresh);
        saveModsDb();
        return res.json({ success: true, mod: { ...mod, metadataStale: metadataIsStale(mod) } });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Refresh metadata for all installed mods (admin/gm)
router.post('/mods/refresh', requireRole(['admin', 'gm']), async (req, res) => {
    const results = [];
    let refreshed = 0;
    let failed = 0;

    for (const mod of modsDatabase.installed) {
        try {
            const fresh = await fetchModInfo(mod.id);
            mergeMetadata(mod, fresh);
            refreshed += 1;
            results.push({ id: mod.id, ok: true });
        } catch (e) {
            failed += 1;
            results.push({ id: mod.id, ok: false, error: e.message });
        }
    }

    saveModsDb();
    return res.json({ success: true, refreshed, failed, results });
});

// Get full dependency tree for a mod
router.get('/mods/:id/dependencies', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await workshopApi.getAllDependencies(id);

        res.json({
            modId: id,
            dependencies: result.mods,
            tree: result.tree,
            totalCount: result.mods.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add mod to available list
router.post('/mods/add', requireRole(['admin', 'gm']), async (req, res) => {
    const { workshopId, url, withDependencies } = req.body;

    let id = workshopId;
    if (url) {
        id = parseWorkshopId(url);
    }

    if (!id) {
        return res.status(400).json({ error: 'Invalid workshop ID or URL' });
    }

    try {
        // Check if already exists
        if (modsDatabase.installed.find(m => m.id === id)) {
            return res.status(400).json({ error: 'Mod already in installed list' });
        }

        const modInfo = await fetchModInfo(id);

        // If withDependencies is true, fetch and add all dependencies
        const addedMods = [modInfo];

        if (withDependencies && modInfo.dependencies && modInfo.dependencies.length > 0) {
            const depResult = await workshopApi.getAllDependencies(id);

            for (const depMod of depResult.mods) {
                // Skip the main mod itself
                if (depMod.id === id) continue;

                // Skip if already in database
                if (modsDatabase.installed.find(m => m.id === depMod.id)) continue;

                addedMods.push(depMod);
            }
        }

        // Add all mods to database
        modsDatabase.installed.push(...addedMods);
        saveModsDb();

        res.json({
            success: true,
            added: addedMods.length,
            mods: addedMods,
            message: addedMods.length > 1
                ? `Added ${addedMods.length} mods (including ${addedMods.length - 1} dependencies)`
                : 'Mod added successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download/install mod
router.post('/mods/:id/install', requireRole(['admin', 'gm']), async (req, res) => {
    const { id } = req.params;
    const configPath = path.join(__dirname, '../config/server-config.json');

    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!isWindows() && looksLikeWindowsPath(config.steamCmdPath)) {
            return res.status(400).json({
                error: 'SteamCMD path looks like a Windows path, but this process is running on Linux.',
                suggestion: 'For Docker/Linux, set steamCmdPath to /usr/games/steamcmd (or a directory containing steamcmd).',
                steamCmdPath: config.steamCmdPath
            });
        }
        const steamCmd = resolveSteamCmdExecutable(config.steamCmdPath) || config.steamCmdPath || '/usr/games/steamcmd';
        if (!steamCmd || !fs.existsSync(steamCmd)) {
            return res.status(400).json({
                error: 'SteamCMD not found - cannot download mods',
                path: steamCmd || null
            });
        }

        const mod = modsDatabase.installed.find(m => m.id === id);
        if (!mod) {
            return res.status(404).json({ error: 'Mod not found in database' });
        }

        // Check dependencies first
        const depCheck = checkDependencies(id);
        if (!depCheck.satisfied) {
            return res.status(400).json({
                error: 'Cannot install: missing dependencies',
                missing: depCheck.missing,
                suggestion: 'Please install required mods first or use "Add with Dependencies"'
            });
        }

        // Download mod via SteamCMD
        const workshopPath = path.join(config.serverPath, 'workshop');
        if (!fs.existsSync(workshopPath)) {
            fs.mkdirSync(workshopPath, { recursive: true });
        }

        const downloadProcess = spawn(steamCmd, [
            '+force_install_dir', workshopPath,
            '+login', 'anonymous',
            '+workshop_download_item', '1874900', id,
            '+quit'
        ]);

        downloadProcess.on('exit', (code) => {
            if (code === 0) {
                mod.status = 'installed';
                saveModsDb();
            } else {
                mod.status = 'error';
                mod.error = `Installation failed with code ${code}`;
                saveModsDb();
            }
        });

        mod.status = 'downloading';
        saveModsDb();

        res.json({ success: true, message: 'Download started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enable/disable mod
router.post('/mods/:id/toggle', requireRole(['admin', 'gm']), (req, res) => {
    const { id } = req.params;
    const { enabled } = req.body;

    const mod = modsDatabase.installed.find(m => m.id === id);
    if (!mod) {
        return res.status(404).json({ error: 'Mod not found' });
    }

    if (enabled) {
        // Check dependencies before enabling
        const depCheck = checkDependencies(id);
        if (!depCheck.satisfied) {
            return res.status(400).json({
                error: 'Cannot enable: missing dependencies',
                missing: depCheck.missing
            });
        }
    }

    mod.enabled = enabled;
    saveModsDb();

    // Check if disabling this mod affects others
    const affectedMods = modsDatabase.installed.filter(m =>
        m.enabled && (m.dependencies || []).includes(id)
    );

    const warnings = affectedMods.length > 0 ? {
        message: 'Warning: Other mods depend on this mod',
        affected: affectedMods.map(m => ({ id: m.id, name: m.name }))
    } : null;

    res.json({ success: true, mod, warnings });
});

// Remove mod
router.delete('/mods/:id', requireRole(['admin', 'gm']), (req, res) => {
    const { id } = req.params;

    const index = modsDatabase.installed.findIndex(m => m.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Mod not found' });
    }

    // Check if other mods depend on this
    const dependents = modsDatabase.installed.filter(m =>
        (m.dependencies || []).includes(id) && m.enabled
    );

    if (dependents.length > 0) {
        return res.status(400).json({
            error: 'Cannot remove: other mods depend on this mod',
            dependents: dependents.map(m => ({ id: m.id, name: m.name }))
        });
    }

    modsDatabase.installed.splice(index, 1);
    saveModsDb();

    res.json({ success: true });
});

// Validate configuration
router.get('/mods/validate', (req, res) => {
    const issues = validateModConfiguration();

    res.json({
        valid: issues.filter(i => i.type === 'error').length === 0,
        issues
    });
});

// Auto-resolve dependencies (fetch missing dependencies info)
router.post('/mods/:id/resolve-dependencies', async (req, res) => {
    const { id } = req.params;

    const mod = modsDatabase.installed.find(m => m.id === id);
    if (!mod) {
        return res.status(404).json({ error: 'Mod not found' });
    }

    try {
        const result = await workshopApi.getAllDependencies(id);
        const toInstall = [];

        for (const depMod of result.mods) {
            if (depMod.id === id) continue; // Skip main mod

            const existing = modsDatabase.installed.find(m => m.id === depMod.id);
            if (!existing) {
                toInstall.push(depMod);
            }
        }

        res.json({
            success: true,
            dependencies: toInstall,
            tree: result.tree,
            message: `Found ${toInstall.length} missing dependencies`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
