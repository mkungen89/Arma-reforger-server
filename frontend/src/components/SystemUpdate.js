import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SystemUpdate.css';

function SystemUpdate() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  useEffect(() => {
    checkForUpdates();
    loadSystemInfo();
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await axios.get('/api/system/check-update');
      setUpdateInfo(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error checking for updates:', error);
      setLoading(false);
    }
  };

  const loadSystemInfo = async () => {
    try {
      const response = await axios.get('/api/system/info');
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Error loading system info:', error);
    }
  };

  const performUpdate = async () => {
    if (!window.confirm('Are you sure you want to update? The service will restart automatically.')) {
      return;
    }

    setUpdating(true);
    setUpdateResult(null);

    try {
      const response = await axios.post('/api/system/update');
      setUpdateResult({
        success: true,
        message: response.data.message,
        details: response.data
      });

      // Refresh update info after 10 seconds (service should restart)
      setTimeout(() => {
        window.location.reload();
      }, 10000);
    } catch (error) {
      setUpdateResult({
        success: false,
        message: error.response?.data?.error || 'Failed to update',
        details: error.response?.data
      });
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="system-update-card">
        <h3>System Update</h3>
        <p>Checking for updates...</p>
      </div>
    );
  }

  return (
    <div className="system-update-card">
      <div className="update-header">
        <h3>
          {updateInfo?.updateAvailable ? '🔔 Update Available!' : '✅ Up to Date'}
        </h3>
      </div>

      <div className="update-info">
        {systemInfo && (
          <div className="system-info">
            <div className="info-row">
              <span className="info-label">Current Version:</span>
              <span className="info-value">{systemInfo.version}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Commit:</span>
              <span className="info-value">
                <code>{systemInfo.commit}</code>
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Branch:</span>
              <span className="info-value">{systemInfo.branch}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Node.js:</span>
              <span className="info-value">{systemInfo.nodeVersion}</span>
            </div>
          </div>
        )}

        {updateInfo?.updateAvailable && updateInfo.latestCommit && (
          <div className="latest-commit">
            <h4>Latest Update:</h4>
            <div className="commit-info">
              <p className="commit-message">"{updateInfo.latestCommit.message}"</p>
              <p className="commit-meta">
                by {updateInfo.latestCommit.author} •
                {new Date(updateInfo.latestCommit.date).toLocaleDateString()}
              </p>
              <p className="commit-sha">
                <code>{updateInfo.latestCommit.sha}</code>
              </p>
            </div>
          </div>
        )}

        {updateResult && (
          <div className={`update-result ${updateResult.success ? 'success' : 'error'}`}>
            <p>{updateResult.message}</p>
            {updateResult.success && (
              <p className="restart-info">
                Service will restart in a few seconds. Page will reload automatically.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="update-actions">
        <button
          className="btn-secondary"
          onClick={checkForUpdates}
          disabled={updating}
        >
          🔄 Check for Updates
        </button>

        {updateInfo?.updateAvailable && (
          <button
            className="btn-primary update-btn"
            onClick={performUpdate}
            disabled={updating}
          >
            {updating ? '⏳ Updating...' : '⬆️ Update Now'}
          </button>
        )}
      </div>

      {systemInfo?.repoUrl && (
        <div className="repo-link">
          <a
            href={systemInfo.repoUrl.replace('.git', '')}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub →
          </a>
        </div>
      )}
    </div>
  );
}

export default SystemUpdate;
