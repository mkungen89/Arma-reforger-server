# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Arma Reforger Server Manager** is a complete server management solution for Arma Reforger dedicated servers. The project consists of:

1. **Node.js Backend (API/Engine)** - Express API server handling server control, mod management, battlelog, scheduling, backups, and authentication
2. **Flute CMS (PHP)** - Primary UI layer (Git submodule), handles public battlelog pages and admin panel
3. **Installation Scripts** - Automated installers for Ubuntu VPS (`install-ubuntu.sh`) and Windows (`install.ps1`)

**Key Architectural Decision**: The project is transitioning to **Flute-only UI**. The React frontend has been removed (v3.5.0+). Node backend serves API-only; Flute CMS provides all UI.

## Development Commands

### Running the Backend

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The backend runs on port 3001 by default (configurable via `PORT` environment variable).

### Testing Installation Scripts

**Ubuntu (requires sudo):**
```bash
sudo bash install-ubuntu.sh
```

**Non-interactive (for automation):**
```bash
sudo ADMIN_STEAMID=76561199XXXXXXXXX FLUTE_DOMAIN=site.example.com ENABLE_NGINX=1 bash install-ubuntu.sh
```

### Managing the Service (Ubuntu)

```bash
# Start/stop/restart the backend service
sudo systemctl start arma-reforger-webui
sudo systemctl stop arma-reforger-webui
sudo systemctl restart arma-reforger-webui

# View logs
sudo journalctl -u arma-reforger-webui -f
```

### Docker (API/Engine Only - for testing)

```bash
# Start in Docker Desktop
docker compose up --build

# Access API at http://localhost:3001/api
```

Note: Docker mode runs Linux container. If `serverPath` points to Windows `.exe`, the game server process won't start in the container.

## Architecture

### Backend Structure

All backend code lives in `backend/`:

- **`server.js`** - Main Express server, route mounting, middleware configuration
- **`auth.js`** - Steam authentication, session management, role-based access control (Admin/GM/User)
- **`battlelog.js`** - Public battlelog API (player stats, kills, deaths, leaderboards, match history)
- **`battlelogIntegration.js`** - Game server log parsing and battlelog event ingestion
- **`playerManager.js`** - Live player management (kick/ban/warn/message/broadcast)
- **`scheduler.js`** - Automated task scheduling (cron/interval/one-time tasks)
- **`backup.js`** - Backup creation/restore system (ZIP archives)
- **`modManager.js`** - Steam Workshop mod management with dependency checking
- **`workshopApi.js`** - Steam Workshop scraping for mod metadata
- **`diagnostics.js`** - System health checks and auto-fix capabilities
- **`sso.js`** - OAuth-like SSO flow for Flute CMS integration
- **`systemUpdate.js`** - Self-update system via GitHub
- **`platform.js`** - Platform-agnostic executable resolution (Windows/Linux)
- **`internalApiKey.js`** - Internal API key validation for service-to-service calls
- **`rateLimit.js`** - Rate limiting middleware for public endpoints
- **`apiError.js`** - Standardized API error responses

### Configuration Files

All runtime configuration lives in `config/` (NOT committed to Git):

- **`server-config.json`** - Server settings (paths, ports, Steam API key)
- **`users.json`** - User database with Steam IDs and roles
- **`mods.json`** - Installed mods and their metadata
- **`scheduled-tasks.json`** - Scheduled task definitions
- **`battlelog.json`** - Battlelog data (player stats, matches, events)
- **`sso-clients.json`** - SSO client credentials for Flute integration

Examples are in `config.example/`. The installer creates `config/` from these templates.

### Authentication & Authorization

**Three-tier role system:**
- **Admin** - Full access to all features (server control, config, user management, backups)
- **GM (Game Master)** - Server control, mod management, player management, logs (no config/users)
- **User** - Read-only access (dashboard, logs)

**Session Management:**
- Sessions stored in-memory (Map) with 24-hour expiry
- Steam OpenID authentication flow
- Bearer token in `Authorization` header

