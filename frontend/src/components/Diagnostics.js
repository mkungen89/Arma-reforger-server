import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Diagnostics() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [knownIssues, setKnownIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadKnownIssues();
  }, []);

  const loadKnownIssues = async () => {
    try {
      const response = await axios.get('/api/diagnostics/issues');
      setKnownIssues(response.data);
    } catch (error) {
      console.error('Error loading known issues:', error);
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.get('/api/diagnostics/run');
      setDiagnostics(response.data);

      if (response.data.status === 'healthy') {
        setMessage({ type: 'success', text: 'All checks passed! Server is healthy.' });
      } else if (response.data.status === 'warning') {
        setMessage({ type: 'warning', text: 'Some warnings detected. Review the results below.' });
      } else {
        setMessage({ type: 'error', text: 'Issues detected. Review the results below.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to run diagnostics' });
    }

    setLoading(false);
  };

  const handleAutoFix = async (issueId) => {
    try {
      const response = await axios.post(`/api/diagnostics/autofix/${issueId}`);
      setMessage({ type: 'success', text: response.data.message });
      runDiagnostics();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to apply auto-fix',
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass':
        return '#10b981';
      case 'fail':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#4fc3f7';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Diagnostics</h2>
        <p>Troubleshoot server issues and check system health</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Run System Diagnostics</h3>
          <button
            className="btn btn-primary"
            onClick={runDiagnostics}
            disabled={loading}
          >
            {loading ? '🔄 Running...' : '🔍 Run Diagnostics'}
          </button>
        </div>

        {diagnostics && (
          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                padding: '15px',
                borderRadius: '8px',
                background:
                  diagnostics.status === 'healthy'
                    ? 'rgba(16, 185, 129, 0.1)'
                    : diagnostics.status === 'warning'
                    ? 'rgba(245, 158, 11, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${
                  diagnostics.status === 'healthy'
                    ? '#10b981'
                    : diagnostics.status === 'warning'
                    ? '#f59e0b'
                    : '#ef4444'
                }`,
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '5px' }}>
                Overall Status: {diagnostics.status.toUpperCase()}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>
                Checked at: {new Date(diagnostics.timestamp).toLocaleString()}
              </div>
            </div>

            <h4 style={{ fontSize: '16px', marginBottom: '15px', color: '#e8e8e8' }}>
              Check Results
            </h4>

            <div style={{ display: 'grid', gap: '10px' }}>
              {diagnostics.checks.map((check, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '15px',
                    background: '#0f1419',
                    borderRadius: '8px',
                    border: `1px solid ${getStatusColor(check.status)}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{getStatusIcon(check.status)}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#e8e8e8' }}>
                        {check.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#718096' }}>{check.details}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {diagnostics.issues && diagnostics.issues.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '16px', marginBottom: '15px', color: '#ef4444' }}>
                  ⚠️ Issues Detected
                </h4>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {diagnostics.issues.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '15px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid #ef4444',
                      }}
                    >
                      {item.issue && (
                        <>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#ef4444', marginBottom: '10px' }}>
                            {item.issue.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#718096', marginBottom: '10px' }}>
                            Related to: {item.check}
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#e8e8e8', marginBottom: '5px' }}>
                              Solutions:
                            </div>
                            <ul style={{ marginLeft: '20px', fontSize: '13px', color: '#cbd5e0' }}>
                              {item.issue.solutions.map((solution, sIdx) => (
                                <li key={sIdx} style={{ marginBottom: '5px' }}>
                                  {solution}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {['missing_files', 'mod_conflict', 'disk_space'].includes(item.issue.id) && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => handleAutoFix(item.issue.id)}
                            >
                              🔧 Try Auto-Fix
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Common Issues & Solutions</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '15px' }}>
          {knownIssues.map((issue, idx) => (
            <details
              key={idx}
              style={{
                padding: '15px',
                background: '#0f1419',
                borderRadius: '8px',
                border: '1px solid #2d3748',
              }}
            >
              <summary style={{ fontSize: '14px', fontWeight: '600', color: '#e8e8e8', cursor: 'pointer' }}>
                {issue.title}
              </summary>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '10px' }}>
                  <strong>Symptoms:</strong>
                  <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                    {issue.symptoms.map((symptom, sIdx) => (
                      <li key={sIdx}>{symptom}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ fontSize: '13px', color: '#cbd5e0' }}>
                  <strong>Solutions:</strong>
                  <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                    {issue.solutions.map((solution, sIdx) => (
                      <li key={sIdx}>{solution}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Diagnostics;
