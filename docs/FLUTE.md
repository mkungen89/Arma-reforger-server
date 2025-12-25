# Flute CMS Integration

Complete guide for the Flute CMS integration in the Arma Reforger Server Manager.

## Architecture Overview

The Arma Reforger Server Manager uses **Flute CMS** as its **only UI**. There is no separate React frontend.

**Components:**
- **Flute CMS** (PHP, GPL-3.0) - Web UI and CMS
  - Repository: https://github.com/Flute-CMS/cms
  - License: GPL-3.0
  - Installed as Git submodule at `flute/`
  - Deployed to `/opt/flute` in production

- **Node Backend** (Express.js, GPL-3.0-or-later) - API and server engine
  - Located at `backend/`
  - Deployed to `/opt/arma-reforger-manager`
  - Exposes REST API at `/api/*`

- **Arma Reforger Module** (GPL-3.0-or-later) - Custom Flute module
  - Source: `flute-ext/app/Modules/ArmaReforgerManager/`
  - Deployed to: `/opt/flute/app/Modules/ArmaReforgerManager/`
  - Provides admin pages and battlelog UI

---

## Directory Structure

### Development (Repository)
```
arma-reforger-server-manager/
├── backend/                    # Node.js API server
│   ├── server.js              # Main entry point
│   ├── auth.js                # Authentication
│   ├── battlelog.js           # Battlelog API
│   └── ...
├── flute/                     # Flute CMS (Git submodule)
│   ├── app/
│   ├── public/
│   └── ...
├── flute-ext/                 # Our custom Flute module (source)
│   └── app/
│       └── Modules/
│           └── ArmaReforgerManager/
│               ├── Controllers/
│               ├── views/
│               └── routes.php
├── config/                    # Node backend config
│   ├── server-config.json     # Server settings
│   ├── users.json             # Authorized users
│   └── ...
├── docs/                      # Documentation
└── install-ubuntu.sh          # Installer script
```

### Production (VPS)
```
/opt/
├── arma-reforger-manager/     # Node backend
│   ├── backend/
│   ├── config/
│   └── logs/
├── flute/                     # Flute CMS
│   ├── app/
│   │   └── Modules/
│   │       └── ArmaReforgerManager/  # Deployed from flute-ext/
│   ├── public/
│   ├── storage/
│   ├── vendor/
│   └── .env
└── arma-reforger/             # Game server
```

---

## Flute Routes

### Public Routes (No Authentication)

**Battlelog** - Public statistics and leaderboards
- `/battlelog` - Main battlelog page
  - Overview tab: Server stats, recent activity
  - Leaderboard tab: Top 50 players by kills/deaths/K/D/playtime
  - Live Feed tab: Real-time kill feed
  - Recent Matches tab: Match history

**API calls** (server-side from Flute):
- `GET /api/battlelog/stats` - Total players, kills, deaths, uptime
- `GET /api/battlelog/leaderboard?sortBy=kills&limit=50` - Top players
- `GET /api/battlelog/feed?limit=100` - Recent events (kills, deaths, connections)
- `GET /api/battlelog/matches?limit=20` - Recent matches
- `GET /api/battlelog/player/{steamId}` - Individual player stats

### Admin Routes (Steam Authentication Required)

**Login/Logout**
- `/arma/login` - Steam OpenID login page
- `/arma/logout` - Logout (clears session)

**Dashboard & Server Control**
- `/arma` - Dashboard (server status, quick actions, system resources)
- `/arma/server` - Server control (start/stop/restart/update, live logs)

**Player Management**
- `/arma/players` - Live player list, kick/ban/message/broadcast

**Automation**
- `/arma/scheduler` - Scheduled tasks (backups, restarts, updates)

**Backups**
- `/arma/backups` - Create/download/restore backups

**Mod Management**
- `/arma/mods` - Workshop mod search, install, enable/disable, dependencies

**Configuration**
- `/arma/config` - Server configuration editor, diagnostics

**User Management**
- `/arma/users` - Add/remove admin users, role assignment

**Logs**
- `/arma/logs` - Server logs, audit logs

**API calls** (authenticated with Bearer token):
- `POST /api/server/start` - Start server
- `POST /api/server/stop` - Stop server
- `POST /api/server/restart` - Restart server
- `POST /api/server/update` - Update server via SteamCMD
- `GET /api/status` - Server status (running/stopped/error)
- `GET /api/logs` - Server logs
- `GET /api/audit-logs` - Audit logs (admin only)
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Add user (admin only)
- `PUT /api/config` - Update config (admin/GM)
- ...and more (see API documentation)

---

## Authentication Flow

### Steam OpenID Login

1. **User visits** `/arma/login`
2. **User clicks** "Sign in through Steam" button
3. **Frontend calls** `GET /api/auth/steam/openid/start`
4. **Backend returns** Steam login URL
5. **User redirects** to Steam (steamcommunity.com)
6. **User logs in** with Steam account
7. **Steam redirects back** to `/api/auth/steam/openid/callback`
8. **Backend verifies** OpenID response with Steam servers
9. **Backend checks** if user's Steam ID is in `config/users.json`
10. **Backend creates** session and stores in `config/sessions.json`
11. **Backend returns** token in HTML page via localStorage
12. **Frontend stores** token: `localStorage.setItem('arma_api_token', token)`
13. **User redirects** to `/arma` dashboard

