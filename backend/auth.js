const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Users database
const usersDbPath = path.join(__dirname, '../config/users.json');
let usersDatabase = { users: [] };

// Load users database
function loadUsersDb() {
    try {
        if (fs.existsSync(usersDbPath)) {
            usersDatabase = JSON.parse(fs.readFileSync(usersDbPath, 'utf8'));
        } else {
            // SECURITY: do NOT auto-create a hardcoded default admin.
            // Install scripts should create config/users.json with your real SteamID(s).
            usersDatabase = { users: [] };
            saveUsersDb();
            console.warn(
                '[auth] No users.json found. Created an empty users database. ' +
                'Add your SteamID as admin in config/users.json to be able to log in.'
            );
        }
    } catch (error) {
        console.error('Error loading users database:', error);
    }
}

// Save users database
function saveUsersDb() {
    try {
        const configDir = path.dirname(usersDbPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(usersDbPath, JSON.stringify(usersDatabase, null, 2));
    } catch (error) {
        console.error('Error saving users database:', error);
    }
}

loadUsersDb();

// Active sessions (in-memory for now)
const activeSessions = new Map();

// Generate session token
function generateSessionToken() {
    return require('crypto').randomBytes(32).toString('hex');
}

// Middleware to check authentication
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const session = activeSessions.get(token);

    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Check if session expired (24 hours)
    if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
        activeSessions.delete(token);
        return res.status(401).json({ error: 'Session expired' });
    }

    req.user = session.user;
    next();
}

// Middleware to check admin role
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Middleware factory to check allowed roles
function requireRole(allowedRoles = []) {
    const allowed = new Set(allowedRoles);
    return function (req, res, next) {
        const role = req.user?.role;
        if (!role || !allowed.has(role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                requiredRoles: allowedRoles
            });
        }
        next();
    };
}

// Get Steam API key from config
function getSteamApiKey() {
    try {
        const configPath = path.join(__dirname, '../config/server-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return config.steamApiKey || '';
        }
    } catch (error) {
        console.error('Error reading Steam API key:', error);
    }
    return '';
}

