import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Battlelog.css';

function Battlelog() {
  const [overview, setOverview] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [sortBy, setSortBy] = useState('score');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadLiveFeed, 5000); // Update feed every 5 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard();
    }
  }, [sortBy, activeTab]);

  const loadData = async () => {
    try {
      const [overviewRes, feedRes, matchesRes] = await Promise.all([
        axios.get('/api/battlelog/overview'),
        axios.get('/api/battlelog/feed?limit=30'),
        axios.get('/api/battlelog/matches?limit=10')
      ]);

      setOverview(overviewRes.data);
      setLiveFeed(feedRes.data);
      setRecentMatches(matchesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading battlelog data:', error);
      setLoading(false);
    }
  };

  const loadLiveFeed = async () => {
    try {
      const response = await axios.get('/api/battlelog/feed?limit=30');
      setLiveFeed(response.data);
    } catch (error) {
      console.error('Error loading live feed:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await axios.get(`/api/battlelog/leaderboard?sortBy=${sortBy}&limit=100`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`/api/battlelog/search?q=${searchQuery}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const loadPlayerProfile = async (steamId) => {
    try {
      const response = await axios.get(`/api/battlelog/player/${steamId}`);
      setSelectedPlayer(response.data);
      setActiveTab('player');
    } catch (error) {
      console.error('Error loading player:', error);
    }
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'kill': return '💀';
      case 'player_join': return '🟢';
      case 'player_leave': return '🔴';
      case 'match_start': return '🎮';
      case 'match_end': return '🏆';
      default: return '📋';
    }
  };

  const getRankBadge = (rankInfo) => {
    const colors = {
      'Recruit': '#8b7355',
      'Private': '#6b8e23',
      'Corporal': '#4682b4',
      'Sergeant': '#9370db',
      'Staff Sergeant': '#ff8c00',
      'Master Sergeant': '#ff6347',
      'Lieutenant': '#ffd700',
      'Captain': '#ff4500',
      'Major': '#dc143c',
      'Colonel': '#8b0000'
    };

    return (
      <span
        className="rank-badge"
        style={{ background: colors[rankInfo.name] || '#4682b4' }}
      >
        ⭐ {rankInfo.level} - {rankInfo.name}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="battlelog-loading">
        <div className="spinner"></div>
        <p>Loading Battlelog...</p>
      </div>
    );
  }

  return (
    <div className="battlelog-container">
      <div className="battlelog-header">
        <div className="battlelog-logo">
          <h1>🎯 BATTLELOG</h1>
          <p>Arma Reforger Server Statistics</p>
        </div>

        <div className="battlelog-search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch();
            }}
            placeholder="Search players..."
            className="search-input"
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((player) => (
                <div
                  key={player.steamId}
                  className="search-result-item"
                  onClick={() => {
                    loadPlayerProfile(player.steamId);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                >
                  <div className="player-name">{player.displayName}</div>
                  <div className="player-stats-small">
                    {getRankBadge(player.rank)} | Score: {player.stats.score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="battlelog-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
        <button
          className={`tab ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          📡 Live Feed
        </button>
        <button
          className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          🎮 Matches
        </button>
      </div>

      <div className="battlelog-content">
        {activeTab === 'overview' && overview && (
          <div className="overview-tab">
            <div className="stats-cards">
              <div className="stat-card-bl">
                <div className="stat-icon">👥</div>
                <div className="stat-value">{overview.totalPlayers}</div>
                <div className="stat-label">Total Players</div>
              </div>
              <div className="stat-card-bl">
                <div className="stat-icon">🟢</div>
                <div className="stat-value">{overview.onlinePlayers}</div>
                <div className="stat-label">Online Now</div>
              </div>
              <div className="stat-card-bl">
                <div className="stat-icon">💀</div>
                <div className="stat-value">{overview.stats.totalKills.toLocaleString()}</div>
                <div className="stat-label">Total Kills</div>
              </div>
              <div className="stat-card-bl">
                <div className="stat-icon">🎮</div>
                <div className="stat-value">{overview.stats.totalMatches}</div>
                <div className="stat-label">Matches Played</div>
              </div>
            </div>

            <div className="top-players-section">
              <h2>🏆 Top 10 Players</h2>
              <div className="top-players-list">
                {overview.topPlayers.map((player, index) => (
                  <div
                    key={player.steamId}
                    className="top-player-card"
                    onClick={() => loadPlayerProfile(player.steamId)}
                  >
                    <div className="player-rank-number">#{index + 1}</div>
                    <div className="player-info">
                      <div className="player-name-top">{player.displayName}</div>
                      {getRankBadge(player.rank)}
                    </div>
                    <div className="player-stats-top">
                      <div>Score: <strong>{player.score.toLocaleString()}</strong></div>
                      <div>K/D: <strong>{player.kd}</strong></div>
                      <div>Kills: <strong>{player.kills}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="recent-activity">
              <h2>📡 Recent Activity</h2>
              <div className="activity-feed">
                {overview.recentEvents.slice(0, 10).map((event) => (
                  <div key={event.id} className="activity-item">
                    <span className="event-icon">{getEventIcon(event.type)}</span>
                    <span className="event-message">{event.message}</span>
                    <span className="event-time">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="leaderboard-tab">
            <div className="leaderboard-controls">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="score">Score</option>
                <option value="kills">Kills</option>
                <option value="kd">K/D Ratio</option>
                <option value="wins">Wins</option>
                <option value="playtime">Playtime</option>
              </select>
            </div>

            <div className="leaderboard-table">
              <div className="leaderboard-header">
                <div className="lb-rank">#</div>
                <div className="lb-player">Player</div>
                <div className="lb-rank-badge">Rank</div>
                <div className="lb-score">Score</div>
                <div className="lb-kd">K/D</div>
                <div className="lb-kills">Kills</div>
                <div className="lb-deaths">Deaths</div>
                <div className="lb-wins">Wins</div>
              </div>

              {leaderboard.map((player) => (
                <div
                  key={player.steamId}
                  className="leaderboard-row"
                  onClick={() => loadPlayerProfile(player.steamId)}
                >
                  <div className="lb-rank">{player.rank}</div>
                  <div className="lb-player">{player.displayName}</div>
                  <div className="lb-rank-badge">{getRankBadge(player.rankInfo)}</div>
                  <div className="lb-score">{player.stats.score.toLocaleString()}</div>
                  <div className="lb-kd">{player.kd}</div>
                  <div className="lb-kills">{player.stats.kills}</div>
                  <div className="lb-deaths">{player.stats.deaths}</div>
                  <div className="lb-wins">{player.stats.wins}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <div className="live-feed-tab">
            <h2>📡 Live Activity Feed</h2>
            <div className="live-feed">
              {liveFeed.map((event) => (
                <div key={event.id} className={`feed-item ${event.type}`}>
                  <div className="feed-icon">{getEventIcon(event.type)}</div>
                  <div className="feed-content">
                    <div className="feed-message">{event.message}</div>
                    {event.type === 'kill' && (
                      <div className="feed-details">
                        <span className="weapon">🔫 {event.weapon}</span>
                        {event.headshot && <span className="headshot">🎯 HEADSHOT</span>}
                        {event.distance > 0 && <span className="distance">📏 {event.distance}m</span>}
                      </div>
                    )}
                    <div className="feed-time">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="matches-tab">
            <h2>🎮 Recent Matches</h2>
            <div className="matches-list">
              {recentMatches.map((match) => (
                <div key={match.id} className="match-card">
                  <div className="match-header">
                    <div className="match-scenario">{match.scenario}</div>
                    <div className="match-map">📍 {match.map}</div>
                  </div>
                  <div className="match-details">
                    <div>Duration: {formatDuration(match.duration)}</div>
                    <div>Players: {match.players?.length || 0}/{match.maxPlayers}</div>
                    {match.winner && <div>Winner: 🏆 {match.winner}</div>}
                  </div>
                  <div className="match-time">
                    {new Date(match.endedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'player' && selectedPlayer && (
          <div className="player-profile-tab">
            <div className="profile-header">
              <div className="profile-name-section">
                <h1>{selectedPlayer.displayName}</h1>
                {getRankBadge(selectedPlayer.rankInfo)}
              </div>
              <div className="profile-xp">
                XP: {selectedPlayer.xp} / {selectedPlayer.rankInfo.level < 10 ? '4500' : 'MAX'}
              </div>
            </div>

            <div className="profile-stats-grid">
              <div className="profile-stat">
                <div className="stat-label">Score</div>
                <div className="stat-value-large">{selectedPlayer.stats.score.toLocaleString()}</div>
              </div>
              <div className="profile-stat">
                <div className="stat-label">K/D Ratio</div>
                <div className="stat-value-large">{selectedPlayer.kd}</div>
              </div>
              <div className="profile-stat">
                <div className="stat-label">Kills</div>
                <div className="stat-value-large">{selectedPlayer.stats.kills}</div>
              </div>
              <div className="profile-stat">
                <div className="stat-label">Deaths</div>
                <div className="stat-value-large">{selectedPlayer.stats.deaths}</div>
              </div>
              <div className="profile-stat">
                <div className="stat-label">Headshots</div>
                <div className="stat-value-large">{selectedPlayer.stats.headshots}</div>
              </div>
              <div className="profile-stat">
                <div className="stat-label">Longest Killstreak</div>
                <div className="stat-value-large">{selectedPlayer.stats.longestKillstreak}</div>
              </div>
            </div>

            <div className="profile-section">
              <h3>📊 Weapon Stats</h3>
              <div className="weapon-stats">
                {Object.entries(selectedPlayer.weapons || {}).map(([weapon, stats]) => (
                  <div key={weapon} className="weapon-stat-item">
                    <div className="weapon-name">🔫 {weapon}</div>
                    <div className="weapon-kills">Kills: {stats.kills}</div>
                    <div className="weapon-headshots">Headshots: {stats.headshots}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-section">
              <h3>📡 Recent Activity</h3>
              <div className="profile-events">
                {selectedPlayer.recentEvents.slice(0, 20).map((event) => (
                  <div key={event.id} className="profile-event-item">
                    <span className="event-icon">{getEventIcon(event.type)}</span>
                    <span className="event-text">{event.message}</span>
                    <span className="event-time">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Battlelog;
