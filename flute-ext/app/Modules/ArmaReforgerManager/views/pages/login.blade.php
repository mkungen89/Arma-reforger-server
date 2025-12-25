@extends('flute::layouts.app')

@section('title', 'Login - Arma Manager')

@section('content')
<style>
    .login-container {
        max-width: 500px;
        margin: 80px auto;
        padding: 40px;
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,107,0,0.3);
        border-radius: 12px;
        text-align: center;
    }
    .steam-login-btn {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 14px 28px;
        background: linear-gradient(90deg, #171a21 0%, #1b2838 100%);
        border: 2px solid #66c0f4;
        border-radius: 4px;
        color: white;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        text-decoration: none;
        margin-top: 24px;
    }
    .steam-login-btn:hover {
        background: linear-gradient(90deg, #1b2838 0%, #2a475e 100%);
        border-color: #fff;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 192, 244, 0.4);
    }
    .steam-icon {
        width: 32px;
        height: 32px;
    }
    .logout-section {
        margin-top: 24px;
    }
    .user-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: rgba(0,0,0,0.3);
        border-radius: 8px;
        margin-bottom: 20px;
    }
    .user-avatar {
        width: 64px;
        height: 64px;
        border-radius: 4px;
        border: 2px solid #ff6b00;
    }
    .user-info {
        flex: 1;
        text-align: left;
    }
</style>

<div class="login-container">
    <div style="margin-bottom: 24px;">
        <h1 style="margin: 0 0 12px 0; color: #ff6b00; font-size: 28px;">Arma Reforger Manager</h1>
        <p style="opacity: 0.8; margin: 0;">Server Control Panel</p>
    </div>

    <div id="login-section">
        <p style="opacity: 0.9; margin-bottom: 24px;">
            Login with your Steam account to access the server management panel.
        </p>

        <a href="#" id="steam-login-btn" class="steam-login-btn">
            <svg class="steam-icon" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                <g fill="#66c0f4">
                    <path d="M127.998 0C57.318 0 0 57.317 0 127.999c0 48.59 27.115 90.879 67.043 112.67l35.25-14.586c-6.548-3.139-11.07-9.791-11.07-17.521 0-10.69 8.67-19.359 19.359-19.359 1.015 0 2.009.08 2.98.229l36.589-53.069c0-32.035 26.01-58.045 58.045-58.045 32.04 0 58.05 26.01 58.05 58.045 0 32.04-26.01 58.05-58.05 58.05-1.08 0-2.15-.03-3.21-.09l-50.44 35.98c.07.82.11 1.65.11 2.49 0 15.46-12.54 28-28 28-14.99 0-27.23-11.79-27.93-26.59l-42.56 17.61C73.154 245.08 99.269 256 127.998 256 198.678 256 256 198.682 256 128.001 256 57.32 198.678 0 127.998 0z"/>
                    <path d="M82.467 191.911c.105 9.571 7.917 17.29 17.496 17.29 9.661 0 17.5-7.839 17.5-17.5 0-.265-.008-.527-.018-.789l-34.978 1z"/>
                    <circle cx="208.196" cy="135.99" r="38.045"/>
                    <circle cx="208.196" cy="135.99" r="26.532"/>
                </g>
            </svg>
            <span>Sign in through Steam</span>
        </a>

        <div id="login-status" style="margin-top: 20px; opacity: 0.8;"></div>
    </div>

    <div id="logout-section" style="display: none;">
        <div id="user-card" class="user-card"></div>

        <div style="display: flex; gap: 12px; justify-content: center;">
            <a href="/arma" class="btn" style="background: #ff6b00; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                Go to Dashboard
            </a>
            <button id="logout-btn" class="btn" style="background: rgba(255,255,255,0.1); color: white; padding: 12px 24px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); font-weight: 600; cursor: pointer;">
                Logout
            </button>
        </div>
    </div>
</div>

<script>
    (function () {
        const TOKEN_KEY = 'arma_api_token';

        function getToken() {
            return localStorage.getItem(TOKEN_KEY) || '';
        }

        function clearToken() {
            localStorage.removeItem(TOKEN_KEY);
        }

        async function checkSession() {
            const token = getToken();
            if (!token) {
                showLoginSection();
                return;
            }

            try {
                const res = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    clearToken();
                    showLoginSection();
                    return;
                }

                const data = await res.json();
                showLogoutSection(data.user);
            } catch (e) {
                clearToken();
                showLoginSection();
            }
        }

        function showLoginSection() {
            document.getElementById('login-section').style.display = '';
            document.getElementById('logout-section').style.display = 'none';
        }

        function showLogoutSection(user) {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('logout-section').style.display = '';

            const userCard = document.getElementById('user-card');
            userCard.innerHTML = `
                ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="user-avatar">` : ''}
                <div class="user-info">
                    <div style="font-size: 20px; font-weight: 600; margin-bottom: 4px;">${user.displayName || 'Unknown'}</div>
                    <div style="opacity: 0.7;">Role: <strong style="color: #ff6b00;">${user.role.toUpperCase()}</strong></div>
                    <div style="opacity: 0.6; font-size: 13px; margin-top: 4px;">SteamID: ${user.steamId}</div>
                </div>
            `;
        }

        // Steam login button click
        document.getElementById('steam-login-btn').addEventListener('click', async function(e) {
            e.preventDefault();
            const statusEl = document.getElementById('login-status');
            statusEl.textContent = 'Redirecting to Steam...';

            try {
                // Get Steam login URL from backend
                const res = await fetch('/api/auth/steam/openid/start');
                const data = await res.json();

                if (data.success && data.url) {
                    // Redirect to Steam
                    window.location.href = data.url;
                } else {
                    statusEl.textContent = 'Error: Could not get Steam login URL';
                    statusEl.style.color = '#dc3545';
                }
            } catch (error) {
                statusEl.textContent = 'Error: ' + error.message;
                statusEl.style.color = '#dc3545';
            }
        });

        // Logout button click
        document.getElementById('logout-btn').addEventListener('click', async function() {
            const token = getToken();
            if (token) {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } catch (e) {
                    // Ignore errors, just clear token
                }
            }

            clearToken();
            showLoginSection();
        });

        // Check session on load
        checkSession();
    })();
</script>
@endsection


