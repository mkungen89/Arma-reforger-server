import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Scheduler.css';

function Scheduler({ userRole }) {
  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    type: 'server_restart',
    scheduleType: 'cron',
    cronExpression: '0 4 * * *',
    intervalMinutes: 60,
    executeAt: '',
    enabled: true,
    config: {}
  });

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    loadData();
    loadTaskTypes();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    try {
      const tasksRes = await axios.get('/api/tasks');
      setTasks(tasksRes.data.tasks || []);

      if (activeTab === 'history') {
        const historyRes = await axios.get('/api/tasks/history/all?limit=50');
        setHistory(historyRes.data.history || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading scheduler data:', error);
      setMessage({ type: 'error', text: 'Failed to load tasks' });
      setLoading(false);
    }
  };

  const loadTaskTypes = async () => {
    try {
      const response = await axios.get('/api/tasks/types/available');
      setTaskTypes(response.data.types || []);
    } catch (error) {
      console.error('Error loading task types:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();

    try {
      await axios.post('/api/tasks', formData);
      setMessage({ type: 'success', text: 'Task created successfully' });
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create task' });
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();

    try {
      await axios.put(`/api/tasks/${editingTask.id}`, formData);
      setMessage({ type: 'success', text: 'Task updated successfully' });
      setEditingTask(null);
      resetForm();
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update task' });
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.name}"?`)) return;

    try {
      await axios.delete(`/api/tasks/${task.id}`);
      setMessage({ type: 'success', text: 'Task deleted successfully' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete task' });
    }
  };

  const handleToggleTask = async (task) => {
    try {
      await axios.post(`/api/tasks/${task.id}/toggle`);
      setMessage({ type: 'success', text: `Task ${task.enabled ? 'disabled' : 'enabled'}` });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to toggle task' });
    }
  };

  const handleExecuteNow = async (task) => {
    if (!window.confirm(`Execute "${task.name}" immediately?`)) return;

    try {
      await axios.post(`/api/tasks/${task.id}/execute`);
      setMessage({ type: 'success', text: 'Task execution started' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to execute task' });
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      type: task.type,
      scheduleType: task.scheduleType,
      cronExpression: task.cronExpression || '0 4 * * *',
      intervalMinutes: task.intervalMinutes || 60,
      executeAt: task.executeAt || '',
      enabled: task.enabled,
      config: task.config || {}
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'server_restart',
      scheduleType: 'cron',
      cronExpression: '0 4 * * *',
      intervalMinutes: 60,
      executeAt: '',
      enabled: true,
      config: {}
    });
  };

  const getStatusBadge = (task) => {
    if (!task.lastStatus) return <span className="badge badge-gray">Never Run</span>;
    if (task.lastStatus === 'success') return <span className="badge badge-success">Success</span>;
    if (task.lastStatus === 'error') return <span className="badge badge-danger">Error</span>;
    return <span className="badge badge-info">{task.lastStatus}</span>;
  };

  const formatNextRun = (nextRun) => {
    if (!nextRun) return 'Not scheduled';
    const date = new Date(nextRun);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return 'Overdue';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes} minutes`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="scheduler">
      <div className="page-header">
        <h2>⏰ Automated Tasks & Scheduling</h2>
        <p>Schedule and automate server maintenance tasks</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{tasks.length}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{tasks.filter(t => t.enabled).length}</div>
          <div className="stat-label">Enabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-value">{tasks.reduce((sum, t) => sum + (t.executionCount || 0), 0)}</div>
          <div className="stat-label">Total Executions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{history.length}</div>
          <div className="stat-label">History Records</div>
        </div>
      </div>

      {/* Action Bar */}
      {isAdmin && (
        <div className="action-bar">
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setEditingTask(null);
              setShowCreateModal(true);
            }}
          >
            ➕ Create New Task
          </button>
          <button className="btn btn-secondary" onClick={loadData}>
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={activeTab === 'tasks' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('tasks')}
        >
          📋 Tasks ({tasks.length})
        </button>
        <button
          className={activeTab === 'history' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('history')}
        >
          📜 Execution History
        </button>
      </div>

      {/* Tasks List */}
      {activeTab === 'tasks' && (
        <div className="tasks-list">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No scheduled tasks</h3>
              <p>Create automated tasks to manage your server</p>
              {isAdmin && (
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                  Create First Task
                </button>
              )}
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className={`task-card ${!task.enabled ? 'disabled' : ''}`}>
                <div className="task-header">
                  <div className="task-info">
                    <h3>{task.name}</h3>
                    <span className="task-type">{task.type.replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                  <div className="task-status">
                    {getStatusBadge(task)}
                    {task.enabled ? (
                      <span className="badge badge-success">Enabled</span>
                    ) : (
                      <span className="badge badge-gray">Disabled</span>
                    )}
                  </div>
                </div>

                <div className="task-schedule">
                  <div className="schedule-info">
                    <strong>Schedule:</strong>{' '}
                    {task.scheduleType === 'cron' && `Cron: ${task.cronExpression}`}
                    {task.scheduleType === 'interval' && `Every ${task.intervalMinutes} minutes`}
                    {task.scheduleType === 'once' && `Once at ${new Date(task.executeAt).toLocaleString()}`}
                  </div>
                  {task.enabled && task.nextRun && (
                    <div className="next-run">
                      Next run: <strong>{formatNextRun(task.nextRun)}</strong>
                    </div>
                  )}
                </div>

                <div className="task-stats">
                  <span>Executions: <strong>{task.executionCount || 0}</strong></span>
                  {task.lastRun && (
                    <span>Last run: <strong>{new Date(task.lastRun).toLocaleString()}</strong></span>
                  )}
                  {task.lastError && (
                    <span className="error-text">Error: {task.lastError}</span>
                  )}
                </div>

                {isAdmin && (
                  <div className="task-actions">
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleExecuteNow(task)}
                    >
                      ▶️ Run Now
                    </button>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => handleEditTask(task)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className={`btn btn-sm ${task.enabled ? 'btn-secondary' : 'btn-success'}`}
                      onClick={() => handleToggleTask(task)}
                    >
                      {task.enabled ? '⏸️ Disable' : '▶️ Enable'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteTask(task)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Execution History */}
      {activeTab === 'history' && (
        <div className="history-list">
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <h3>No execution history</h3>
              <p>Task execution history will appear here</p>
            </div>
          ) : (
            history.map((exec, index) => (
              <div key={index} className={`history-item ${exec.status}`}>
                <div className="history-header">
                  <span className="history-icon">
                    {exec.status === 'completed' && '✅'}
                    {exec.status === 'failed' && '❌'}
                    {exec.status === 'running' && '🔄'}
                  </span>
                  <div className="history-info">
                    <strong>{exec.taskName}</strong>
                    <span className="history-type">{exec.taskType}</span>
                  </div>
                  <span className="history-time">
                    {new Date(exec.startTime).toLocaleString()}
                  </span>
                </div>
                {exec.output && (
                  <div className="history-output">
                    <pre>{exec.output}</pre>
                  </div>
                )}
                {exec.error && (
                  <div className="history-error">
                    Error: {exec.error}
                  </div>
                )}
                {exec.duration && (
                  <div className="history-duration">
                    Duration: {(exec.duration / 1000).toFixed(2)}s
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && isAdmin && (
        <div className="modal">
          <div className="modal-content large">
            <h3>{editingTask ? 'Edit Task' : 'Create New Task'}</h3>

            <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask}>
              <div className="form-group">
                <label>Task Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Daily Restart"
                  required
                />
              </div>

              <div className="form-group">
                <label>Task Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  {taskTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Schedule Type</label>
                <select
                  value={formData.scheduleType}
                  onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
                  required
                >
                  <option value="cron">Cron Expression</option>
                  <option value="interval">Interval (Minutes)</option>
                  <option value="once">One Time</option>
                </select>
              </div>

              {formData.scheduleType === 'cron' && (
                <div className="form-group">
                  <label>Cron Expression</label>
                  <input
                    type="text"
                    value={formData.cronExpression}
                    onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                    placeholder="0 4 * * * (Daily at 4 AM)"
                    required
                  />
                  <small>Format: minute hour day month weekday</small>
                </div>
              )}

              {formData.scheduleType === 'interval' && (
                <div className="form-group">
                  <label>Interval (Minutes)</label>
                  <input
                    type="number"
                    value={formData.intervalMinutes}
                    onChange={(e) => setFormData({ ...formData, intervalMinutes: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              )}

              {formData.scheduleType === 'once' && (
                <div className="form-group">
                  <label>Execute At</label>
                  <input
                    type="datetime-local"
                    value={formData.executeAt}
                    onChange={(e) => setFormData({ ...formData, executeAt: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                  {' '}Enable task immediately
                </label>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTask(null);
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
    </div>
  );
}

export default Scheduler;
