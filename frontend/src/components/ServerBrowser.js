import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ServerBrowser.css';

function ServerBrowser() {
  const [serverInfo, setServerInfo] = useState(null);
  const [players, setPlayers] = useState([]);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinInfo, setJoinInfo] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    loadServerData();
    const interval = setInterval(loadServerData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadServerData = async () => {
    try {
      const [infoRes, playersRes, rulesRes] = await Promise.all([
        axios.get('/api/server-browser/info'),
        axios.get('/api/server-browser/players'),
        axios.get('/api/server-browser/rules')
      ]);

      setServerInfo(infoRes.data);
      setPlayers(playersRes.data);
      setRules(rulesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading server data:', error);
      setLoading(false);
    }
  };

  const handleJoinServer = async () => {
    try {
      const response = await axios.get('/api/server-browser/join-info');
      setJoinInfo(response.data);
      setShowJoinModal(true);
    } catch (error) {
      console.error('Error getting join info:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#4ade80';
      case 'starting':
        return '#fb923c';
      case 'offline':
      case 'stopped':
        return '#ef4444';
      default:
        return '#718096';
    }
  };

  const formatUptime = (ms) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="server-browser-loading">
        <div className="spinner"></div>
        <p>Loading server information...</p>
      </div>
    );
  }

  return (
    <div className="server-browser-container">
      <div className="server-browser-header">
        <h1>🌐 Server Browser</h1>
        <p>Join the battle now!</p>
      </div>

      {serverInfo && (
        <div className="server-info-card">
          <div className="server-header-section">
            <div className="server-main-info">
              <div className="server-name-section">
                <h2>{serverInfo.name}</h2>
                <div
                  className="server-status-indicator"
                  style={{ backgroundColor: getStatusColor(serverInfo.status) }}
                >
                  <span className="status-dot"></span>
                  {serverInfo.status.toUpperCase()}
                </div>
              </div>
              <p className="server-description">{serverInfo.description}</p>
            </div>

            <div className="server-join-section">
              <div className="player-count">
                <span className="current-players">{serverInfo.currentPlayers}</span>
                <span className="separator">/</span>
                <span className="max-players">{serverInfo.maxPlayers}</span>
              </div>
              <button
                className={`btn-join ${serverInfo.status !== 'online' ? 'disabled' : ''}`}
                onClick={handleJoinServer}
                disabled={serverInfo.status !== 'online'}
              >
                {serverInfo.status === 'online' ? '🎮 JOIN SERVER' : 'SERVER OFFLINE'}
              </button>
            </div>
          </div>

          <div className="server-details-grid">
            <div className="detail-item">
              <span className="detail-icon">🗺️</span>
              <div>
                <div className="detail-label">Map</div>
                <div className="detail-value">{serverInfo.map}</div>
              </div>
            </div>
            <div className="detail-item">
              <span className="detail-icon">🎯</span>
              <div>
                <div className="detail-label">Scenario</div>
                <div className="detail-value">{serverInfo.scenario}</div>
              </div>
            </div>
            <div className="detail-item">
              <span className="detail-icon">⏱️</span>
              <div>
                <div className="detail-label">Uptime</div>
                <div className="detail-value">{formatUptime(serverInfo.uptime)}</div>
              </div>
            </div>
            <div className="detail-item">
              <span className="detail-icon">📡</span>
              <div>
                <div className="detail-label">Ping</div>
                <div className="detail-value">{serverInfo.ping}ms</div>
              </div>
            </div>
          </div>

          {serverInfo.settings.modded && serverInfo.mods.length > 0 && (
            <div className="server-mods-section">
              <h3>🔧 Required Mods ({serverInfo.mods.length})</h3>
              <div className="mods-list-browser">
                {serverInfo.mods.slice(0, 5).map((mod, index) => (
                  <div key={index} className="mod-badge-browser">
                    {mod.name}
                  </div>
                ))}
                {serverInfo.mods.length > 5 && (
                  <div className="mod-badge-browser more">
                    +{serverInfo.mods.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Server Rules */}
      {rules && (
        <div className="server-rules-card">
          <h3>⚙️ Server Settings</h3>
          <div className="rules-grid">
            <div className="rule-item">
              <span>Difficulty:</span>
              <strong>{rules.difficulty}</strong>
            </div>
            <div className="rule-item">
              <span>Time Limit:</span>
              <strong>{rules.timeLimit} min</strong>
            </div>
            <div className="rule-item">
              <span>Score Limit:</span>
              <strong>{rules.scoreLimit}</strong>
            </div>
            <div className="rule-item">
              <span>Friendly Fire:</span>
              <strong>{rules.friendly ? 'ON' : 'OFF'}</strong>
            </div>
            <div className="rule-item">
              <span>BattleEye:</span>
              <strong>{rules.battleEye ? 'Enabled' : 'Disabled'}</strong>
            </div>
            <div className="rule-item">
              <span>Cross-Platform:</span>
              <strong>{rules.crossPlatform ? 'Yes' : 'No'}</strong>
            </div>
            <div className="rule-item">
              <span>Max Ping:</span>
              <strong>{rules.maxPing}ms</strong>
            </div>
            <div className="rule-item">
              <span>Region:</span>
              <strong>{rules.region}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Players List */}
      <div className="players-list-card">
        <h3>👥 Players Online ({players.length})</h3>
        {players.length === 0 ? (
          <div className="no-players">
            <span>No players currently online</span>
          </div>
        ) : (
          <div className="players-table">
            <div className="players-table-header">
              <div className="col-name">Player</div>
              <div className="col-rank">Rank</div>
              <div className="col-score">Score</div>
              <div className="col-kd">K/D</div>
              <div className="col-ping">Ping</div>
            </div>
            {players.map((player, index) => (
              <div key={index} className="player-row">
                <div className="col-name">
                  <span className="player-name">{player.name}</span>
                  <span className="player-team">{player.team}</span>
                </div>
                <div className="col-rank">
                  <span className="rank-badge">⭐ {player.rank}</span>
                </div>
                <div className="col-score">{player.score.toLocaleString()}</div>
                <div className="col-kd">
                  {player.deaths > 0
                    ? (player.kills / player.deaths).toFixed(2)
                    : player.kills}
                </div>
                <div className="col-ping">
                  <span className={`ping-indicator ${player.ping > 100 ? 'high' : 'low'}`}>
                    {player.ping}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join Modal */}
      {showJoinModal && joinInfo && (
        <div className="modal">
          <div className="modal-content">
            <h3>🎮 Join Server</h3>

            {joinInfo.canJoin ? (
              <div className="join-info">
                <div className="join-detail">
                  <strong>Server IP:</strong>
                  <code>{joinInfo.ip}:{joinInfo.port}</code>
                </div>

                {joinInfo.requiresMods && (
                  <div className="join-warning">
                    ⚠️ This server requires {joinInfo.mods.length} mods to be installed
                  </div>
                )}

                <div className="join-instructions">
                  <h4>How to Join:</h4>
                  <ol>
                    <li>Open Arma Reforger</li>
                    <li>Go to "Multiplayer" → "Server Browser"</li>
                    <li>Click "Direct Connect"</li>
                    <li>Enter IP: <strong>{joinInfo.ip}:{joinInfo.port}</strong></li>
                    {joinInfo.password && <li>Enter password when prompted</li>}
                    <li>Click "Connect"</li>
                  </ol>
                </div>

                <div className="quick-copy">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(`${joinInfo.ip}:${joinInfo.port}`);
                      alert('Server address copied to clipboard!');
                    }}
                  >
                    📋 Copy Server Address
                  </button>
                </div>
              </div>
            ) : (
              <div className="join-error">
                <span className="error-icon">❌</span>
                <p>
                  {serverInfo?.status !== 'online'
                    ? 'Server is currently offline'
                    : 'Server is full'}
                </p>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServerBrowser;
