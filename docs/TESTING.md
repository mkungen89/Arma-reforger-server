# Testing Guide

Comprehensive testing guide for the Arma Reforger Server Manager.

## Table of Contents
- [Smoke Test Checklist](#smoke-test-checklist)
- [Automated Tests](#automated-tests)
- [Testing Environments](#testing-environments)
- [Common Test Scenarios](#common-test-scenarios)

---

## Smoke Test Checklist

Use this checklist after deployment or major updates to verify all features work correctly.

### Prerequisites
- [ ] System is deployed (installer completed successfully)
- [ ] Services are running:
  ```bash
  sudo systemctl status arma-reforger-backend
  sudo systemctl status nginx
  sudo systemctl status php8.2-fpm
  ```
- [ ] You have admin Steam ID configured in `config/users.json`
- [ ] Domain is accessible (or using IP address)

---

### 1. Flute Site Loads

**Test:** Basic site accessibility

- [ ] Navigate to: `https://yourdomain.com/`
- [ ] Page loads without errors
- [ ] No PHP errors displayed
- [ ] Flute logo/branding appears
- [ ] Navigation menu is visible

**Expected:** Flute homepage loads successfully

**Troubleshooting if fails:**
```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Check Flute logs
sudo tail -f /opt/flute/storage/logs/laravel.log

# Check permissions
ls -la /opt/flute/storage
```

---

### 2. Battlelog Page

**Test:** Public battlelog accessibility and functionality

#### 2A. Battlelog Loads
- [ ] Navigate to: `https://yourdomain.com/battlelog`
- [ ] Page renders without errors
- [ ] "Overview" tab is visible
- [ ] Server status shows (online/offline)

#### 2B. Overview Tab
- [ ] Total players count displays
- [ ] Total kills displays
- [ ] Server uptime shows
- [ ] Recent activity feed loads (or shows "No activity yet")

#### 2C. Leaderboard Tab
- [ ] Click "Leaderboard" tab
- [ ] Tab switches successfully
- [ ] Leaderboard table displays
- [ ] Sort options work (by kills, deaths, K/D, playtime)
- [ ] Top 50 players shown

#### 2D. Live Feed Tab
- [ ] Click "Live Feed" tab
- [ ] Recent events display (kills, deaths, connections)
- [ ] Timestamps are accurate
- [ ] Feed auto-refreshes (every 10 seconds)

#### 2E. Recent Matches Tab
- [ ] Click "Recent Matches" tab
- [ ] Match list displays
- [ ] Match details show (players, duration, outcome)
- [ ] Can click match to view details

**Expected:** All battlelog features work, data displays correctly

**Troubleshooting if fails:**
```bash
# Check if battlelog API responds
curl http://localhost:3001/api/battlelog/stats

# Check backend logs
sudo journalctl -u arma-reforger-backend -n 50
```

---

### 3. Authentication (Login/Logout)

**Test:** Steam OpenID login flow

#### 3A. Login Page
- [ ] Navigate to: `https://yourdomain.com/arma/login`
- [ ] "Sign in through Steam" button displays
- [ ] Steam logo is visible
- [ ] No error messages

#### 3B. Steam Login Flow
- [ ] Click "Sign in through Steam"
- [ ] Redirects to Steam (steamcommunity.com)
- [ ] Steam login page appears
- [ ] Log in with Steam account
- [ ] Redirects back to site
- [ ] Shows "Login Successful" or redirects to dashboard
- [ ] Token is stored (check browser localStorage: `arma_api_token`)

#### 3C. Authenticated State
- [ ] Navigate to: `https://yourdomain.com/arma`
- [ ] Dashboard loads (not login page)
- [ ] User info displays (name, role, Steam ID)
- [ ] Navigation menu shows admin options

#### 3D. Logout
- [ ] Click "Logout" button (usually in nav or user menu)
- [ ] Confirmation or immediate logout
- [ ] Redirects to login page
- [ ] Can no longer access `/arma` dashboard (redirects to login)
- [ ] Token is cleared from localStorage

**Expected:** Complete login/logout cycle works flawlessly

**Troubleshooting if fails:**
```bash
# Check Steam OpenID callback
sudo journalctl -u arma-reforger-backend | grep "Steam OpenID"

# Check users.json
cat /opt/arma-reforger-manager/config/users.json

# Verify your Steam ID is listed
# Get your Steam ID from: https://steamid.io/
```

---

### 4. Server Control

**Test:** Server start/stop/restart/update actions

#### 4A. Dashboard View
- [ ] Navigate to: `https://yourdomain.com/arma`
- [ ] Server status shows (running/stopped/starting)
- [ ] PID displays (if running)
- [ ] Uptime displays (if running)
- [ ] Player count displays (if running)
- [ ] System resources show (CPU, memory, disk)

#### 4B. Start Server
- [ ] If server is stopped, click "Start Server"
- [ ] Button shows loading state
- [ ] Status changes to "Starting..." then "Running"
- [ ] PID appears
- [ ] Success notification appears
- [ ] If already running, shows "Server is already running"

#### 4C. Stop Server
- [ ] Click "Stop Server"
- [ ] Confirmation dialog appears (optional)
- [ ] Confirm stop
- [ ] Button shows loading state
- [ ] Status changes to "Stopping..." then "Stopped"
- [ ] PID disappears
- [ ] Success notification appears
- [ ] If already stopped, shows "Server is already stopped"

#### 4D. Restart Server
- [ ] Click "Restart Server"
- [ ] Server stops
- [ ] Brief pause
- [ ] Server starts again
- [ ] PID changes (new process)
- [ ] Success notification appears

#### 4E. Update Server
- [ ] Click "Update Server"
- [ ] If server is running, shows error "Please stop the server first"
- [ ] Stop server
- [ ] Click "Update Server" again
- [ ] Update initiates
- [ ] Progress messages appear (or logs show update)
- [ ] Update completes successfully

#### 4F. Status Refresh
- [ ] Dashboard auto-refreshes (every 10-30 seconds)
- [ ] Status updates without page reload
- [ ] System resources update in real-time

**Expected:** All server control actions work idempotently

**Troubleshooting if fails:**
```bash
# Check if server executable exists
ls -la /opt/arma-reforger/ArmaReforgerServer

# Check server logs
sudo journalctl -u arma-reforger-backend -f

# Manually test start
sudo -u arma /opt/arma-reforger/ArmaReforgerServer
```

---

### 5. Live Player Management

**Test:** Player list, kick, ban, message, broadcast

#### 5A. Player List
- [ ] Navigate to: `https://yourdomain.com/arma/players`
- [ ] Online players list displays
- [ ] Player names show
- [ ] Steam IDs visible (for admins)
- [ ] Playtime shows
- [ ] Connection time shows
- [ ] If no players, shows "No online players"

#### 5B. Kick Player
- [ ] Click "Kick" button next to a player
- [ ] Confirmation dialog appears
- [ ] Enter reason (optional)
- [ ] Confirm kick
- [ ] Player is removed from list
- [ ] Success notification appears

#### 5C. Ban Player
- [ ] Click "Ban" button next to a player
- [ ] Ban dialog appears
- [ ] Options: temporary (hours/days) or permanent
- [ ] Enter reason
- [ ] Confirm ban
- [ ] Player is kicked and banned
- [ ] Success notification appears

#### 5D. Unban Player
- [ ] Navigate to banned players list (or tab)
- [ ] Banned players display
- [ ] Click "Unban" next to a player
- [ ] Confirm unban
- [ ] Player removed from ban list
- [ ] Success notification appears

#### 5E. Message Player
- [ ] Click "Message" button next to a player
- [ ] Message dialog appears
- [ ] Enter message text
- [ ] Send message
- [ ] Success notification appears
- [ ] Message appears in player's game (verify in-game if possible)

#### 5F. Broadcast Message
- [ ] Click "Broadcast" button (usually at top)
- [ ] Broadcast dialog appears
- [ ] Enter message text
- [ ] Send broadcast
- [ ] Success notification appears
- [ ] All online players see message (verify in-game if possible)

**Expected:** All player management actions work correctly

**Troubleshooting if fails:**
```bash
# Check if RCON/admin interface is configured
cat /opt/arma-reforger-manager/config/server-config.json | grep -i admin

# Check backend logs
sudo journalctl -u arma-reforger-backend | grep -i player
```

---

### 6. Scheduler / Automated Tasks

**Test:** Task creation, editing, execution

#### 6A. Task List
- [ ] Navigate to: `https://yourdomain.com/arma/scheduler`
- [ ] Scheduled tasks list displays
- [ ] Existing tasks show (if any)
- [ ] Task types visible (backup, restart, update, etc.)
- [ ] Schedule displays (daily, weekly, interval)
- [ ] Last run time shows

#### 6B. Create Task
- [ ] Click "Create Task" or "New Task"
- [ ] Task creation form appears
- [ ] Select task type (e.g., "Backup Server")
- [ ] Select schedule type (e.g., "Daily")
- [ ] Set time (e.g., "02:00 AM")
- [ ] Enable task
- [ ] Save task
- [ ] Task appears in list
- [ ] Success notification appears

#### 6C. Edit Task
- [ ] Click "Edit" on existing task
- [ ] Edit form appears
- [ ] Change schedule (e.g., time or frequency)
- [ ] Save changes
- [ ] Changes reflect in task list

#### 6D. Run Now
- [ ] Click "Run Now" on a task
- [ ] Confirmation appears
- [ ] Confirm execution
- [ ] Task executes immediately
- [ ] Execution status updates
- [ ] Last run time updates
- [ ] Success notification appears

#### 6E. Execution History
- [ ] View execution history (button or tab)
- [ ] Recent executions display (last 50)
- [ ] Shows: timestamp, task type, result (success/failure)
- [ ] Failed executions show error details

#### 6F. Internal API Key Validation
- [ ] Tasks execute using internal API key
- [ ] No manual authentication required
- [ ] Check logs for successful auth:
  ```bash
  sudo journalctl -u arma-reforger-backend | grep "internal API"
  ```

**Expected:** Scheduler creates, edits, and executes tasks successfully

**Troubleshooting if fails:**
```bash
# Check internal API key
cat /opt/arma-reforger-manager/config/internal-api-key.json

# Check scheduled tasks config
cat /opt/arma-reforger-manager/config/scheduled-tasks.json

# Check cron job or timer
sudo systemctl list-timers | grep arma
```

---

### 7. Backup & Restore

**Test:** Backup creation, download, restore

#### 7A. Backup List
- [ ] Navigate to: `https://yourdomain.com/arma/backups`
- [ ] Existing backups list displays
- [ ] Backup names show (with timestamps)
- [ ] File sizes display
- [ ] Creation dates show

#### 7B. Create Backup
- [ ] Click "Create Backup"
- [ ] Backup options appear
- [ ] Select items to backup:
  - [ ] Server files
  - [ ] Config files
  - [ ] Logs
  - [ ] Battlelog database
- [ ] Enter backup name (or auto-generate)
- [ ] Create backup
- [ ] Progress indicator shows
- [ ] Backup completes
- [ ] New backup appears in list
- [ ] Success notification appears

#### 7C. Download Backup
- [ ] Click "Download" on a backup
- [ ] File download initiates
- [ ] .zip file downloads to your computer
- [ ] File is valid (can extract it)

#### 7D. Restore Backup
- [ ] Click "Restore" on a backup
- [ ] **Warning dialog appears** (restoring will overwrite files)
- [ ] Confirm restore
- [ ] Restoration begins
- [ ] Progress shown
- [ ] Restore completes
- [ ] Success notification appears
- [ ] Verify files were restored (check timestamps)

#### 7E. Zip-Slip Protection
- [ ] Security test: backups cannot extract outside intended directory
- [ ] No path traversal vulnerabilities (e.g., `../../etc/passwd`)
- [ ] Check backend validation:
  ```bash
  sudo journalctl -u arma-reforger-backend | grep -i "zip"
  ```

#### 7F. Delete Backup
- [ ] Click "Delete" on a backup
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Backup removed from list
- [ ] Success notification appears

**Expected:** Backups create, download, restore safely

**Troubleshooting if fails:**
```bash
# Check backups directory
ls -la /opt/arma-reforger-manager/backups/

# Check permissions
sudo chown -R arma:arma /opt/arma-reforger-manager/backups/

# Check disk space
df -h
```

---

### 8. Mod Management

**Test:** Workshop mod search, install, toggle, remove

#### 8A. Mod List
- [ ] Navigate to: `https://yourdomain.com/arma/mods`
- [ ] Installed mods list displays
- [ ] Mod names show
- [ ] Mod IDs display
- [ ] Enable/disable toggles visible
- [ ] Version info shows
- [ ] File sizes display

#### 8B. Search Workshop Mods
- [ ] Enter mod name or Workshop ID in search
- [ ] Click "Search Workshop"
- [ ] Search results display
- [ ] Mod metadata shows:
  - [ ] Name
  - [ ] Author
  - [ ] Description
  - [ ] Preview image
  - [ ] File size
  - [ ] Last updated

#### 8C. Install Mod
- [ ] Click "Install" on a search result
- [ ] Installation begins
- [ ] Progress indicator shows
- [ ] Download completes
- [ ] Mod appears in installed mods list
- [ ] Success notification appears

#### 8D. Enable/Disable Mod
- [ ] Toggle mod enabled/disabled
- [ ] Status updates immediately
- [ ] Server config updates (check `config/mods.json`)
- [ ] Success notification appears

#### 8E. Dependency Resolution
- [ ] Install mod with dependencies
- [ ] Dependency list displays
- [ ] Option to "Resolve Dependencies" appears
- [ ] Click "Resolve Dependencies"
- [ ] All dependencies install automatically
- [ ] All mods enabled
- [ ] Success notification appears

#### 8F. Refresh Metadata
- [ ] Click "Refresh Metadata" on a mod
- [ ] Metadata updates from Workshop
- [ ] Version info updates
- [ ] File size updates
- [ ] Last updated time changes
- [ ] Success notification appears

#### 8G. Remove Mod
- [ ] Click "Remove" on a mod
- [ ] Confirmation dialog appears
- [ ] Confirm removal
- [ ] Mod files deleted
- [ ] Mod removed from list
- [ ] Success notification appears

**Expected:** Full Workshop mod lifecycle works

**Troubleshooting if fails:**
```bash
# Check SteamCMD
/opt/steamcmd/steamcmd.sh +quit

# Check mod directory
ls -la /opt/arma-reforger/mods/

# Check Steam Workshop API
curl "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/" \
  -d "itemcount=1" -d "publishedfileids[0]=1234567890"
```

---

### 9. Configuration Management

**Test:** Server config editing, validation, diagnostics

#### 9A. Config Page
- [ ] Navigate to: `https://yourdomain.com/arma/config`
- [ ] Configuration form displays
- [ ] All fields populated with current values
- [ ] Fields grouped logically (server, network, game, etc.)

#### 9B. Edit Configuration
- [ ] Change server name
- [ ] Change max players
- [ ] Change server port
- [ ] Change password (or set/unset)
- [ ] Click "Save Configuration"
- [ ] Validation runs
- [ ] Success notification appears
- [ ] Config file updates (`config/server-config.json`)

#### 9C. Steam API Key Masking
- [ ] Steam API Key field shows masked value: `***...abc123` (last 6 chars)
- [ ] Cannot see full key in UI
- [ ] Can update key by entering new value
- [ ] After save, key is masked again

#### 9D. Run Diagnostics
- [ ] Click "Run Diagnostics" button
- [ ] Diagnostics execute
- [ ] Results display:
  - [ ] SteamCMD installation check
  - [ ] Server executable check
  - [ ] Port availability check
  - [ ] Firewall status
  - [ ] File permissions
  - [ ] Environment warnings (Docker, path mismatches)
- [ ] Issues highlighted in red
- [ ] Suggestions provided for fixes

#### 9E. Validation
- [ ] Try invalid values (e.g., negative port number)
- [ ] Validation error appears
- [ ] Cannot save invalid config
- [ ] Error message explains issue

**Expected:** Config management is secure and validated

**Troubleshooting if fails:**
```bash
# Check config file
cat /opt/arma-reforger-manager/config/server-config.json

# Validate JSON manually
jq . /opt/arma-reforger-manager/config/server-config.json
```

---

### 10. User Management

**Test:** Add/remove users, role assignment

#### 10A. User List
- [ ] Navigate to: `https://yourdomain.com/arma/users`
- [ ] User list displays
- [ ] Shows: Steam ID, display name, role, added date
- [ ] Avatar images display (if Steam API key configured)

#### 10B. Add User
- [ ] Click "Add User"
- [ ] User form appears
- [ ] Enter Steam ID (17 digits)
- [ ] Select role (Admin, GM, or User)
- [ ] Click "Add"
- [ ] Validation runs (valid Steam ID format)
- [ ] User added to list
- [ ] Steam profile fetched (name, avatar)
- [ ] Success notification appears

#### 10C. Update User Role
- [ ] Click "Edit" on a user
- [ ] Role dropdown appears
- [ ] Change role (e.g., User → GM)
- [ ] Save changes
- [ ] Role updates
- [ ] Success notification appears

#### 10D. Remove User
- [ ] Click "Remove" on a user (not yourself)
- [ ] Confirmation dialog appears
- [ ] Confirm removal
- [ ] User removed from list
- [ ] User's sessions invalidated
- [ ] Success notification appears

#### 10E. Protection: Last Admin
- [ ] Try to remove the last admin user
- [ ] Error appears: "Cannot remove the last admin"
- [ ] User is NOT removed

#### 10F. Protection: Self-Removal
- [ ] Try to remove yourself (logged-in user)
- [ ] Error appears: "Cannot remove yourself"
- [ ] User is NOT removed

**Expected:** User management enforces security rules

**Troubleshooting if fails:**
```bash
# Check users.json
cat /opt/arma-reforger-manager/config/users.json

# Validate JSON
jq . /opt/arma-reforger-manager/config/users.json
```

---

## Post-Smoke Test

After completing all smoke tests:

- [ ] All tests passed
- [ ] No critical errors in logs:
  ```bash
  sudo journalctl -u arma-reforger-backend -p err -n 50
  sudo tail -100 /var/log/nginx/error.log
  sudo tail -100 /opt/flute/storage/logs/laravel.log
  ```
- [ ] Audit log contains expected entries:
  ```bash
  tail -50 /opt/arma-reforger-manager/logs/audit.log | jq .
  ```
- [ ] System resources are stable (not constantly at 100%)
- [ ] No memory leaks over extended operation

---

## Automated Tests

For automated testing, run the test suite:

```bash
cd /opt/arma-reforger-manager
npm test
```

See [Automated Tests](#automated-tests-implementation) section below for details.

---

## Testing Environments

### Local Development
- Test on local machine with Docker or VM
- Use `localhost` or `127.0.0.1`
- Mock Steam authentication for faster testing

### Staging
- Dedicated staging VPS
- Mirror of production configuration
- Test updates here first before production

### Production
- Run smoke tests after deployment
- Run smoke tests after updates
- Schedule regular smoke tests (weekly/monthly)

---

## Common Test Scenarios

### Scenario 1: Fresh Install
1. Run installer on clean Ubuntu VPS
2. Complete Flute web installer
3. Run full smoke test checklist
4. Verify all features work

### Scenario 2: Update from Previous Version
1. Backup production
2. Deploy to staging
3. Run update procedure (docs/UPDATES.md)
4. Run smoke tests on staging
5. If passed, deploy to production
6. Run smoke tests on production

### Scenario 3: Recovery from Failure
1. Simulate failure (stop database, corrupt file, etc.)
2. Verify error handling
3. Restore from backup
4. Run smoke tests
5. Verify full recovery

### Scenario 4: Load Testing
1. Simulate multiple concurrent users
2. Stress test API endpoints
3. Monitor resource usage
4. Check for memory leaks
5. Verify rate limiting works

---

## Automated Tests Implementation

See `backend/tests/` directory for automated test suite.

**Test Coverage:**
- Authentication endpoints
- Role-based access control
- Public API endpoints (battlelog, server browser)
- Server control actions
- Input validation
- Error handling

**Run Tests:**
```bash
# All tests
npm test

# Specific test file
npm test -- auth.test.js

# With coverage
npm test -- --coverage
```

---

## Reporting Issues

If any smoke test fails:

1. **Document the failure:**
   - What step failed?
   - What was expected?
   - What actually happened?
   - Screenshots if applicable

2. **Gather logs:**
   ```bash
   sudo journalctl -u arma-reforger-backend -n 200 > backend-logs.txt
   sudo tail -200 /var/log/nginx/error.log > nginx-logs.txt
   sudo tail -200 /opt/flute/storage/logs/laravel.log > flute-logs.txt
   tail -100 /opt/arma-reforger-manager/logs/audit.log > audit-logs.txt
   ```

3. **Check system status:**
   ```bash
   df -h > disk-usage.txt
   free -h > memory-usage.txt
   sudo systemctl status arma-reforger-backend nginx php8.2-fpm > service-status.txt
   ```

4. **Create GitHub issue** with all information

---

## Test Automation Scripts

Example Bash script for automated smoke testing:

```bash
#!/bin/bash
# smoke-test.sh - Automated smoke test

API_URL="http://localhost:3001"
TOKEN="your-admin-token-here"

echo "=== Smoke Test ==="

# Test 1: Health check
echo -n "Health check... "
if curl -s "$API_URL/health" | grep -q '"status":"ok"'; then
    echo "✓"
else
    echo "✗ FAILED"
    exit 1
fi

# Test 2: API status (public)
echo -n "API status... "
if curl -s "$API_URL/api/status" | grep -q '"uptime"'; then
    echo "✓"
else
    echo "✗ FAILED"
    exit 1
fi

# Test 3: Battlelog stats (public)
echo -n "Battlelog API... "
if curl -s "$API_URL/api/battlelog/stats" | grep -q '"totalPlayers"'; then
    echo "✓"
else
    echo "✗ FAILED"
    exit 1
fi

# Test 4: Auth check (requires token)
echo -n "Auth check... "
if curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/auth/me" | grep -q '"steamId"'; then
    echo "✓"
else
    echo "✗ FAILED"
    exit 1
fi

echo ""
echo "=== All Tests Passed ==="
```

---

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Smoke Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

---

For questions or issues with testing, consult the [deployment guide](./DEPLOYMENT.md) or check the logs.
