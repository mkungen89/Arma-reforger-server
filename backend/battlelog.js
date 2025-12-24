const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Battlelog database
const battlelogDbPath = path.join(__dirname, '../config/battlelog.json');
let battlelogData = {
    players: [],
    sessions: [],
    matches: [],
    events: [],
    stats: {
        totalKills: 0,
        totalDeaths: 0,
        totalPlaytime: 0,
        totalMatches: 0
    }
};

// Load battlelog data
function loadBattlelog() {
    try {
        if (fs.existsSync(battlelogDbPath)) {
            battlelogData = JSON.parse(fs.readFileSync(battlelogDbPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading battlelog:', error);
    }
}

// Save battlelog data
function saveBattlelog() {
    try {
        const configDir = path.dirname(battlelogDbPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(battlelogDbPath, JSON.stringify(battlelogData, null, 2));
    } catch (error) {
        console.error('Error saving battlelog:', error);
    }
}

loadBattlelog();

// Get or create player
function getOrCreatePlayer(steamId, displayName) {
    let player = battlelogData.players.find(p => p.steamId === steamId);

    if (!player) {
        player = {
            steamId,
            displayName,
            stats: {
                kills: 0,
                deaths: 0,
                playtime: 0,
                matches: 0,
                wins: 0,
                losses: 0,
                score: 0,
                headshots: 0,
                vehicleKills: 0,
                longestKillstreak: 0,
                currentKillstreak: 0
            },
            weapons: {},
            vehicles: {},
            classes: {},
            joinedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            rank: 1,
            xp: 0,
            achievements: []
        };
        battlelogData.players.push(player);
        saveBattlelog();
    }

    return player;
}

// Calculate rank based on XP
function calculateRank(xp) {
    const ranks = [
        { level: 1, xp: 0, name: 'Recruit' },
        { level: 2, xp: 100, name: 'Private' },
        { level: 3, xp: 300, name: 'Corporal' },
        { level: 4, xp: 600, name: 'Sergeant' },
        { level: 5, xp: 1000, name: 'Staff Sergeant' },
        { level: 6, xp: 1500, name: 'Master Sergeant' },
        { level: 7, xp: 2100, name: 'Lieutenant' },
        { level: 8, xp: 2800, name: 'Captain' },
        { level: 9, xp: 3600, name: 'Major' },
        { level: 10, xp: 4500, name: 'Colonel' }
    ];

    for (let i = ranks.length - 1; i >= 0; i--) {
        if (xp >= ranks[i].xp) {
            return ranks[i];
        }
    }

    return ranks[0];
}

// PUBLIC ROUTES (No authentication required for Battlelog!)

// Get server overview
router.get('/battlelog/overview', (req, res) => {
    const topPlayers = battlelogData.players
        .sort((a, b) => b.stats.score - a.stats.score)
        .slice(0, 10)
        .map(p => ({
            steamId: p.steamId,
            displayName: p.displayName,
            score: p.stats.score,
            kills: p.stats.kills,
            deaths: p.stats.deaths,
            kd: p.stats.deaths > 0 ? (p.stats.kills / p.stats.deaths).toFixed(2) : p.stats.kills,
            playtime: p.stats.playtime,
            rank: calculateRank(p.xp)
        }));

    const recentMatches = battlelogData.matches
        .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
        .slice(0, 5);

    const recentEvents = battlelogData.events
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);

    res.json({
        stats: battlelogData.stats,
        topPlayers,
        recentMatches,
        recentEvents,
        totalPlayers: battlelogData.players.length,
        onlinePlayers: battlelogData.sessions.filter(s => s.online).length
    });
});

// Get leaderboard
router.get('/battlelog/leaderboard', (req, res) => {
    const { sortBy = 'score', limit = 100 } = req.query;

    let sorted = [...battlelogData.players];

    switch (sortBy) {
        case 'kills':
            sorted.sort((a, b) => b.stats.kills - a.stats.kills);
            break;
        case 'kd':
            sorted.sort((a, b) => {
                const kdA = a.stats.deaths > 0 ? a.stats.kills / a.stats.deaths : a.stats.kills;
                const kdB = b.stats.deaths > 0 ? b.stats.kills / b.stats.deaths : b.stats.kills;
                return kdB - kdA;
            });
            break;
        case 'playtime':
            sorted.sort((a, b) => b.stats.playtime - a.stats.playtime);
            break;
        case 'wins':
            sorted.sort((a, b) => b.stats.wins - a.stats.wins);
            break;
        default:
            sorted.sort((a, b) => b.stats.score - a.stats.score);
    }

    const leaderboard = sorted.slice(0, parseInt(limit)).map((p, index) => ({
        rank: index + 1,
        steamId: p.steamId,
        displayName: p.displayName,
        stats: p.stats,
        kd: p.stats.deaths > 0 ? (p.stats.kills / p.stats.deaths).toFixed(2) : p.stats.kills,
        rankInfo: calculateRank(p.xp),
        lastSeen: p.lastSeen
    }));

    res.json(leaderboard);
});

// Get player profile
router.get('/battlelog/player/:steamId', (req, res) => {
    const { steamId } = req.params;
    const player = battlelogData.players.find(p => p.steamId === steamId);

    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }

    const playerSessions = battlelogData.sessions
        .filter(s => s.steamId === steamId)
        .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
        .slice(0, 20);

    const playerMatches = battlelogData.matches
        .filter(m => m.players && m.players.some(p => p.steamId === steamId))
        .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
        .slice(0, 10);

    const playerEvents = battlelogData.events
        .filter(e => e.steamId === steamId || e.victim === steamId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50);

    res.json({
        ...player,
        kd: player.stats.deaths > 0 ? (player.stats.kills / player.stats.deaths).toFixed(2) : player.stats.kills,
        rankInfo: calculateRank(player.xp),
        recentSessions: playerSessions,
        recentMatches: playerMatches,
        recentEvents: playerEvents
    });
});

// Get match details
router.get('/battlelog/match/:matchId', (req, res) => {
    const { matchId } = req.params;
    const match = battlelogData.matches.find(m => m.id === matchId);

    if (!match) {
        return res.status(404).json({ error: 'Match not found' });
    }

    const matchEvents = battlelogData.events
        .filter(e => e.matchId === matchId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({
        ...match,
        events: matchEvents
    });
});

// Get recent matches
router.get('/battlelog/matches', (req, res) => {
    const { limit = 20 } = req.query;

    const matches = battlelogData.matches
        .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
        .slice(0, parseInt(limit));

    res.json(matches);
});

// Get live feed (recent events)
router.get('/battlelog/feed', (req, res) => {
    const { limit = 50 } = req.query;

    const events = battlelogData.events
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, parseInt(limit));

    res.json(events);
});

// Search players
router.get('/battlelog/search', (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.json([]);
    }

    const results = battlelogData.players
        .filter(p =>
            p.displayName.toLowerCase().includes(q.toLowerCase()) ||
            p.steamId.includes(q)
        )
        .slice(0, 20)
        .map(p => ({
            steamId: p.steamId,
            displayName: p.displayName,
            rank: calculateRank(p.xp),
            stats: {
                score: p.stats.score,
                kills: p.stats.kills,
                deaths: p.stats.deaths
            }
        }));

    res.json(results);
});

// ADMIN ROUTES (require authentication)

// Record player join
router.post('/battlelog/player/join', (req, res) => {
    const { steamId, displayName } = req.body;

    const player = getOrCreatePlayer(steamId, displayName);
    player.lastSeen = new Date().toISOString();

    const session = {
        id: `session_${Date.now()}_${steamId}`,
        steamId,
        displayName,
        joinedAt: new Date().toISOString(),
        leftAt: null,
        online: true,
        duration: 0
    };

    battlelogData.sessions.push(session);

    const event = {
        id: `event_${Date.now()}`,
        type: 'player_join',
        steamId,
        displayName,
        timestamp: new Date().toISOString(),
        message: `${displayName} joined the server`
    };

    battlelogData.events.push(event);

    saveBattlelog();

    res.json({ success: true, player, session });
});

// Record player leave
router.post('/battlelog/player/leave', (req, res) => {
    const { steamId, displayName } = req.body;

    const session = battlelogData.sessions
        .filter(s => s.steamId === steamId && s.online)
        .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))[0];

    if (session) {
        session.leftAt = new Date().toISOString();
        session.online = false;
        session.duration = new Date(session.leftAt) - new Date(session.joinedAt);

        const player = battlelogData.players.find(p => p.steamId === steamId);
        if (player) {
            player.stats.playtime += session.duration;
        }
    }

    const event = {
        id: `event_${Date.now()}`,
        type: 'player_leave',
        steamId,
        displayName,
        timestamp: new Date().toISOString(),
        message: `${displayName} left the server`
    };

    battlelogData.events.push(event);

    saveBattlelog();

    res.json({ success: true });
});

