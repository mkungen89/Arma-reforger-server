@extends('flute::layouts.app')

@section('title', 'Battlelog - Arma Reforger')

@push('header')
<meta name="description" content="Live Arma Reforger server statistics, leaderboards, player profiles, and match history">
<meta property="og:title" content="Arma Reforger Battlelog">
<meta property="og:description" content="Live server statistics and player rankings">
<meta property="og:type" content="website">
@endpush

@section('content')
<style>
    .battlelog-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 24px 16px;
        background: linear-gradient(180deg, rgba(30,30,30,0.9) 0%, rgba(15,15,15,0.95) 100%);
        min-height: 100vh;
    }
    .bf3-header {
        background: linear-gradient(90deg, #ff6b00 0%, #ff8533 100%);
        padding: 20px 24px;
        border-radius: 8px;
        margin-bottom: 24px;
        box-shadow: 0 4px 12px rgba(255, 107, 0, 0.3);
    }
    .bf3-nav {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        flex-wrap: wrap;
    }
    .bf3-nav-item {
        padding: 12px 24px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,107,0,0.3);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        color: rgba(255,255,255,0.9);
        text-decoration: none;
        font-weight: 500;
    }
    .bf3-nav-item:hover {
        background: rgba(255,107,0,0.1);
        border-color: #ff6b00;
        color: #ff6b00;
    }
    .bf3-nav-item.active {
        background: #ff6b00;
        border-color: #ff6b00;
        color: white;
    }
    .bf3-card {
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,107,0,0.2);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    }
    .bf3-stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
    }
    .bf3-stat {
        text-align: center;
        padding: 16px;
        background: rgba(0,0,0,0.3);
        border-radius: 6px;
        border-left: 3px solid #ff6b00;
    }
    .bf3-stat-value {
        font-size: 32px;
        font-weight: bold;
        color: #ff6b00;
        margin-bottom: 8px;
    }
    .bf3-stat-label {
        font-size: 14px;
        opacity: 0.8;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .bf3-table {
        width: 100%;
        border-collapse: collapse;
    }
    .bf3-table thead {
        background: rgba(255,107,0,0.1);
    }
    .bf3-table th {
        padding: 12px;
        text-align: left;
        font-weight: 600;
        color: #ff6b00;
        border-bottom: 2px solid rgba(255,107,0,0.3);
    }
    .bf3-table td {
        padding: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .bf3-table tbody tr:hover {
        background: rgba(255,107,0,0.05);
        cursor: pointer;
    }
    .bf3-rank {
        display: inline-block;
        padding: 4px 12px;
        background: rgba(255,107,0,0.2);
        border-radius: 4px;
        font-weight: 600;
        color: #ff6b00;
    }
    .bf3-feed-item {
        padding: 12px;
        background: rgba(0,0,0,0.3);
        border-left: 3px solid #ff6b00;
        border-radius: 4px;
        margin-bottom: 8px;
        font-size: 14px;
    }
    .bf3-feed-time {
        opacity: 0.6;
        font-size: 12px;
        margin-left: 8px;
    }
    .player-avatar {
        width: 40px;
        height: 40px;
        border-radius: 4px;
        margin-right: 12px;
        border: 2px solid rgba(255,107,0,0.3);
    }
    .rank-badge {
        display: inline-block;
        padding: 2px 8px;
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        color: #000;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 700;
        margin-left: 8px;
    }
</style>

<div class="battlelog-container">
    <!-- Header -->
    <div class="bf3-header">
        <h1 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">ARMA REFORGER</h1>
        <div style="font-size: 16px; opacity: 0.9;">BATTLELOG</div>
    </div>

    <!-- Navigation -->
    <div class="bf3-nav">
        <a href="#" class="bf3-nav-item active" onclick="showTab('overview'); return false;">Overview</a>
        <a href="#" class="bf3-nav-item" onclick="showTab('leaderboard'); return false;">Leaderboard</a>
        <a href="#" class="bf3-nav-item" onclick="showTab('feed'); return false;">Live Feed</a>
        <a href="#" class="bf3-nav-item" onclick="showTab('matches'); return false;">Recent Matches</a>
    </div>

    <!-- Overview Tab -->
    <div id="tab-overview" class="tab-content">
        <div class="bf3-card">
            <h2 style="margin-top: 0; color: #ff6b00;">Server Statistics</h2>
            <div id="overview-stats" class="bf3-stat-grid">
                <div style="opacity: 0.7;">Loading...</div>
            </div>
        </div>

        <div class="bf3-card">
            <h2 style="margin-top: 0; color: #ff6b00;">Top Players</h2>
            <div id="top-players">
                <p style="opacity: 0.7;">Loading...</p>
            </div>
        </div>
    </div>

    <!-- Leaderboard Tab -->
    <div id="tab-leaderboard" class="tab-content" style="display: none;">
        <div class="bf3-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #ff6b00;">Player Rankings</h2>
                <select id="sort-by" onchange="loadLeaderboard()" style="padding: 8px 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,107,0,0.3); border-radius: 4px; color: inherit;">
                    <option value="score">Sort by Score</option>
                    <option value="kills">Sort by Kills</option>
                    <option value="kd">Sort by K/D</option>
                    <option value="xp">Sort by XP</option>
                </select>
            </div>
            <div id="leaderboard-table">
                <p style="opacity: 0.7;">Loading...</p>
            </div>
        </div>
    </div>

    <!-- Live Feed Tab -->
    <div id="tab-feed" class="tab-content" style="display: none;">
        <div class="bf3-card">
            <h2 style="margin-top: 0; color: #ff6b00;">Live Activity</h2>
            <div id="feed-list">
                <p style="opacity: 0.7;">Loading...</p>
            </div>
        </div>
    </div>

    <!-- Matches Tab -->
    <div id="tab-matches" class="tab-content" style="display: none;">
        <div class="bf3-card">
            <h2 style="margin-top: 0; color: #ff6b00;">Recent Matches</h2>
            <div id="matches-list">
                <p style="opacity: 0.7;">Loading...</p>
            </div>
        </div>
    </div>

    <!-- Player Modal -->
    <div id="player-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 1000; padding: 40px; overflow-y: auto;" onclick="closePlayerModal()">
        <div style="max-width: 900px; margin: 0 auto; background: #1a1a1a; border: 1px solid rgba(255,107,0,0.3); border-radius: 8px; padding: 32px;" onclick="event.stopPropagation()">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
                <div id="player-modal-content"></div>
                <button onclick="closePlayerModal()" style="background: none; border: none; color: #ff6b00; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
        </div>
    </div>
</div>

<script>
    let currentData = { overview: null, leaderboard: null, feed: null, matches: null };

    function showTab(tab) {
        document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.bf3-nav-item').forEach(el => el.classList.remove('active'));

        document.getElementById('tab-' + tab).style.display = 'block';
        event.target.classList.add('active');

        // Load data if not loaded
        if (tab === 'overview' && !currentData.overview) loadOverview();
        if (tab === 'leaderboard' && !currentData.leaderboard) loadLeaderboard();
        if (tab === 'feed' && !currentData.feed) loadFeed();
        if (tab === 'matches' && !currentData.matches) loadMatches();
    }

    async function loadOverview() {
        const result = await fetch('/api/battlelog/overview').then(r => r.json());
        currentData.overview = result;

        const stats = result.stats || {};
        document.getElementById('overview-stats').innerHTML = `
            <div class="bf3-stat">
                <div class="bf3-stat-value">${(stats.totalPlayers || 0).toLocaleString()}</div>
                <div class="bf3-stat-label">Total Players</div>
            </div>
            <div class="bf3-stat">
                <div class="bf3-stat-value">${(stats.totalKills || 0).toLocaleString()}</div>
                <div class="bf3-stat-label">Total Kills</div>
            </div>
            <div class="bf3-stat">
                <div class="bf3-stat-value">${(stats.totalDeaths || 0).toLocaleString()}</div>
                <div class="bf3-stat-label">Total Deaths</div>
            </div>
            <div class="bf3-stat">
                <div class="bf3-stat-value">${(stats.totalMatches || 0).toLocaleString()}</div>
                <div class="bf3-stat-label">Matches Played</div>
            </div>
            <div class="bf3-stat">
                <div class="bf3-stat-value">${formatPlaytime(stats.totalPlaytime || 0)}</div>
                <div class="bf3-stat-label">Total Playtime</div>
            </div>
        `;

        // Load top 5 players
        const leaders = await fetch('/api/battlelog/leaderboard?sortBy=score&limit=5').then(r => r.json());
        if (leaders.players) {
            document.getElementById('top-players').innerHTML = leaders.players.map((p, i) => `
                <div style="display: flex; align-items: center; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 6px; margin-bottom: 8px; cursor: pointer;" onclick="showPlayerProfile('${p.steamId}')">
                    <span style="font-size: 20px; font-weight: 700; color: #ff6b00; width: 40px;">#${i + 1}</span>
                    ${p.avatarUrl ? `<img src="${p.avatarUrl}" class="player-avatar">` : ''}
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 16px;">${p.name || 'Unknown'}</div>
                        <div style="opacity: 0.7; font-size: 13px;">Score: ${p.score || 0} · K/D: ${calculateKD(p.kills, p.deaths)} · ${p.rank || 'Recruit'}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    async function loadLeaderboard() {
        const sortBy = document.getElementById('sort-by').value;
        const result = await fetch(`/api/battlelog/leaderboard?sortBy=${sortBy}&limit=50`).then(r => r.json());
        currentData.leaderboard = result;

        if (result.players && result.players.length > 0) {
            document.getElementById('leaderboard-table').innerHTML = `
                <table class="bf3-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Score</th>
                            <th>Kills</th>
                            <th>Deaths</th>
                            <th>K/D</th>
                            <th>XP</th>
                            <th>Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.players.map((p, i) => `
                            <tr onclick="showPlayerProfile('${p.steamId}')">
                                <td><span class="bf3-rank">#${i + 1}</span></td>
                                <td>
                                    <div style="display: flex; align-items: center;">
                                        ${p.avatarUrl ? `<img src="${p.avatarUrl}" class="player-avatar">` : ''}
                                        <div>
                                            <div style="font-weight: 600;">${p.name || 'Unknown'}</div>
                                            ${p.rank ? `<span class="rank-badge">${p.rank}</span>` : ''}
                                        </div>
                                    </div>
                                </td>
                                <td style="font-weight: 600; color: #ff6b00;">${p.score || 0}</td>
                                <td>${p.kills || 0}</td>
                                <td>${p.deaths || 0}</td>
                                <td>${calculateKD(p.kills, p.deaths)}</td>
                                <td>${p.xp || 0}</td>
                                <td>${p.level || 1}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            document.getElementById('leaderboard-table').innerHTML = '<p style="opacity: 0.7;">No players found</p>';
        }
    }

    async function loadFeed() {
        const result = await fetch('/api/battlelog/feed?limit=100').then(r => r.json());
        currentData.feed = result;

        if (result.events && result.events.length > 0) {
            document.getElementById('feed-list').innerHTML = result.events.map(event => {
                const icon = event.type === 'kill' ? '☠️' : event.type === 'death' ? '💀' : event.type === 'connect' ? '🟢' : event.type === 'disconnect' ? '🔴' : '📝';
                return `
                    <div class="bf3-feed-item">
                        ${icon} ${event.message || event.description || 'Event'}
                        <span class="bf3-feed-time">${formatTime(event.timestamp)}</span>
                    </div>
                `;
            }).join('');
        } else {
            document.getElementById('feed-list').innerHTML = '<p style="opacity: 0.7;">No recent activity</p>';
        }

        // Auto-refresh feed every 10 seconds
        setTimeout(loadFeed, 10000);
    }

    async function loadMatches() {
        const result = await fetch('/api/battlelog/matches?limit=20').then(r => r.json());
        currentData.matches = result;

        if (result.matches && result.matches.length > 0) {
            document.getElementById('matches-list').innerHTML = result.matches.map(match => `
                <div class="bf3-card" style="margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h3 style="margin: 0 0 8px 0; color: #ff6b00;">${match.map || 'Unknown Map'}</h3>
                            <div style="opacity: 0.8; font-size: 14px;">
                                ${new Date(match.startTime).toLocaleString()}
                                ${match.duration ? ` · Duration: ${Math.floor(match.duration / 60)}m` : ''}
                                ${match.players ? ` · Players: ${match.players.length}` : ''}
                            </div>
                        </div>
                        ${match.winner ? `<div style="background: rgba(255,107,0,0.2); padding: 8px 16px; border-radius: 4px; font-weight: 600;">Winner: ${match.winner}</div>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            document.getElementById('matches-list').innerHTML = '<p style="opacity: 0.7;">No recent matches</p>';
        }
    }

    async function showPlayerProfile(steamId) {
        const result = await fetch(`/api/battlelog/players/${steamId}`).then(r => r.json());
        const player = result.player || result;

        const content = `
            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
                ${player.avatarUrl ? `<img src="${player.avatarUrl}" style="width: 80px; height: 80px; border-radius: 8px; border: 3px solid #ff6b00;">` : ''}
                <div>
                    <h2 style="margin: 0 0 8px 0; font-size: 28px;">${player.name || 'Unknown'}</h2>
                    ${player.rank ? `<span class="rank-badge">${player.rank}</span>` : ''}
                    <div style="opacity: 0.7; margin-top: 8px; font-size: 14px;">SteamID: ${steamId}</div>
                </div>
            </div>

            <div class="bf3-stat-grid" style="margin-bottom: 24px;">
                <div class="bf3-stat">
                    <div class="bf3-stat-value">${player.score || 0}</div>
                    <div class="bf3-stat-label">Score</div>
                </div>
                <div class="bf3-stat">
                    <div class="bf3-stat-value">${player.kills || 0}</div>
                    <div class="bf3-stat-label">Kills</div>
                </div>
                <div class="bf3-stat">
                    <div class="bf3-stat-value">${player.deaths || 0}</div>
                    <div class="bf3-stat-label">Deaths</div>
                </div>
                <div class="bf3-stat">
                    <div class="bf3-stat-value">${calculateKD(player.kills, player.deaths)}</div>
                    <div class="bf3-stat-label">K/D Ratio</div>
                </div>
                <div class="bf3-stat">
                    <div class="bf3-stat-value">${player.xp || 0}</div>
                    <div class="bf3-stat-label">XP</div>
                </div>
                <div class="bf3-stat">
                    <div class="bf3-stat-value">${player.level || 1}</div>
                    <div class="bf3-stat-label">Level</div>
                </div>
            </div>

            ${player.weapons && player.weapons.length > 0 ? `
                <h3 style="color: #ff6b00; margin-bottom: 12px;">Weapon Stats</h3>
                <div style="margin-bottom: 20px;">
                    ${player.weapons.map(w => `
                        <div style="padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; margin-bottom: 6px;">
                            <strong>${w.name}</strong>: ${w.kills} kills
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;

        document.getElementById('player-modal-content').innerHTML = content;
        document.getElementById('player-modal').style.display = 'block';
    }

    function closePlayerModal() {
        document.getElementById('player-modal').style.display = 'none';
    }

    function calculateKD(kills, deaths) {
        if (!deaths || deaths === 0) return kills || 0;
        return ((kills || 0) / deaths).toFixed(2);
    }

    function formatPlaytime(seconds) {
        const hours = Math.floor(seconds / 3600);
        if (hours > 0) return `${hours}h`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m`;
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    }

    // Initial load
    loadOverview();
</script>
@endsection


