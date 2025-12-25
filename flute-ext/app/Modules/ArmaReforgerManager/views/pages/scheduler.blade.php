@extends('arma-reforger::layouts.admin')

@section('title', 'Task Scheduler')

@section('arma-content')
    <h1 style="margin: 0 0 24px 0;">Task Scheduler</h1>

    <div class="arma-card">
        <h2>Scheduled Tasks</h2>
        <button class="arma-btn" onclick="showCreateTask()" style="margin-bottom: 16px;">Create New Task</button>

        <div id="tasks-list">
            <p style="opacity: 0.7;">Loading tasks...</p>
        </div>
    </div>

    <div class="arma-card">
        <h2>Execution History (Last 50)</h2>
        <div id="history-list">
            <p style="opacity: 0.7;">Loading history...</p>
        </div>
    </div>

    <!-- Create/Edit Task Modal (simplified inline for now) -->
    <div id="task-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; padding: 40px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 24px; max-height: 80vh; overflow-y: auto;">
            <h2 style="margin-top: 0;">Create Task</h2>

            <label style="display: block; margin-top: 16px;">Task Name</label>
            <input type="text" id="task-name" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">

            <label style="display: block; margin-top: 16px;">Task Type</label>
            <select id="task-type" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
                <option value="server_restart">Server Restart</option>
                <option value="server_update">Server Update</option>
                <option value="backup">Create Backup</option>
                <option value="broadcast">Broadcast Message</option>
                <option value="kick_idle">Kick Idle Players</option>
                <option value="clear_logs">Clear Logs</option>
                <option value="mod_update">Update Mods</option>
                <option value="custom_command">Custom Command</option>
            </select>

            <label style="display: block; margin-top: 16px;">Schedule Type</label>
            <select id="schedule-type" onchange="updateScheduleInputs()" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
                <option value="cron">Cron Expression</option>
                <option value="interval">Interval (Minutes)</option>
                <option value="once">One Time</option>
            </select>

            <div id="schedule-input" style="margin-top: 16px;">
                <label style="display: block;">Cron Expression</label>
                <input type="text" id="schedule-value" placeholder="0 4 * * * (4 AM daily)" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
            </div>

            <div style="margin-top: 24px; display: flex; gap: 12px;">
                <button class="arma-btn" onclick="createTask()">Create</button>
                <button class="arma-btn arma-btn-secondary" onclick="hideCreateTask()">Cancel</button>
            </div>
        </div>
    </div>

    <script>
        async function loadTasks() {
            const result = await ArmaAPI.get('/api/scheduler/tasks');
            const tasksList = document.getElementById('tasks-list');

            if (result.ok && result.json.tasks) {
                const tasks = result.json.tasks;
                if (tasks.length === 0) {
                    tasksList.innerHTML = '<p style="opacity: 0.7;">No scheduled tasks</p>';
                } else {
                    tasksList.innerHTML = tasks.map(task => `
                        <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 12px; ${!task.enabled ? 'opacity: 0.5;' : ''}">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div style="flex: 1;">
                                    <strong style="font-size: 16px;">${task.name}</strong>
                                    <div style="opacity: 0.7; font-size: 13px; margin-top: 4px;">
                                        Type: ${task.type} · Schedule: ${task.scheduleType} (${task.schedule})
                                        ${task.nextRun ? `<br>Next run: ${new Date(task.nextRun).toLocaleString()}` : ''}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button class="arma-btn arma-btn-secondary" onclick="runTask('${task.id}')">Run Now</button>
                                    <button class="arma-btn ${task.enabled ? 'arma-btn-danger' : ''}" onclick="toggleTask('${task.id}', ${task.enabled})">${task.enabled ? 'Disable' : 'Enable'}</button>
                                    <button class="arma-btn arma-btn-danger" onclick="deleteTask('${task.id}')">Delete</button>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            } else {
                tasksList.innerHTML = '<p style="color: #dc3545;">Failed to load tasks</p>';
            }
        }

        async function loadHistory() {
            const result = await ArmaAPI.get('/api/scheduler/history?limit=50');
            const historyList = document.getElementById('history-list');

            if (result.ok && result.json.history) {
                const history = result.json.history;
                if (history.length === 0) {
                    historyList.innerHTML = '<p style="opacity: 0.7;">No execution history</p>';
                } else {
                    historyList.innerHTML = history.map(h => `
                        <div style="padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-bottom: 6px; font-size: 13px;">
                            <strong>${h.taskName || h.taskId}</strong> · ${new Date(h.executedAt).toLocaleString()}
                            <span style="color: ${h.success ? '#28a745' : '#dc3545'}; margin-left: 8px;">${h.success ? '✓' : '✗'}</span>
                            ${h.error ? `<div style="opacity: 0.7; margin-top: 4px;">Error: ${h.error}</div>` : ''}
                        </div>
                    `).join('');
                }
            } else {
                historyList.innerHTML = '<p style="opacity: 0.7;">Failed to load history</p>';
            }
        }

        async function runTask(id) {
            if (!confirm('Run this task now?')) return;

            const result = await ArmaAPI.post(`/api/scheduler/tasks/${id}/run`);
            if (result.ok) {
                alert('Task execution started');
                await loadHistory();
            } else {
                alert(`Failed: ${result.json.error || 'Unknown error'}`);
            }
        }

        async function toggleTask(id, currentlyEnabled) {
            const result = await ArmaAPI.post(`/api/scheduler/tasks/${id}/toggle`);
            if (result.ok) {
                await loadTasks();
            } else {
                alert(`Failed: ${result.json.error || 'Unknown error'}`);
            }
        }

        async function deleteTask(id) {
            if (!confirm('Delete this task?')) return;

            const result = await ArmaAPI.delete(`/api/scheduler/tasks/${id}`);
            if (result.ok) {
                await loadTasks();
            } else {
                alert(`Failed: ${result.json.error || 'Unknown error'}`);
            }
        }

        function showCreateTask() {
            document.getElementById('task-modal').style.display = 'block';
        }

        function hideCreateTask() {
            document.getElementById('task-modal').style.display = 'none';
        }

        function updateScheduleInputs() {
            const type = document.getElementById('schedule-type').value;
            const input = document.getElementById('schedule-input');

            if (type === 'cron') {
                input.innerHTML = `
                    <label style="display: block;">Cron Expression</label>
                    <input type="text" id="schedule-value" placeholder="0 4 * * * (4 AM daily)" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
                `;
            } else if (type === 'interval') {
                input.innerHTML = `
                    <label style="display: block;">Interval (Minutes)</label>
                    <input type="number" id="schedule-value" placeholder="60" min="1" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
                `;
            } else {
                input.innerHTML = `
                    <label style="display: block;">Date/Time</label>
                    <input type="datetime-local" id="schedule-value" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
                `;
            }
        }

        async function createTask() {
            const name = document.getElementById('task-name').value.trim();
            const type = document.getElementById('task-type').value;
            const scheduleType = document.getElementById('schedule-type').value;
            const schedule = document.getElementById('schedule-value').value.trim();

            if (!name || !schedule) {
                alert('Please fill in all fields');
                return;
            }

            const result = await ArmaAPI.post('/api/scheduler/tasks', {
                name,
                type,
                scheduleType,
                schedule,
                enabled: true
            });

            if (result.ok) {
                hideCreateTask();
                await loadTasks();
                // Reset form
                document.getElementById('task-name').value = '';
                document.getElementById('schedule-value').value = '';
            } else {
                alert(`Failed to create task: ${result.json.error || 'Unknown error'}`);
            }
        }

        loadTasks();
        loadHistory();
    </script>
@endsection
