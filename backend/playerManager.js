const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { requireRole } = require('./auth');
const { isValidInternalRequest } = require('./internalApiKey');

function requireInternal(req, res, next) {
    if (!isValidInternalRequest(req)) {
        return res.status(403).json({ error: 'Internal request required' });
    }
    next();
}

// In-memory storage for active players
const activePlayers = new Map();
const playerHistory = [];
const MAX_HISTORY = 1000;

// Player session tracking
class PlayerSession {
    constructor(steamId, playerName, ip) {
        this.steamId = steamId;
        this.playerName = playerName;
        this.ip = ip;
        this.joinTime = new Date();
        this.lastSeen = new Date();
        this.ping = 0;
        this.score = 0;
        this.kills = 0;
        this.deaths = 0;
        this.teamKills = 0;
        this.isAdmin = false;
        this.warnings = [];
        this.kicked = false;
        this.banned = false;
    }

    update(data) {
        this.lastSeen = new Date();
        if (data.ping !== undefined) this.ping = data.ping;
        if (data.score !== undefined) this.score = data.score;
        if (data.kills !== undefined) this.kills = data.kills;
        if (data.deaths !== undefined) this.deaths = data.deaths;
    }

    getSessionDuration() {
        return Math.floor((this.lastSeen - this.joinTime) / 1000); // seconds
    }

    toJSON() {
        return {
            steamId: this.steamId,
            playerName: this.playerName,
            ip: this.ip,
            joinTime: this.joinTime,
            lastSeen: this.lastSeen,
            sessionDuration: this.getSessionDuration(),
            ping: this.ping,
            score: this.score,
            kills: this.kills,
            deaths: this.deaths,
            kd: this.deaths > 0 ? (this.kills / this.deaths).toFixed(2) : this.kills.toFixed(2),
            teamKills: this.teamKills,
            isAdmin: this.isAdmin,
            warnings: this.warnings,
            kicked: this.kicked,
            banned: this.banned
        };
    }
}

// Banned players storage
const bannedPlayers = new Map();

// Admin commands queue
const adminCommands = [];

// Get all active players
router.get('/players/active', requireRole(['admin', 'gm']), (req, res) => {
    const players = Array.from(activePlayers.values()).map(p => p.toJSON());
    res.json({
        count: players.length,
        players: players.sort((a, b) => b.score - a.score)
    });
});

// Get player by Steam ID
router.get('/players/:steamId', requireRole(['admin', 'gm']), (req, res) => {
    const player = activePlayers.get(req.params.steamId);
    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player.toJSON());
});

// Get player history
router.get('/players/history/all', requireRole(['admin', 'gm']), (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    res.json({
        total: playerHistory.length,
        limit,
        offset,
        history: playerHistory.slice(offset, offset + limit)
    });
});

// Get banned players
router.get('/players/banned/list', requireRole(['admin', 'gm']), (req, res) => {
    const banned = Array.from(bannedPlayers.values());
    res.json({
        count: banned.length,
        players: banned
    });
});

// Player join event (called from server)
router.post('/players/join', requireInternal, (req, res) => {
    const { steamId, playerName, ip } = req.body;

    if (!steamId || !playerName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if banned
    if (bannedPlayers.has(steamId)) {
        const ban = bannedPlayers.get(steamId);
        return res.status(403).json({
            error: 'Player is banned',
            ban
        });
    }

    // Create or update player session
    let player = activePlayers.get(steamId);
    if (!player) {
        player = new PlayerSession(steamId, playerName, ip);
        activePlayers.set(steamId, player);

        // Add to history
        playerHistory.unshift({
            steamId,
            playerName,
            ip,
            event: 'join',
            timestamp: new Date()
        });
        if (playerHistory.length > MAX_HISTORY) {
            playerHistory.pop();
        }
    }

    res.json({ success: true, player: player.toJSON() });
});

// Player leave event
router.post('/players/leave', requireInternal, (req, res) => {
    const { steamId } = req.body;

    const player = activePlayers.get(steamId);
    if (player) {
        // Add to history
        playerHistory.unshift({
            steamId: player.steamId,
            playerName: player.playerName,
            event: 'leave',
            sessionDuration: player.getSessionDuration(),
            timestamp: new Date()
        });
        if (playerHistory.length > MAX_HISTORY) {
            playerHistory.pop();
        }

        activePlayers.delete(steamId);
    }

    res.json({ success: true });
});

// Update player stats
router.post('/players/:steamId/update', requireInternal, (req, res) => {
    const player = activePlayers.get(req.params.steamId);
    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }

    player.update(req.body);
    res.json({ success: true, player: player.toJSON() });
});

// Warn player (GM+ required)
router.post('/players/:steamId/warn', requireRole(['admin', 'gm']), (req, res) => {
    const { reason } = req.body;
    const player = activePlayers.get(req.params.steamId);

    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }

    const warning = {
        reason,
        timestamp: new Date(),
        issuedBy: req.user?.displayName || 'Admin'
    };

    player.warnings.push(warning);

    // Add to history
    playerHistory.unshift({
        steamId: player.steamId,
        playerName: player.playerName,
        event: 'warn',
        reason,
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: `Warning issued to ${player.playerName}`,
        warnings: player.warnings
    });
});

