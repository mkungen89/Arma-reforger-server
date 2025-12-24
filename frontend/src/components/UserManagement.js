import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ steamId: '', role: 'user' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.users);
      setLoading(false);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/users', newUser, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ type: 'success', text: 'User added successfully' });
      setNewUser({ steamId: '', role: 'user' });
      setShowAddUser(false);
      loadUsers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to add user',
      });
    }
  };

  const handleUpdateRole = async (steamId, newRole) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.put(
        `/api/users/${steamId}`,
        { role: newRole },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage({ type: 'success', text: 'User role updated' });
      loadUsers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to update user',
      });
    }
  };

  const handleRemoveUser = async (steamId, displayName) => {
    if (!window.confirm(`Remove user ${displayName}?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`/api/users/${steamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ type: 'success', text: 'User removed' });
      loadUsers();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to remove user',
      });
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', label: 'Admin' },
      gm: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', label: 'GM' },
      user: { bg: 'rgba(79, 195, 247, 0.2)', color: '#4fc3f7', label: 'User' },
    };

    const style = styles[role] || styles.user;

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
        {style.label}
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
        <h2>User Management</h2>
        <p>Manage authorized users and their roles</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Authorized Users ({users.length})</h3>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddUser(!showAddUser)}
          >
            {showAddUser ? '✕ Cancel' : '➕ Add User'}
          </button>
        </div>

        {showAddUser && (
          <form
            onSubmit={handleAddUser}
            style={{
              marginTop: '20px',
              padding: '20px',
              background: '#0f1419',
              borderRadius: '8px',
              border: '1px solid #2d3748',
            }}
          >
            <div className="form-group">
              <label>Steam ID 64</label>
              <input
                type="text"
                value={newUser.steamId}
                onChange={(e) =>
                  setNewUser({ ...newUser, steamId: e.target.value })
                }
                placeholder="76561199176944069"
                required
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  background: '#1a1f26',
                  border: '1px solid #2d3748',
                  borderRadius: '8px',
                  color: '#e8e8e8',
                  fontSize: '14px',
                }}
              >
                <option value="user">User - View only access</option>
                <option value="gm">GM - Game master permissions</option>
                <option value="admin">Admin - Full access</option>
              </select>
            </div>

            <button type="submit" className="btn btn-success">
              Add User
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px' }}>
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
              No users found
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {users.map((user) => (
                <div
                  key={user.steamId}
                  style={{
                    padding: '15px',
                    background: '#0f1419',
                    borderRadius: '8px',
                    border: '1px solid #2d3748',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                  }}
                >
                  {user.avatarUrl && (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        border: '2px solid #2d3748',
                      }}
                    />
                  )}

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#e8e8e8',
                        marginBottom: '5px',
                      }}
                    >
                      {user.displayName}
                    </div>
                    <div style={{ fontSize: '13px', color: '#718096' }}>
                      Steam ID: {user.steamId}
                    </div>
                    {user.lastLogin && (
                      <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '3px' }}>
                        Last login: {new Date(user.lastLogin).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {getRoleBadge(user.role)}

                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.steamId, e.target.value)}
                      style={{
                        padding: '6px 10px',
                        background: '#1a1f26',
                        border: '1px solid #2d3748',
                        borderRadius: '6px',
                        color: '#e8e8e8',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="user">User</option>
                      <option value="gm">GM</option>
                      <option value="admin">Admin</option>
                    </select>

                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleRemoveUser(user.steamId, user.displayName)}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Role Permissions</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '15px' }}>
          <div
            style={{
              padding: '15px',
              background: '#0f1419',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              {getRoleBadge('admin')}
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8e8e8' }}>
                Administrator
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#718096', lineHeight: '1.6' }}>
              Full access to all features including server control, mod management, diagnostics,
              configuration, and user management. Can add/remove users and change roles.
            </div>
          </div>

          <div
            style={{
              padding: '15px',
              background: '#0f1419',
              borderRadius: '8px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              {getRoleBadge('gm')}
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8e8e8' }}>
                Game Master
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#718096', lineHeight: '1.6' }}>
              Can manage server (start/stop/restart), view logs, and manage mods. Cannot change
              configuration or manage users.
            </div>
          </div>

          <div
            style={{
              padding: '15px',
              background: '#0f1419',
              borderRadius: '8px',
              border: '1px solid rgba(79, 195, 247, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              {getRoleBadge('user')}
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#e8e8e8' }}>
                User
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#718096', lineHeight: '1.6' }}>
              Read-only access. Can view dashboard, server status, logs, and current configuration.
              Cannot make any changes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
