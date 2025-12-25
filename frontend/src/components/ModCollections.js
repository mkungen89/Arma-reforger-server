import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ModCollections.css';

function ModCollections({ userRole }) {
  const [collections, setCollections] = useState([]);
  const [availableMods, setAvailableMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mods: [],
    isPublic: true
  });

  const [importData, setImportData] = useState('');

  const canEdit = userRole === 'admin' || userRole === 'gm';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [collectionsRes, modsRes] = await Promise.all([
        axios.get('/api/mod-collections'),
        axios.get('/api/mods')
      ]);

      setCollections(collectionsRes.data.collections || []);
      setAvailableMods(modsRes.data.mods || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load mod collections' });
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (formData.mods.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one mod' });
      return;
    }

    try {
      await axios.post('/api/mod-collections', formData);
      setMessage({ type: 'success', text: 'Collection created successfully!' });
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create collection' });
    }
  };

  const handleDelete = async (collection) => {
    if (!window.confirm(`Delete collection "${collection.name}"?`)) return;

    try {
      await axios.delete(`/api/mod-collections/${collection.id}`);
      setMessage({ type: 'success', text: 'Collection deleted' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete collection' });
    }
  };

  const handleExport = async (collection) => {
    try {
      const response = await axios.get(`/api/mod-collections/${collection.id}/export`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${collection.name.replace(/[^a-z0-9]/gi, '_')}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage({ type: 'success', text: 'Collection exported!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export collection' });
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();

    try {
      const data = JSON.parse(importData);

      if (!data.mods || !Array.isArray(data.mods)) {
        throw new Error('Invalid collection format');
      }

      await axios.post('/api/mod-collections/import', data);
      setMessage({ type: 'success', text: 'Collection imported successfully!' });
      setShowImportModal(false);
      setImportData('');
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import: ' + error.message });
    }
  };

  const handleApply = async (collection) => {
    if (!window.confirm(`Apply collection "${collection.name}"? This will enable all mods in this collection.`)) return;

    try {
      const response = await axios.post(`/api/mod-collections/${collection.id}/apply`);
      setMessage({
        type: 'success',
        text: `Collection ready to apply: ${response.data.mods.length} mods. Go to Mod Manager to activate them.`
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to apply collection' });
    }
  };

  const toggleModSelection = (modId) => {
    const mods = formData.mods.includes(modId)
      ? formData.mods.filter(id => id !== modId)
      : [...formData.mods, modId];

    setFormData({ ...formData, mods });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      mods: [],
      isPublic: true
    });
  };

  const getModName = (modId) => {
    const mod = availableMods.find(m => m.id === modId);
    return mod ? mod.name : modId;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="mod-collections">
      <div className="page-header">
        <h2>📦 Mod Collections</h2>
        <p>Save and share mod combinations</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{collections.length}</div>
          <div className="stat-label">Total Collections</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <div className="stat-value">{availableMods.length}</div>
          <div className="stat-label">Available Mods</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🌐</div>
          <div className="stat-value">{collections.filter(c => c.isPublic).length}</div>
          <div className="stat-label">Public Collections</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔒</div>
          <div className="stat-value">{collections.filter(c => !c.isPublic).length}</div>
          <div className="stat-label">Private Collections</div>
        </div>
      </div>

      {/* Action Bar */}
      {canEdit && (
        <div className="action-bar">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ Create Collection
          </button>
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            📥 Import Collection
          </button>
          <button className="btn btn-secondary" onClick={loadData}>
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Collections List */}
      <div className="collections-list">
        {collections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No collections yet</h3>
            <p>Create mod collections to save and share your favorite mod combinations</p>
            {canEdit && (
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                Create First Collection
              </button>
            )}
          </div>
        ) : (
          collections.map((collection) => (
            <div key={collection.id} className="collection-card">
              <div className="collection-header">
                <div className="collection-info">
                  <h3>{collection.name}</h3>
                  <p className="collection-description">{collection.description || 'No description'}</p>
                  <div className="collection-meta">
                    <span>🔧 {collection.mods.length} mods</span>
                    <span>👤 {collection.createdBy}</span>
                    <span>📅 {new Date(collection.createdAt).toLocaleDateString()}</span>
                    {collection.isPublic ? (
                      <span className="badge badge-success">🌐 Public</span>
                    ) : (
                      <span className="badge badge-secondary">🔒 Private</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="collection-mods">
                <strong>Mods in collection:</strong>
                <div className="mods-list">
                  {collection.mods.slice(0, 5).map((modId, index) => (
                    <span key={index} className="mod-badge">
                      {getModName(modId)}
                    </span>
                  ))}
                  {collection.mods.length > 5 && (
                    <span className="mod-badge more">
                      +{collection.mods.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              <div className="collection-actions">
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleApply(collection)}
                >
                  ✅ Apply
                </button>
                <button
                  className="btn btn-sm btn-info"
                  onClick={() => handleExport(collection)}
                >
                  📤 Export
                </button>
                {canEdit && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(collection)}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && canEdit && (
        <div className="modal">
          <div className="modal-content large">
            <h3>Create New Collection</h3>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Collection Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Essential Gameplay Mods"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this mod collection..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  />
                  {' '}Make collection public
                </label>
              </div>

              <div className="form-group">
                <label>Select Mods ({formData.mods.length} selected)</label>
                <div className="mod-selector">
                  {availableMods.length === 0 ? (
                    <p className="no-mods">No mods available. Add mods in Mod Manager first.</p>
                  ) : (
                    availableMods.map((mod) => (
                      <label key={mod.id} className="mod-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.mods.includes(mod.id)}
                          onChange={() => toggleModSelection(mod.id)}
                        />
                        <span>{mod.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Create Collection
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

      {/* Import Collection Modal */}
      {showImportModal && canEdit && (
        <div className="modal">
          <div className="modal-content">
            <h3>Import Collection</h3>

            <form onSubmit={handleImport}>
              <div className="form-group">
                <label>Collection JSON</label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder='Paste collection JSON here...'
                  rows="10"
                  required
                />
                <small>Paste the exported collection JSON file content here</small>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Import Collection
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportData('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModCollections;
