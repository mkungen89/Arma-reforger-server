import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BackupManager.css';

function BackupManager({ userRole }) {
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    includeConfig: true,
    includeMods: true,
    includeProfiles: true,
    includeServer: false
  });

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const [backupsRes, statsRes] = await Promise.all([
        axios.get('/api/backup/list'),
        axios.get('/api/backup/stats/summary')
      ]);

      setBackups(backupsRes.data.backups || []);
      setStats(statsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading backups:', error);
      setMessage({ type: 'error', text: 'Failed to load backups' });
      setLoading(false);
    }
  };

  const handleCreateBackup = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      setMessage({ type: 'error', text: 'Backup name is required' });
      return;
    }

    try {
      setMessage({ type: 'info', text: 'Creating backup... This may take a while.' });

      await axios.post('/api/backup/create', formData);

      setMessage({ type: 'success', text: 'Backup created successfully!' });
      setShowCreateModal(false);
      resetForm();
      loadBackups();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create backup' });
    }
  };

  const handleDownload = async (backup) => {
    try {
      const response = await axios.get(`/api/backup/download/${backup.id}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage({ type: 'success', text: 'Backup downloaded' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to download backup' });
    }
  };

  const handleRestore = async (backup) => {
    if (!window.confirm(`Restore backup "${backup.name}"? This will overwrite current files!`)) {
      return;
    }

    try {
      setMessage({ type: 'info', text: 'Restoring backup... Please wait.' });

      await axios.post(`/api/backup/restore/${backup.id}`);

      setMessage({ type: 'success', text: 'Backup restored successfully! Server restart recommended.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to restore backup' });
    }
  };

  const handleDelete = async (backup) => {
    if (!window.confirm(`Delete backup "${backup.name}"? This cannot be undone!`)) {
      return;
    }

    try {
      await axios.delete(`/api/backup/${backup.id}`);
      setMessage({ type: 'success', text: 'Backup deleted' });
      loadBackups();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete backup' });
    }
  };

  const handleViewDetails = async (backup) => {
    try {
      const response = await axios.get(`/api/backup/${backup.id}`);
      setSelectedBackup(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load backup details' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      includeConfig: true,
      includeMods: true,
      includeProfiles: true,
      includeServer: false
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="backup-manager">
      <div className="page-header">
        <h2>💾 Backup & Restore</h2>
        <p>Create and manage server backups</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{stats.totalBackups}</div>
            <div className="stat-label">Total Backups</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💽</div>
            <div className="stat-value">{stats.totalSizeFormatted}</div>
            <div className="stat-label">Total Size</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-value">
              {stats.newestBackup ? formatDate(stats.newestBackup.createdAt).split(',')[0] : 'N/A'}
            </div>
            <div className="stat-label">Latest Backup</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.backupsThisWeek}</div>
            <div className="stat-label">This Week</div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {isAdmin && (
        <div className="action-bar">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ Create Backup
          </button>
          <button className="btn btn-secondary" onClick={loadBackups}>
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Backups List */}
      <div className="backups-list">
        {backups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No backups yet</h3>
            <p>Create your first backup to protect your server data</p>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                Create First Backup
              </button>
            )}
          </div>
        ) : (
          backups.map((backup) => (
            <div key={backup.id} className="backup-card">
              <div className="backup-header">
                <div className="backup-info">
                  <h3>{backup.name}</h3>
                  <p className="backup-description">{backup.description || 'No description'}</p>
                  <div className="backup-meta">
                    <span>📅 {formatDate(backup.createdAt)}</span>
                    <span>👤 {backup.createdBy}</span>
                    <span>💾 {backup.sizeFormatted}</span>
                  </div>
                </div>
              </div>

              <div className="backup-includes">
                <strong>Includes:</strong>
                <div className="includes-badges">
                  {backup.includes.config && <span className="badge badge-success">Config</span>}
                  {backup.includes.mods && <span className="badge badge-success">Mods</span>}
                  {backup.includes.profiles && <span className="badge badge-success">Profiles</span>}
                  {backup.includes.server && <span className="badge badge-warning">Full Server</span>}
                </div>
              </div>

              <div className="backup-actions">
                <button
                  className="btn btn-sm btn-info"
                  onClick={() => handleViewDetails(backup)}
                >
                  📋 Details
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleDownload(backup)}
                >
                  ⬇️ Download
                </button>
                {isAdmin && (
                  <>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => handleRestore(backup)}
                    >
                      🔄 Restore
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(backup)}
                    >
                      🗑️ Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Backup Modal */}
      {showCreateModal && isAdmin && (
        <div className="modal">
          <div className="modal-content">
            <h3>Create New Backup</h3>

            <form onSubmit={handleCreateBackup}>
              <div className="form-group">
                <label>Backup Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Before Update 2024-01-15"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional notes about this backup..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Include in Backup:</label>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.includeConfig}
                      onChange={(e) => setFormData({ ...formData, includeConfig: e.target.checked })}
                    />
                    Configuration Files
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.includeMods}
                      onChange={(e) => setFormData({ ...formData, includeMods: e.target.checked })}
                    />
                    Mod Files
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.includeProfiles}
                      onChange={(e) => setFormData({ ...formData, includeProfiles: e.target.checked })}
                    />
                    Server Profiles
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.includeServer}
                      onChange={(e) => setFormData({ ...formData, includeServer: e.target.checked })}
                    />
                    Full Server Files (Large!)
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Create Backup
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backup Details Modal */}
      {selectedBackup && (
        <div className="modal">
          <div className="modal-content large">
            <h3>Backup Details: {selectedBackup.name}</h3>

            <div className="backup-details">
              <div className="detail-row">
                <strong>Created:</strong> {formatDate(selectedBackup.createdAt)}
              </div>
              <div className="detail-row">
                <strong>Created By:</strong> {selectedBackup.createdBy}
              </div>
              <div className="detail-row">
                <strong>Size:</strong> {selectedBackup.sizeFormatted}
              </div>
              <div className="detail-row">
                <strong>Description:</strong> {selectedBackup.description || 'No description'}
              </div>
            </div>

            {selectedBackup.files && (
              <div className="files-list">
                <h4>Files ({selectedBackup.files.length})</h4>
                <div className="files-scroll">
                  {selectedBackup.files.map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatBytes(file.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedBackup(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default BackupManager;
