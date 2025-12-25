import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './PlayerManagement.css';

function PlayerManagement({ userRole }) {
  const [activePlayers, setActivePlayers] = useState([]);
  const [bannedPlayers, setBannedPlayers] = useState([]);
  const [playerHistory, setPlayerHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Modals
  const [showKickModal, setShowKickModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Form data
  const [kickReason, setKickReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState(0); // 0 = permanent
  const [playerMessage, setPlayerMessage] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const canModerate = userRole === 'admin' || userRole === 'gm';

  const loadData = useCallback(async () => {
    try {
      const [playersRes, statsRes] = await Promise.all([
        axios.get('/api/players/active'),
        axios.get('/api/players/stats/summary')
      ]);

      setActivePlayers(playersRes.data.players || []);
      setStats(statsRes.data);

      if (activeTab === 'banned') {
        const bannedRes = await axios.get('/api/players/banned/list');
        setBannedPlayers(bannedRes.data.players || []);
      } else if (activeTab === 'history') {
        const historyRes = await axios.get('/api/players/history/all?limit=50');
        setPlayerHistory(historyRes.data.history || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading player data:', error);
      setMessage({ type: 'error', text: 'Failed to load player data' });
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [loadData]);

  const handleWarn = async (player) => {
    const reason = prompt(`Warn ${player.playerName}?\n\nEnter reason:`);
    if (!reason) return;

    try {
      await axios.post(`/api/players/${player.steamId}/warn`, { reason });
      setMessage({ type: 'success', text: `Warning issued to ${player.playerName}` });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to warn player' });
    }
  };

  const handleKick = async () => {
    if (!selectedPlayer) return;

    try {
      await axios.post(`/api/players/${selectedPlayer.steamId}/kick`, {
        reason: kickReason || 'Kicked by admin'
      });
      setMessage({ type: 'success', text: `${selectedPlayer.playerName} has been kicked` });
      setShowKickModal(false);
      setKickReason('');
      setSelectedPlayer(null);
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to kick player' });
    }
  };

  const handleBan = async () => {
    if (!selectedPlayer) return;

    try {
      await axios.post(`/api/players/${selectedPlayer.steamId}/ban`, {
        reason: banReason || 'Banned by admin',
        duration: parseInt(banDuration)
      });
      setMessage({
        type: 'success',
        text: `${selectedPlayer.playerName} has been banned ${banDuration === 0 ? 'permanently' : `for ${banDuration} hours`}`
      });
      setShowBanModal(false);
      setBanReason('');
      setBanDuration(0);
      setSelectedPlayer(null);
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to ban player' });
    }
  };

  const handleUnban = async (player) => {
    if (!window.confirm(`Unban ${player.playerName}?`)) return;

    try {
      await axios.post(`/api/players/${player.steamId}/unban`);
      setMessage({ type: 'success', text: `${player.playerName} has been unbanned` });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to unban player' });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedPlayer || !playerMessage) return;

    try {
      await axios.post(`/api/players/${selectedPlayer.steamId}/message`, {
        message: playerMessage
      });
      setMessage({ type: 'success', text: `Message sent to ${selectedPlayer.playerName}` });
      setShowMessageModal(false);
      setPlayerMessage('');
      setSelectedPlayer(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to send message' });
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage) return;

    try {
      const response = await axios.post('/api/players/broadcast', {
        message: broadcastMessage
      });
      setMessage({
        type: 'success',
        text: `Broadcast sent to ${response.data.playerCount} players`
      });
      setShowBroadcastModal(false);
      setBroadcastMessage('');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to send broadcast' });
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getPingColor = (ping) => {
    if (ping < 50) return '#4ade80';
    if (ping < 100) return '#facc15';
    if (ping < 150) return '#fb923c';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="player-management">
      <div className="page-header">
        <h2>🎮 Live Player Management</h2>
        <p>Monitor and manage players in real-time</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* Statistics Overview */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{stats.totalPlayers}</div>
            <div className="stat-label">Online Players</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-value">{stats.totalKills}</div>
            <div className="stat-label">Total Kills</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📶</div>
            <div className="stat-value">{stats.averagePing}ms</div>
            <div className="stat-label">Avg Ping</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{stats.bannedCount}</div>
            <div className="stat-label">Banned Players</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {canModerate && (
        <div className="action-bar">
          <button className="btn btn-primary" onClick={() => setShowBroadcastModal(true)}>
            📢 Broadcast Message
          </button>
          <button className="btn btn-secondary" onClick={loadData}>
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={activeTab === 'active' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('active')}
        >
          🟢 Active Players ({activePlayers.length})
        </button>
        <button
          className={activeTab === 'banned' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('banned')}
        >
          🚫 Banned Players
        </button>
        <button
          className={activeTab === 'history' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('history')}
        >
          📜 History
        </button>
      </div>

      {/* Active Players */}
      {activeTab === 'active' && (
        <div className="players-list">
          {activePlayers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">😴</div>
              <h3>No active players</h3>
              <p>Server is empty right now</p>
            </div>
          ) : (
            activePlayers.map((player) => (
              <div key={player.steamId} className="player-card">
                <div className="player-main">
                  <div className="player-info">
                    <h3>{player.playerName}</h3>
                    <span className="player-steamid">{player.steamId}</span>
                    <span className="player-duration">
                      ⏱️ {formatDuration(player.sessionDuration)}
                    </span>
                  </div>

                  <div className="player-stats">
                    <div className="stat">
                      <span className="stat-label">Score</span>
                      <span className="stat-value">{player.score}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">K/D</span>
                      <span className="stat-value">{player.kd}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Ping</span>
                      <span
                        className="stat-value"
                        style={{ color: getPingColor(player.ping) }}
                      >
                        {player.ping}ms
                      </span>
                    </div>
                  </div>
                </div>

                {player.warnings.length > 0 && (
                  <div className="player-warnings">
                    ⚠️ {player.warnings.length} warning(s)
                  </div>
                )}

                {canModerate && (
                  <div className="player-actions">
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => handleWarn(player)}
                    >
                      ⚠️ Warn
                    </button>
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => {
                        setSelectedPlayer(player);
                        setShowMessageModal(true);
                      }}
                    >
                      💬 Message
                    </button>
                    {(userRole === 'admin' || userRole === 'gm') && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          setSelectedPlayer(player);
                          setShowKickModal(true);
                        }}
                      >
                        👢 Kick
                      </button>
                    )}
                    {userRole === 'admin' && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          setSelectedPlayer(player);
                          setShowBanModal(true);
                        }}
                      >
                        🚫 Ban
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Banned Players */}
      {activeTab === 'banned' && (
        <div className="players-list">
          {bannedPlayers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>No banned players</h3>
              <p>All clean!</p>
            </div>
          ) : (
            bannedPlayers.map((ban) => (
              <div key={ban.steamId} className="ban-card">
                <div className="ban-info">
                  <h3>{ban.playerName}</h3>
                  <span className="ban-steamid">{ban.steamId}</span>
                  <p className="ban-reason">Reason: {ban.reason}</p>
                  <span className="ban-date">
                    Banned on {new Date(ban.bannedAt).toLocaleString()}
                  </span>
                  {ban.permanent ? (
                    <span className="ban-permanent">⚠️ PERMANENT</span>
                  ) : (
                    <span className="ban-expires">
                      Expires: {new Date(ban.expiresAt).toLocaleString()}
                    </span>
                  )}
                </div>
                {userRole === 'admin' && (
                  <button
                    className="btn btn-success"
                    onClick={() => handleUnban(ban)}
                  >
                    ✅ Unban
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="history-list">
          {playerHistory.map((event, index) => (
            <div key={index} className="history-item">
              <span className="history-icon">
                {event.event === 'join' && '➡️'}
                {event.event === 'leave' && '⬅️'}
                {event.event === 'kick' && '👢'}
                {event.event === 'ban' && '🚫'}
                {event.event === 'warn' && '⚠️'}
                {event.event === 'unban' && '✅'}
              </span>
              <div className="history-details">
                <strong>{event.playerName}</strong> {event.event}
                {event.reason && <span> - {event.reason}</span>}
                <span className="history-time">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kick Modal */}
      {showKickModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Kick Player</h3>
            <p>Kick {selectedPlayer?.playerName}?</p>
            <input
              type="text"
              placeholder="Reason (optional)"
              value={kickReason}
              onChange={(e) => setKickReason(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={handleKick}>
                Kick Player
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowKickModal(false);
                  setKickReason('');
                  setSelectedPlayer(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Ban Player</h3>
            <p>Ban {selectedPlayer?.playerName}?</p>
            <input
              type="text"
              placeholder="Reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
            <select
              value={banDuration}
              onChange={(e) => setBanDuration(e.target.value)}
            >
              <option value="0">Permanent</option>
              <option value="1">1 Hour</option>
              <option value="6">6 Hours</option>
              <option value="24">24 Hours</option>
              <option value="168">7 Days</option>
              <option value="720">30 Days</option>
            </select>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={handleBan}>
                Ban Player
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                  setBanDuration(0);
                  setSelectedPlayer(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Send Message</h3>
            <p>Send message to {selectedPlayer?.playerName}</p>
            <textarea
              placeholder="Your message..."
              value={playerMessage}
              onChange={(e) => setPlayerMessage(e.target.value)}
              rows="4"
            />
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleSendMessage}>
                Send Message
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowMessageModal(false);
                  setPlayerMessage('');
                  setSelectedPlayer(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Broadcast Message</h3>
            <p>Send message to all {activePlayers.length} online players</p>
            <textarea
              placeholder="Your broadcast message..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows="4"
            />
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleBroadcast}>
                Send Broadcast
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowBroadcastModal(false);
                  setBroadcastMessage('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerManagement;
