import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DiscordSettings.css';

function DiscordSettings({ userRole }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [testing, setTesting] = useState(false);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get('/api/discord/config');
      setConfig(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading Discord config:', error);
      setMessage({ type: 'error', text: 'Failed to load Discord configuration' });
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await axios.put('/api/discord/config', config);
      setMessage({ type: 'success', text: 'Discord configuration saved!' });
      loadConfig();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save configuration' });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage({ type: 'info', text: 'Sending test notification...' });

    try {
      await axios.post('/api/discord/test');
      setMessage({ type: 'success', text: 'Test notification sent! Check your Discord channel.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to send test notification' });
    } finally {
      setTesting(false);
    }
  };

  const toggleNotification = (type) => {
    setConfig({
      ...config,
      notifications: {
        ...config.notifications,
        [type]: !config.notifications[type]
      }
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="discord-settings">
        <div className="page-header">
          <h2>🤖 Discord Integration</h2>
          <p>Admin access required</p>
        </div>
        <div className="alert alert-warning">
          Only administrators can configure Discord integration.
        </div>
      </div>
    );
  }

  return (
    <div className="discord-settings">
      <div className="page-header">
        <h2>🤖 Discord Integration</h2>
        <p>Configure Discord webhook notifications</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="card">
        <h3>📝 Setup Instructions</h3>
        <ol className="instructions">
          <li>
            Go to your Discord server → <strong>Server Settings</strong> → <strong>Integrations</strong>
          </li>
          <li>
            Click <strong>Webhooks</strong> → <strong>New Webhook</strong>
          </li>
          <li>
            Choose a channel (e.g., #server-status)
          </li>
          <li>
            Copy the <strong>Webhook URL</strong>
          </li>
          <li>
            Paste it below and configure notification preferences
          </li>
        </ol>
      </div>

      {/* Webhook Configuration */}
      <div className="card">
        <h3>🔗 Webhook Configuration</h3>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            />
            {' '}Enable Discord Notifications
          </label>
        </div>

        <div className="form-group">
          <label>Webhook URL</label>
          <input
            type="text"
            value={config.webhookUrl}
            onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
            placeholder="https://discord.com/api/webhooks/..."
            disabled={!config.enabled}
          />
          <small>Your Discord webhook URL (keep this secret!)</small>
        </div>

        <div className="form-group">
          <label>Mention Role ID (Optional)</label>
          <input
            type="text"
            value={config.mentionRole}
            onChange={(e) => setConfig({ ...config, mentionRole: e.target.value })}
            placeholder="123456789012345678"
            disabled={!config.enabled}
          />
          <small>Discord role ID to mention for critical events (@everyone if empty)</small>
        </div>

        <div className="button-group">
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Save Configuration
          </button>
          <button
            className="btn btn-info"
            onClick={handleTest}
            disabled={!config.enabled || !config.webhookUrl || testing}
          >
            {testing ? '⏳ Testing...' : '🧪 Send Test Notification'}
          </button>
        </div>
      </div>

      {/* Notification Types */}
      <div className="card">
        <h3>🔔 Notification Types</h3>
        <p>Choose which events should trigger Discord notifications:</p>

        <div className="notification-grid">
          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={config.notifications.serverStart}
                onChange={() => toggleNotification('serverStart')}
                disabled={!config.enabled}
              />
              <div className="notification-info">
                <strong>🟢 Server Started</strong>
                <span>When the server starts successfully</span>
              </div>
            </label>
          </div>

          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={config.notifications.serverStop}
                onChange={() => toggleNotification('serverStop')}
                disabled={!config.enabled}
              />
              <div className="notification-info">
                <strong>🔴 Server Stopped</strong>
                <span>When the server is stopped</span>
              </div>
            </label>
          </div>

          <div className="notification-item critical">
            <label>
              <input
                type="checkbox"
                checked={config.notifications.serverCrash}
                onChange={() => toggleNotification('serverCrash')}
                disabled={!config.enabled}
              />
              <div className="notification-info">
                <strong>💥 Server Crashed</strong>
                <span>Critical: Server has crashed (will mention role)</span>
              </div>
            </label>
          </div>

          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={config.notifications.playerJoin}
                onChange={() => toggleNotification('playerJoin')}
                disabled={!config.enabled}
              />
              <div className="notification-info">
                <strong>👋 Player Joined</strong>
                <span>When a player joins the server</span>
              </div>
            </label>
          </div>

          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={config.notifications.playerLeave}
                onChange={() => toggleNotification('playerLeave')}
                disabled={!config.enabled}
              />
              <div className="notification-info">
                <strong>👋 Player Left</strong>
                <span>When a player leaves the server</span>
              </div>
            </label>
          </div>

          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={config.notifications.playerKick}
                onChange={() => toggleNotification('playerKick')}
                disabled={!config.enabled}
              />
              <div className="notification-info">
                <strong>👢 Player Kicked</strong>
                <span>When a player is kicked</span>
              </div>
            </label>
          </div>

          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={config.notifications.playerBan}
                onChange={() => toggleNotification('playerBan')}
                disabled={!config.enabled}
              />
              <div className="notification-info">
                <strong>🚫 Player Banned</strong>
                <span>When a player is banned</span>
              </div>
            </label>
          </div>

          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={config.notifications.taskComplete}
                onChange={() => toggleNotification('taskComplete')}
                disabled={!config.enabled}
              />
              <div className="notification-info">
                <strong>✅ Task Completed</strong>
                <span>When a scheduled task completes</span>
              </div>
            </label>
          </div>

          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={config.notifications.taskFailed}
                onChange={() => toggleNotification('taskFailed')}
                disabled={!config.enabled}
              />
              <div className="notification-info">
                <strong>❌ Task Failed</strong>
                <span>When a scheduled task fails</span>
              </div>
            </label>
          </div>

          <div className="notification-item">
            <label>
              <input
                type="checkbox"
                checked={config.notifications.backupComplete}
                onChange={() => toggleNotification('backupComplete')}
                disabled={!config.enabled}
              />
              <div className="notification-info">
                <strong>💾 Backup Complete</strong>
                <span>When a backup is created</span>
              </div>
            </label>
          </div>
        </div>

        <div className="button-group" style={{ marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Save Notification Settings
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="card">
        <h3>👁️ Notification Preview</h3>
        <p>Example of how notifications will appear in Discord:</p>

        <div className="discord-preview">
          <div className="webhook-message">
            <img
              src="https://i.imgur.com/AfFp7pu.png"
              alt="Bot Avatar"
              className="bot-avatar"
            />
            <div className="message-content">
              <div className="bot-name">Arma Reforger Server</div>
              <div className="embed success">
                <div className="embed-color"></div>
                <div className="embed-content">
                  <div className="embed-title">🟢 Server Started</div>
                  <div className="embed-description">The Arma Reforger server has started successfully</div>
                  <div className="embed-fields">
                    <div className="embed-field">
                      <div className="field-name">Server Name</div>
                      <div className="field-value">My Arma Server</div>
                    </div>
                    <div className="embed-field">
                      <div className="field-name">Port</div>
                      <div className="field-value">2001</div>
                    </div>
                  </div>
                  <div className="embed-footer">Arma Reforger Server Manager</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiscordSettings;