**Security Middleware:**
- Rate limiting on `/api/auth`, `/api/battlelog`, `/api/server-browser`
- Internal API key required for write operations to battlelog/scheduler
- CORS restricted to same-origin by default (configurable via `CORS_ORIGIN`)
- Request body size limit (1MB default)

### Flute CMS Integration

Flute CMS lives as a Git submodule in `flute/`:

```bash
git submodule update --init --recursive
```

**Integration Points:**
1. **Public Battlelog** - Flute fetches Node API endpoints server-side (no CORS issues)
2. **SSO** - Flute redirects to `/api/sso/authorize`, exchanges code for token, validates with `/api/sso/userinfo`
3. **Admin Panel** - Flute module in `flute-ext/app/Modules/` (copied during install)

**Important:** Flute is GPL-3.0 licensed. The installer copies Flute modules from `flute-ext/` but does NOT commit Flute runtime files to this repo.

### Scheduler System

The scheduler (`backend/scheduler.js`) supports:

**Schedule Types:**
- **Cron** - Cron expression (e.g., `0 4 * * *` for 4 AM daily)
- **Interval** - Every N minutes/hours
- **One-time** - Execute once at a specific time

**Task Types:**
- `server_restart` - Restart server (with optional warning broadcast)
- `server_update` - Run SteamCMD update
- `backup` - Create backup archive
- `broadcast` - Send message to all players
- `kick_idle` - Kick players idle for N minutes
- `clear_logs` - Truncate server logs
- `mod_update` - Update all installed mods
- `custom_command` - Execute arbitrary shell command

All scheduler operations use internal API key for authentication.

### Battlelog System

**Public Read Endpoints** (no auth required):
- `GET /api/battlelog/overview` - Total stats summary
- `GET /api/battlelog/feed` - Live event feed
- `GET /api/battlelog/matches` - Match history
- `GET /api/battlelog/leaderboard` - Player rankings
- `GET /api/battlelog/players/:steamId` - Player profile

**Write Endpoints** (internal API key required):
- `POST /api/battlelog/events` - Record game events
- `POST /api/battlelog/match` - Record match results

**Data Model:**
- **Players** - SteamID, name, avatar, stats (kills, deaths, score, XP, rank)
- **Sessions** - Player connection/disconnection events
- **Matches** - Game rounds with start/end times and player participation
- **Events** - Kill/death/achievement events with timestamps

### Mod Management

**Dependency Validation:**
- Prevents circular dependencies
- Ensures all required mods are enabled
- Validates before toggling mods on/off

**Metadata Fetching:**
- Scrapes Steam Workshop pages for mod info (version, size, thumbnail, game version)
- Uses stable `__NEXT_DATA__` JSON parsing
- Supports metadata refresh with TTL tracking

**Operations:**
- Search mod by Workshop URL
- Add/remove mods
- Install via SteamCMD
- Toggle enabled/disabled state
- Refresh metadata (per mod or bulk)

## Important Patterns

### Error Handling

Always use standardized error responses:

```javascript
const { sendApiError } = require('./apiError');

// In route handler
return sendApiError(res, 400, 'Invalid request', { details: 'Missing required field: name' });
```

### Internal API Calls

When backend services need to call other backend endpoints (e.g., scheduler calling backup):

```javascript
const { getInternalApiKey } = require('./internalApiKey');
const headers = { 'x-internal-api-key': getInternalApiKey() };

await axios.post(`${API_BASE}/api/backup/create`, data, { headers });
```

### Role-Based Middleware

```javascript
const { requireAuth, requireAdmin, requireRole } = require('./auth');

// Admin only
router.post('/endpoint', requireAuth, requireAdmin, handler);

// Admin or GM
router.post('/endpoint', requireAuth, requireRole(['admin', 'gm']), handler);
```

### Platform-Agnostic Paths

```javascript
const { resolveSteamCmdExecutable, resolveServerExecutable, isWindows } = require('./platform');

const steamCmdExec = resolveSteamCmdExecutable(config.steamCmdPath);
const serverExec = resolveServerExecutable(config.serverPath);
```

## Common Development Tasks

