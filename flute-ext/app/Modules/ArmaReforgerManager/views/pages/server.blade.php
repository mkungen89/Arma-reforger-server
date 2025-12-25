@extends('arma-reforger::layouts.admin')

@section('title', 'Server Control')

@section('arma-content')
    <h1 style="margin: 0 0 24px 0;">Server Control</h1>

    <!-- Server Actions -->
    <div class="arma-card">
        <h2>Control Actions</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
            <button class="arma-btn" id="btn-start">Start Server</button>
            <button class="arma-btn" id="btn-stop">Stop Server</button>
            <button class="arma-btn" id="btn-restart">Restart Server</button>
            <button class="arma-btn arma-btn-secondary" id="btn-update">Update via SteamCMD</button>
            <button class="arma-btn arma-btn-secondary" id="btn-refresh">Refresh Status</button>
        </div>
        <div id="action-response" style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; display: none; margin-top: 12px;"></div>
    </div>

    <!-- Current Status -->
    <div class="arma-card">
        <h2>Current Status</h2>
        <div id="server-status">
            <p style="opacity: 0.7;">Loading...</p>
        </div>
    </div>

    <!-- Live Logs -->
    <div class="arma-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin: 0;">Live Server Logs</h2>
            <label style="display: flex; align-items: center; gap: 8px; margin: 0;">
                <input type="checkbox" id="auto-scroll" checked onchange="toggleAutoScroll()">
                <span>Auto-scroll</span>
            </label>
        </div>
        <div id="logs-container" style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; font-family: 'Courier New', monospace; font-size: 13px; max-height: 400px; overflow-y: auto;">
            <div id="logs-content">
                <p style="opacity: 0.7;">Logs will appear here when server is running...</p>
            </div>
        </div>
    </div>

    <script>
        let autoScroll = true;

        async function refreshStatus() {
            const result = await ArmaAPI.get('/api/status');
            const statusEl = document.getElementById('server-status');

            if (result.ok) {
                const s = result.json;
                const statusColor = s.running ? '#28a745' : '#6c757d';
                statusEl.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div>
                            <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">Status</div>
                            <div style="font-size: 20px; font-weight: 600; color: ${statusColor};">
                                ${s.running ? '● ONLINE' : '○ OFFLINE'}
                            </div>
                        </div>
                        ${s.pid ? `
                            <div>
                                <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">Process ID</div>
                                <div style="font-size: 20px; font-weight: 600;">${s.pid}</div>
                            </div>
                        ` : ''}
                        ${s.uptime ? `
                            <div>
                                <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">Uptime</div>
                                <div style="font-size: 20px; font-weight: 600;">${formatUptime(s.uptime)}</div>
                            </div>
                        ` : ''}
                        ${s.lastStartAt ? `
                            <div>
                                <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">Last Started</div>
                                <div style="font-size: 14px;">${new Date(s.lastStartAt).toLocaleString()}</div>
                            </div>
                        ` : ''}
                    </div>
                    ${s.lastError ? `
                        <div style="margin-top: 16px; padding: 12px; background: rgba(220,53,69,0.1); border-left: 3px solid #dc3545; border-radius: 6px;">
                            <strong>Last Error:</strong> ${s.lastError}
                        </div>
                    ` : ''}
                `;

                // Update button states
                const canStart = !s.running;
                const canStop = s.running;
                document.getElementById('btn-start').disabled = !canStart;
                document.getElementById('btn-stop').disabled = !canStop;
                document.getElementById('btn-restart').disabled = !canStop;
            } else {
                statusEl.innerHTML = '<p style="color: #dc3545;">Failed to load status</p>';
            }
        }

        async function doAction(action, endpoint) {
            const responseEl = document.getElementById('action-response');
            responseEl.style.display = 'block';
            responseEl.innerHTML = `<span style="color: #ff6b00;">Executing ${action}...</span>`;

            const result = await ArmaAPI.post(endpoint);

            if (result.ok) {
                responseEl.innerHTML = `<span style="color: #28a745;">✓ ${result.json.message || 'Success'}</span>`;
                setTimeout(() => { responseEl.style.display = 'none'; }, 5000);
            } else {
                responseEl.innerHTML = `<span style="color: #dc3545;">✗ ${result.json.error || 'Failed'}</span>`;
            }

            await refreshStatus();
            if (action === 'Start') {
                // Wait a bit then start log polling
                setTimeout(startLogPolling, 2000);
            }
        }

        async function refreshLogs() {
            const result = await ArmaAPI.get('/api/logs');
            const logsContent = document.getElementById('logs-content');

            if (result.ok && result.json.logs && result.json.logs.length > 0) {
                const logs = result.json.logs.slice(-50); // Last 50 lines
                logsContent.innerHTML = logs.map(log => {
                    const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
                    const level = log.level || 'info';
                    const levelColor = {
                        'error': '#dc3545',
                        'warning': '#ffc107',
                        'info': 'rgba(255,255,255,0.9)',
                        'debug': 'rgba(255,255,255,0.6)'
                    }[level] || 'rgba(255,255,255,0.9)';

                    return `
                        <div style="margin-bottom: 4px; color: ${levelColor};">
                            ${timestamp ? `<span style="opacity: 0.6;">[${timestamp}]</span> ` : ''}
                            ${log.message || log}
                        </div>
                    `;
                }).join('');

                if (autoScroll) {
                    const container = document.getElementById('logs-container');
                    container.scrollTop = container.scrollHeight;
                }
            }
        }

        function toggleAutoScroll() {
            autoScroll = document.getElementById('auto-scroll').checked;
        }

        function formatUptime(seconds) {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);

            if (days > 0) return `${days}d ${hours}h ${minutes}m`;
            if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m`;
        }

        let logPolling;

        function startLogPolling() {
            if (logPolling) clearInterval(logPolling);
            logPolling = setInterval(refreshLogs, 3000);
        }

        // Event listeners
        document.getElementById('btn-start').addEventListener('click', () => doAction('Start', '/api/server/start'));
        document.getElementById('btn-stop').addEventListener('click', () => doAction('Stop', '/api/server/stop'));
        document.getElementById('btn-restart').addEventListener('click', () => doAction('Restart', '/api/server/restart'));
        document.getElementById('btn-update').addEventListener('click', () => {
            if (confirm('Update server via SteamCMD? The server will be stopped during the update.')) {
                doAction('Update', '/api/server/update');
            }
        });
        document.getElementById('btn-refresh').addEventListener('click', refreshStatus);

        // Initial load
        refreshStatus();
        refreshLogs();

        // Auto-refresh status every 10 seconds
        setInterval(refreshStatus, 10000);

        // Start log polling
        startLogPolling();
    </script>
@endsection


