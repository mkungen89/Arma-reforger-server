import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Configuration.css';

function Configuration() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

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
      setMessage({ type: 'success', text: 'Configuration saved successfully. Restart server for changes to take effect.' });
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
    <div className="configuration-page">
      <div className="page-header">
        <h2>Server Configuration</h2>
        <p>Manage Arma Reforger server settings and parameters</p>
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

      {/* Tabs */}
      <div className="config-tabs">
        <button
          className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Settings
        </button>
        <button
          className={`tab-button ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          Network & Ports
        </button>
        <button
          className={`tab-button ${activeTab === 'game' ? 'active' : ''}`}
          onClick={() => setActiveTab('game')}
        >
          Game Properties
        </button>
        <button
          className={`tab-button ${activeTab === 'rcon' ? 'active' : ''}`}
          onClick={() => setActiveTab('rcon')}
        >
          RCON
        </button>
        <button
          className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
      </div>

      {/* Basic Settings Tab */}
      {activeTab === 'basic' && (
        <div className="tab-content">
          <div className="card">
            <h3>Server Information</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>Server Name</label>
                <input
                  type="text"
                  value={config?.serverName || ''}
                  onChange={(e) => handleChange('serverName', e.target.value)}
                  placeholder="My Arma Reforger Server"
                />
                <div className="form-hint">Displayed in server browser</div>
              </div>

              <div className="form-group">
                <label>Max Players</label>
                <input
                  type="number"
                  min="1"
                  max="128"
                  value={config?.maxPlayers || 32}
                  onChange={(e) => handleChange('maxPlayers', parseInt(e.target.value))}
                />
                <div className="form-hint">Maximum number of players (1-128)</div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.visible !== false}
                    onChange={(e) => handleChange('visible', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Visible in Server Browser</span>
                </label>
                <div className="form-hint">Make server discoverable in public listings</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Passwords</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>Server Password (optional)</label>
                <input
                  type="password"
                  value={config?.password || ''}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Leave empty for public server"
                />
                <div className="form-hint">Required for players to join</div>
              </div>

              <div className="form-group">
                <label>Admin Password</label>
                <input
                  type="password"
                  value={config?.adminPassword || ''}
                  onChange={(e) => handleChange('adminPassword', e.target.value)}
                />
                <div className="form-hint">Used for in-game admin authentication</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Installation Paths</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>Server Installation Path</label>
                <input
                  type="text"
                  value={config?.serverPath || ''}
                  onChange={(e) => handleChange('serverPath', e.target.value)}
                />
                <div className="form-hint">Path where Arma Reforger server files are installed</div>
              </div>

              <div className="form-group">
                <label>SteamCMD Path</label>
                <input
                  type="text"
                  value={config?.steamCmdPath || ''}
                  onChange={(e) => handleChange('steamCmdPath', e.target.value)}
                />
                <div className="form-hint">Path to SteamCMD installation</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network & Ports Tab */}
      {activeTab === 'network' && (
        <div className="tab-content">
          <div className="card">
            <h3>Game Server Ports</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>Game Port (UDP)</label>
                <input
                  type="number"
                  min="1024"
                  max="65535"
                  value={config?.serverPort || 2001}
                  onChange={(e) => handleChange('serverPort', parseInt(e.target.value))}
                />
                <div className="form-hint">UDP port for game traffic (default: 2001)</div>
              </div>

              <div className="form-group">
                <label>Public Port</label>
                <input
                  type="number"
                  min="1024"
                  max="65535"
                  value={config?.publicPort || config?.serverPort || 2001}
                  onChange={(e) => handleChange('publicPort', parseInt(e.target.value))}
                />
                <div className="form-hint">Port-forwarded to server (usually same as Game Port)</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Steam Query (A2S)</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.a2sEnabled !== false}
                    onChange={(e) => handleChange('a2sEnabled', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Enable Steam Query</span>
                </label>
                <div className="form-hint">Allow server queries from Steam browser</div>
              </div>

              {config?.a2sEnabled !== false && (
                <div className="form-group">
                  <label>A2S Port</label>
                  <input
                    type="number"
                    min="1024"
                    max="65535"
                    value={config?.a2sPort || 17777}
                    onChange={(e) => handleChange('a2sPort', parseInt(e.target.value))}
                  />
                  <div className="form-hint">Steam browser query port (default: 17777)</div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Web UI</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>Web UI Port</label>
                <input
                  type="number"
                  min="1024"
                  max="65535"
                  value={config?.webUIPort || 3001}
                  onChange={(e) => handleChange('webUIPort', parseInt(e.target.value))}
                />
                <div className="form-hint">HTTP port for this web interface (requires restart)</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Platform Support</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.crossPlatform !== false}
                    onChange={(e) => handleChange('crossPlatform', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Enable Cross-Platform Play</span>
                </label>
                <div className="form-hint">Allow PC, Xbox, and PlayStation players</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Properties Tab */}
      {activeTab === 'game' && (
        <div className="tab-content">
          <div className="card">
            <h3>View Distances</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>Server Max View Distance (meters)</label>
                <input
                  type="number"
                  min="500"
                  max="10000"
                  step="100"
                  value={config?.serverMaxViewDistance || 2500}
                  onChange={(e) => handleChange('serverMaxViewDistance', parseInt(e.target.value))}
                />
                <div className="form-hint">Maximum render distance (500-10,000m, default: 2500)</div>
              </div>

              <div className="form-group">
                <label>Network View Distance (meters)</label>
                <input
                  type="number"
                  min="500"
                  max="5000"
                  step="100"
                  value={config?.networkViewDistance || 1500}
                  onChange={(e) => handleChange('networkViewDistance', parseInt(e.target.value))}
                />
                <div className="form-hint">Network synchronization distance (500-5,000m, default: 1500)</div>
              </div>

              <div className="form-group">
                <label>Min Grass Distance (meters)</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  step="10"
                  value={config?.serverMinGrassDistance || 50}
                  onChange={(e) => handleChange('serverMinGrassDistance', parseInt(e.target.value))}
                />
                <div className="form-hint">Minimum grass render distance (0-150m, default: 50)</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Gameplay Settings</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.battlEye !== false}
                    onChange={(e) => handleChange('battlEye', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Enable BattlEye Anti-Cheat</span>
                </label>
                <div className="form-hint">Recommended for public servers</div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.fastValidation === true}
                    onChange={(e) => handleChange('fastValidation', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Fast Validation</span>
                </label>
                <div className="form-hint">Faster loading, recommended enabled</div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.disableThirdPerson === true}
                    onChange={(e) => handleChange('disableThirdPerson', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Disable Third Person View</span>
                </label>
                <div className="form-hint">Force first-person only</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Voice Chat (VON)</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.vonDisableUI === true}
                    onChange={(e) => handleChange('vonDisableUI', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Disable VON UI</span>
                </label>
                <div className="form-hint">Hide voice chat UI elements</div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.vonDisableDirectSpeechUI === true}
                    onChange={(e) => handleChange('vonDisableDirectSpeechUI', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Disable Direct Speech UI</span>
                </label>
                <div className="form-hint">Hide direct voice UI</div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.vonCanTransmitCrossFaction === true}
                    onChange={(e) => handleChange('vonCanTransmitCrossFaction', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Cross-Faction Voice</span>
                </label>
                <div className="form-hint">Allow voice between opposing factions</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RCON Tab */}
      {activeTab === 'rcon' && (
        <div className="tab-content">
          <div className="card">
            <h3>RCON Configuration</h3>
            <p style={{ marginBottom: '15px', color: '#718096' }}>
              Remote Console allows server administration via command-line interface
            </p>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.rconEnabled === true}
                    onChange={(e) => handleChange('rconEnabled', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Enable RCON</span>
                </label>
                <div className="form-hint">Allow remote console connections</div>
              </div>

              {config?.rconEnabled && (
                <>
                  <div className="form-group">
                    <label>RCON Port</label>
                    <input
                      type="number"
                      min="1024"
                      max="65535"
                      value={config?.rconPort || 19999}
                      onChange={(e) => handleChange('rconPort', parseInt(e.target.value))}
                    />
                    <div className="form-hint">UDP port for RCON (default: 19999)</div>
                  </div>

                  <div className="form-group">
                    <label>RCON Password</label>
                    <input
                      type="password"
                      value={config?.rconPassword || ''}
                      onChange={(e) => handleChange('rconPassword', e.target.value)}
                      placeholder="Minimum 3 characters, no spaces"
                    />
                    <div className="form-hint">Secure password for RCON access</div>
                  </div>

                  <div className="form-group">
                    <label>Max RCON Clients</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config?.rconMaxClients || 5}
                      onChange={(e) => handleChange('rconMaxClients', parseInt(e.target.value))}
                    />
                    <div className="form-hint">Maximum simultaneous RCON connections (1-10)</div>
                  </div>

                  <div className="form-group">
                    <label>RCON Permission Level</label>
                    <select
                      value={config?.rconPermission || 'admin'}
                      onChange={(e) => handleChange('rconPermission', e.target.value)}
                    >
                      <option value="admin">Admin (full control)</option>
                      <option value="monitor">Monitor (read-only)</option>
                    </select>
                    <div className="form-hint">Access level for RCON connections</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {config?.rconEnabled && (
            <div className="alert alert-warning">
              <span>
                ⚠️ Warning: RCON provides full server access. Use a strong password and restrict access via firewall.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="tab-content">
          <div className="card">
            <h3>AI Settings</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.disableAI === true}
                    onChange={(e) => handleChange('disableAI', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Disable All AI</span>
                </label>
                <div className="form-hint">Removes all AI from the server</div>
              </div>

              {config?.disableAI !== true && (
                <div className="form-group">
                  <label>AI Limit</label>
                  <input
                    type="number"
                    min="-1"
                    max="500"
                    value={config?.aiLimit || -1}
                    onChange={(e) => handleChange('aiLimit', parseInt(e.target.value))}
                  />
                  <div className="form-hint">Maximum AI count (-1 = unlimited, 0 = none, 1-500 = limit)</div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Player Save & Queue</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>Player Save Interval (seconds)</label>
                <input
                  type="number"
                  min="30"
                  max="3600"
                  value={config?.playerSaveTime || 300}
                  onChange={(e) => handleChange('playerSaveTime', parseInt(e.target.value))}
                />
                <div className="form-hint">How often player data is saved (default: 300)</div>
              </div>

              <div className="form-group">
                <label>Join Queue Max Size</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config?.joinQueueMaxSize || 50}
                  onChange={(e) => handleChange('joinQueueMaxSize', parseInt(e.target.value))}
                />
                <div className="form-hint">Maximum players in queue (0 = disabled)</div>
              </div>

              <div className="form-group">
                <label>Slot Reservation Timeout (seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={config?.slotReservationTimeout || 30}
                  onChange={(e) => handleChange('slotReservationTimeout', parseInt(e.target.value))}
                />
                <div className="form-hint">Time reserved slots are held</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>System Options</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.disableCrashReporter === true}
                    onChange={(e) => handleChange('disableCrashReporter', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Disable Crash Reporter</span>
                </label>
                <div className="form-hint">Don't send crash reports to developers</div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.disableServerShutdown === true}
                    onChange={(e) => handleChange('disableServerShutdown', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Disable Server Shutdown</span>
                </label>
                <div className="form-hint">Prevent automatic server shutdown</div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config?.lobbyPlayerSynchronise === true}
                    onChange={(e) => handleChange('lobbyPlayerSynchronise', e.target.checked)}
                  />
                  <span style={{ marginLeft: '8px' }}>Lobby Player Synchronization</span>
                </label>
                <div className="form-hint">Synchronize players in lobby</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Steam API</h3>
            <div style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label>Steam API Key</label>
                <input
                  type="password"
                  value={config?.steamApiKey || ''}
                  onChange={(e) => handleChange('steamApiKey', e.target.value)}
                  placeholder="Get from steamcommunity.com/dev/apikey"
                />
                <div className="form-hint">Required for Steam integration features</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save/Reset Buttons */}
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
          ℹ️ Note: Most changes require a server restart to take effect. Port changes may require firewall configuration.
        </span>
      </div>

      {/* Documentation Links */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h4>📚 Documentation</h4>
        <p style={{ marginTop: '10px', marginBottom: '10px' }}>
          For more detailed information about Arma Reforger server configuration:
        </p>
        <ul style={{ marginLeft: '20px' }}>
          <li>
            <a href="https://community.bistudio.com/wiki/Arma_Reforger:Server_Config" target="_blank" rel="noopener noreferrer">
              Official Server Config Documentation
            </a>
          </li>
          <li>
            <a href="https://docs.fourseasonshosting.com/docs/game-knowledge-base/arma-reforger/complete-config.json-guide" target="_blank" rel="noopener noreferrer">
              Complete config.json Guide
            </a>
          </li>
          <li>
            <a href="https://armareforger.xyz/guides/arma-reforger-dedicated-server-setup" target="_blank" rel="noopener noreferrer">
              Dedicated Server Setup Guide
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Configuration;