### Adding a New API Endpoint

1. Create or modify router file in `backend/`
2. Add authentication middleware if needed
3. Implement error handling with `sendApiError`
4. Mount router in `backend/server.js`
5. Add rate limiting if endpoint is public

### Adding a Scheduled Task Type

1. Add task type constant to `TASK_TYPES` in `scheduler.js`
2. Implement execution logic in `executeTask()` function
3. Use internal API key for any backend API calls
4. Add to frontend task creation UI (in Flute module)

### Modifying Configuration Schema

1. Update example in `config.example/`
2. Update validation in relevant backend module
3. Document in README.md
4. Update installer script if needed

### Working with Flute Modules

Flute modules are in `flute-ext/app/Modules/`. During installation, these are copied to the Flute installation directory. Do NOT edit files inside `flute/` (submodule) directly.

## Security Considerations

### Secrets Management

- **Never commit** `config/` directory
- Steam API keys go in `server-config.json` (masked in UI)
- SSO JWT secret in `SSO_JWT_SECRET` environment variable
- Internal API key auto-generated on first boot

### GDPR Compliance

- Player IP addresses NOT stored or exposed in battlelog
- Minimal data collection (SteamID, name, avatar, stats only)
- No personal data in logs
- Data retention policy configurable for battlelog history

### Production Hardening

Environment variables:
- `CORS_ORIGIN` - Comma-separated allowed origins
- `JSON_LIMIT` - Request body size limit (default 1mb)
- `PUBLIC_API_RPM` - Rate limit for public endpoints (default 300/min)
- `TRUST_PROXY=1` - Enable if behind reverse proxy
- `SSO_JWT_SECRET` - Required for SSO

Nginx setup:
- Proxy `/api/*` to Node backend
- Serve Flute CMS as root
- Enable HTTPS with Let's Encrypt
- Add rate limiting at Nginx level for DDoS protection

### Common Pitfalls

- **Do not** edit `flute/` submodule directly - changes go in `flute-ext/`
- **Do not** commit lockfiles to Git (npm ci uses package-lock.json in VPS install)
- **Do not** hardcode default admin SteamID - installer must prompt for it
- **Do not** log sensitive data (API keys, tokens, internal API key)
- **Always** validate input before executing shell commands
- **Always** check file permissions before writing config files

## File Locations

**Development (local):**
- Backend: `./backend/`
- Config: `./config/`
- Backups: `./backups/`
- Mods: `./mods/`

**Production (Ubuntu VPS):**
- Installation root: `/opt/arma-reforger-manager/`
- Backend: `/opt/arma-reforger-manager/backend/`
- Config: `/opt/arma-reforger-manager/config/`
- Game server: `/opt/arma-reforger/` (or custom path)
- Flute CMS: `/var/www/flute/` (or custom path)
- Systemd service: `/etc/systemd/system/arma-reforger-webui.service`

## Testing

**Manual Testing Checklist** (see TODO.md section E1 for full list):
- Server start/stop/restart (idempotency)
- Mod add/install/toggle/remove
- Scheduler task create/run/history
- Backup create/download/restore
- Player management (kick/ban/message)
- Battlelog public access
- SSO login flow

**No automated tests currently.** Contributions welcome.

## Git Workflow

Main branch: `main`

**Submodules:**
```bash
# Update Flute CMS to latest
cd flute
git pull origin main
cd ..
git add flute
git commit -m "chore: update Flute CMS submodule"
```

**Important Git Ignore Patterns:**
- `config/` - Runtime configuration with secrets
- `backups/` - Backup archives
- `mods/` - Downloaded mod files
- `node_modules/` - Dependencies
- `flute/storage/` - Flute runtime data
- `flute/vendor/` - Flute PHP dependencies

## References

- **Arma Reforger Docs**: https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting
- **Flute CMS**: https://flute-cms.com/en
- **Steam Workshop API**: (undocumented - we scrape HTML)
- **TODO.md**: Master plan for Flute-only completion
- **docs/FLUTE.md**: Flute integration details
- **UPDATE.md**: System update guide
