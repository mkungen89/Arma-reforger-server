import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import ServerControl from './components/ServerControl';
import ModManager from './components/ModManager';
import Diagnostics from './components/Diagnostics';
import Configuration from './components/Configuration';
import Logs from './components/Logs';

function App() {
  const [serverStatus, setServerStatus] = useState('stopped');
  const [ws, setWs] = useState(null);

  useEffect(() => {
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
        window.location.reload();
      }, 5000);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <nav className="sidebar">
          <div className="sidebar-header">
            <h1>Arma Reforger</h1>
            <p>Server Manager</p>
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
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard serverStatus={serverStatus} />} />
            <Route path="/server" element={<ServerControl serverStatus={serverStatus} />} />
            <Route path="/mods" element={<ModManager />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/config" element={<Configuration />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
