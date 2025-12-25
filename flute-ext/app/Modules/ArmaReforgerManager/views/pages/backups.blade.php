@extends('arma-reforger::layouts.admin')

@section('title', 'Backup Manager')

@section('arma-content')
    <h1 style="margin: 0 0 24px 0;">Backup Manager</h1>

    <div class="arma-card">
        <h2>Create Backup</h2>
        <div style="margin-bottom: 16px;">
            <p style="opacity: 0.8; margin-bottom: 12px;">Select what to include in the backup:</p>
            <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="backup-config" checked>
                    <span>Config Files</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="backup-mods">
                    <span>Mods</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="backup-profiles" checked>
                    <span>Profiles</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="backup-server">
                    <span>Server Files</span>
                </label>
            </div>
            <button class="arma-btn" onclick="createBackup()">Create Backup Now</button>
            <div id="create-backup-status" style="margin-top: 12px; opacity: 0.9;"></div>
        </div>
    </div>

    <div class="arma-card">
        <h2>Existing Backups</h2>
        <div id="backups-list">
            <p style="opacity: 0.7;">Loading backups...</p>
        </div>
    </div>

    <script>
        async function loadBackups() {
            const result = await ArmaAPI.get('/api/backups');
            const backupsList = document.getElementById('backups-list');

            if (result.ok && result.json.backups) {
                const backups = result.json.backups;
                if (backups.length === 0) {
                    backupsList.innerHTML = '<p style="opacity: 0.7;">No backups found</p>';
                } else {
                    backupsList.innerHTML = backups.map(backup => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 12px;">
                            <div>
                                <strong style="font-size: 16px;">${backup.name || backup.filename}</strong>
                                <div style="opacity: 0.7; font-size: 13px; margin-top: 4px;">
                                    Created: ${new Date(backup.createdAt).toLocaleString()}
                                    ${backup.size ? ` · Size: ${(backup.size / 1024 / 1024).toFixed(2)} MB` : ''}
                                </div>
                                ${backup.contents ? `
                                    <div style="opacity: 0.6; font-size: 12px; margin-top: 6px;">
                                        Contains: ${backup.contents.join(', ')}
                                    </div>
                                ` : ''}
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="arma-btn arma-btn-secondary" onclick="downloadBackup('${backup.id || backup.filename}')">Download</button>
                                <button class="arma-btn arma-btn-secondary" onclick="restoreBackup('${backup.id || backup.filename}')">Restore</button>
                                <button class="arma-btn arma-btn-danger" onclick="deleteBackup('${backup.id || backup.filename}')">Delete</button>
                            </div>
                        </div>
                    `).join('');
                }
            } else {
                backupsList.innerHTML = '<p style="color: #dc3545;">Failed to load backups</p>';
            }
        }

        async function createBackup() {
            const statusEl = document.getElementById('create-backup-status');
            statusEl.innerHTML = '<span style="color: #ff6b00;">Creating backup...</span>';

            const contents = [];
            if (document.getElementById('backup-config').checked) contents.push('config');
            if (document.getElementById('backup-mods').checked) contents.push('mods');
            if (document.getElementById('backup-profiles').checked) contents.push('profiles');
            if (document.getElementById('backup-server').checked) contents.push('server');

            if (contents.length === 0) {
                statusEl.innerHTML = '<span style="color: #dc3545;">Please select at least one item to backup</span>';
                return;
            }

            const result = await ArmaAPI.post('/api/backups/create', { contents });
            if (result.ok) {
                statusEl.innerHTML = '<span style="color: #28a745;">Backup created successfully!</span>';
                await loadBackups();
            } else {
                statusEl.innerHTML = `<span style="color: #dc3545;">Failed: ${result.json.error || 'Unknown error'}</span>`;
            }
        }

        async function downloadBackup(id) {
            window.open(`/api/backups/${id}/download`, '_blank');
        }

        async function restoreBackup(id) {
            if (!confirm('⚠️ WARNING: Restoring a backup will overwrite current files. The server will be stopped during restore. Continue?')) {
                return;
            }

            const result = await ArmaAPI.post(`/api/backups/${id}/restore`);
            if (result.ok) {
                alert('Backup restore completed. Please restart the server.');
            } else {
                alert(`Failed to restore backup: ${result.json.error || 'Unknown error'}`);
            }
        }

        async function deleteBackup(id) {
            if (!confirm('Delete this backup? This cannot be undone.')) return;

            const result = await ArmaAPI.delete(`/api/backups/${id}`);
            if (result.ok) {
                await loadBackups();
            } else {
                alert(`Failed to delete backup: ${result.json.error || 'Unknown error'}`);
            }
        }

        loadBackups();
    </script>
@endsection
