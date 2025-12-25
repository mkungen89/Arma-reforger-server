const fs = require('fs');
const path = require('path');
const { Tail } = require('tail');
const axios = require('axios');
const { getInternalApiKey } = require('./internalApiKey');

/**
 * Battlelog Integration Module
 * Automatically collects data from Arma Reforger server logs and events
 * Integrates with battlelog.js to track all player actions in real-time
 */

class BattlelogIntegration {
  constructor(serverManager, battlelogRouter) {
    this.serverManager = serverManager;
    this.battlelogRouter = battlelogRouter;
    this.logWatcher = null;
    this.currentMatch = null;
    this.activePlayers = new Map();
    this.logPath = path.join(__dirname, '../server/profile/console.log');

    // Event patterns for log parsing
    this.patterns = {
      playerJoin: /Player '(.+?)' \(ID: (\d+), GUID: ([A-F0-9]+)\) connected/i,
      playerLeave: /Player '(.+?)' \(ID: (\d+)\) disconnected/i,
      playerKill: /Player '(.+?)' killed '(.+?)' with (.+?)( \(headshot\))?( at (\d+)m)?/i,
      matchStart: /Mission '(.+?)' started on '(.+?)'/i,
      matchEnd: /Mission ended/i,
      chat: /\[CHAT\] (.+?): (.+)/i
    };

    this.setupEventListeners();
  }

  // Start monitoring server logs
  startLogMonitoring() {
    if (!fs.existsSync(this.logPath)) {
      console.log('Server log file not found, waiting for server to start...');
      return;
    }

    try {
      this.logWatcher = new Tail(this.logPath, {
        fromBeginning: false,
        follow: true,
        useWatchFile: true
      });

      this.logWatcher.on('line', (line) => {
        this.parseLogLine(line);
      });

      this.logWatcher.on('error', (error) => {
        console.error('Log watcher error:', error);
      });

      console.log('Battlelog integration: Log monitoring started');
    } catch (error) {
      console.error('Failed to start log monitoring:', error);
    }
  }

  // Stop monitoring logs
  stopLogMonitoring() {
    if (this.logWatcher) {
      this.logWatcher.unwatch();
      this.logWatcher = null;
      console.log('Battlelog integration: Log monitoring stopped');
    }
  }

  // Parse individual log lines
  parseLogLine(line) {
    // Player Join
    let match = line.match(this.patterns.playerJoin);
    if (match) {
      this.handlePlayerJoin({
        displayName: match[1],
        playerId: match[2],
        steamId: match[3]
      });
      return;
    }

    // Player Leave
    match = line.match(this.patterns.playerLeave);
    if (match) {
      this.handlePlayerLeave({
        displayName: match[1],
        playerId: match[2]
      });
      return;
    }

    // Player Kill
    match = line.match(this.patterns.playerKill);
    if (match) {
      this.handlePlayerKill({
        killerName: match[1],
        victimName: match[2],
        weapon: match[3],
        headshot: !!match[4],
        distance: match[6] ? parseInt(match[6]) : 0
      });
      return;
    }

    // Match Start
    match = line.match(this.patterns.matchStart);
    if (match) {
      this.handleMatchStart({
        scenario: match[1],
        map: match[2]
      });
      return;
    }

    // Match End
    if (line.match(this.patterns.matchEnd)) {
      this.handleMatchEnd();
      return;
    }

    // Chat message
    match = line.match(this.patterns.chat);
    if (match) {
      this.handleChatMessage({
        playerName: match[1],
        message: match[2]
      });
      return;
    }
  }

  // Setup event listeners from server manager
  setupEventListeners() {
    // Listen to server events if serverManager is available
    if (this.serverManager) {
      this.serverManager.on('playerConnected', (data) => {
        this.handlePlayerJoin(data);
      });

      this.serverManager.on('playerDisconnected', (data) => {
        this.handlePlayerLeave(data);
      });

      this.serverManager.on('playerKilled', (data) => {
        this.handlePlayerKill(data);
      });

      this.serverManager.on('matchStarted', (data) => {
        this.handleMatchStart(data);
      });

      this.serverManager.on('matchEnded', (data) => {
        this.handleMatchEnd(data);
      });
    }
  }

