@extends('flute::layouts.app')

@section('content')
    <div class="arma-manager-layout">
        <!-- Top Navigation -->
        <div class="arma-nav-header" style="background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 12px 0;">
            <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 24px;">
                        <a href="/arma" style="font-weight: 600; font-size: 16px; text-decoration: none; color: #ff6b00;">
                            Arma Reforger Manager
                        </a>
                        <nav style="display: flex; gap: 16px; flex-wrap: wrap;">
                            <a href="/arma" class="arma-nav-link {{ request()->is('arma') ? 'active' : '' }}">Dashboard</a>
                            <a href="/arma/server" class="arma-nav-link {{ request()->is('arma/server') ? 'active' : '' }}">Server Control</a>
                            <a href="/arma/players" class="arma-nav-link {{ request()->is('arma/players') ? 'active' : '' }}" data-role="gm">Players</a>
                            <a href="/arma/mods" class="arma-nav-link {{ request()->is('arma/mods') ? 'active' : '' }}" data-role="gm">Mods</a>
                            <a href="/arma/scheduler" class="arma-nav-link {{ request()->is('arma/scheduler') ? 'active' : '' }}" data-role="admin">Scheduler</a>
                            <a href="/arma/backups" class="arma-nav-link {{ request()->is('arma/backups') ? 'active' : '' }}" data-role="admin">Backups</a>
                            <a href="/arma/logs" class="arma-nav-link {{ request()->is('arma/logs') ? 'active' : '' }}">Logs</a>
                            <a href="/arma/config" class="arma-nav-link {{ request()->is('arma/config') ? 'active' : '' }}" data-role="admin">Config</a>
                            <a href="/arma/users" class="arma-nav-link {{ request()->is('arma/users') ? 'active' : '' }}" data-role="admin">Users</a>
                        </nav>
                    </div>
                    <div id="arma-user-info" style="font-size: 14px; opacity: 0.85;">
                        <span id="arma-user-display">Loading...</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Content Area -->
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 24px 16px;">
            @yield('arma-content')
        </div>
    </div>

    <style>
        .arma-nav-link {
            color: rgba(255,255,255,0.7);
            text-decoration: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 14px;
            transition: all 0.2s;
        }
        .arma-nav-link:hover {
            color: rgba(255,255,255,0.95);
            background: rgba(255,255,255,0.05);
        }
        .arma-nav-link.active {
            color: #ff6b00;
            background: rgba(255,107,0,0.1);
        }
        .arma-card {
            background: rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
        }
        .arma-card h2 {
            margin-top: 0;
            margin-bottom: 16px;
            font-size: 18px;
        }
        .arma-btn {
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            background: #ff6b00;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .arma-btn:hover {
            background: #ff8533;
        }
        .arma-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .arma-btn-secondary {
            background: rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.9);
        }
        .arma-btn-secondary:hover {
            background: rgba(255,255,255,0.15);
        }
        .arma-btn-danger {
            background: #dc3545;
        }
        .arma-btn-danger:hover {
            background: #c82333;
        }
    </style>

    <script>
        // Shared API utilities for all Arma admin pages
        window.ArmaAPI = (function() {
            const TOKEN_KEY = 'arma_api_token';

            function getToken() {
                return localStorage.getItem(TOKEN_KEY) || '';
            }

            function setToken(t) {
                localStorage.setItem(TOKEN_KEY, t);
            }

            function clearToken() {
                localStorage.removeItem(TOKEN_KEY);
            }

            async function request(path, opts = {}) {
                const token = getToken();
                const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
                if (token) {
                    headers['Authorization'] = 'Bearer ' + token;
                }

                const response = await fetch(path, Object.assign({
                    credentials: 'include',
                    headers
                }, opts));

                const text = await response.text();
                let json;
                try {
                    json = JSON.parse(text);
                } catch {
                    json = { raw: text };
                }

                return {
                    ok: response.ok,
                    status: response.status,
                    json
                };
            }

            async function get(path) {
                return request(path, { method: 'GET' });
            }

            async function post(path, data = {}) {
                return request(path, {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            }

            async function put(path, data = {}) {
                return request(path, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
            }

            async function del(path) {
                return request(path, { method: 'DELETE' });
            }

            async function getCurrentUser() {
                const result = await get('/api/auth/me');
                if (result.ok && result.json.user) {
                    return result.json.user;
                }
                return null;
            }

            return {
                getToken,
                setToken,
                clearToken,
                request,
                get,
                post,
                put,
                delete: del,
                getCurrentUser
            };
        })();

        // Update user info in header
        (async function() {
            const userDisplay = document.getElementById('arma-user-display');
            const user = await ArmaAPI.getCurrentUser();

            if (user) {
                userDisplay.innerHTML = `
                    <span style="color: #ff6b00;">${user.displayName}</span>
                    <span style="opacity: 0.6; margin-left: 8px;">(${user.role})</span>
                    <a href="/arma/login" style="margin-left: 12px; font-size: 13px; opacity: 0.7;">Logout</a>
                `;

                // Hide navigation items based on role
                const role = user.role;
                document.querySelectorAll('.arma-nav-link[data-role]').forEach(link => {
                    const requiredRole = link.getAttribute('data-role');
                    if (requiredRole === 'admin' && role !== 'admin') {
                        link.style.display = 'none';
                    } else if (requiredRole === 'gm' && role !== 'admin' && role !== 'gm') {
                        link.style.display = 'none';
                    }
                });
            } else {
                userDisplay.innerHTML = `
                    <a href="/arma/login" style="color: #ff6b00;">Login</a>
                `;
            }
        })();
    </script>
@endsection
