import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard({ serverStatus }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/status');
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Server overview and system monitoring</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Server Status</span>
            <span className="stat-card-icon">🎮</span>
          </div>
          <div className="stat-card-value">{serverStatus.toUpperCase()}</div>
          <div className="stat-card-label">
            {stats?.pid ? `PID: ${stats.pid}` : 'Not running'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Uptime</span>
            <span className="stat-card-icon">⏱️</span>
          </div>
          <div className="stat-card-value">
            {serverStatus === 'running' ? formatUptime(stats?.uptime || 0) : '0m'}
          </div>
          <div className="stat-card-label">Server running time</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">CPU Load</span>
            <span className="stat-card-icon">💻</span>
          </div>
          <div className="stat-card-value">
            {stats?.system?.cpu?.currentLoad?.toFixed(1) || '0'}%
          </div>
          <div className="stat-card-label">Current CPU usage</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Memory</span>
            <span className="stat-card-icon">🧠</span>
          </div>
          <div className="stat-card-value">
            {stats?.system?.mem
              ? ((stats.system.mem.used / stats.system.mem.total) * 100).toFixed(1)
              : '0'}%
          </div>
          <div className="stat-card-label">
            {stats?.system?.mem
              ? `${formatBytes(stats.system.mem.used)} / ${formatBytes(stats.system.mem.total)}`
              : 'N/A'}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>System Information</h3>
        {stats?.system?.disk && stats.system.disk.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <h4 style={{ fontSize: '14px', color: '#718096', marginBottom: '10px' }}>
              Disk Usage
            </h4>
            {stats.system.disk.map((disk, idx) => (
              <div key={idx} style={{ marginBottom: '15px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '5px',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: '#cbd5e0' }}>{disk.mount}</span>
                  <span style={{ color: '#718096' }}>
                    {formatBytes(disk.used)} / {formatBytes(disk.size)}
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    background: '#2d3748',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${disk.use}%`,
                      height: '100%',
                      background:
                        disk.use > 90
                          ? '#ef4444'
                          : disk.use > 75
                          ? '#f59e0b'
                          : '#10b981',
                      transition: 'width 0.3s',
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Configuration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginTop: '15px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '5px' }}>Server Name</div>
            <div style={{ fontSize: '14px', color: '#e8e8e8' }}>{stats?.config?.serverName || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '5px' }}>Max Players</div>
            <div style={{ fontSize: '14px', color: '#e8e8e8' }}>{stats?.config?.maxPlayers || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '5px' }}>Server Port</div>
            <div style={{ fontSize: '14px', color: '#e8e8e8' }}>{stats?.config?.serverPort || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '5px' }}>Web UI Port</div>
            <div style={{ fontSize: '14px', color: '#e8e8e8' }}>{stats?.config?.webUIPort || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
