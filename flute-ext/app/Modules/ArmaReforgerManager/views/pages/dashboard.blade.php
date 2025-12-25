@extends('arma-reforger::layouts.admin')

@section('title', 'Dashboard')

@section('arma-content')
    <h1 style="margin: 0 0 24px 0;">Dashboard</h1>

    <!-- Server Status -->
    <div class="arma-card">
        <h2>Server Status</h2>
        <div id="server-status">
            <p style="opacity: 0.7;">Loading...</p>
        </div>
    </div>

    <!-- System Resources -->
    <div class="arma-card">
        <h2>System Resources</h2>
        <div id="system-stats">
            <p style="opacity: 0.7;">Loading...</p>
        </div>
    </div>

    <!-- Quick Actions -->
    <div class="arma-card">
        <h2>Quick Actions</h2>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <a href="/arma/server" class="arma-btn">Server Control</a>
            <a href="/arma/players" class="arma-btn arma-btn-secondary">Player Management</a>
            <a href="/arma/mods" class="arma-btn arma-btn-secondary">Mod Manager</a>
            <a href="/arma/logs" class="arma-btn arma-btn-secondary">View Logs</a>
            <a href="/battlelog" class="arma-btn arma-btn-secondary" target="_blank">Public Battlelog</a>
        </div>
    </div>

    <!-- Environment Warnings -->
    <div id="env-warnings"></div>

    <script>
        async function refreshDashboard() {
            // Load server status
            const statusResult = await ArmaAPI.get('/api/status');
            const statusEl = document.getElementById('server-status');

            if (statusResult.ok) {
                const s = statusResult.json;
                const statusColor = s.running ? '#28a745' : '#6c757d';
                statusEl.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div>
                            <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">Status</div>
                            <div style="font-size: 18px; font-weight: 600; color: ${statusColor};">
                                ${s.running ? '● ONLINE' : '○ OFFLINE'}
                            </div>
                        </div>
                        ${s.pid ? `
                            <div>
                                <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">Process ID</div>
                                <div style="font-size: 18px; font-weight: 600;">${s.pid}</div>
                            </div>
                        ` : ''}
                        ${s.uptime ? `
                            <div>
                                <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">Uptime</div>
                                <div style="font-size: 18px; font-weight: 600;">${formatUptime(s.uptime)}</div>
                            </div>
                        ` : ''}
                        ${s.players !== undefined ? `
                            <div>
                                <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">Players</div>
                                <div style="font-size: 18px; font-weight: 600;">${s.players.current || 0}/${s.players.max || 0}</div>
                            </div>
                        ` : ''}
                    </div>
                    ${s.lastError ? `
                        <div style="margin-top: 16px; padding: 12px; background: rgba(220,53,69,0.1); border-left: 3px solid #dc3545; border-radius: 6px;">
                            <strong>Last Error:</strong> ${s.lastError}
                        </div>
                    ` : ''}
                `;
            } else {
                statusEl.innerHTML = '<p style="color: #dc3545;">Failed to load server status</p>';
            }

            // Load system stats
            const systemResult = await ArmaAPI.get('/api/system/info');
            const systemEl = document.getElementById('system-stats');

            if (systemResult.ok && systemResult.json) {
                const sys = systemResult.json;
                systemEl.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        ${sys.cpu ? `
                            <div>
                                <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">CPU Usage</div>
                                <div style="font-size: 18px; font-weight: 600;">${sys.cpu.toFixed(1)}%</div>
                                <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; margin-top: 6px; overflow: hidden;">
                                    <div style="background: #ff6b00; height: 100%; width: ${sys.cpu}%;"></div>
                                </div>
                            </div>
                        ` : ''}
                        ${sys.memory ? `
                            <div>
                                <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">Memory Usage</div>
                                <div style="font-size: 18px; font-weight: 600;">${sys.memory.toFixed(1)}%</div>
                                <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; margin-top: 6px; overflow: hidden;">
                                    <div style="background: #ff6b00; height: 100%; width: ${sys.memory}%;"></div>
                                </div>
                            </div>
                        ` : ''}
                        ${sys.disk ? `
                            <div>
                                <div style="opacity: 0.7; font-size: 13px; margin-bottom: 4px;">Disk Usage</div>
                                <div style="font-size: 18px; font-weight: 600;">${sys.disk.toFixed(1)}%</div>
                                <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; margin-top: 6px; overflow: hidden;">
                                    <div style="background: #ff6b00; height: 100%; width: ${sys.disk}%;"></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                systemEl.innerHTML = '<p style="opacity: 0.7;">System stats unavailable</p>';
            }

            // Check for environment warnings
            const envResult = await ArmaAPI.get('/api/env');
            const warningsEl = document.getElementById('env-warnings');

            if (envResult.ok && envResult.json.warnings && envResult.json.warnings.length > 0) {
                warningsEl.innerHTML = `
                    <div class="arma-card" style="background: rgba(255,193,7,0.1); border-color: #ffc107;">
                        <h2 style="color: #ffc107;">⚠️ Environment Warnings</h2>
                        ${envResult.json.warnings.map(w => `<div style="opacity: 0.9; margin-bottom: 8px;">• ${w}</div>`).join('')}
                    </div>
                `;
            } else {
                warningsEl.innerHTML = '';
            }
        }

        function formatUptime(seconds) {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);

            if (days > 0) return `${days}d ${hours}h ${minutes}m`;
            if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m`;
        }

        refreshDashboard();
        // Auto-refresh every 30 seconds
        setInterval(refreshDashboard, 30000);
    </script>
@endsection