  // Handle player join event
  async handlePlayerJoin(data) {
    const { displayName, steamId, playerId } = data;

    console.log(`[Battlelog] Player joined: ${displayName} (${steamId})`);

    this.activePlayers.set(steamId || playerId, {
      displayName,
      steamId: steamId || `player_${playerId}`,
      playerId,
      joinedAt: new Date(),
      kills: 0,
      deaths: 0,
      score: 0
    });

    try {
      await axios.post('http://localhost:3001/api/battlelog/player/join', {
        steamId: steamId || `player_${playerId}`,
        displayName
      }, { headers: { 'x-internal-api-key': getInternalApiKey() } });
    } catch (error) {
      console.error('Error recording player join:', error.message);
    }
  }

  // Handle player leave event
  async handlePlayerLeave(data) {
    const { displayName, steamId, playerId } = data;
    const playerKey = steamId || playerId;
    const playerData = this.activePlayers.get(playerKey);

    console.log(`[Battlelog] Player left: ${displayName}`);

    if (playerData) {
      try {
        await axios.post('http://localhost:3001/api/battlelog/player/leave', {
          steamId: playerData.steamId,
          displayName: playerData.displayName
        }, { headers: { 'x-internal-api-key': getInternalApiKey() } });
      } catch (error) {
        console.error('Error recording player leave:', error.message);
      }

      this.activePlayers.delete(playerKey);
    }
  }

  // Handle player kill event
  async handlePlayerKill(data) {
    const { killerName, victimName, weapon, headshot, distance } = data;

    // Find killer and victim in active players
    let killer = null;
    let victim = null;

    for (const [key, player] of this.activePlayers.entries()) {
      if (player.displayName === killerName) {
        killer = player;
        killer.kills++;
        killer.score += headshot ? 150 : 100;
      }
      if (player.displayName === victimName) {
        victim = player;
        victim.deaths++;
      }
    }

    console.log(`[Battlelog] Kill: ${killerName} -> ${victimName} (${weapon})`);

    if (killer && victim) {
      try {
        await axios.post('http://localhost:3001/api/battlelog/event/kill', {
          killerSteamId: killer.steamId,
          killerName: killer.displayName,
          victimSteamId: victim.steamId,
          victimName: victim.displayName,
          weapon: weapon || 'Unknown',
          headshot: headshot || false,
          distance: distance || 0
        }, { headers: { 'x-internal-api-key': getInternalApiKey() } });
      } catch (error) {
        console.error('Error recording kill:', error.message);
      }
    }
  }

  // Handle match start event
  async handleMatchStart(data) {
    const { scenario, map } = data;

    console.log(`[Battlelog] Match started: ${scenario} on ${map}`);

    try {
      const response = await axios.post('http://localhost:3001/api/battlelog/match/start', {
        scenario: scenario || 'Unknown Scenario',
        map: map || 'Unknown Map',
        maxPlayers: 64
      }, { headers: { 'x-internal-api-key': getInternalApiKey() } });

      this.currentMatch = response.data.match;
    } catch (error) {
      console.error('Error recording match start:', error.message);
    }
  }

  // Handle match end event
  async handleMatchEnd(data = {}) {
    if (!this.currentMatch) return;

    console.log('[Battlelog] Match ended');

    const players = Array.from(this.activePlayers.values()).map(p => ({
      steamId: p.steamId,
      displayName: p.displayName,
      kills: p.kills,
      deaths: p.deaths,
      score: p.score,
      won: false // Can be determined by game logic
    }));

    try {
      await axios.post('http://localhost:3001/api/battlelog/match/end', {
        matchId: this.currentMatch.id,
        winner: data.winner || null,
        players
      }, { headers: { 'x-internal-api-key': getInternalApiKey() } });

      // Reset player match stats
      for (const [key, player] of this.activePlayers.entries()) {
        player.kills = 0;
        player.deaths = 0;
        player.score = 0;
      }

      this.currentMatch = null;
    } catch (error) {
      console.error('Error recording match end:', error.message);
    }
  }

  // Handle chat messages
  handleChatMessage(data) {
    // Can be used for achievements (e.g., "gg" after match)
    console.log(`[Battlelog] Chat: ${data.playerName}: ${data.message}`);
  }

  // Get current active players
  getActivePlayers() {
    return Array.from(this.activePlayers.values());
  }

  // Get current match info
  getCurrentMatch() {
    return this.currentMatch;
  }
}

module.exports = BattlelogIntegration;
