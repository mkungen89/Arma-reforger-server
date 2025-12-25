@extends('arma-reforger::layouts.admin')

@section('title', 'User Management')

@section('arma-content')
    <h1 style="margin: 0 0 24px 0;">User Management</h1>

    <div class="arma-card">
        <h2>Add New User</h2>
        <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
                <label style="display: block; margin-bottom: 6px;">Steam ID 64</label>
                <input type="text" id="new-steamid" placeholder="76561198..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
            </div>
            <div style="flex: 1; min-width: 200px;">
                <label style="display: block; margin-bottom: 6px;">Display Name</label>
                <input type="text" id="new-displayname" placeholder="Player Name" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
            </div>
            <div style="min-width: 150px;">
                <label style="display: block; margin-bottom: 6px;">Role</label>
                <select id="new-role" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
                    <option value="user">User (Read Only)</option>
                    <option value="gm">GM (Server Control)</option>
                    <option value="admin">Admin (Full Access)</option>
                </select>
            </div>
            <button class="arma-btn" onclick="addUser()">Add User</button>
        </div>
        <div id="add-user-status" style="margin-top: 12px; opacity: 0.9;"></div>
    </div>

    <div class="arma-card">
        <h2>Existing Users</h2>
        <div id="users-list">
            <p style="opacity: 0.7;">Loading users...</p>
        </div>
    </div>

    <div class="arma-card">
        <h2>Role Descriptions</h2>
        <div style="display: grid; gap: 12px;">
            <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <strong style="color: #ff6b00;">Admin</strong>
                <div style="opacity: 0.8; font-size: 14px; margin-top: 4px;">
                    Full access to all features: server control, configuration, user management, backups, scheduler, mods, players, logs.
                </div>
            </div>
            <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <strong style="color: #ffc107;">GM (Game Master)</strong>
                <div style="opacity: 0.8; font-size: 14px; margin-top: 4px;">
                    Can control server (start/stop/restart), manage players (kick/ban), manage mods, view logs. Cannot change configuration or manage users.
                </div>
            </div>
            <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <strong style="color: #28a745;">User</strong>
                <div style="opacity: 0.8; font-size: 14px; margin-top: 4px;">
                    Read-only access. Can view dashboard, status, and logs. Cannot make any changes.
                </div>
            </div>
        </div>
    </div>

    <script>
        async function loadUsers() {
            const result = await ArmaAPI.get('/api/users');
            const usersList = document.getElementById('users-list');

            if (result.ok && result.json.users) {
                const users = result.json.users;
                if (users.length === 0) {
                    usersList.innerHTML = '<p style="opacity: 0.7;">No users found</p>';
                } else {
                    usersList.innerHTML = users.map(user => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    ${user.avatarUrl ? `<img src="${user.avatarUrl}" style="width: 48px; height: 48px; border-radius: 50%;">` : ''}
                                    <div>
                                        <strong style="font-size: 16px;">${user.displayName || 'Unknown'}</strong>
                                        <div style="opacity: 0.7; font-size: 13px; margin-top: 4px;">
                                            SteamID: ${user.steamId}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <select onchange="updateUserRole('${user.steamId}', this.value)" style="padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
                                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                    <option value="gm" ${user.role === 'gm' ? 'selected' : ''}>GM</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                                <button class="arma-btn arma-btn-danger" onclick="removeUser('${user.steamId}', '${user.displayName}')">Remove</button>
                            </div>
                        </div>
                    `).join('');
                }
            } else {
                usersList.innerHTML = '<p style="color: #dc3545;">Failed to load users</p>';
            }
        }

        async function addUser() {
            const steamId = document.getElementById('new-steamid').value.trim();
            const displayName = document.getElementById('new-displayname').value.trim();
            const role = document.getElementById('new-role').value;
            const statusEl = document.getElementById('add-user-status');

            if (!steamId || !displayName) {
                statusEl.innerHTML = '<span style="color: #dc3545;">Please fill in all fields</span>';
                return;
            }

            if (!/^\d{17}$/.test(steamId)) {
                statusEl.innerHTML = '<span style="color: #dc3545;">Invalid Steam ID format. Must be 17 digits.</span>';
                return;
            }

            statusEl.innerHTML = '<span style="color: #ff6b00;">Adding user...</span>';

            const result = await ArmaAPI.post('/api/users', { steamId, displayName, role });
            if (result.ok) {
                statusEl.innerHTML = '<span style="color: #28a745;">User added successfully!</span>';
                document.getElementById('new-steamid').value = '';
                document.getElementById('new-displayname').value = '';
                await loadUsers();
            } else {
                statusEl.innerHTML = `<span style="color: #dc3545;">Failed: ${result.json.error || 'Unknown error'}</span>`;
            }
        }

        async function updateUserRole(steamId, newRole) {
            const result = await ArmaAPI.put(`/api/users/${steamId}`, { role: newRole });
            if (result.ok) {
                alert('User role updated');
                await loadUsers();
            } else {
                alert(`Failed to update role: ${result.json.error || 'Unknown error'}`);
                await loadUsers(); // Reload to reset dropdown
            }
        }

        async function removeUser(steamId, displayName) {
            if (!confirm(`Remove user ${displayName}? This cannot be undone.`)) return;

            const result = await ArmaAPI.delete(`/api/users/${steamId}`);
            if (result.ok) {
                await loadUsers();
            } else {
                alert(`Failed to remove user: ${result.json.error || 'Unknown error'}`);
            }
        }

        loadUsers();
    </script>
@endsection