// Record kill
router.post('/battlelog/event/kill', (req, res) => {
    const { killerSteamId, killerName, victimSteamId, victimName, weapon, headshot, distance } = req.body;

    const killer = getOrCreatePlayer(killerSteamId, killerName);
    const victim = getOrCreatePlayer(victimSteamId, victimName);

    killer.stats.kills++;
    killer.stats.score += 100;
    killer.stats.currentKillstreak++;
    killer.xp += 100;

    if (headshot) {
        killer.stats.headshots++;
        killer.stats.score += 50;
        killer.xp += 50;
    }

    if (killer.stats.currentKillstreak > killer.stats.longestKillstreak) {
        killer.stats.longestKillstreak = killer.stats.currentKillstreak;
    }

    victim.stats.deaths++;
    victim.stats.currentKillstreak = 0;

    // Weapon stats
    if (!killer.weapons[weapon]) {
        killer.weapons[weapon] = { kills: 0, headshots: 0 };
    }
    killer.weapons[weapon].kills++;
    if (headshot) killer.weapons[weapon].headshots++;

    killer.rank = calculateRank(killer.xp).level;
    battlelogData.stats.totalKills++;
    battlelogData.stats.totalDeaths++;

    const event = {
        id: `event_${Date.now()}`,
        type: 'kill',
        steamId: killerSteamId,
        displayName: killerName,
        victim: victimSteamId,
        victimName,
        weapon,
        headshot: headshot || false,
        distance: distance || 0,
        timestamp: new Date().toISOString(),
        message: headshot
            ? `${killerName} headshotted ${victimName} with ${weapon}`
            : `${killerName} killed ${victimName} with ${weapon}`
    };

    battlelogData.events.push(event);
    saveBattlelog();

    res.json({ success: true, event });
});

