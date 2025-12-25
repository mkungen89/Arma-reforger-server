const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * Server Browser System (BF3-style)
 * Shows server info, player list, and allows direct joining
 */

class ServerBrowser {
  constructor(serverManager) {
    this.serverManager = serverManager;
    this.serverInfo = {
      name: 'Arma Reforger Server',
      description: 'Official Server',
      map: 'Everon',
      scenario: 'Conflict',
      maxPlayers: 64,
      currentPlayers: 0,
      players: [],
      settings: {
        difficulty: 'Normal',
        timeLimit: 60,
        scoreLimit: 1000,
        friendly: false,
        crossPlatform: true,
        battleEye: true,
        modded: false
      },
      mods: [],
      status: 'stopped',
      ip: '0.0.0.0',
      port: 2001,
      version: '1.0.0',
      uptime: 0,
      startedAt: null,
      password: false,
      ping: 0
    };

    this.updateInterval = null;
  }

  // Start periodic updates
  startUpdates() {
    this.updateServerInfo();
    this.updateInterval = setInterval(() => {
      this.updateServerInfo();
    }, 5000); // Update every 5 seconds
  }

  // Stop updates
  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Update server information
  updateServerInfo() {
    if (this.serverManager) {
      try {
        // Get server status
        const status = this.serverManager.getStatus();
        this.serverInfo.status = status.running ? 'online' : 'offline';
        this.serverInfo.uptime = status.uptime || 0;
        this.serverInfo.startedAt = status.startedAt || null;

        // Get player count
        const players = this.serverManager.getPlayers();
        this.serverInfo.currentPlayers = players.length;
        this.serverInfo.players = players.map(p => ({
          name: p.displayName,
          steamId: p.steamId,
          ping: p.ping || 0,
          score: p.score || 0,
          kills: p.kills || 0,
          deaths: p.deaths || 0,
          team: p.team || 'Unknown',
          rank: p.rank || 1
        }));

        // Get loaded mods
        const mods = this.serverManager.getLoadedMods();
        this.serverInfo.mods = mods.map(m => ({
          id: m.id,
          name: m.name,
          version: m.version
        }));
        this.serverInfo.settings.modded = mods.length > 0;

      } catch (error) {
        console.error('Error updating server info:', error);
      }
    }
  }

  // Get server info
  getServerInfo() {
    return this.serverInfo;
  }

  // Get detailed server rules
  getServerRules() {
    return {
      ...this.serverInfo.settings,
      tickRate: 60,
      adminCount: 1,
      region: 'EU',
      gameMode: this.serverInfo.scenario,
      allowedWeapons: 'All',
      vehicleSpawnRate: 'Normal',
      maxPing: 150
    };
  }

  // Get player list with details
  getPlayerList() {
    return this.serverInfo.players.sort((a, b) => b.score - a.score);
  }

  // Generate server quick match score (for matchmaking)
  getQuickMatchScore() {
    const playerRatio = this.serverInfo.currentPlayers / this.serverInfo.maxPlayers;

    // Prefer servers that are 50-80% full
    let score = 100;
    if (playerRatio < 0.2) score = 30; // Too empty
    else if (playerRatio < 0.5) score = 70; // Getting better
    else if (playerRatio < 0.8) score = 100; // Perfect
    else if (playerRatio < 1) score = 60; // Almost full
    else score = 20; // Full

    // Add ping score (lower is better)
    const pingScore = Math.max(0, 100 - this.serverInfo.ping);
    score += pingScore * 0.3;

    return Math.round(score);
  }
}

// Create server browser instance
let serverBrowser = null;

// Initialize with server manager
function initializeServerBrowser(serverManager) {
  serverBrowser = new ServerBrowser(serverManager);
  serverBrowser.startUpdates();
  console.log('Server Browser initialized');
}

// API Routes

// Get server info
router.get('/server-browser/info', (req, res) => {
  if (!serverBrowser) {
    return res.status(503).json({ error: 'Server browser not initialized' });
  }

  res.json(serverBrowser.getServerInfo());
});

// Get server rules
router.get('/server-browser/rules', (req, res) => {
  if (!serverBrowser) {
    return res.status(503).json({ error: 'Server browser not initialized' });
  }

  res.json(serverBrowser.getServerRules());
});

// Get player list
router.get('/server-browser/players', (req, res) => {
  if (!serverBrowser) {
    return res.status(503).json({ error: 'Server browser not initialized' });
  }

  res.json(serverBrowser.getPlayerList());
});

// Get quick match score
router.get('/server-browser/quick-match-score', (req, res) => {
  if (!serverBrowser) {
    return res.status(503).json({ error: 'Server browser not initialized' });
  }

  res.json({
    score: serverBrowser.getQuickMatchScore(),
    serverInfo: serverBrowser.getServerInfo()
  });
});

// Update server settings (Admin only)
router.put('/server-browser/settings', (req, res) => {
  if (!serverBrowser) {
    return res.status(503).json({ error: 'Server browser not initialized' });
  }

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { name, description, maxPlayers, settings } = req.body;

  const info = serverBrowser.getServerInfo();

  if (name) info.name = name;
  if (description) info.description = description;
  if (maxPlayers) info.maxPlayers = maxPlayers;
  if (settings) {
    info.settings = { ...info.settings, ...settings };
  }

  res.json({
    success: true,
    message: 'Server settings updated',
    serverInfo: info
  });
});

// Server list (for multi-server support in future)
router.get('/server-browser/list', (req, res) => {
  if (!serverBrowser) {
    return res.status(503).json({ error: 'Server browser not initialized' });
  }

  // For now, return only this server
  // In future, could query multiple servers
  const servers = [
    {
      id: 'main_server',
      ...serverBrowser.getServerInfo(),
      quickMatchScore: serverBrowser.getQuickMatchScore()
    }
  ];

  res.json(servers);
});

// Filter servers (for future multi-server support)
router.post('/server-browser/filter', (req, res) => {
  const {
    map,
    scenario,
    minPlayers,
    maxPlayers,
    region,
    modded,
    password,
    maxPing
  } = req.body;

  if (!serverBrowser) {
    return res.status(503).json({ error: 'Server browser not initialized' });
  }

  const server = serverBrowser.getServerInfo();
  const servers = [{ id: 'main_server', ...server }];

  // Apply filters
  const filtered = servers.filter(s => {
    if (map && s.map !== map) return false;
    if (scenario && s.scenario !== scenario) return false;
    if (minPlayers && s.currentPlayers < minPlayers) return false;
    if (maxPlayers && s.currentPlayers > maxPlayers) return false;
    if (modded !== undefined && s.settings.modded !== modded) return false;
    if (password !== undefined && s.password !== password) return false;
    if (maxPing && s.ping > maxPing) return false;
    return true;
  });

  res.json(filtered);
});

// Get server join info
router.get('/server-browser/join-info', (req, res) => {
  if (!serverBrowser) {
    return res.status(503).json({ error: 'Server browser not initialized' });
  }

  const info = serverBrowser.getServerInfo();

  res.json({
    ip: info.ip,
    port: info.port,
    password: info.password,
    requiresMods: info.mods.length > 0,
    mods: info.mods,
    currentPlayers: info.currentPlayers,
    maxPlayers: info.maxPlayers,
    canJoin: info.status === 'online' && info.currentPlayers < info.maxPlayers
  });
});

module.exports = {
  router,
  initializeServerBrowser
};
