import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ModManager() {
  const [mods, setMods] = useState({ installed: [], validation: [] });
  const [loading, setLoading] = useState(true);
  const [searchUrl, setSearchUrl] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [dependencyTree, setDependencyTree] = useState(null);
  const [message, setMessage] = useState(null);
  const [addWithDeps, setAddWithDeps] = useState(true);

  useEffect(() => {
    loadMods();
  }, []);

  const loadMods = async () => {
    try {
      const response = await axios.get('/api/mods');
      setMods(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading mods:', error);
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchUrl) return;

    setMessage(null);
    setSearchResult(null);
    setDependencyTree(null);

    try {
      const response = await axios.get('/api/mods/search', {
        params: { url: searchUrl },
      });
      setSearchResult(response.data);

      // Fetch dependency tree if mod has dependencies
      if (response.data.dependencies && response.data.dependencies.length > 0) {
        const depResponse = await axios.get(`/api/mods/${response.data.id}/dependencies`);
        setDependencyTree(depResponse.data);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to fetch mod info',
      });
    }
  };

  const handleAddMod = async () => {
    if (!searchResult) return;

    try {
      const response = await axios.post('/api/mods/add', {
        workshopId: searchResult.id,
        withDependencies: addWithDeps
      });

      setMessage({
        type: 'success',
        text: response.data.message || 'Mod added successfully'
      });

      setSearchUrl('');
      setSearchResult(null);
      setDependencyTree(null);
      loadMods();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to add mod',
      });
    }
  };

  const handleInstallMod = async (modId) => {
    try {
      const response = await axios.post(`/api/mods/${modId}/install`);
      setMessage({ type: 'success', text: response.data.message });
      loadMods();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to install mod',
      });
    }
  };

  const handleToggleMod = async (modId, currentStatus) => {
    try {
      const response = await axios.post(`/api/mods/${modId}/toggle`, {
        enabled: !currentStatus,
      });

      if (response.data.warnings) {
        setMessage({
          type: 'warning',
          text: response.data.warnings.message,
        });
      } else {
        setMessage({ type: 'success', text: 'Mod updated successfully' });
      }

      loadMods();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to toggle mod',
      });
    }
  };

  const handleRemoveMod = async (modId) => {
    if (!window.confirm('Are you sure you want to remove this mod?')) return;

    try {
      await axios.delete(`/api/mods/${modId}`);
      setMessage({ type: 'success', text: 'Mod removed successfully' });
      loadMods();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to remove mod',
      });
    }
  };

  const handleResolveDependencies = async (modId) => {
    try {
      const response = await axios.post(`/api/mods/${modId}/resolve-dependencies`);
      setMessage({
        type: 'info',
        text: response.data.message,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to resolve dependencies',
      });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      not_installed: { bg: '#2d3748', color: '#718096' },
      downloading: { bg: 'rgba(79, 195, 247, 0.2)', color: '#4fc3f7' },
      installed: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' },
      error: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' },
    };

    const style = styles[status] || styles.not_installed;

    return (
      <span
        style={{
          padding: '4px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          background: style.bg,
          color: style.color,
        }}
      >
        {status?.replace('_', ' ').toUpperCase()}
      </span>
    );
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
        <h2>Mod Manager</h2>
        <p>Manage server mods with automatic dependency checking</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      {mods.validation && mods.validation.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <h3>⚠️ Validation Issues</h3>
          <div style={{ marginTop: '15px' }}>
            {mods.validation.map((issue, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: '#0f1419',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  border: '1px solid #2d3748',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444', marginBottom: '5px' }}>
                  {issue.type.toUpperCase()}: {issue.modName}
                </div>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '8px' }}>
                  {issue.message}
                </div>
                {issue.missing && issue.missing.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                    Missing: {issue.missing.map(m => m.id).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>Add New Mod</h3>
        <div style={{ marginTop: '15px' }}>
          <div className="form-group">
            <label>Arma Reforger Workshop URL or ID</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={searchUrl}
                onChange={(e) => setSearchUrl(e.target.value)}
                placeholder="https://reforger.armaplatform.com/workshop/ABC123... or Workshop ID"
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleSearch}>
                🔍 Search
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#718096', marginTop: '5px' }}>
              Supports: Arma Platform URLs, Workshop IDs, and Steam Workshop URLs
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={addWithDeps}
                onChange={(e) => setAddWithDeps(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '14px', color: '#cbd5e0' }}>
                Automatically add all dependencies
              </span>
            </label>
          </div>

          {searchResult && (
            <div
              style={{
                marginTop: '15px',
                padding: '15px',
                background: '#0f1419',
                borderRadius: '8px',
                border: '1px solid #2d3748',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8e8e8', marginBottom: '8px' }}>
                    {searchResult.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#718096', marginBottom: '8px' }}>
                    By: {searchResult.author} | Size: {searchResult.size} | Version: {searchResult.version}
                  </div>
                  {searchResult.dependencies && searchResult.dependencies.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '8px' }}>
                      ⚠️ Requires {searchResult.dependencies.length} dependencies
                    </div>
                  )}
                  {dependencyTree && dependencyTree.totalCount > 1 && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px',
                      background: '#1a1f26',
                      borderRadius: '6px',
                      border: '1px solid #2d3748'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#4fc3f7', marginBottom: '8px' }}>
                        📦 Dependency Tree ({dependencyTree.totalCount} total mods)
                      </div>
                      <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#cbd5e0' }}>
                        {dependencyTree.dependencies.filter(d => d.id !== searchResult.id).map((dep, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            {dep.name} <span style={{ color: '#718096' }}>({dep.id})</span>
                          </li>
                        ))}
                      </ul>
                      {addWithDeps && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#10b981' }}>
                          ✓ All dependencies will be added automatically
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button className="btn btn-success" onClick={handleAddMod}>
                  ➕ {addWithDeps && dependencyTree ? `Add ${dependencyTree.totalCount} Mods` : 'Add Mod'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Installed Mods ({mods.installed.length})</h3>
        <div style={{ marginTop: '15px' }}>
          {mods.installed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
              No mods installed yet. Add mods using the search above.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {mods.installed.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    padding: '15px',
                    background: '#0f1419',
                    borderRadius: '8px',
                    border: `1px solid ${mod.enabled ? '#10b981' : '#2d3748'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <input
                          type="checkbox"
                          checked={mod.enabled || false}
                          onChange={() => handleToggleMod(mod.id, mod.enabled)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8e8e8' }}>
                          {mod.name}
                        </div>
                        {getStatusBadge(mod.status)}
                      </div>

                      <div style={{ fontSize: '13px', color: '#718096', marginBottom: '8px', marginLeft: '28px' }}>
                        ID: {mod.id} | By: {mod.author}
                      </div>

                      {mod.dependencies && mod.dependencies.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#4fc3f7', marginLeft: '28px', marginBottom: '8px' }}>
                          Dependencies: {mod.dependencies.join(', ')}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {mod.status === 'not_installed' && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleInstallMod(mod.id)}
                        >
                          📥 Install
                        </button>
                      )}

                      {mod.dependencies && mod.dependencies.length > 0 && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleResolveDependencies(mod.id)}
                        >
                          🔗 Check Deps
                        </button>
                      )}

                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleRemoveMod(mod.id)}
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModManager;