// Kick player (GM+ required)
router.post('/players/:steamId/kick', requireRole(['admin', 'gm']), (req, res) => {
    const { reason } = req.body;
    const player = activePlayers.get(req.params.steamId);

    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }

    player.kicked = true;

    // Add to admin command queue (to be executed by server)
    adminCommands.push({
        type: 'kick',
        steamId: player.steamId,
        playerName: player.playerName,
        reason: reason || 'Kicked by admin',
        timestamp: new Date()
    });

    // Add to history
    playerHistory.unshift({
        steamId: player.steamId,
        playerName: player.playerName,
        event: 'kick',
        reason: reason || 'Kicked by admin',
        timestamp: new Date()
    });

    // Remove from active players
    activePlayers.delete(req.params.steamId);

    res.json({
        success: true,
        message: `${player.playerName} has been kicked`
    });
});

// Ban player (Admin only)
router.post('/players/:steamId/ban', requireRole(['admin']), (req, res) => {
    const { reason, duration } = req.body; // duration in hours, 0 = permanent
    const player = activePlayers.get(req.params.steamId);

    if (!player && !req.params.steamId) {
        return res.status(404).json({ error: 'Player not found' });
    }

    const ban = {
        steamId: req.params.steamId,
        playerName: player ? player.playerName : 'Unknown',
        reason: reason || 'Banned by admin',
        bannedAt: new Date(),
        bannedBy: req.user?.displayName || 'Admin',
        duration: duration || 0, // 0 = permanent
        expiresAt: duration > 0 ? new Date(Date.now() + duration * 60 * 60 * 1000) : null,
        permanent: duration === 0
    };

    bannedPlayers.set(req.params.steamId, ban);

    // Add to admin command queue
    adminCommands.push({
        type: 'ban',
        steamId: req.params.steamId,
        playerName: ban.playerName,
        reason: ban.reason,
        timestamp: new Date()
    });

    // Add to history
    playerHistory.unshift({
        steamId: req.params.steamId,
        playerName: ban.playerName,
        event: 'ban',
        reason: ban.reason,
        permanent: ban.permanent,
        timestamp: new Date()
    });

    // Remove from active players if online
    if (player) {
        activePlayers.delete(req.params.steamId);
    }

    res.json({
        success: true,
        message: `${ban.playerName} has been banned`,
        ban
    });
});

// Unban player (Admin only)
router.post('/players/:steamId/unban', requireRole(['admin']), (req, res) => {
    const ban = bannedPlayers.get(req.params.steamId);

    if (!ban) {
        return res.status(404).json({ error: 'Player is not banned' });
    }

    bannedPlayers.delete(req.params.steamId);

    // Add to history
    playerHistory.unshift({
        steamId: req.params.steamId,
        playerName: ban.playerName,
        event: 'unban',
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: `${ban.playerName} has been unbanned`
    });
});

// Send message to player (GM+ required)
router.post('/players/:steamId/message', requireRole(['admin', 'gm']), (req, res) => {
    const { message } = req.body;
    const player = activePlayers.get(req.params.steamId);

    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }

    // Add to admin command queue
    adminCommands.push({
        type: 'message',
        steamId: player.steamId,
        playerName: player.playerName,
        message,
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: `Message sent to ${player.playerName}`
    });
});

// Broadcast message to all players (GM+ required)
router.post('/players/broadcast', requireRole(['admin', 'gm']), (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Add to admin command queue
    adminCommands.push({
        type: 'broadcast',
        message,
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'Broadcast sent to all players',
        playerCount: activePlayers.size
    });
});

// Get pending admin commands (for server to execute)
router.get('/players/commands/pending', requireInternal, (req, res) => {
    const commands = [...adminCommands];
    adminCommands.length = 0; // Clear queue
    res.json({ count: commands.length, commands });
});

// Get player statistics summary
router.get('/players/stats/summary', requireRole(['admin', 'gm']), (req, res) => {
    const players = Array.from(activePlayers.values());

    const stats = {
        totalPlayers: players.length,
        totalKills: players.reduce((sum, p) => sum + p.kills, 0),
        totalDeaths: players.reduce((sum, p) => sum + p.deaths, 0),
        averagePing: players.length > 0
            ? Math.round(players.reduce((sum, p) => sum + p.ping, 0) / players.length)
            : 0,
        averageSessionTime: players.length > 0
            ? Math.round(players.reduce((sum, p) => sum + p.getSessionDuration(), 0) / players.length)
            : 0,
        topScorer: players.length > 0
            ? players.reduce((max, p) => p.score > max.score ? p : max).toJSON()
            : null,
        bannedCount: bannedPlayers.size,
        totalWarnings: players.reduce((sum, p) => sum + p.warnings.length, 0)
    };

    res.json(stats);
});

// Cleanup expired bans (runs periodically)
setInterval(() => {
    const now = Date.now();
    for (const [steamId, ban] of bannedPlayers.entries()) {
        if (!ban.permanent && ban.expiresAt && new Date(ban.expiresAt).getTime() < now) {
            bannedPlayers.delete(steamId);
            console.log(`Ban expired for ${ban.playerName} (${steamId})`);
        }
    }
}, 60000); // Check every minute

// Cleanup inactive players (15 min timeout)
setInterval(() => {
    const timeout = 15 * 60 * 1000; // 15 minutes
    const now = Date.now();

    for (const [steamId, player] of activePlayers.entries()) {
        if (now - player.lastSeen.getTime() > timeout) {
            console.log(`Player ${player.playerName} timed out`);
            activePlayers.delete(steamId);

            playerHistory.unshift({
                steamId: player.steamId,
                playerName: player.playerName,
                event: 'timeout',
                timestamp: new Date()
            });
        }
    }
}, 60000); // Check every minute

module.exports = router;
