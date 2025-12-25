@extends('flute::layouts.app')

@section('title', 'Server Control')

@section('content')
    <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 24px 16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div>
                <h1 style="margin: 0 0 6px 0;">Server Control</h1>
                <div style="opacity:0.8;">
                    <a href="/arma">Dashboard</a> ·
                    <a href="/arma/login">Login</a>
                </div>
            </div>
            <div id="arma-whoami" style="opacity:0.85;">Laddar…</div>
        </div>

        <div class="card" style="padding: 16px; border-radius: 12px; margin-top: 16px;">
            <h2 style="margin-top: 0;">Actions</h2>
            <div style="display:flex; flex-wrap:wrap; gap:10px;">
                <button class="btn" id="btn-start">Start</button>
                <button class="btn" id="btn-stop">Stop</button>
                <button class="btn" id="btn-restart">Restart</button>
                <button class="btn" id="btn-update">Update</button>
                <button class="btn" id="btn-refresh">Refresh status</button>
            </div>
            <div style="margin-top: 12px; font-size: 13px; opacity: 0.75;">
                Kräver att du är inloggad som admin i Node-backenden (via <a href="/arma/login">/arma/login</a>).
            </div>
        </div>

        <div class="card" style="padding: 16px; border-radius: 12px; margin-top: 16px;">
            <h2 style="margin-top: 0;">Status</h2>
            <pre id="arma-status" style="white-space: pre-wrap; word-break: break-word; margin: 0; opacity: 0.9;">Loading…</pre>
        </div>

        <div class="card" style="padding: 16px; border-radius: 12px; margin-top: 16px;">
            <h2 style="margin-top: 0;">Last response</h2>
            <pre id="arma-last" style="white-space: pre-wrap; word-break: break-word; margin: 0; opacity: 0.9;">—</pre>
        </div>
    </div>

    <script>
        (function () {
            const TOKEN_KEY = 'arma_api_token';
            function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }

            async function apiJson(path, opts) {
                const token = getToken();
                const headers = Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {});
                if (token) headers['Authorization'] = 'Bearer ' + token;
                const res = await fetch(path, Object.assign({ credentials: 'include', headers }, opts || {}));
                const text = await res.text();
                let json;
                try { json = JSON.parse(text); } catch { json = { raw: text }; }
                return { ok: res.ok, status: res.status, json };
            }

            async function refreshWho() {
                const who = document.getElementById('arma-whoami');
                if (!getToken()) {
                    who.textContent = 'Inte inloggad (token saknas)';
                    return;
                }
                const me = await apiJson('/api/auth/me', { method: 'GET' });
                if (!me.ok) {
                    who.textContent = 'Inte inloggad (session ogiltig)';
                    return;
                }
                who.textContent = `Inloggad: ${me.json.user.displayName} (${me.json.user.role})`;
            }

            async function refreshStatus() {
                const el = document.getElementById('arma-status');
                const r = await apiJson('/api/status', { method: 'GET', headers: { 'Content-Type': undefined } });
                el.textContent = JSON.stringify(r.json, null, 2);
            }

            async function doAction(path) {
                const last = document.getElementById('arma-last');
                last.textContent = 'Working…';
                const r = await apiJson(path, { method: 'POST', body: '{}' });
                last.textContent = JSON.stringify({ status: r.status, body: r.json }, null, 2);
                await refreshStatus();
            }

            document.getElementById('btn-start').addEventListener('click', () => doAction('/api/server/start'));
            document.getElementById('btn-stop').addEventListener('click', () => doAction('/api/server/stop'));
            document.getElementById('btn-restart').addEventListener('click', () => doAction('/api/server/restart'));
            document.getElementById('btn-update').addEventListener('click', () => doAction('/api/server/update'));
            document.getElementById('btn-refresh').addEventListener('click', async () => { await refreshWho(); await refreshStatus(); });

            refreshWho();
            refreshStatus();
        })();
    </script>
@endsection


