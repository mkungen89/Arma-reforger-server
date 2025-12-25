import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from './ToastProvider';

function ServerControl({ serverStatus }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const { addToast } = useToast();

  const handleStart = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.post('/api/server/start');
      setMessage({ type: 'success', text: response.data.message });
      addToast({ type: 'success', title: 'Server', message: response.data.message || 'Start OK' });
    } catch (error) {
      const errText = error.response?.data?.error || 'Failed to start server';
      setMessage({
        type: 'error',
        text: errText,
      });
      addToast({ type: 'error', title: 'Server', message: errText });
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.post('/api/server/stop');
      setMessage({ type: 'success', text: response.data.message });
      addToast({ type: 'success', title: 'Server', message: response.data.message || 'Stop OK' });
    } catch (error) {
      const errText = error.response?.data?.error || 'Failed to stop server';
      setMessage({
        type: 'error',
        text: errText,
      });
      addToast({ type: 'error', title: 'Server', message: errText });
    }
    setLoading(false);
  };

  const handleRestart = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await axios.post('/api/server/restart');
      setMessage({ type: 'success', text: 'Server restart initiated' });
      addToast({ type: 'info', title: 'Server', message: 'Restart initiated' });
    } catch (error) {
      const errText = error.response?.data?.error || 'Failed to restart server';
      setMessage({
        type: 'error',
        text: errText,
      });
      addToast({ type: 'error', title: 'Server', message: errText });
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!window.confirm('This will update the server files. The server must be stopped. Continue?')) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.post('/api/server/update');
      setMessage({ type: 'info', text: response.data.message + ' - Check logs for progress' });
      addToast({ type: 'info', title: 'Update', message: response.data.message || 'Update started' });
    } catch (error) {
      const errText = error.response?.data?.error || 'Failed to start update';
      setMessage({
        type: 'error',
        text: errText,
      });
      addToast({ type: 'error', title: 'Update', message: errText });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Server Control</h2>
        <p>Start, stop, and manage your Arma Reforger server</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="card">
        <h3>Server Actions</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '20px' }}>
          <button
            className="btn btn-success"
            onClick={handleStart}
            disabled={loading || serverStatus === 'running'}
          >
            ▶️ Start Server
          </button>

          <button
            className="btn btn-danger"
            onClick={handleStop}
            disabled={loading || serverStatus !== 'running'}
          >
            ⏹️ Stop Server
          </button>

          <button
            className="btn btn-primary"
            onClick={handleRestart}
            disabled={loading}
          >
            🔄 Restart Server
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleUpdate}
            disabled={loading || serverStatus === 'running'}
          >
            📥 Update Server
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Current Status</h3>
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <div
              className={`status-indicator ${serverStatus}`}
              style={{ width: '16px', height: '16px' }}
            ></div>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#e8e8e8' }}>
              {serverStatus.toUpperCase()}
            </span>
          </div>

          <div style={{ fontSize: '14px', color: '#718096', lineHeight: '1.6' }}>
            {serverStatus === 'stopped' && (
              <p>Server is currently stopped. Click "Start Server" to launch it.</p>
            )}
            {serverStatus === 'running' && (
              <p>Server is running and accepting connections.</p>
            )}
            {serverStatus === 'error' && (
              <p>
                Server encountered an error. Check logs for details or run diagnostics.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Quick Actions</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '10px' }}>
          <div
            style={{
              padding: '15px',
              background: '#0f1419',
              borderRadius: '8px',
              border: '1px solid #2d3748',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#e8e8e8', marginBottom: '5px' }}>
              Update Server Files
            </div>
            <div style={{ fontSize: '13px', color: '#718096', marginBottom: '10px' }}>
              Download and install the latest server version via SteamCMD
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleUpdate}
              disabled={loading || serverStatus === 'running'}
            >
              Run Update
            </button>
          </div>

          <div
            style={{
              padding: '15px',
              background: '#0f1419',
              borderRadius: '8px',
              border: '1px solid #2d3748',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#e8e8e8', marginBottom: '5px' }}>
              Server Configuration
            </div>
            <div style={{ fontSize: '13px', color: '#718096', marginBottom: '10px' }}>
              Modify server settings, ports, and game parameters
            </div>
            <a href="/config" className="btn btn-secondary btn-sm">
              Open Configuration
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServerControl;
