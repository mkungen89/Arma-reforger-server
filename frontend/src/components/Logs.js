import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function Logs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef(null);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    loadLogs();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port || 3001}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'log') {
        setLogs((prev) => [...prev, data.data]);
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const loadLogs = async () => {
    try {
      const response = await axios.get('/api/logs', {
        params: { limit: 500 },
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all logs?')) return;

    try {
      await axios.delete('/api/logs');
      setLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  };

  const handleExportLogs = () => {
    const logText = filteredLogs
      .map((log) => `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const getLevelColor = (level) => {
    switch (level) {
      case 'error':
        return '#ef4444';
      case 'warn':
        return '#f59e0b';
      case 'info':
        return '#4fc3f7';
      default:
        return '#718096';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return '❌';
      case 'warn':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Server Logs</h2>
        <p>Real-time server logs and output</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', color: '#cbd5e0' }}>Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                background: '#0f1419',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                color: '#e8e8e8',
                fontSize: '13px',
              }}
            >
              <option value="all">All Logs</option>
              <option value="info">Info</option>
              <option value="warn">Warnings</option>
              <option value="error">Errors</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#cbd5e0', marginLeft: '15px' }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Auto-scroll
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleExportLogs}>
              📥 Export
            </button>
            <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleClearLogs}>
              🗑️ Clear
            </button>
          </div>
        </div>

        <div
          style={{
            background: '#0a0e12',
            border: '1px solid #2d3748',
            borderRadius: '8px',
            padding: '15px',
            maxHeight: '600px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '13px',
          }}
        >
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
              No logs available
            </div>
          ) : (
            <>
              {filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 0',
                    borderBottom: idx < filteredLogs.length - 1 ? '1px solid #1a1f26' : 'none',
                    display: 'flex',
                    gap: '10px',
                  }}
                >
                  <span style={{ color: '#4a5568', minWidth: '160px', fontSize: '12px' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span style={{ color: getLevelColor(log.level), minWidth: '20px' }}>
                    {getLevelIcon(log.level)}
                  </span>
                  <span style={{ color: '#cbd5e0', flex: 1, wordBreak: 'break-word' }}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </>
          )}
        </div>

        <div style={{ marginTop: '15px', fontSize: '13px', color: '#718096', display: 'flex', justifyContent: 'space-between' }}>
          <span>Total logs: {logs.length}</span>
          <span>Filtered: {filteredLogs.length}</span>
        </div>
      </div>
    </div>
  );
}

export default Logs;
