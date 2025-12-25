import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Battlelog.css';
import './BattlelogEnhanced.css';

function BattlelogEnhanced() {
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

  // New features
  const [achievements, setAchievements] = useState([]);
  const [battleReports, setBattleReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [friends, setFriends] = useState([]);
  const [platoons, setPlatoons] = useState([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadLiveFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard();
    } else if (activeTab === 'achievements') {
      loadAchievements();
    } else if (activeTab === 'reports') {
      loadBattleReports();
    } else if (activeTab === 'platoons') {
      loadPlatoons();
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

  const loadAchievements = async () => {
    try {
      const response = await axios.get('/api/achievements/definitions');
      setAchievements(response.data.achievements);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadBattleReports = async () => {
    try {
      const response = await axios.get('/api/battle-reports?limit=20');
      setBattleReports(response.data);
    } catch (error) {
      console.error('Error loading battle reports:', error);
    }
  };

  const loadPlatoons = async () => {
    try {
      const response = await axios.get('/api/social/platoons?sortBy=members');
      setPlatoons(response.data);
    } catch (error) {
      console.error('Error loading platoons:', error);
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
      const [playerRes, achievementsRes, reportsRes] = await Promise.all([
        axios.get(`/api/battlelog/player/${steamId}`),
        axios.get(`/api/achievements/player/${steamId}`),
        axios.get(`/api/battle-reports/player/${steamId}?limit=5`)
      ]);

      setSelectedPlayer({
        ...playerRes.data,
        achievements: achievementsRes.data,
        battleReports: reportsRes.data
      });
      setActiveTab('player');
    } catch (error) {
      console.error('Error loading player:', error);
    }
  };

  const viewBattleReport = async (matchId) => {
    try {
      const response = await axios.get(`/api/battle-reports/match/${matchId}`);
      setSelectedReport(response.data);
      setActiveTab('report-detail');
    } catch (error) {
      console.error('Error loading battle report:', error);
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
          <p>Arma Reforger Server Statistics & Community</p>
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
        <button
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📈 Battle Reports
        </button>
        <button
          className={`tab ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏅 Achievements
        </button>
        <button
          className={`tab ${activeTab === 'platoons' ? 'active' : ''}`}
          onClick={() => setActiveTab('platoons')}
        >
          🛡️ Platoons
        </button>
      </div>

      <div className="battlelog-content">
        {/* Overview Tab */}
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

        {/* Leaderboard Tab - Same as before */}
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

        {/* Live Feed Tab - Same as before */}
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

        {/* Continue in next file due to size... */}
      </div>
    </div>
  );
}

export default BattlelogEnhanced;
