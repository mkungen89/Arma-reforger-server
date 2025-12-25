@extends('arma-reforger::layouts.admin')

@section('title', 'Server Logs')

@section('arma-content')
    <h1 style="margin: 0 0 24px 0;">Server Logs</h1>

    <div class="arma-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin: 0;">Live Logs</h2>
            <div style="display: flex; gap: 12px; align-items: center;">
                <label style="display: flex; align-items: center; gap: 8px; margin: 0;">
                    <input type="checkbox" id="auto-scroll" checked onchange="toggleAutoScroll()">
                    <span>Auto-scroll</span>
                </label>
                <select id="log-level" onchange="filterLogs()" style="padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
                    <option value="all">All Levels</option>
                    <option value="error">Errors Only</option>
                    <option value="warning">Warnings +</option>
                    <option value="info">Info +</option>
                </select>
                <button class="arma-btn arma-btn-secondary" onclick="clearLogs()">Clear Logs</button>
                <button class="arma-btn arma-btn-secondary" onclick="refreshLogs()">Refresh</button>
            </div>
        </div>

        <div id="logs-container" style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; font-family: 'Courier New', monospace; font-size: 13px; max-height: 600px; overflow-y: auto;">
            <div id="logs-content">
                <p style="opacity: 0.7;">Loading logs...</p>
            </div>
        </div>
    </div>

    <style>
        .log-line {
            margin-bottom: 4px;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .log-error {
            background: rgba(220, 53, 69, 0.1);
            color: #dc3545;
        }
        .log-warning {
            background: rgba(255, 193, 7, 0.1);
            color: #ffc107;
        }
        .log-info {
            color: rgba(255,255,255,0.9);
        }
        .log-debug {
            color: rgba(255,255,255,0.6);
        }
    </style>

    <script>
        let autoScroll = true;
        let currentLogs = [];

        async function refreshLogs() {
            const result = await ArmaAPI.get('/api/logs');
            const logsContent = document.getElementById('logs-content');

            if (result.ok && result.json.logs) {
                currentLogs = result.json.logs;
                filterLogs();
            } else {
                logsContent.innerHTML = '<p style="color: #dc3545;">Failed to load logs</p>';
            }
        }

        function filterLogs() {
            const level = document.getElementById('log-level').value;
            const logsContent = document.getElementById('logs-content');

            let filteredLogs = currentLogs;

            if (level !== 'all') {
                const levels = {
                    'error': ['error'],
                    'warning': ['error', 'warning'],
                    'info': ['error', 'warning', 'info']
                };
                filteredLogs = currentLogs.filter(log => levels[level].includes(log.level));
            }

            if (filteredLogs.length === 0) {
                logsContent.innerHTML = '<p style="opacity: 0.7;">No logs</p>';
                return;
            }

            logsContent.innerHTML = filteredLogs.map(log => {
                const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
                const levelClass = `log-${log.level || 'info'}`;
                return `
                    <div class="log-line ${levelClass}">
                        ${timestamp ? `<span style="opacity: 0.6;">[${timestamp}]</span> ` : ''}
                        <span style="opacity: 0.8;">[${(log.level || 'info').toUpperCase()}]</span>
                        ${log.message || log}
                    </div>
                `;
            }).join('');

            if (autoScroll) {
                const container = document.getElementById('logs-container');
                container.scrollTop = container.scrollHeight;
            }
        }

        function toggleAutoScroll() {
            autoScroll = document.getElementById('auto-scroll').checked;
        }

        async function clearLogs() {
            if (!confirm('Clear all server logs? This cannot be undone.')) return;

            const result = await ArmaAPI.delete('/api/logs');
            if (result.ok) {
                await refreshLogs();
            } else {
                alert(`Failed to clear logs: ${result.json.error || 'Unknown error'}`);
            }
        }

        // Initial load
        refreshLogs();

        // Auto-refresh every 5 seconds
        setInterval(refreshLogs, 5000);
    </script>
@endsection
