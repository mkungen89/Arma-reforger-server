@extends('arma-reforger::layouts.admin')

@section('title', 'Server Configuration')

@section('arma-content')
    <h1 style="margin: 0 0 24px 0;">Server Configuration</h1>

    <div class="arma-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin: 0;">Configuration</h2>
            <div style="display: flex; gap: 12px;">
                <button class="arma-btn arma-btn-secondary" onclick="runDiagnostics()">Run Diagnostics</button>
                <button class="arma-btn" onclick="saveConfig()">Save Changes</button>
            </div>
        </div>

        <div id="config-form">
            <p style="opacity: 0.7;">Loading configuration...</p>
        </div>

        <div id="save-status" style="margin-top: 16px; opacity: 0.9;"></div>
    </div>

    <div class="arma-card">
        <h2>Diagnostics Results</h2>
        <div id="diagnostics-results">
            <p style="opacity: 0.7;">Run diagnostics to see results</p>
        </div>
    </div>

    <style>
        .config-field {
            margin-bottom: 20px;
        }
        .config-field label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            opacity: 0.9;
        }
        .config-field input,
        .config-field select {
            width: 100%;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(0,0,0,0.2);
            color: inherit;
        }
        .config-field .hint {
            font-size: 12px;
            opacity: 0.6;
            margin-top: 4px;
        }
    </style>

    <script>
        let currentConfig = {};

        async function loadConfig() {
            const result = await ArmaAPI.get('/api/config');
            const configForm = document.getElementById('config-form');

            if (result.ok && result.json) {
                currentConfig = result.json;

                configForm.innerHTML = `
                    <div class="config-field">
                        <label>Server Path</label>
                        <input type="text" id="config-serverPath" value="${currentConfig.serverPath || ''}" />
                        <div class="hint">Path to Arma Reforger server installation</div>
                    </div>

                    <div class="config-field">
                        <label>SteamCMD Path</label>
                        <input type="text" id="config-steamCmdPath" value="${currentConfig.steamCmdPath || ''}" />
                        <div class="hint">Path to SteamCMD installation</div>
                    </div>

                    <div class="config-field">
                        <label>Server Name</label>
                        <input type="text" id="config-serverName" value="${currentConfig.serverName || ''}" />
                    </div>

                    <div class="config-field">
                        <label>Server Port (UDP)</label>
                        <input type="number" id="config-serverPort" value="${currentConfig.serverPort || 2001}" min="1" max="65535" />
                    </div>

                    <div class="config-field">
                        <label>Max Players</label>
                        <input type="number" id="config-maxPlayers" value="${currentConfig.maxPlayers || 32}" min="1" max="128" />
                    </div>

                    <div class="config-field">
                        <label>Server Password (optional)</label>
                        <input type="password" id="config-password" value="${currentConfig.password || ''}" />
                        <div class="hint">Leave empty for public server</div>
                    </div>

                    <div class="config-field">
                        <label>Admin Password</label>
                        <input type="password" id="config-adminPassword" value="${currentConfig.adminPassword || ''}" />
                        <div class="hint">Password for in-game admin access</div>
                    </div>

                    <div class="config-field">
                        <label>Steam API Key</label>
                        <input type="password" id="config-steamApiKey" value="${currentConfig.steamApiKey ? '********' : ''}" placeholder="Enter new key to update" />
                        <div class="hint">Required for Steam authentication. Get from: <a href="https://steamcommunity.com/dev/apikey" target="_blank" style="color: #ff6b00;">steamcommunity.com/dev/apikey</a></div>
                    </div>

                    <div class="config-field">
                        <label>Web UI Port</label>
                        <input type="number" id="config-webUIPort" value="${currentConfig.webUIPort || 3001}" min="1" max="65535" />
                        <div class="hint">Port for Node backend API</div>
                    </div>
                `;
            } else {
                configForm.innerHTML = '<p style="color: #dc3545;">Failed to load configuration</p>';
            }
        }

        async function saveConfig() {
            const statusEl = document.getElementById('save-status');
            statusEl.innerHTML = '<span style="color: #ff6b00;">Saving configuration...</span>';

            const config = {
                serverPath: document.getElementById('config-serverPath').value,
                steamCmdPath: document.getElementById('config-steamCmdPath').value,
                serverName: document.getElementById('config-serverName').value,
                serverPort: parseInt(document.getElementById('config-serverPort').value),
                maxPlayers: parseInt(document.getElementById('config-maxPlayers').value),
                password: document.getElementById('config-password').value,
                adminPassword: document.getElementById('config-adminPassword').value,
                webUIPort: parseInt(document.getElementById('config-webUIPort').value)
            };

            // Only include Steam API key if it's been changed
            const steamApiKeyInput = document.getElementById('config-steamApiKey').value;
            if (steamApiKeyInput && steamApiKeyInput !== '********') {
                config.steamApiKey = steamApiKeyInput;
            }

            const result = await ArmaAPI.put('/api/config', config);
            if (result.ok) {
                statusEl.innerHTML = '<span style="color: #28a745;">✓ Configuration saved successfully! Restart the server for changes to take effect.</span>';
                await loadConfig();
            } else {
                statusEl.innerHTML = `<span style="color: #dc3545;">Failed to save: ${result.json.error || 'Unknown error'}</span>`;
            }
        }

        async function runDiagnostics() {
            const resultsEl = document.getElementById('diagnostics-results');
            resultsEl.innerHTML = '<p style="opacity: 0.7;">Running diagnostics...</p>';

            const result = await ArmaAPI.get('/api/diagnostics/run');
            if (result.ok && result.json.issues) {
                const issues = result.json.issues;
                if (issues.length === 0) {
                    resultsEl.innerHTML = '<p style="color: #28a745;">✓ No issues found!</p>';
                } else {
                    resultsEl.innerHTML = issues.map(issue => `
                        <div style="padding: 12px; background: ${issue.severity === 'error' ? 'rgba(220,53,69,0.1)' : 'rgba(255,193,7,0.1)'}; border-left: 3px solid ${issue.severity === 'error' ? '#dc3545' : '#ffc107'}; border-radius: 6px; margin-bottom: 12px;">
                            <strong style="display: block; margin-bottom: 6px;">${issue.title || issue.id}</strong>
                            <div style="opacity: 0.85; font-size: 14px; margin-bottom: 8px;">${issue.description || ''}</div>
                            ${issue.solution ? `<div style="opacity: 0.7; font-size: 13px;">💡 ${issue.solution}</div>` : ''}
                            ${issue.autofix ? `
                                <button class="arma-btn arma-btn-secondary" onclick="autofix('${issue.id}')" style="margin-top: 8px; padding: 6px 12px; font-size: 13px;">
                                    Auto-fix
                                </button>
                            ` : ''}
                        </div>
                    `).join('');
                }
            } else {
                resultsEl.innerHTML = '<p style="color: #dc3545;">Failed to run diagnostics</p>';
            }
        }

        async function autofix(issueId) {
            const resultsEl = document.getElementById('diagnostics-results');

            const result = await ArmaAPI.post(`/api/diagnostics/autofix/${issueId}`);
            if (result.ok) {
                alert('Auto-fix applied successfully!');
                await runDiagnostics();
            } else {
                alert(`Failed to apply auto-fix: ${result.json.error || 'Unknown error'}`);
            }
        }

        loadConfig();
    </script>
@endsection
