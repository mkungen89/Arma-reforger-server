import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Configuration() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get('/api/config');
      setConfig(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading config:', error);
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig({ ...config, [field]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setMessage(null);

    try {
      await axios.put('/api/config', config);
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
      setHasChanges(false);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save configuration',
      });
    }
  };

  const handleReset = () => {
    loadConfig();
    setHasChanges(false);
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Configuration</h2>
        <p>Manage server settings and paths</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      {hasChanges && (
        <div className="alert alert-warning">
          <span>⚠️ You have unsaved changes. Click "Save Configuration" to apply them.</span>
        </div>
      )}

      <div className="card">
        <h3>Server Paths</h3>
        <div style={{ marginTop: '15px' }}>
          <div className="form-group">
            <label>Server Installation Path</label>
            <input
              type="text"
              value={config?.serverPath || ''}
              onChange={(e) => handleChange('serverPath', e.target.value)}
            />
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '5px' }}>
              Path where Arma Reforger server files are installed
            </div>
          </div>

          <div className="form-group">
            <label>SteamCMD Path</label>
            <input
              type="text"
              value={config?.steamCmdPath || ''}
              onChange={(e) => handleChange('steamCmdPath', e.target.value)}
            />
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '5px' }}>
              Path to SteamCMD installation
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Server Settings</h3>
        <div style={{ marginTop: '15px' }}>
          <div className="form-group">
            <label>Server Name</label>
            <input
              type="text"
              value={config?.serverName || ''}
              onChange={(e) => handleChange('serverName', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Max Players</label>
            <input
              type="number"
              min="1"
              max="64"
              value={config?.maxPlayers || 32}
              onChange={(e) => handleChange('maxPlayers', parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Server Password (optional)</label>
            <input
              type="password"
              value={config?.password || ''}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Leave empty for public server"
            />
          </div>

          <div className="form-group">
            <label>Admin Password</label>
            <input
              type="password"
              value={config?.adminPassword || ''}
              onChange={(e) => handleChange('adminPassword', e.target.value)}
            />
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '5px' }}>
              Used for in-game admin authentication
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Network Settings</h3>
        <div style={{ marginTop: '15px' }}>
          <div className="form-group">
            <label>Server Port</label>
            <input
              type="number"
              min="1024"
              max="65535"
              value={config?.serverPort || 2001}
              onChange={(e) => handleChange('serverPort', parseInt(e.target.value))}
            />
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '5px' }}>
              UDP port for game server (default: 2001)
            </div>
          </div>

          <div className="form-group">
            <label>Web UI Port</label>
            <input
              type="number"
              min="1024"
              max="65535"
              value={config?.webUIPort || 3001}
              onChange={(e) => handleChange('webUIPort', parseInt(e.target.value))}
            />
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '5px' }}>
              HTTP port for this web interface (requires restart)
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button
          className="btn btn-success"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          💾 Save Configuration
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={!hasChanges}
        >
          ↺ Reset Changes
        </button>
      </div>

      <div className="alert alert-info" style={{ marginTop: '20px' }}>
        <span>
          ℹ️ Note: Changes to network ports require a server restart to take effect.
        </span>
      </div>
    </div>
  );
}

export default Configuration;
