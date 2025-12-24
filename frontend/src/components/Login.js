import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [steamId, setSteamId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/steam/login', {
        steamId: steamId.trim(),
      });

      if (response.data.success) {
        // Store token
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Call parent callback
        onLoginSuccess(response.data.user, response.data.token);
      }
    } catch (err) {
      setError(
        err.response?.data?.error || 'Login failed. Please try again.'
      );
    }

    setLoading(false);
  };

  const handleSteamLogin = () => {
    // In production, this would redirect to Steam OpenID
    // For now, show instructions
    alert(
      'Steam OpenID Login:\n\n' +
      '1. Get your Steam ID from https://steamid.io/\n' +
      '2. Enter it in the form below\n\n' +
      'Your Steam ID must be authorized by an admin.'
    );
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Arma Reforger</h1>
          <p>Server Manager</p>
        </div>

        <div className="login-content">
          <h2>Login Required</h2>
          <p className="login-subtitle">
            Authenticate with your Steam account to access the server manager
          </p>

          {error && (
            <div className="login-error">
              <span>⚠️ {error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Steam ID 64</label>
              <input
                type="text"
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                placeholder="76561199176944069"
                required
                disabled={loading}
              />
              <div className="form-help">
                Find your Steam ID at{' '}
                <a
                  href="https://steamid.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  steamid.io
                </a>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login with Steam ID'}
            </button>
          </form>

          <div className="login-divider">
            <span>or</span>
          </div>

          <button
            className="btn btn-steam btn-block"
            onClick={handleSteamLogin}
            disabled={loading}
          >
            <span className="steam-icon">🎮</span>
            Sign in through Steam
          </button>

          <div className="login-footer">
            <p>
              Only authorized Steam accounts can access this server manager.
              <br />
              Contact an admin if you need access.
            </p>
          </div>
        </div>
      </div>

      <div className="login-background"></div>
    </div>
  );
}

export default Login;