### API Authentication

All admin API endpoints require:
```javascript
Authorization: Bearer <token>
```

Token is sent automatically from frontend:
```javascript
const token = localStorage.getItem('arma_api_token');
const response = await fetch('/api/server/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Role-Based Access Control

Three roles:
- **admin**: Full access (server control, config, user management)
- **gm**: Game master (server control, player management, no user/config changes)
- **user**: Read-only (view stats, no server control)

Backend enforces roles with middleware:
```javascript
app.post('/api/server/start', requireAuth, requireRole(['admin', 'gm']), ...);
app.post('/api/users', requireAuth, requireRole(['admin']), ...);
```

---

## Nginx Configuration

### Single Domain Setup

Everything on one domain (e.g., `arma.example.com`):

```nginx
server {
    listen 443 ssl http2;
    server_name arma.example.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/arma.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/arma.example.com/privkey.pem;

    # Flute (PHP)
    root /opt/flute/public;
    index index.php;

    # Proxy Node API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Flute routes
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

**Full config**: `docs/nginx-configs/single-domain.conf`

### Split Domains Setup (Maximum Security)

Separate public and private:
- `battlelog.example.com` - Public battlelog (read-only)
- `panel.example.com` - Admin panel (authenticated)

**Full config**: `docs/nginx-configs/split-domains.conf`

---

## Configuration Files

### Node Backend Config (`/opt/arma-reforger-manager/config/`)

**server-config.json** - Server settings
```json
{
  "serverName": "My Arma Server",
  "serverPort": 2001,
  "maxPlayers": 64,
  "password": "",
  "steamApiKey": "YOUR_STEAM_API_KEY",
  "internalApiKey": "random-secret-key",
  "serverPath": "/opt/arma-reforger",
  "steamCmdPath": "/opt/steamcmd"
}
```

**users.json** - Authorized users
```json
{
  "users": [
    {
      "steamId": "76561198012345678",
      "displayName": "AdminUser",
      "role": "admin",
      "addedAt": "2025-12-25T00:00:00.000Z"
    }
  ]
}
```

**sessions.json** - Active sessions (auto-managed)
```json
{
  "token-abc123...": {
    "user": {
      "steamId": "76561198012345678",
      "displayName": "AdminUser",
      "role": "admin"
    },
    "createdAt": 1735084800000
  }
}
```

**flute-db.json** - Flute database credentials (created by installer)

Example with **MariaDB** (local):
```json
{
  "engine": "mariadb",
  "host": "127.0.0.1",
  "port": "3306",
  "database": "flute",
  "username": "flute",
  "password": "auto-generated-password"
}
```

Example with **PostgreSQL** (local):
```json
{
  "engine": "postgres",
  "host": "127.0.0.1",
  "port": "5432",
  "database": "flute",
  "username": "flute",
  "password": "auto-generated-password"
}
```

Example with **Supabase** (cloud PostgreSQL):
```json
{
  "engine": "postgres",
  "host": "db.xxxxxxxxxxxxx.supabase.co",
  "port": "5432",
  "database": "postgres",
  "username": "postgres",
  "password": "your-supabase-password"
}
```

### Flute Config (`/opt/flute/`)

Flute has its own configuration:
- `.env` - Main Flute config (database, app key, etc.)
- `storage/` - Cache, sessions, logs, uploads
- `vendor/` - Composer dependencies

**Do not commit** these to the Arma Manager repository. They are runtime files.

---

## Updating the Arma Reforger Module

The custom Flute module lives in the main repository at `flute-ext/`.

**After updating the module code:**

```bash
# 1. Pull latest code
cd /opt/arma-reforger-manager
sudo -u arma git pull origin main

# 2. Deploy to Flute
sudo rsync -a flute-ext/app/Modules/ /opt/flute/app/Modules/

# 3. Clear Flute cache
cd /opt/flute
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan view:clear

# 4. Verify permissions
sudo chown -R www-data:www-data /opt/flute/app/Modules/ArmaReforgerManager
```

---

## Module Structure

### Controllers (`flute-ext/app/Modules/ArmaReforgerManager/Controllers/`)

- `ArmaLoginController.php` - Login/logout page
- `ArmaDashboardController.php` - Dashboard
- `ArmaServerController.php` - Server control page
- `ArmaBattlelogController.php` - Public battlelog
- `ArmaPlayersController.php` - Player management
- `ArmaSchedulerController.php` - Scheduled tasks
- `ArmaBackupsController.php` - Backup management
- `ArmaModsController.php` - Mod management
- `ArmaConfigController.php` - Configuration
- `ArmaUsersController.php` - User management
- `ArmaLogsController.php` - Logs viewer

### Views (`flute-ext/app/Modules/ArmaReforgerManager/views/`)

**Layouts:**
- `layouts/admin.blade.php` - Admin layout with navigation

**Pages:**
- `pages/login.blade.php` - Login page
- `pages/dashboard.blade.php` - Dashboard
- `pages/server.blade.php` - Server control
- `pages/battlelog.blade.php` - Battlelog
- `pages/players.blade.php` - Player management
- `pages/scheduler.blade.php` - Scheduler
- `pages/backups.blade.php` - Backups
- `pages/mods.blade.php` - Mods
- `pages/config.blade.php` - Configuration
- `pages/users.blade.php` - Users
- `pages/logs.blade.php` - Logs

### Routes (`flute-ext/app/Modules/ArmaReforgerManager/routes.php`)

```php
$router->get('/battlelog', [ArmaBattlelogController::class, 'index']);
$router->get('/arma/login', [ArmaLoginController::class, 'index']);
$router->get('/arma', [ArmaDashboardController::class, 'index']);
$router->get('/arma/server', [ArmaServerController::class, 'index']);
$router->get('/arma/players', [ArmaPlayersController::class, 'index']);
// ... etc
```

---

## API Communication

### From Flute to Node Backend

All pages use JavaScript to call the Node API:

```javascript
// Shared utility in admin.blade.php
window.ArmaAPI = (function() {
    const TOKEN_KEY = 'arma_api_token';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || '';
    }

    async function get(url) {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    async function post(url, data) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    return { get, post, getToken };
})();
```

**Usage in pages:**
```javascript
// Get server status
const status = await ArmaAPI.get('/api/status');

// Start server
const result = await ArmaAPI.post('/api/server/start');
```

---

## GDPR Compliance

### Data Collected

- Steam ID (64-bit identifier)
- Display name (from Steam)
- Avatar URL (from Steam)
- Last login timestamp
- Role (admin/gm/user)

### Data NOT Collected

- IP addresses (not stored in app, only in Nginx logs)
- Email addresses (unless user provides in Flute)
- Private messages
- Session cookies (tokens in localStorage)

### User Rights

- **Access**: Users can view their profile at `/arma/users`
- **Deletion**: Admins can delete users, which removes all data and sessions
- **Portability**: Data is stored in JSON files, easily exportable

### Retention

- **Sessions**: 24 hours (configurable)
- **Audit logs**: Unlimited (implement rotation as needed)
- **Battlelog data**: Unlimited (implement retention policy as needed)

---

## Troubleshooting

### Flute shows blank page

```bash
# Check PHP errors
sudo tail -f /var/log/nginx/error.log
sudo tail -f /opt/flute/storage/logs/laravel.log

# Clear cache
cd /opt/flute
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan view:clear

# Check permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

### Module not loading

```bash
# Verify module exists
ls -la /opt/flute/app/Modules/ArmaReforgerManager/

# Check ownership
sudo chown -R www-data:www-data /opt/flute/app/Modules/

# Clear Flute cache
cd /opt/flute
sudo -u www-data php artisan cache:clear
```

### API calls fail with 401

```bash
# Check token in browser console
localStorage.getItem('arma_api_token')

# Check backend is running
sudo systemctl status arma-reforger-backend

# Check sessions.json
cat /opt/arma-reforger-manager/config/sessions.json

# Verify user is in users.json
cat /opt/arma-reforger-manager/config/users.json
```

### Routes not working

```bash
# Check Nginx config
sudo nginx -t

# Check Flute routes
cd /opt/flute
sudo -u www-data php artisan route:list | grep -i arma

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm
```

### Supabase connection issues

```bash
# Test connection manually
export PGPASSWORD="your-password"
psql -h db.xxxxx.supabase.co -p 5432 -U postgres -d postgres -c "SELECT 1;"
unset PGPASSWORD

# Check Flute database config
cat /opt/arma-reforger-manager/config/flute-db.json

# Verify Flute .env has correct DB credentials
cat /opt/flute/.env | grep DB_

# Common issues:
# 1. Firewall: Supabase requires outbound access on port 5432
# 2. Wrong credentials: Double-check Project Settings > Database in Supabase
# 3. SSL mode: Flute may require sslmode=require (check Flute docs)
# 4. Connection pooling: Use direct connection, not pooler URL
```

**Supabase-specific notes:**
- Use the **direct connection** string (not the pooler)
- Default database name is `postgres` (not `flute`)
- Default username is `postgres` (not `flute`)
- Password is shown only once during project creation - save it!
- Connection limit on free tier: 50 concurrent connections
- Enable connection pooling in Supabase if you hit limits

---

## Additional Resources

- [Deployment Guide](./DEPLOYMENT.md) - Full deployment instructions
- [Security Guide](./SECURITY.md) - Production security hardening
- [Update Guide](./UPDATES.md) - Update procedures
- [Testing Guide](./TESTING.md) - Testing and QA
- [Flute Documentation](https://docs.flute-cms.com/) - Official Flute docs

---

## License

This Arma Reforger Manager (including the custom Flute module) is licensed under **GPL-3.0-or-later** for compatibility with Flute CMS (GPL-3.0).

Flute CMS itself is licensed separately under GPL-3.0.
