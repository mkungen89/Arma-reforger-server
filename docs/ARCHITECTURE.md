# Architecture & File Structure

Complete reference for the Arma Reforger Server Manager codebase structure and architecture.

## Table of Contents
- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Configuration Files](#configuration-files)
- [Key Components](#key-components)
- [Data Flow](#data-flow)
- [File Locations Reference](#file-locations-reference)

---

## Overview

The Arma Reforger Server Manager is a **full-stack server management solution** with:

- **Backend**: Node.js (Express) API server and game server engine
- **Frontend**: Flute CMS (PHP/Laravel) for web UI
- **Database**: MariaDB or PostgreSQL (for Flute)
- **Game Server**: Arma Reforger dedicated server

**Architecture Pattern**: API-first with separate concerns
- Node backend handles game server control, API endpoints, authentication
- Flute handles web UI, routing, and presentation layer
- Communication via REST API with Bearer token authentication

---

## Directory Structure

### Repository Root

```
arma-reforger-server-manager/
│
├── backend/                    # Node.js backend (API & engine)
│   ├── server.js              # Main entry point
│   ├── auth.js                # Authentication & user management
│   ├── steamOpenId.js         # Steam OpenID 2.0 implementation
│   ├── sessionStore.js        # Persistent session storage
│   ├── auditLogger.js         # Audit logging system
│   ├── battlelog.js           # Battlelog API
│   ├── playerManager.js       # Player management (kick/ban/message)
│   ├── scheduler.js           # Scheduled tasks
│   ├── backup.js              # Backup & restore
│   ├── modManager.js          # Workshop mod management
│   ├── diagnostics.js         # System diagnostics
│   ├── platform.js            # Platform detection (Windows/Linux)
│   ├── rateLimit.js           # Rate limiting middleware
│   ├── apiError.js            # Standardized error responses
│   ├── internalApiKey.js      # Internal API key validation
│   └── tests/                 # Automated tests
│       ├── auth.test.js
│       └── public-api.test.js
│
├── flute/                     # Flute CMS (Git submodule)
│   ├── app/                   # Flute application code
│   ├── public/                # Web root
│   ├── storage/               # Cache, logs, uploads
│   ├── vendor/                # Composer dependencies
│   └── ...
│
├── flute-ext/                 # Custom Flute module (source)
│   └── app/
│       └── Modules/
│           └── ArmaReforgerManager/
│               ├── Controllers/       # PHP controllers
│               │   ├── ArmaLoginController.php
│               │   ├── ArmaDashboardController.php
│               │   ├── ArmaServerController.php
│               │   ├── ArmaBattlelogController.php
│               │   ├── ArmaPlayersController.php
│               │   ├── ArmaSchedulerController.php
│               │   ├── ArmaBackupsController.php
│               │   ├── ArmaModsController.php
│               │   ├── ArmaConfigController.php
│               │   ├── ArmaUsersController.php
│               │   └── ArmaLogsController.php
│               ├── views/             # Blade templates
│               │   ├── layouts/
│               │   │   └── admin.blade.php
│               │   └── pages/
│               │       ├── login.blade.php
│               │       ├── dashboard.blade.php
│               │       ├── server.blade.php
│               │       ├── battlelog.blade.php
│               │       ├── players.blade.php
│               │       ├── scheduler.blade.php
│               │       ├── backups.blade.php
│               │       ├── mods.blade.php
│               │       ├── config.blade.php
│               │       ├── users.blade.php
│               │       └── logs.blade.php
│               └── routes.php         # Route definitions
│
├── config/                    # Node backend configuration
│   ├── server-config.json     # Server settings (not committed)
│   ├── users.json             # Authorized users (not committed)
│   ├── sessions.json          # Active sessions (not committed)
│   ├── mods.json              # Installed mods (not committed)
│   ├── scheduled-tasks.json   # Scheduled tasks (not committed)
│   ├── internal-api-key.json  # Internal API key (not committed)
│   ├── flute-db.json          # Flute DB credentials (not committed)
│   └── ...
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # This file
│   ├── DEPLOYMENT.md          # Deployment guide
│   ├── SECURITY.md            # Security & hardening
│   ├── UPDATES.md             # Update procedures
│   ├── TESTING.md             # Testing guide
│   ├── FLUTE.md               # Flute integration guide
│   └── nginx-configs/         # Nginx configuration templates
│       ├── single-domain.conf
│       └── split-domains.conf
│
├── logs/                      # Application logs (not committed)
│   └── audit.log              # Audit trail
│
├── backups/                   # Server backups (not committed)
│
├── .github/                   # GitHub configuration
│   └── workflows/
│       └── tests.yml          # CI/CD pipeline
│
├── .gitignore                 # Git ignore rules
├── package.json               # Node dependencies & scripts
├── package-lock.json          # Locked dependency versions
├── install-ubuntu.sh          # Automated installer for Ubuntu
├── README.md                  # Project overview
├── TODO.md                    # Development roadmap
├── CLAUDE.md                  # Guide for Claude Code instances
└── LICENSE                    # GPL-3.0-or-later license
```

### Production Deployment Paths

```
/opt/
│
├── arma-reforger-manager/     # Manager backend
│   ├── backend/               # Node.js source
│   ├── config/                # Configuration files
│   │   ├── server-config.json
│   │   ├── users.json
│   │   ├── sessions.json
│   │   ├── mods.json
│   │   └── ...
│   ├── logs/                  # Application logs
│   │   └── audit.log
│   ├── backups/               # Backup archives
│   ├── node_modules/          # Node dependencies
│   └── package.json
│
├── flute/                     # Flute CMS
│   ├── app/
│   │   └── Modules/
│   │       └── ArmaReforgerManager/  # Deployed from flute-ext/
│   ├── bootstrap/
│   │   └── cache/             # Bootstrap cache
│   ├── public/                # Web root (nginx points here)
│   │   ├── index.php
│   │   ├── uploads/           # User uploads
│   │   └── storage/           # Symlink to ../storage/app/public
│   ├── storage/               # Flute storage
│   │   ├── app/
│   │   ├── framework/
│   │   │   ├── cache/
│   │   │   ├── sessions/
│   │   │   └── views/
│   │   └── logs/
│   │       └── laravel.log
│   ├── vendor/                # Composer dependencies
│   └── .env                   # Flute environment config
│
├── arma-reforger/             # Game server installation
│   ├── ArmaReforgerServer     # Server executable (Linux)
│   ├── ArmaReforgerServer.exe # Server executable (Windows)
│   ├── mods/                  # Workshop mods
│   ├── profile/               # Server profile
│   └── ...
│
└── steamcmd/                  # SteamCMD installation
    ├── steamcmd.sh            # SteamCMD executable
    └── ...
```

---

## Configuration Files

### Node Backend (`/opt/arma-reforger-manager/config/`)

#### server-config.json
**Purpose**: Main server configuration
**Created by**: Installer (auto-generated)
**Format**: JSON
```json
{
  "serverName": "My Arma Server",
  "serverPort": 2001,
  "maxPlayers": 64,
  "password": "",
  "steamApiKey": "YOUR_API_KEY",
  "internalApiKey": "random-secret",
  "serverPath": "/opt/arma-reforger",
  "steamCmdPath": "/opt/steamcmd"
}
```

#### users.json
**Purpose**: Authorized users with roles
**Created by**: Installer (initial admin)
**Format**: JSON
```json
{
  "users": [
    {
      "steamId": "76561198012345678",
      "displayName": "Admin",
      "avatarUrl": "https://...",
      "role": "admin",
      "addedAt": "2025-12-25T00:00:00Z",
      "lastLogin": "2025-12-25T12:00:00Z"
    }
  ]
}
```

#### sessions.json
**Purpose**: Active user sessions
**Created by**: Backend (auto-managed)
**Format**: JSON (key-value)
```json
{
  "abc123...": {
    "user": {
      "steamId": "76561198012345678",
      "displayName": "Admin",
      "role": "admin"
    },
    "createdAt": 1735084800000
  }
}
```

#### mods.json
**Purpose**: Installed Workshop mods
**Created by**: Backend (when mods installed)
**Format**: JSON
```json
{
  "mods": [
    {
      "id": "1234567890",
      "name": "Mod Name",
      "enabled": true,
      "size": 1024000,
      "dependencies": []
    }
  ]
}
```

#### scheduled-tasks.json
**Purpose**: Automated scheduled tasks
**Created by**: User (via UI)
**Format**: JSON
```json
{
  "tasks": [
    {
      "id": "task-1",
      "type": "backup",
      "schedule": "daily",
      "time": "02:00",
      "enabled": true,
      "lastRun": "2025-12-25T02:00:00Z"
    }
  ]
}
```

#### internal-api-key.json
**Purpose**: Internal API key for scheduled tasks
**Created by**: Installer (auto-generated)
**Format**: JSON
```json
{
  "key": "random-secret-key-for-internal-use"
}
```

#### flute-db.json
**Purpose**: Flute database credentials
**Created by**: Installer
**Format**: JSON
```json
{
  "engine": "mariadb",
  "host": "localhost",
  "database": "flute",
  "username": "flute",
  "password": "auto-generated-password"
}
```

### Flute CMS (`/opt/flute/`)

#### .env
**Purpose**: Flute environment configuration
**Created by**: Flute installer (web-based)
**Format**: ENV (key=value)
```env
APP_NAME="Arma Reforger"
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://arma.example.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=flute
DB_USERNAME=flute
DB_PASSWORD=...
```

---

## Key Components

### Backend (Node.js)

#### server.js
**Purpose**: Main Express app, HTTP server
**Key responsibilities**:
- Initialize Express app
- Load middleware (CORS, rate limiting, auth)
- Mount API routers
- Serve health check endpoint
- Start HTTP/WebSocket server

#### auth.js
**Purpose**: Authentication & authorization
**Key responsibilities**:
- Steam OpenID login flow
- Session creation & validation
- User management (CRUD)
- Role-based access control middleware
- Audit logging for user actions

#### sessionStore.js
**Purpose**: Persistent session storage
**Key responsibilities**:
- Save sessions to config/sessions.json
- Load sessions on startup
- Session TTL management (24 hours)
- Automatic cleanup (every hour)
- Delete sessions by Steam ID

#### auditLogger.js
**Purpose**: Audit trail logging
**Key responsibilities**:
- Log admin actions to logs/audit.log
- Sanitize secrets from log entries
- Categorize events (user, server, mod, config, etc.)
- Provide query interface for UI

#### steamOpenId.js
**Purpose**: Steam OpenID 2.0 implementation
**Key responsibilities**:
- Generate Steam login URLs
- Verify OpenID responses
- Extract Steam ID from callback

#### playerManager.js
**Purpose**: Live player management
**Key responsibilities**:
- List online players
- Kick/ban/unban players
- Send messages to players
- Broadcast messages to all players

#### modManager.js
**Purpose**: Workshop mod management
**Key responsibilities**:
- Search Steam Workshop
- Download/install mods via SteamCMD
- Enable/disable mods
- Resolve dependencies
- Update mod metadata

#### scheduler.js
**Purpose**: Scheduled task execution
**Key responsibilities**:
- Store scheduled tasks
- Execute tasks at intervals
- Track execution history
- Support for backups, restarts, updates

#### backup.js
**Purpose**: Backup & restore functionality
**Key responsibilities**:
- Create ZIP backups
- List available backups
- Restore from backup
- Zip-slip protection

#### diagnostics.js
**Purpose**: System diagnostics
**Key responsibilities**:
- Check SteamCMD installation
- Verify server executable
- Test port availability
- Check file permissions
- Detect environment issues

### Frontend (Flute CMS + Module)

#### Flute CMS (Submodule)
**Purpose**: Web UI framework
**Responsibilities**:
- Routing
- Blade templating
- Database ORM
- User authentication (Flute users, separate from manager)
- CMS features

#### ArmaReforgerManager Module
**Purpose**: Custom Flute module for manager UI
**Responsibilities**:
- Render admin pages
- Call Node API via JavaScript
- Display server status, logs, players, etc.
- Handle user interactions

---

## Data Flow

### User Authentication Flow

```
1. User → /arma/login (Flute page)
2. User clicks "Sign in through Steam"
3. Browser → GET /api/auth/steam/openid/start (Node API)
4. Node API → Returns Steam login URL
5. Browser → Redirects to Steam
6. User → Logs in on Steam
7. Steam → Redirects to /api/auth/steam/openid/callback
8. Node API → Verifies OpenID with Steam
9. Node API → Checks users.json for authorization
10. Node API → Creates session in sessions.json
11. Node API → Returns token in HTML page
12. Browser → Stores token in localStorage
13. Browser → Redirects to /arma (dashboard)
```

### Server Control Flow

```
1. User → Clicks "Start Server" in UI
2. Browser → POST /api/server/start with Bearer token
3. Node API → Validates token (sessions.json)
4. Node API → Checks user role (admin or gm)
5. Node API → Spawns server process
6. Node API → Logs action to audit.log
7. Node API → Returns success response
8. Browser → Updates UI, shows "Running"
```

### Battlelog Data Flow

```
1. User → Visits /battlelog (Flute page)
2. Flute → Renders battlelog.blade.php
3. Browser → Fetches data via JavaScript
4. Browser → GET /api/battlelog/stats (Node API)
5. Node API → Reads battlelog database
6. Node API → Returns stats (no auth required)
7. Browser → Updates UI with stats
```

---

## File Locations Reference

### Configuration

| File | Location (Dev) | Location (Prod) | Purpose |
|------|---------------|-----------------|---------|
| Server config | `config/server-config.json` | `/opt/arma-reforger-manager/config/server-config.json` | Server settings |
| Users | `config/users.json` | `/opt/arma-reforger-manager/config/users.json` | Authorized users |
| Sessions | `config/sessions.json` | `/opt/arma-reforger-manager/config/sessions.json` | Active sessions |
| Flute DB | `config/flute-db.json` | `/opt/arma-reforger-manager/config/flute-db.json` | Flute credentials |
| Flute env | `flute/.env` | `/opt/flute/.env` | Flute config |

### Logs

| Log | Location (Dev) | Location (Prod) | Purpose |
|-----|---------------|-----------------|---------|
| Audit log | `logs/audit.log` | `/opt/arma-reforger-manager/logs/audit.log` | Admin actions |
| Backend logs | stdout/stderr | `journalctl -u arma-reforger-backend` | Node backend |
| Nginx logs | N/A | `/var/log/nginx/arma-*.log` | Web server |
| Flute logs | `flute/storage/logs/laravel.log` | `/opt/flute/storage/logs/laravel.log` | PHP errors |

### Executables

| Component | Location (Dev) | Location (Prod) | Purpose |
|-----------|---------------|-----------------|---------|
| Node backend | `backend/server.js` | `/opt/arma-reforger-manager/backend/server.js` | API server |
| Game server | N/A | `/opt/arma-reforger/ArmaReforgerServer` | Arma server |
| SteamCMD | N/A | `/opt/steamcmd/steamcmd.sh` | Steam CLI |

### Web Files

| Component | Location (Dev) | Location (Prod) | Purpose |
|-----------|---------------|-----------------|---------|
| Flute web root | `flute/public/` | `/opt/flute/public/` | Nginx root |
| Flute module | `flute-ext/app/Modules/ArmaReforgerManager/` | `/opt/flute/app/Modules/ArmaReforgerManager/` | Manager UI |

---

## Component Communication

```
┌──────────────┐
│   Browser    │
│  (User UI)   │
└──────┬───────┘
       │ HTTPS
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│    Nginx     │                  │    Nginx     │
│ (Reverse     │                  │ (PHP-FPM)    │
│  Proxy)      │                  │              │
└──────┬───────┘                  └──────┬───────┘
       │ HTTP                            │
       │ /api/*                          │ /*.php
       ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│ Node Backend │                  │  Flute CMS   │
│ (Express.js) │                  │  (Laravel)   │
│              │                  │              │
│ - Auth       │                  │ - UI Routes  │
│ - Server Ctrl│                  │ - Templates  │
│ - Battlelog  │                  │ - CMS        │
│ - API        │                  │              │
└──────┬───────┘                  └──────┬───────┘
       │                                 │
       │ Spawns                          │ Queries
       ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│ Arma Server  │                  │   Database   │
│  Process     │                  │  (MariaDB/   │
│              │                  │  PostgreSQL) │
└──────────────┘                  └──────────────┘
```

---

## Development vs Production

### Development
- Run backend: `npm run dev` (nodemon)
- Run Flute: Via `php artisan serve` or local Apache/Nginx
- Config: Local files in `config/`
- No systemd services

### Production
- Backend: systemd service (`arma-reforger-backend.service`)
- Flute: Nginx + PHP-FPM
- Config: `/opt/arma-reforger-manager/config/`
- Logs: systemd journal + file logs
- SSL: Let's Encrypt certificates

---

## Further Reading

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [FLUTE.md](./FLUTE.md) - Flute integration details
- [SECURITY.md](./SECURITY.md) - Security configuration
- [UPDATES.md](./UPDATES.md) - Update procedures
- [TESTING.md](./TESTING.md) - Testing guide
