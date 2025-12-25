const express = require('express');
const router = express.Router();
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getInternalApiKey } = require('./internalApiKey');
const { requireRole } = require('./auth');

// Scheduler UI/API should be admin-only
router.use(requireRole(['admin']));

const API_BASE = process.env.INTERNAL_API_BASE || `http://localhost:${process.env.PORT || 3001}`;
const internalHeaders = { headers: { 'x-internal-api-key': getInternalApiKey() } };

// Tasks storage
const tasksFile = path.join(__dirname, '../config/scheduled-tasks.json');
let scheduledTasks = new Map();
let tasks = [];

// Task execution history
const taskHistory = [];
const MAX_HISTORY = 500;

// Available task types
const TASK_TYPES = {
  SERVER_RESTART: 'server_restart',
  SERVER_UPDATE: 'server_update',
  BACKUP: 'backup',
  BROADCAST: 'broadcast',
  KICK_IDLE: 'kick_idle',
  CLEAR_LOGS: 'clear_logs',
  MOD_UPDATE: 'mod_update',
  CUSTOM_COMMAND: 'custom_command'
};

// Load tasks from file
function loadTasks() {
  try {
    if (fs.existsSync(tasksFile)) {
      const data = fs.readFileSync(tasksFile, 'utf8');
      tasks = JSON.parse(data);
      console.log(`Loaded ${tasks.length} scheduled tasks`);

      // Re-schedule all enabled tasks
      tasks.forEach(task => {
        if (task.enabled) {
          scheduleTask(task);
        }
      });
    } else {
      tasks = [];
      saveTasks();
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
    tasks = [];
  }
}

// Save tasks to file
function saveTasks() {
  try {
    const dir = path.dirname(tasksFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

// Schedule a task
function scheduleTask(task) {
  // Cancel existing schedule if exists
  if (scheduledTasks.has(task.id)) {
    scheduledTasks.get(task.id).cancel();
  }

  let job;

  if (task.scheduleType === 'cron') {
    // Cron schedule (e.g., "0 4 * * *" for daily at 4 AM)
    job = schedule.scheduleJob(task.cronExpression, () => executeTask(task));
  } else if (task.scheduleType === 'interval') {
    // Interval in minutes
    const rule = new schedule.RecurrenceRule();
    rule.minute = new schedule.Range(0, 59, task.intervalMinutes);
    job = schedule.scheduleJob(rule, () => executeTask(task));
  } else if (task.scheduleType === 'once') {
    // One-time execution at specific date/time
    job = schedule.scheduleJob(new Date(task.executeAt), () => {
      executeTask(task);
      // Disable after execution
      task.enabled = false;
      saveTasks();
    });
  }

  if (job) {
    scheduledTasks.set(task.id, job);
    console.log(`Scheduled task: ${task.name} (${task.scheduleType})`);
  }
}

// Execute a task
async function executeTask(task) {
  const execution = {
    taskId: task.id,
    taskName: task.name,
    taskType: task.type,
    startTime: new Date(),
    status: 'running',
    output: '',
    error: null
  };

  console.log(`Executing task: ${task.name}`);

  try {
    switch (task.type) {
      case TASK_TYPES.SERVER_RESTART:
        await executeServerRestart(task, execution);
        break;

      case TASK_TYPES.SERVER_UPDATE:
        await executeServerUpdate(task, execution);
        break;

      case TASK_TYPES.BACKUP:
        await executeBackup(task, execution);
        break;

      case TASK_TYPES.BROADCAST:
        await executeBroadcast(task, execution);
        break;

      case TASK_TYPES.KICK_IDLE:
        await executeKickIdle(task, execution);
        break;

      case TASK_TYPES.CLEAR_LOGS:
        await executeClearLogs(task, execution);
        break;

      case TASK_TYPES.MOD_UPDATE:
        await executeModUpdate(task, execution);
        break;

      case TASK_TYPES.CUSTOM_COMMAND:
        await executeCustomCommand(task, execution);
        break;

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }

    execution.status = 'completed';
    execution.output += `\nTask completed successfully`;
    task.lastRun = execution.startTime;
    task.lastStatus = 'success';
  } catch (error) {
    execution.status = 'failed';
    execution.error = error.message;
    task.lastStatus = 'error';
    task.lastError = error.message;
    console.error(`Task failed: ${task.name}`, error);
  }

  execution.endTime = new Date();
  execution.duration = execution.endTime - execution.startTime;

  // Add to history
  taskHistory.unshift(execution);
  if (taskHistory.length > MAX_HISTORY) {
    taskHistory.pop();
  }

  // Update task
  task.executionCount = (task.executionCount || 0) + 1;
  saveTasks();

  // Send notification if configured
  if (task.notifyOnComplete || (task.notifyOnError && execution.status === 'failed')) {
    sendNotification(task, execution);
  }
}

// Task execution functions
async function executeServerRestart(task, execution) {
  execution.output = 'Sending restart broadcast...';

  // Broadcast warning
  await axios.post(`${API_BASE}/api/players/broadcast`, {
    message: task.config?.warningMessage || 'Server will restart in 5 minutes!'
  }, internalHeaders);

  // Wait for warning period
  const waitMinutes = task.config?.warningMinutes || 5;
  execution.output += `\nWaiting ${waitMinutes} minutes...`;
  await new Promise(resolve => setTimeout(resolve, waitMinutes * 60 * 1000));

  // Stop server
  execution.output += '\nStopping server...';
  await axios.post(`${API_BASE}/api/server/stop`, null, internalHeaders);

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Start server
  execution.output += '\nStarting server...';
  await axios.post(`${API_BASE}/api/server/start`, null, internalHeaders);

  execution.output += '\nServer restarted successfully';
}

async function executeServerUpdate(task, execution) {
  execution.output = 'Starting server update...';

  // Stop server first
  try {
    await axios.post(`${API_BASE}/api/server/stop`, null, internalHeaders);
    execution.output += '\nServer stopped';
  } catch (error) {
    execution.output += '\nServer was not running';
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Run update
  execution.output += '\nRunning SteamCMD update...';
  await axios.post(`${API_BASE}/api/server/update`, null, internalHeaders);

  // Wait for update to complete (this is simplified - in reality you'd monitor the process)
  await new Promise(resolve => setTimeout(resolve, 60000));

  // Start server if configured
  if (task.config?.autoStart !== false) {
    execution.output += '\nStarting server...';
    await axios.post(`${API_BASE}/api/server/start`, null, internalHeaders);
  }

  execution.output += '\nUpdate completed';
}

async function executeBackup(task, execution) {
  execution.output = 'Starting backup...';

  // Trigger backup via API
  await axios.post(`${API_BASE}/api/backup/create`, {
    name: `scheduled_${new Date().toISOString().replace(/[:.]/g, '-')}`,
    includeConfig: task.config?.includeConfig !== false,
    includeMods: task.config?.includeMods !== false,
    includeProfiles: task.config?.includeProfiles !== false
  }, internalHeaders);

  execution.output += '\nBackup created successfully';
}

async function executeBroadcast(task, execution) {
  execution.output = `Broadcasting: "${task.config?.message}"`;

  await axios.post(`${API_BASE}/api/players/broadcast`, {
    message: task.config?.message || 'Scheduled broadcast message'
  }, internalHeaders);

  execution.output += '\nBroadcast sent';
}

async function executeKickIdle(task, execution) {
  execution.output = 'Checking for idle players...';

  const idleMinutes = task.config?.idleMinutes || 30;
  const response = await axios.get(`${API_BASE}/api/players/active`, internalHeaders);
  const players = response.data.players;

  let kickedCount = 0;
  for (const player of players) {
    const sessionMinutes = player.sessionDuration / 60;
    if (player.score === 0 && sessionMinutes > idleMinutes) {
      await axios.post(`http://localhost:3001/api/players/${player.steamId}/kick`, {
        reason: `Idle for ${Math.floor(sessionMinutes)} minutes`
      }, internalHeaders);
      kickedCount++;
    }
  }

  execution.output += `\nKicked ${kickedCount} idle players`;
}

async function executeClearLogs(task, execution) {
  execution.output = 'Clearing old logs...';

  await axios.delete(`${API_BASE}/api/logs`, internalHeaders);

  execution.output += '\nLogs cleared';
}

async function executeModUpdate(task, execution) {
  execution.output = 'Updating mods...';

  // Get all mods
  const response = await axios.get(`${API_BASE}/api/mods`, internalHeaders);
  const mods = response.data.mods || [];

  let updatedCount = 0;
  for (const mod of mods) {
    if (mod.enabled) {
      try {
        // Re-install to get latest version
        await axios.post(`${API_BASE}/api/mods/${mod.id}/install`, null, internalHeaders);
        updatedCount++;
      } catch (error) {
        execution.output += `\nFailed to update ${mod.name}: ${error.message}`;
      }
    }
  }

  execution.output += `\nUpdated ${updatedCount} mods`;
}

async function executeCustomCommand(task, execution) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  execution.output = `Executing command: ${task.config?.command}`;

  const result = await execPromise(task.config?.command, {
    cwd: task.config?.workingDirectory || process.cwd(),
    timeout: task.config?.timeout || 300000 // 5 min default
  });

  execution.output += `\nSTDOUT:\n${result.stdout}`;
  if (result.stderr) {
    execution.output += `\nSTDERR:\n${result.stderr}`;
  }
}

function sendNotification(task, execution) {
  // TODO: Implement notification system (Discord webhook, email, etc.)
  console.log(`[NOTIFICATION] Task ${task.name}: ${execution.status}`);
}

// API Routes

// Get all tasks
router.get('/tasks', (req, res) => {
  res.json({
    count: tasks.length,
    tasks: tasks.map(task => ({
      ...task,
      nextRun: scheduledTasks.has(task.id)
        ? scheduledTasks.get(task.id).nextInvocation()
        : null
    }))
  });
});

// Get task by ID
router.get('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({
    ...task,
    nextRun: scheduledTasks.has(task.id)
      ? scheduledTasks.get(task.id).nextInvocation()
      : null
  });
});

// Create new task (Admin only)
router.post('/tasks', (req, res) => {
  const { name, type, scheduleType, cronExpression, intervalMinutes, executeAt, config, enabled } = req.body;

  if (!name || !type || !scheduleType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const task = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    scheduleType, // 'cron', 'interval', 'once'
    cronExpression,
    intervalMinutes,
    executeAt,
    config: config || {},
    enabled: enabled !== false,
    createdAt: new Date(),
    createdBy: req.user?.displayName || 'Admin',
    executionCount: 0,
    lastRun: null,
    lastStatus: null,
    lastError: null,
    notifyOnComplete: false,
    notifyOnError: true
  };

  tasks.push(task);
  saveTasks();

  if (task.enabled) {
    scheduleTask(task);
  }

  res.json({
    success: true,
    message: 'Task created successfully',
    task
  });
});

// Update task (Admin only)
router.put('/tasks/:id', (req, res) => {
  const taskIndex = tasks.findIndex(t => t.id === req.params.id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = tasks[taskIndex];
  const wasEnabled = task.enabled;

  // Update task fields
  Object.assign(task, req.body);
  task.updatedAt = new Date();
  task.updatedBy = req.user?.displayName || 'Admin';

  saveTasks();

  // Re-schedule if necessary
  if (wasEnabled && scheduledTasks.has(task.id)) {
    scheduledTasks.get(task.id).cancel();
    scheduledTasks.delete(task.id);
  }

  if (task.enabled) {
    scheduleTask(task);
  }

  res.json({
    success: true,
    message: 'Task updated successfully',
    task
  });
});

// Delete task (Admin only)
router.delete('/tasks/:id', (req, res) => {
  const taskIndex = tasks.findIndex(t => t.id === req.params.id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = tasks[taskIndex];

  // Cancel schedule
  if (scheduledTasks.has(task.id)) {
    scheduledTasks.get(task.id).cancel();
    scheduledTasks.delete(task.id);
  }

  // Remove task
  tasks.splice(taskIndex, 1);
  saveTasks();

  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
});

// Execute task immediately (Admin only)
router.post('/tasks/:id/execute', async (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Execute in background
  executeTask(task);

  res.json({
    success: true,
    message: 'Task execution started'
  });
});

// Toggle task enabled status
router.post('/tasks/:id/toggle', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  task.enabled = !task.enabled;
  saveTasks();

  if (task.enabled) {
    scheduleTask(task);
  } else if (scheduledTasks.has(task.id)) {
    scheduledTasks.get(task.id).cancel();
    scheduledTasks.delete(task.id);
  }

  res.json({
    success: true,
    message: `Task ${task.enabled ? 'enabled' : 'disabled'}`,
    task
  });
});

// Get task execution history
router.get('/tasks/history/all', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  res.json({
    total: taskHistory.length,
    limit,
    offset,
    history: taskHistory.slice(offset, offset + limit)
  });
});

// Get history for specific task
router.get('/tasks/:id/history', (req, res) => {
  const history = taskHistory.filter(h => h.taskId === req.params.id);

  res.json({
    total: history.length,
    history
  });
});

// Get available task types
router.get('/tasks/types/available', (req, res) => {
  res.json({
    types: Object.entries(TASK_TYPES).map(([key, value]) => ({
      key,
      value,
      name: key.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
      description: getTaskTypeDescription(value)
    }))
  });
});

function getTaskTypeDescription(type) {
  const descriptions = {
    server_restart: 'Restart the game server with optional warning broadcast',
    server_update: 'Update server files via SteamCMD',
    backup: 'Create a backup of server files and configuration',
    broadcast: 'Send a message to all online players',
    kick_idle: 'Kick players who have been idle for too long',
    clear_logs: 'Clear server logs to free up space',
    mod_update: 'Update all enabled mods to latest versions',
    custom_command: 'Execute a custom shell command'
  };
  return descriptions[type] || 'No description available';
}

// Load tasks on startup
loadTasks();

module.exports = router;