// Start match
router.post('/battlelog/match/start', (req, res) => {
    const { scenario, map, maxPlayers } = req.body;

    const match = {
        id: `match_${Date.now()}`,
        scenario,
        map,
        maxPlayers,
        startedAt: new Date().toISOString(),
        endedAt: null,
        duration: 0,
        players: [],
        winner: null
    };

    battlelogData.matches.push(match);
    battlelogData.stats.totalMatches++;

    const event = {
        id: `event_${Date.now()}`,
        type: 'match_start',
        matchId: match.id,
        timestamp: new Date().toISOString(),
        message: `Match started: ${scenario} on ${map}`
    };

    battlelogData.events.push(event);
    saveBattlelog();

    res.json({ success: true, match });
});

// End match
router.post('/battlelog/match/end', (req, res) => {
    const { matchId, winner, players } = req.body;

    const match = battlelogData.matches.find(m => m.id === matchId);

    if (match) {
        match.endedAt = new Date().toISOString();
        match.duration = new Date(match.endedAt) - new Date(match.startedAt);
        match.winner = winner;
        match.players = players;

        // Update player stats
        players.forEach(p => {
            const player = battlelogData.players.find(pl => pl.steamId === p.steamId);
            if (player) {
                player.stats.matches++;
                if (p.won) {
                    player.stats.wins++;
                    player.xp += 500;
                } else {
                    player.stats.losses++;
                    player.xp += 100;
                }
                player.rank = calculateRank(player.xp).level;
            }
        });
    }

    const event = {
        id: `event_${Date.now()}`,
        type: 'match_end',
        matchId,
        timestamp: new Date().toISOString(),
        message: `Match ended - Winner: ${winner || 'Draw'}`
    };

    battlelogData.events.push(event);
    saveBattlelog();

    res.json({ success: true, match });
});

// Get current stats summary
router.get('/battlelog/stats', (req, res) => {
    res.json(battlelogData.stats);
});

module.exports = router;
