const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Mod database (persisted to file)
const modDbPath = path.join(__dirname, '../config/mods.json');
let modsDatabase = { installed: [], available: [] };

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
        fs.writeFileSync(modDbPath, JSON.stringify(modsDatabase, null, 2));
    } catch (error) {
        console.error('Error saving mods database:', error);
    }
}

loadModsDb();

// Parse mod ID from Workshop URL
function parseWorkshopId(url) {
    const match = url.match(/id=(\d+)/);
    return match ? match[1] : null;
}

// Fetch mod info from Steam Workshop
async function fetchModInfo(workshopId) {
    try {
        const url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${workshopId}`;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const modInfo = {
            id: workshopId,
            name: $('.workshopItemTitle').text().trim() || 'Unknown Mod',
            author: $('.friendBlockContent').text().trim() || 'Unknown',
            description: $('.workshopItemDescription').text().trim() || '',
            size: $('.detailsStatRight').first().text().trim() || 'Unknown',
            updated: $('.detailsStatRight').eq(1).text().trim() || 'Unknown',
            dependencies: [],
            requiredBy: [],
            status: 'not_installed',
            enabled: false
        };

        // Try to find dependencies in description
        const descLower = modInfo.description.toLowerCase();
        if (descLower.includes('require') || descLower.includes('depend')) {
            // Extract workshop IDs from description
            const dependencyMatches = modInfo.description.match(/id=(\d+)/g);
            if (dependencyMatches) {
                modInfo.dependencies = dependencyMatches.map(m => m.replace('id=', ''));
            }
        }

        return modInfo;
    } catch (error) {
        console.error(`Error fetching mod info for ${workshopId}:`, error.message);
        return {
            id: workshopId,
            name: 'Unknown Mod',
            error: error.message,
            status: 'error'
        };
    }
}

// Check if all dependencies are satisfied
function checkDependencies(modId) {
    const mod = modsDatabase.installed.find(m => m.id === modId);
    if (!mod) return { satisfied: false, missing: [] };

    const missing = [];
    const warnings = [];

    for (const depId of mod.dependencies) {
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
    res.json({
        installed: modsDatabase.installed,
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

// Add mod to available list
router.post('/mods/add', async (req, res) => {
    const { workshopId, url } = req.body;

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
        modsDatabase.installed.push(modInfo);
        saveModsDb();

        res.json({ success: true, mod: modInfo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download/install mod
router.post('/mods/:id/install', async (req, res) => {
    const { id } = req.params;
    const configPath = path.join(__dirname, '../config/server-config.json');

    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const steamCmd = path.join(config.steamCmdPath, 'steamcmd.exe');

        if (!fs.existsSync(steamCmd)) {
            return res.status(400).json({ error: 'SteamCMD not found' });
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
                suggestion: 'Please install required mods first'
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
router.post('/mods/:id/toggle', (req, res) => {
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
        m.enabled && m.dependencies.includes(id)
    );

    const warnings = affectedMods.length > 0 ? {
        message: 'Warning: Other mods depend on this mod',
        affected: affectedMods.map(m => ({ id: m.id, name: m.name }))
    } : null;

    res.json({ success: true, mod, warnings });
});

// Remove mod
router.delete('/mods/:id', (req, res) => {
    const { id } = req.params;

    const index = modsDatabase.installed.findIndex(m => m.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Mod not found' });
    }

    // Check if other mods depend on this
    const dependents = modsDatabase.installed.filter(m =>
        m.dependencies.includes(id) && m.enabled
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

// Auto-resolve dependencies
router.post('/mods/:id/resolve-dependencies', async (req, res) => {
    const { id } = req.params;

    const mod = modsDatabase.installed.find(m => m.id === id);
    if (!mod) {
        return res.status(404).json({ error: 'Mod not found' });
    }

    try {
        const toInstall = [];

        for (const depId of mod.dependencies) {
            const existing = modsDatabase.installed.find(m => m.id === depId);
            if (!existing) {
                const depInfo = await fetchModInfo(depId);
                toInstall.push(depInfo);
            }
        }

        res.json({
            success: true,
            dependencies: toInstall,
            message: `Found ${toInstall.length} missing dependencies`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
