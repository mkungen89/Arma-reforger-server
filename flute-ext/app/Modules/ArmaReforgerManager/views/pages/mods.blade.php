@extends('arma-reforger::layouts.admin')

@section('title', 'Mod Manager')

@section('arma-content')
    <h1 style="margin: 0 0 24px 0;">Mod Manager</h1>

    <div class="arma-card">
        <h2>Add Mod from Workshop</h2>
        <div style="display: flex; gap: 12px; align-items: flex-end;">
            <div style="flex: 1;">
                <label style="display: block; margin-bottom: 6px; opacity: 0.9;">Steam Workshop URL</label>
                <input type="text" id="mod-url" placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: inherit;">
            </div>
            <button class="arma-btn" onclick="addMod()">Add Mod</button>
        </div>
        <div id="add-mod-status" style="margin-top: 12px; opacity: 0.9;"></div>
    </div>

    <div class="arma-card">
        <h2>Installed Mods</h2>
        <div id="mods-list">
            <p style="opacity: 0.7;">Loading mods...</p>
        </div>
    </div>

    <script>
        async function loadMods() {
            const result = await ArmaAPI.get('/api/mods');
            const modsList = document.getElementById('mods-list');

            if (result.ok && result.json.mods) {
                const mods = result.json.mods;
                if (mods.length === 0) {
                    modsList.innerHTML = '<p style="opacity: 0.7;">No mods installed</p>';
                } else {
                    modsList.innerHTML = mods.map(mod => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    ${mod.thumbnailUrl ? `<img src="${mod.thumbnailUrl}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 6px;">` : ''}
                                    <div>
                                        <strong style="font-size: 16px;">${mod.name || mod.id}</strong>
                                        <div style="opacity: 0.6; font-size: 13px; margin-top: 4px;">
                                            ID: ${mod.id}
                                            ${mod.version ? ` · Version: ${mod.version}` : ''}
                                            ${mod.size ? ` · Size: ${(mod.size / 1024 / 1024).toFixed(1)} MB` : ''}
                                        </div>
                                    </div>
                                </div>
                                ${mod.dependencies && mod.dependencies.length > 0 ? `
                                    <div style="opacity: 0.7; font-size: 13px; margin-top: 8px;">
                                        Dependencies: ${mod.dependencies.join(', ')}
                                    </div>
                                ` : ''}
                            </div>
                            <div style="display: flex; gap: 8px; flex-direction: column;">
                                <button class="arma-btn ${mod.enabled ? 'arma-btn-danger' : ''}" onclick="toggleMod('${mod.id}', ${mod.enabled})">${mod.enabled ? 'Disable' : 'Enable'}</button>
                                ${!mod.installed ? `<button class="arma-btn arma-btn-secondary" onclick="installMod('${mod.id}')">Install</button>` : ''}
                                <button class="arma-btn arma-btn-secondary" onclick="refreshMetadata('${mod.id}')">Refresh Info</button>
                                <button class="arma-btn arma-btn-danger" onclick="removeMod('${mod.id}')">Remove</button>
                            </div>
                        </div>
                    `).join('');
                }
            } else {
                modsList.innerHTML = '<p style="color: #dc3545;">Failed to load mods</p>';
            }
        }

        async function addMod() {
            const url = document.getElementById('mod-url').value.trim();
            const statusEl = document.getElementById('add-mod-status');

            if (!url) {
                statusEl.innerHTML = '<span style="color: #dc3545;">Please enter a Workshop URL</span>';
                return;
            }

            statusEl.innerHTML = '<span style="color: #ff6b00;">Adding mod...</span>';

            const result = await ArmaAPI.post('/api/mods/add', { url });
            if (result.ok) {
                statusEl.innerHTML = '<span style="color: #28a745;">Mod added successfully!</span>';
                document.getElementById('mod-url').value = '';
                await loadMods();
            } else {
                statusEl.innerHTML = `<span style="color: #dc3545;">Failed: ${result.json.error || 'Unknown error'}</span>`;
            }
        }

        async function toggleMod(id, currentlyEnabled) {
            const result = await ArmaAPI.post(`/api/mods/${id}/toggle`);
            if (result.ok) {
                await loadMods();
            } else {
                alert(`Failed to ${currentlyEnabled ? 'disable' : 'enable'} mod: ${result.json.error || 'Unknown error'}`);
            }
        }

        async function installMod(id) {
            if (!confirm('Install this mod via SteamCMD? This may take a while.')) return;

            const result = await ArmaAPI.post(`/api/mods/${id}/install`);
            if (result.ok) {
                alert('Mod installation started. Check logs for progress.');
                await loadMods();
            } else {
                alert(`Failed to install mod: ${result.json.error || 'Unknown error'}`);
            }
        }

        async function refreshMetadata(id) {
            const result = await ArmaAPI.post(`/api/mods/${id}/refresh-metadata`);
            if (result.ok) {
                await loadMods();
            } else {
                alert(`Failed to refresh metadata: ${result.json.error || 'Unknown error'}`);
            }
        }

        async function removeMod(id) {
            if (!confirm('Remove this mod? This will not delete downloaded files.')) return;

            const result = await ArmaAPI.delete(`/api/mods/${id}`);
            if (result.ok) {
                await loadMods();
            } else {
                alert(`Failed to remove mod: ${result.json.error || 'Unknown error'}`);
            }
        }

        loadMods();
    </script>
@endsection
