@extends('arma-reforger::layouts.admin')

@section('title', 'Live Player Management')

@section('arma-content')
    <h1 style="margin: 0 0 24px 0;">Live Player Management</h1>

    <div class="arma-card">
        <h2>Online Players</h2>
        <div id="players-list">
            <p style="opacity: 0.7;">Loading players...</p>
        </div>
    </div>

    <div class="arma-card">
        <h2>Ban List</h2>
        <div id="ban-list">
            <p style="opacity: 0.7;">Loading bans...</p>
        </div>
    </div>

    <script>
        (async function() {
            // Load online players
            const playersResult = await ArmaAPI.get('/api/players');
            const playersList = document.getElementById('players-list');

            if (playersResult.ok && playersResult.json.players) {
                const players = playersResult.json.players;
                if (players.length === 0) {
                    playersList.innerHTML = '<p style="opacity: 0.7;">No players online</p>';
                } else {
                    playersList.innerHTML = players.map(p => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 8px;">
                            <div>
                                <strong>${p.name || 'Unknown'}</strong>
                                <span style="opacity: 0.6; margin-left: 8px;">(${p.steamId || 'N/A'})</span>
                                ${p.ping ? `<span style="opacity: 0.6; margin-left: 8px;">Ping: ${p.ping}ms</span>` : ''}
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="arma-btn arma-btn-secondary" onclick="sendMessage('${p.steamId}', '${p.name}')">Message</button>
                                <button class="arma-btn arma-btn-secondary" onclick="kickPlayer('${p.steamId}', '${p.name}')">Kick</button>
                                <button class="arma-btn arma-btn-danger" onclick="banPlayer('${p.steamId}', '${p.name}')">Ban</button>
                            </div>
                        </div>
                    `).join('');
                }
            } else {
                playersList.innerHTML = '<p style="color: #dc3545;">Failed to load players</p>';
            }

            // Load ban list
            const bansResult = await ArmaAPI.get('/api/players/bans');
            const banList = document.getElementById('ban-list');

            if (bansResult.ok && bansResult.json.bans) {
                const bans = bansResult.json.bans;
                if (bans.length === 0) {
                    banList.innerHTML = '<p style="opacity: 0.7;">No active bans</p>';
                } else {
                    banList.innerHTML = bans.map(b => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 8px;">
                            <div>
                                <strong>${b.name || 'Unknown'}</strong>
                                <span style="opacity: 0.6; margin-left: 8px;">(${b.steamId || 'N/A'})</span>
                                ${b.reason ? `<span style="opacity: 0.6; margin-left: 8px;">- ${b.reason}</span>` : ''}
                                ${b.expiresAt ? `<span style="opacity: 0.6; margin-left: 8px;">Expires: ${new Date(b.expiresAt).toLocaleString()}</span>` : '<span style="opacity: 0.6; margin-left: 8px;">Permanent</span>'}
                            </div>
                            <button class="arma-btn arma-btn-secondary" onclick="unbanPlayer('${b.steamId}', '${b.name}')">Unban</button>
                        </div>
                    `).join('');
                }
            } else {
                banList.innerHTML = '<p style="opacity: 0.7;">Failed to load bans</p>';
            }
        })();

        async function kickPlayer(steamId, name) {
            const reason = prompt(`Kick ${name}?\n\nReason (optional):`);
            if (reason === null) return; // Cancelled

            const result = await ArmaAPI.post('/api/players/kick', { steamId, reason });
            if (result.ok) {
                alert(`${name} has been kicked`);
                location.reload();
            } else {
                alert(`Failed to kick player: ${result.json.error || 'Unknown error'}`);
            }
        }

        async function banPlayer(steamId, name) {
            const reason = prompt(`Ban ${name}?\n\nReason (required):`);
            if (!reason) return;

            const duration = prompt('Ban duration in hours (leave empty for permanent):');
            const durationHours = duration ? parseInt(duration) : null;

            const result = await ArmaAPI.post('/api/players/ban', { steamId, reason, durationHours });
            if (result.ok) {
                alert(`${name} has been banned`);
                location.reload();
            } else {
                alert(`Failed to ban player: ${result.json.error || 'Unknown error'}`);
            }
        }

        async function unbanPlayer(steamId, name) {
            if (!confirm(`Unban ${name}?`)) return;

            const result = await ArmaAPI.post('/api/players/unban', { steamId });
            if (result.ok) {
                alert(`${name} has been unbanned`);
                location.reload();
            } else {
                alert(`Failed to unban player: ${result.json.error || 'Unknown error'}`);
            }
        }

        async function sendMessage(steamId, name) {
            const message = prompt(`Send private message to ${name}:`);
            if (!message) return;

            const result = await ArmaAPI.post('/api/players/message', { steamId, message });
            if (result.ok) {
                alert('Message sent');
            } else {
                alert(`Failed to send message: ${result.json.error || 'Unknown error'}`);
            }
        }
    </script>
@endsection
