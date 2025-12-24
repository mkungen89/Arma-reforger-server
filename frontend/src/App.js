import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ServerControl from './components/ServerControl';
import ModManager from './components/ModManager';
import Diagnostics from './components/Diagnostics';
import Configuration from './components/Configuration';
import Logs from './components/Logs';
import UserManagement from './components/UserManagement';

// Configure axios defaults
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('stopped');
  const [ws, setWs] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      initWebSocket();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');

    if (!token || !savedUser) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }

    setLoading(false);
  };

  const initWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port || 3001}`;

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'status') {
        setServerStatus(data.data.status);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setTimeout(() => {
        if (isAuthenticated) {
          initWebSocket();
        }
      }, 5000);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  };

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);

    if (ws) {
      ws.close();
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <div className="App">
        <nav className="sidebar">
          <div className="sidebar-header">
            <h1>Arma Reforger</h1>
            <p>Server Manager</p>
          </div>

          <div className="user-info">
            {user?.avatarUrl && (
              <img src={user.avatarUrl} alt={user.displayName} className="user-avatar" />
            )}
            <div className="user-details">
              <div className="user-name">{user?.displayName || 'User'}</div>
              <div className="user-role">{user?.role?.toUpperCase() || 'USER'}</div>
            </div>
          </div>

          <div className="server-status-badge">
            <div className={`status-indicator ${serverStatus}`}></div>
            <span>{serverStatus.toUpperCase()}</span>
          </div>

          <ul className="nav-menu">
            <li>
              <Link to="/">
                <i className="icon">📊</i> Dashboard
              </Link>
            </li>
            <li>
              <Link to="/server">
                <i className="icon">🎮</i> Server Control
              </Link>
            </li>
            <li>
              <Link to="/mods">
                <i className="icon">🔧</i> Mod Manager
              </Link>
            </li>
            <li>
              <Link to="/diagnostics">
                <i className="icon">🔍</i> Diagnostics
              </Link>
            </li>
            <li>
              <Link to="/config">
                <i className="icon">⚙️</i> Configuration
              </Link>
            </li>
            <li>
              <Link to="/logs">
                <i className="icon">📝</i> Logs
              </Link>
            </li>
            {user?.role === 'admin' && (
              <li>
                <Link to="/users">
                  <i className="icon">👥</i> Users
                </Link>
              </li>
            )}
          </ul>

          <div className="sidebar-footer">
            <button className="btn btn-secondary btn-block" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard serverStatus={serverStatus} />} />
            <Route path="/server" element={<ServerControl serverStatus={serverStatus} userRole={user?.role} />} />
            <Route path="/mods" element={<ModManager userRole={user?.role} />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/config" element={<Configuration userRole={user?.role} />} />
            <Route path="/logs" element={<Logs />} />
            {user?.role === 'admin' && (
              <Route path="/users" element={<UserManagement />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
