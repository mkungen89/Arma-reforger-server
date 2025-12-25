@extends('flute::layouts.app')

@section('title', 'Arma Login')

@section('content')
    <div class="container" style="max-width: 820px; margin: 0 auto; padding: 24px 16px;">
        <h1 style="margin: 0 0 8px 0;">Arma Reforger Manager</h1>
        <p style="margin: 0 0 18px 0; opacity: 0.8;">
            Logga in mot Node-backenden (API/engine) för att kunna starta/stoppa servern.
        </p>

        <div class="card" style="padding: 16px; border-radius: 12px;">
            <h2 style="margin-top: 0;">Session</h2>
            <div id="arma-auth-state" style="margin-bottom: 12px; opacity: 0.9;">Laddar…</div>

            <div id="arma-login-form">
                <label for="steamid" style="display:block; margin-bottom:6px;">SteamID64</label>
                <input id="steamid" type="text" placeholder="7656119..." style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.2); color: inherit;">
                <button id="arma-login-btn" class="btn" style="margin-top: 10px;">Logga in</button>
                <div style="margin-top: 8px; font-size: 13px; opacity: 0.75;">
                    Obs: detta använder nuvarande token-baserade login (som tidigare React UI). Nästa steg blir riktig Steam/SSO.
                </div>
            </div>

            <div id="arma-logout-wrap" style="display:none;">
                <button id="arma-logout-btn" class="btn" style="margin-top: 10px;">Logga ut</button>
                <a href="/arma/server" class="btn" style="margin-top: 10px; margin-left: 8px;">Gå till Server Control</a>
            </div>

            <pre id="arma-auth-debug" style="margin-top: 14px; white-space: pre-wrap; word-break: break-word; opacity: 0.9;"></pre>
        </div>
    </div>

    <script>
        (function () {
            const TOKEN_KEY = 'arma_api_token';

            function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
            function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
            function clearToken() { localStorage.removeItem(TOKEN_KEY); }

            async function api(path, opts) {
                const token = getToken();
                const headers = Object.assign({}, (opts && opts.headers) || {});
                if (token) headers['Authorization'] = 'Bearer ' + token;
                return fetch(path, Object.assign({ credentials: 'include', headers }, opts || {}));
            }

            async function refresh() {
                const stateEl = document.getElementById('arma-auth-state');
                const debugEl = document.getElementById('arma-auth-debug');
                const loginForm = document.getElementById('arma-login-form');
                const logoutWrap = document.getElementById('arma-logout-wrap');

                if (!getToken()) {
                    stateEl.textContent = 'Inte inloggad.';
                    debugEl.textContent = '';
                    loginForm.style.display = '';
                    logoutWrap.style.display = 'none';
                    return;
                }

                try {
                    const res = await api('/api/auth/me');
                    const json = await res.json();
                    if (!res.ok) throw new Error(json && json.error ? json.error : 'Auth check failed');

                    stateEl.textContent = `Inloggad som ${json.user.displayName} (${json.user.role})`;
                    debugEl.textContent = JSON.stringify(json, null, 2);
                    loginForm.style.display = 'none';
                    logoutWrap.style.display = '';
                } catch (e) {
                    stateEl.textContent = 'Session ogiltig/utgången. Logga in igen.';
                    debugEl.textContent = String(e && e.message ? e.message : e);
                    clearToken();
                    loginForm.style.display = '';
                    logoutWrap.style.display = 'none';
                }
            }

            document.getElementById('arma-login-btn').addEventListener('click', async function (ev) {
                ev.preventDefault();
                const steamId = document.getElementById('steamid').value.trim();
                const debugEl = document.getElementById('arma-auth-debug');
                debugEl.textContent = 'Loggar in…';

                try {
                    const res = await fetch('/api/auth/steam/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ steamId })
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json && json.error ? json.error : 'Login failed');
                    setToken(json.token);
                    await refresh();
                } catch (e) {
                    debugEl.textContent = 'Login misslyckades: ' + (e && e.message ? e.message : String(e));
                }
            });

            document.getElementById('arma-logout-btn').addEventListener('click', async function (ev) {
                ev.preventDefault();
                const debugEl = document.getElementById('arma-auth-debug');
                debugEl.textContent = 'Loggar ut…';
                try {
                    await api('/api/auth/logout', { method: 'POST' });
                } finally {
                    clearToken();
                    await refresh();
                }
            });

            refresh();
        })();
    </script>
@endsection