// Steam OpenID authentication
router.post('/auth/steam/verify', async (req, res) => {
    const { openIdParams } = req.body;

    try {
        // Verify OpenID response
        // In production, you should properly validate the OpenID response
        // For now, we'll extract the Steam ID from the claimed_id

        const claimedId = openIdParams['openid.claimed_id'] || openIdParams['openid.identity'];

        if (!claimedId) {
            return res.status(400).json({ error: 'Invalid Steam OpenID response' });
        }

        // Extract Steam ID from claimed_id (format: https://steamcommunity.com/openid/id/STEAMID64)
        const steamIdMatch = claimedId.match(/\/id\/(\d+)/);

        if (!steamIdMatch) {
            return res.status(400).json({ error: 'Could not extract Steam ID' });
        }

        const steamId = steamIdMatch[1];

        // Check if user is authorized
        const user = usersDatabase.users.find(u => u.steamId === steamId);

        if (!user) {
            return res.status(403).json({
                error: 'Access denied. Your Steam ID is not authorized.',
                steamId: steamId
            });
        }

        // Fetch user profile from Steam API
        const apiKey = getSteamApiKey();
        let displayName = user.displayName;
        let avatarUrl = '';

        if (apiKey) {
            try {
                const steamResponse = await axios.get(
                    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
                );

                if (steamResponse.data.response.players.length > 0) {
                    const player = steamResponse.data.response.players[0];
                    displayName = player.personaname;
                    avatarUrl = player.avatarfull;

                    // Update user info
                    user.displayName = displayName;
                    user.avatarUrl = avatarUrl;
                    user.lastLogin = new Date().toISOString();
                    saveUsersDb();
                }
            } catch (error) {
                console.error('Error fetching Steam profile:', error);
            }
        }

        // Create session
        const token = generateSessionToken();
        activeSessions.set(token, {
            user: {
                steamId: user.steamId,
                displayName: displayName,
                avatarUrl: avatarUrl,
                role: user.role
            },
            createdAt: Date.now()
        });

        res.json({
            success: true,
            token,
            user: {
                steamId: user.steamId,
                displayName: displayName,
                avatarUrl: avatarUrl,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Steam auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Simple login with Steam ID (for development/testing)
router.post('/auth/steam/login', async (req, res) => {
    const { steamId } = req.body;

    if (!steamId) {
        return res.status(400).json({ error: 'Steam ID required' });
    }

    // Check if user is authorized
    const user = usersDatabase.users.find(u => u.steamId === steamId);

    if (!user) {
        return res.status(403).json({
            error: 'Access denied. Your Steam ID is not authorized.',
            steamId: steamId
        });
    }

    // Fetch user profile from Steam API
    const apiKey = getSteamApiKey();
    let displayName = user.displayName;
    let avatarUrl = '';

    if (apiKey) {
        try {
            const steamResponse = await axios.get(
                `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
            );

            if (steamResponse.data.response.players.length > 0) {
                const player = steamResponse.data.response.players[0];
                displayName = player.personaname;
                avatarUrl = player.avatarfull;

                // Update user info
                user.displayName = displayName;
                user.avatarUrl = avatarUrl;
                user.lastLogin = new Date().toISOString();
                saveUsersDb();
            }
        } catch (error) {
            console.error('Error fetching Steam profile:', error);
        }
    }

    // Create session
    const token = generateSessionToken();
    activeSessions.set(token, {
        user: {
            steamId: user.steamId,
            displayName: displayName,
            avatarUrl: avatarUrl,
            role: user.role
        },
        createdAt: Date.now()
    });

    res.json({
        success: true,
        token,
        user: {
            steamId: user.steamId,
            displayName: displayName,
            avatarUrl: avatarUrl,
            role: user.role
        }
    });
});

// Get current user
router.get('/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

// Logout
router.post('/auth/logout', requireAuth, (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    activeSessions.delete(token);
    res.json({ success: true });
});

// Get all users (admin only)
router.get('/users', requireAuth, requireAdmin, (req, res) => {
    res.json(usersDatabase);
});

// Add user (admin only)
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
    const { steamId, role } = req.body;

    if (!steamId) {
        return res.status(400).json({ error: 'Steam ID required' });
    }

    if (!['admin', 'gm', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be: admin, gm, or user' });
    }

    // Check if user already exists
    if (usersDatabase.users.find(u => u.steamId === steamId)) {
        return res.status(400).json({ error: 'User already exists' });
    }

    // Fetch user info from Steam
    const apiKey = getSteamApiKey();
    let displayName = `User ${steamId}`;
    let avatarUrl = '';

    if (apiKey) {
        try {
            const steamResponse = await axios.get(
                `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
            );

            if (steamResponse.data.response.players.length > 0) {
                const player = steamResponse.data.response.players[0];
                displayName = player.personaname;
                avatarUrl = player.avatarfull;
            }
        } catch (error) {
            console.error('Error fetching Steam profile:', error);
        }
    }

    const newUser = {
        steamId,
        displayName,
        avatarUrl,
        role,
        addedAt: new Date().toISOString(),
        addedBy: req.user.steamId
    };

    usersDatabase.users.push(newUser);
    saveUsersDb();

    res.json({ success: true, user: newUser });
});

// Update user role (admin only)
router.put('/users/:steamId', requireAuth, requireAdmin, (req, res) => {
    const { steamId } = req.params;
    const { role } = req.body;

    if (!['admin', 'gm', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be: admin, gm, or user' });
    }

    const user = usersDatabase.users.find(u => u.steamId === steamId);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Prevent removing last admin
    if (user.role === 'admin' && role !== 'admin') {
        const adminCount = usersDatabase.users.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
            return res.status(400).json({ error: 'Cannot remove the last admin' });
        }
    }

    user.role = role;
    user.updatedAt = new Date().toISOString();
    user.updatedBy = req.user.steamId;
    saveUsersDb();

    res.json({ success: true, user });
});

// Remove user (admin only)
router.delete('/users/:steamId', requireAuth, requireAdmin, (req, res) => {
    const { steamId } = req.params;

    const userIndex = usersDatabase.users.findIndex(u => u.steamId === steamId);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const user = usersDatabase.users[userIndex];

    // Prevent removing last admin
    if (user.role === 'admin') {
        const adminCount = usersDatabase.users.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
            return res.status(400).json({ error: 'Cannot remove the last admin' });
        }
    }

    // Prevent self-removal
    if (steamId === req.user.steamId) {
        return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    usersDatabase.users.splice(userIndex, 1);
    saveUsersDb();

    // Remove active sessions for this user
    for (const [token, session] of activeSessions.entries()) {
        if (session.user.steamId === steamId) {
            activeSessions.delete(token);
        }
    }

    res.json({ success: true });
});

module.exports = {
    router,
    requireAuth,
    requireAdmin,
    requireRole
};
