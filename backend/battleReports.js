const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * Battle Reports System
 * Detailed match reports with statistics and graphs (BF3-style)
 */

const reportsPath = path.join(__dirname, '../config/battle-reports.json');

let battleReports = [];

function loadReports() {
  try {
    if (fs.existsSync(reportsPath)) {
      battleReports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading battle reports:', error);
  }
}

function saveReports() {
  try {
    const dir = path.dirname(reportsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(reportsPath, JSON.stringify(battleReports, null, 2));
  } catch (error) {
    console.error('Error saving battle reports:', error);
  }
}

loadReports();

// Generate detailed battle report
function generateBattleReport(match, events, players) {
  const report = {
    id: `report_${match.id}`,
    matchId: match.id,
    scenario: match.scenario,
    map: match.map,
    startedAt: match.startedAt,
    endedAt: match.endedAt,
    duration: match.duration,
    winner: match.winner,

    // Player statistics
    players: players.map(p => ({
      steamId: p.steamId,
      displayName: p.displayName,
      team: p.team || 'Unknown',
      stats: {
        kills: p.kills || 0,
        deaths: p.deaths || 0,
        score: p.score || 0,
        headshots: p.headshots || 0,
        assists: p.assists || 0,
        longestKill: p.longestKill || 0,
        accuracy: p.accuracy || 0,
        damageDealt: p.damageDealt || 0,
        damageTaken: p.damageTaken || 0
      },
      weapons: p.weapons || {},
      vehicles: p.vehicles || {},
      awards: p.awards || []
    })),

    // Timeline data (for graphs)
    timeline: generateTimeline(events),

    // Team statistics
    teams: generateTeamStats(players),

    // Kill heatmap data
    heatmap: generateHeatmap(events),

    // Top performers
    awards: generateAwards(players),

    // Weapon statistics
    weaponStats: generateWeaponStats(players),

    // Score progression over time
    scoreProgression: generateScoreProgression(events),

    createdAt: new Date().toISOString()
  };

  return report;
}

// Generate timeline from events
function generateTimeline(events) {
  const timeline = events
    .filter(e => ['kill', 'match_start', 'match_end', 'objective_captured'].includes(e.type))
    .map(e => ({
      timestamp: new Date(e.timestamp).getTime(),
      type: e.type,
      message: e.message,
      icon: getEventIcon(e.type)
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return timeline;
}

// Generate team statistics
function generateTeamStats(players) {
  const teams = {};

  players.forEach(p => {
    const team = p.team || 'Unknown';
    if (!teams[team]) {
      teams[team] = {
        name: team,
        playerCount: 0,
        totalKills: 0,
        totalDeaths: 0,
        totalScore: 0,
        totalDamage: 0
      };
    }

    teams[team].playerCount++;
    teams[team].totalKills += p.kills || 0;
    teams[team].totalDeaths += p.deaths || 0;
    teams[team].totalScore += p.score || 0;
    teams[team].totalDamage += p.damageDealt || 0;
  });

  return Object.values(teams);
}

// Generate kill heatmap data
function generateHeatmap(events) {
  const kills = events.filter(e => e.type === 'kill');

  // Group kills by location (if available)
  const heatmapData = {};

  kills.forEach(kill => {
    if (kill.location) {
      const key = `${Math.floor(kill.location.x / 10)}_${Math.floor(kill.location.y / 10)}`;
      heatmapData[key] = (heatmapData[key] || 0) + 1;
    }
  });

  return Object.entries(heatmapData).map(([key, count]) => {
    const [x, y] = key.split('_').map(Number);
    return { x: x * 10, y: y * 10, intensity: count };
  });
}

// Generate awards for top performers
function generateAwards(players) {
  const awards = [];

  // MVP (highest score)
  const mvp = players.reduce((max, p) => p.score > max.score ? p : max, players[0]);
  if (mvp) {
    awards.push({
      type: 'mvp',
      title: 'MVP',
      icon: '👑',
      player: mvp.displayName,
      steamId: mvp.steamId,
      value: mvp.score
    });
  }

  // Best K/D
  const bestKD = players.reduce((max, p) => {
    const kd = p.deaths > 0 ? p.kills / p.deaths : p.kills;
    const maxKD = max.deaths > 0 ? max.kills / max.deaths : max.kills;
    return kd > maxKD ? p : max;
  }, players[0]);

  if (bestKD) {
    awards.push({
      type: 'best_kd',
      title: 'Best K/D Ratio',
      icon: '🎯',
      player: bestKD.displayName,
      steamId: bestKD.steamId,
      value: bestKD.deaths > 0 ? (bestKD.kills / bestKD.deaths).toFixed(2) : bestKD.kills
    });
  }

  // Most Kills
  const mostKills = players.reduce((max, p) => p.kills > max.kills ? p : max, players[0]);
  if (mostKills) {
    awards.push({
      type: 'most_kills',
      title: 'Most Kills',
      icon: '💀',
      player: mostKills.displayName,
      steamId: mostKills.steamId,
      value: mostKills.kills
    });
  }

  // Sharpshooter (most headshots)
  const sharpshooter = players.reduce((max, p) => p.headshots > max.headshots ? p : max, players[0]);
  if (sharpshooter && sharpshooter.headshots > 0) {
    awards.push({
      type: 'sharpshooter',
      title: 'Sharpshooter',
      icon: '🎯',
      player: sharpshooter.displayName,
      steamId: sharpshooter.steamId,
      value: sharpshooter.headshots
    });
  }

  // Longest Kill
  const sniper = players.reduce((max, p) => p.longestKill > max.longestKill ? p : max, players[0]);
  if (sniper && sniper.longestKill > 0) {
    awards.push({
      type: 'longest_kill',
      title: 'Longest Kill',
      icon: '🔭',
      player: sniper.displayName,
      steamId: sniper.steamId,
      value: `${sniper.longestKill}m`
    });
  }

  // Survivor (least deaths)
  const survivor = players.reduce((min, p) => p.deaths < min.deaths ? p : min, players[0]);
  if (survivor) {
    awards.push({
      type: 'survivor',
      title: 'Survivor',
      icon: '🛡️',
      player: survivor.displayName,
      steamId: survivor.steamId,
      value: survivor.deaths
    });
  }

  return awards;
}

// Generate weapon statistics
function generateWeaponStats(players) {
  const weaponData = {};

  players.forEach(p => {
    Object.entries(p.weapons || {}).forEach(([weapon, stats]) => {
      if (!weaponData[weapon]) {
        weaponData[weapon] = {
          kills: 0,
          headshots: 0,
          users: 0
        };
      }
      weaponData[weapon].kills += stats.kills || 0;
      weaponData[weapon].headshots += stats.headshots || 0;
      weaponData[weapon].users++;
    });
  });

  return Object.entries(weaponData)
    .map(([weapon, stats]) => ({
      weapon,
      ...stats,
      headshotPercentage: stats.kills > 0 ? Math.round((stats.headshots / stats.kills) * 100) : 0
    }))
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 10);
}

// Generate score progression over time
function generateScoreProgression(events) {
  const progression = {
    timestamps: [],
    teams: {}
  };

  const scoreEvents = events
    .filter(e => e.scoreChange)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  scoreEvents.forEach(event => {
    const time = new Date(event.timestamp).getTime();
    const team = event.team || 'Unknown';

    if (!progression.teams[team]) {
      progression.teams[team] = {
        name: team,
        scores: []
      };
    }

    progression.timestamps.push(time);
    progression.teams[team].scores.push(event.scoreChange);
  });

  return progression;
}

function getEventIcon(type) {
  const icons = {
    kill: '💀',
    match_start: '🎮',
    match_end: '🏆',
    objective_captured: '🎯'
  };
  return icons[type] || '📋';
}

// API Routes

// Get battle report by match ID
router.get('/battle-reports/match/:matchId', (req, res) => {
  const { matchId } = req.params;
  const report = battleReports.find(r => r.matchId === matchId);

  if (!report) {
    return res.status(404).json({ error: 'Battle report not found' });
  }

  res.json(report);
});

// Get player's recent battle reports
router.get('/battle-reports/player/:steamId', (req, res) => {
  const { steamId } = req.params;
  const { limit = 10 } = req.query;

  const playerReports = battleReports
    .filter(r => r.players.some(p => p.steamId === steamId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, parseInt(limit));

  res.json(playerReports);
});

// Get all recent battle reports
router.get('/battle-reports', (req, res) => {
  const { limit = 20 } = req.query;

  const reports = battleReports
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, parseInt(limit));

  res.json(reports);
});

// Create battle report (called when match ends)
router.post('/battle-reports/generate', (req, res) => {
  const { match, events, players } = req.body;

  if (!match || !events || !players) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  const report = generateBattleReport(match, events, players);
  battleReports.push(report);
  saveReports();

  res.json({
    success: true,
    message: 'Battle report generated',
    report
  });
});

// Get battle report statistics
router.get('/battle-reports/stats', (req, res) => {
  const totalReports = battleReports.length;
  const totalPlayers = new Set(
    battleReports.flatMap(r => r.players.map(p => p.steamId))
  ).size;

  const avgMatchDuration = battleReports.reduce((sum, r) => sum + r.duration, 0) / totalReports;
  const totalKills = battleReports.reduce((sum, r) =>
    sum + r.players.reduce((psum, p) => psum + p.stats.kills, 0), 0
  );

  res.json({
    totalReports,
    totalPlayers,
    avgMatchDuration,
    totalKills
  });
});

module.exports = {
  router,
  generateBattleReport
};
