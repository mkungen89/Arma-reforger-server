# Production Deployment Guide

Complete guide for deploying the Arma Reforger Server Manager with Flute CMS on a VPS.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Flute CMS Setup](#flute-cms-setup)
- [Post-Installation](#post-installation)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements
- Ubuntu 20.04 LTS or 22.04 LTS (recommended)
- Minimum 4GB RAM (8GB+ recommended)
- 50GB+ disk space
- Root or sudo access

### Required Information
Before starting, gather:
- Your Steam ID (17-digit SteamID64) - Get it from https://steamid.io/
- Domain name (e.g., `arma.example.com`)
- Email address for SSL certificates
- (Optional) Steam Web API Key from https://steamcommunity.com/dev/apikey

### Database Options
The installer supports three database options:
1. **MariaDB** (default) - Local database, auto-installed
2. **PostgreSQL** - Local database, auto-installed
3. **Supabase** - Cloud-hosted PostgreSQL (managed service)

**If using Supabase:**
- Create a Supabase project at https://supabase.com
- Get your database credentials from Project Settings > Database
- You'll need: host, database name, username, and password

---

## Installation

### Quick Install (Interactive)

```bash
# Clone the repository
git clone https://github.com/your-org/arma-reforger-server-manager.git
cd arma-reforger-server-manager

# Run the installer (as root or with sudo)
sudo ./install-ubuntu.sh
```

The installer will:
1. Ask for your Steam ID (admin user)
2. Ask for your domain name
3. Ask for your email (for SSL certificates)
4. Install all dependencies (Node.js, PHP 8.2, MariaDB/PostgreSQL, Nginx, Composer)
5. Install SteamCMD and download the Arma Reforger server
6. Deploy Flute CMS
7. Create database and credentials
8. Configure Nginx with SSL (Let's Encrypt)
9. Set up proper file permissions
10. Create systemd services

### Non-Interactive Install

For automated deployments, set environment variables:

```bash
sudo ADMIN_STEAMID="76561198012345678" \
     FLUTE_DOMAIN="arma.example.com" \
     CERTBOT_EMAIL="admin@example.com" \
     ENABLE_SSL=1 \
     FLUTE_DB_ENGINE="mariadb" \
     ./install-ubuntu.sh
```

**Available Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_STEAMID` | (required) | Your SteamID64 for admin access |
| `FLUTE_DOMAIN` | (required) | Domain for the Flute CMS site |
| `CERTBOT_EMAIL` | (required for SSL) | Email for Let's Encrypt |
| `ENABLE_SSL` | 0 | Enable SSL (1=yes, 0=no) |
| `FLUTE_DB_ENGINE` | mariadb | Database engine (mariadb, postgres, or supabase) |
| `FLUTE_DB_HOST` | 127.0.0.1 | Database host (required for Supabase) |
| `FLUTE_DB_PORT` | (auto) | Database port (5432 for PostgreSQL/Supabase, 3306 for MariaDB) |
| `FLUTE_DB_NAME` | flute | Database name (use 'postgres' for Supabase default) |
| `FLUTE_DB_USER` | flute | Database username (use 'postgres' for Supabase default) |
| `FLUTE_DB_PASS` | (auto-generated) | Database password (required for Supabase) |
| `SERVER_PATH` | /opt/arma-reforger | Arma server installation path |
| `FLUTE_PATH` | /opt/flute | Flute CMS installation path |
| `WEB_UI_PATH` | /opt/arma-reforger-manager | Manager backend path |
| `INSTALL_USER` | arma | System user for running services |
| `WEB_UI_PORT` | 3001 | Node backend API port |
| `SERVER_PORT` | 2001 | Arma game server port |

#### Example: Install with Supabase

```bash
sudo ADMIN_STEAMID="76561198012345678" \
     FLUTE_DOMAIN="arma.example.com" \
     CERTBOT_EMAIL="admin@example.com" \
     ENABLE_SSL=1 \
     FLUTE_DB_ENGINE="supabase" \
     FLUTE_DB_HOST="db.xxxxxxxxxxxxx.supabase.co" \
     FLUTE_DB_PORT="5432" \
     FLUTE_DB_NAME="postgres" \
     FLUTE_DB_USER="postgres" \
     FLUTE_DB_PASS="your-supabase-password" \
     ./install-ubuntu.sh
```

**Benefits of Supabase:**
- No local database server to maintain
- Automatic backups and point-in-time recovery
- Built-in connection pooling
- Web-based SQL editor and table viewer
- Free tier available (500MB database, 2GB bandwidth)

**When to use Supabase:**
- Small to medium installations (< 100 concurrent players)
- You want managed database infrastructure
- You prefer cloud-hosted solutions

**When to use local database (MariaDB/PostgreSQL):**
- Large installations (100+ concurrent players)
- You want full control over database performance
- You have database administration expertise
- Cost optimization for high-traffic servers

---

## Flute CMS Setup

After the installer completes, you need to run the Flute web installer **once** to initialize the CMS.

### Step 1: Access Flute Web Installer

Open your browser and navigate to:
```
https://arma.example.com/
```

You should see the Flute CMS installer welcome screen.

### Step 2: System Requirements Check

Flute will automatically check:
- PHP version (8.2+ required)
- Required PHP extensions
- File permissions (storage/, bootstrap/cache/)
- Database connectivity

If all checks pass, click **"Next"** or **"Continue"**.

### Step 3: Database Configuration

The installer script has already created the database and credentials. Enter:

- **Database Type**: MariaDB (or PostgreSQL if you chose that)
- **Host**: `localhost`
- **Port**: `3306` (MariaDB) or `5432` (PostgreSQL)
- **Database Name**: `flute` (or your custom `FLUTE_DB_NAME`)
- **Username**: `flute` (or your custom `FLUTE_DB_USER`)
- **Password**: Check `/opt/arma-reforger-manager/config/flute-db.json`

To view the auto-generated password:
```bash
sudo cat /opt/arma-reforger-manager/config/flute-db.json
```

Click **"Test Connection"** to verify, then **"Next"**.

### Step 4: Admin Account Creation

Create the Flute admin account:

- **Username**: Your desired admin username (can be different from your Steam name)
- **Email**: Your email address
- **Password**: Strong password for Flute admin panel

**IMPORTANT**: This is separate from your Steam login. You'll use Steam to access the Arma Manager, but this Flute admin account is for CMS administration.

Click **"Create Account"** or **"Next"**.

### Step 5: Site Configuration

Configure basic site settings:

- **Site Name**: "Arma Reforger Server" (or your preference)
- **Site URL**: `https://arma.example.com` (should auto-fill)
- **Locale**: Choose your language
- **Timezone**: Choose your timezone

Click **"Save"** or **"Finish"**.

### Step 6: Complete Installation

Flute will:
1. Run database migrations
2. Seed initial data
3. Create configuration files
4. Set up default pages

When complete, you'll see a success message.

Click **"Go to Site"** or **"Dashboard"**.

### Step 7: Enable the Arma Reforger Module

The Arma Reforger Manager module was automatically copied during installation, but you may need to activate it in Flute:

1. Log in to Flute admin panel: `https://arma.example.com/admin`
2. Go to **Modules** or **Extensions**
3. Find **"Arma Reforger Manager"** module
4. Click **"Enable"** or **"Activate"**
5. (Optional) Configure module settings

### Step 8: Test Arma Manager Access

1. Navigate to: `https://arma.example.com/arma/login`
2. Click **"Sign in through Steam"**
3. You'll be redirected to Steam to authenticate
4. After authenticating, you'll be redirected back to the manager
5. You should see the Arma Manager dashboard: `https://arma.example.com/arma`

**Note**: Only users with Steam IDs added to `/opt/arma-reforger-manager/config/users.json` can log in. The installer automatically added your `ADMIN_STEAMID` as an admin.

---

## Post-Installation

### Verify Services Are Running

```bash
# Check all services
sudo systemctl status arma-reforger-backend
sudo systemctl status php8.2-fpm
sudo systemctl status nginx

# Check logs
sudo journalctl -u arma-reforger-backend -f
```

### Add Additional Admin Users

```bash
# Edit users.json
sudo nano /opt/arma-reforger-manager/config/users.json
```

Add users in this format:
```json
{
  "users": [
    {
      "steamId": "76561198012345678",
      "displayName": "AdminUser",
      "role": "admin",
      "addedAt": "2025-12-25T00:00:00.000Z",
      "addedBy": "system"
    },
    {
      "steamId": "76561198087654321",
      "displayName": "Moderator",
      "role": "gm",
      "addedAt": "2025-12-25T00:00:00.000Z",
      "addedBy": "76561198012345678"
    }
  ]
}
```

**Roles:**
- `admin`: Full access (server control, config, user management)
- `gm`: Game master (server control, player management, no user/config changes)
- `user`: Read-only access (view stats, no server control)

### Configure Steam Web API Key

For enhanced features (player avatars, names, profiles):

1. Get your Steam Web API key: https://steamcommunity.com/dev/apikey
2. Add it to the server config:

```bash
sudo nano /opt/arma-reforger-manager/config/server-config.json
```

Find the `steamApiKey` field and paste your key:
```json
{
  "steamApiKey": "YOUR_STEAM_API_KEY_HERE",
  ...
}
```

3. Restart the backend:
```bash
sudo systemctl restart arma-reforger-backend
```

### Configure CORS (if using split domains)

If you're using split domains (e.g., `battlelog.example.com` and `panel.example.com`):

```bash
sudo nano /etc/systemd/system/arma-reforger-backend.service
```

Add to the `[Service]` section:
```ini
Environment="CORS_ORIGIN=https://battlelog.example.com,https://panel.example.com"
```

Reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart arma-reforger-backend
```

### Firewall Configuration

Ensure ports are open:

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Arma game server port
sudo ufw allow 2001/udp

# Allow SSH (IMPORTANT - don't lock yourself out!)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

---

## Troubleshooting

### Flute Installer Shows "Permission Denied" Errors

Fix storage permissions:
```bash
sudo chown -R www-data:www-data /opt/flute/storage
sudo chmod -R 775 /opt/flute/storage
sudo chown -R www-data:www-data /opt/flute/bootstrap/cache
sudo chmod -R 775 /opt/flute/bootstrap/cache
```

### Cannot Connect to Database During Flute Setup

Check database is running:
```bash
# For MariaDB
sudo systemctl status mariadb
sudo systemctl start mariadb

# For PostgreSQL
sudo systemctl status postgresql
sudo systemctl start postgresql
```

Verify credentials:
```bash
cat /opt/arma-reforger-manager/config/flute-db.json
```

Test database connection:
```bash
# MariaDB
mysql -u flute -p flute
# Enter password from flute-db.json

# PostgreSQL
sudo -u postgres psql -d flute
```

### Flute Shows Blank White Page

Check PHP errors:
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /opt/flute/storage/logs/laravel.log
```

Common fixes:
```bash
# Regenerate application key
cd /opt/flute
sudo -u www-data php artisan key:generate

# Clear cache
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan view:clear
```

### Steam Login Redirects to Error Page

Check Node backend is running:
```bash
sudo systemctl status arma-reforger-backend
sudo journalctl -u arma-reforger-backend -f
```

Verify your Steam ID is in users.json:
```bash
cat /opt/arma-reforger-manager/config/users.json
```

### SSL Certificate Errors

Renew certificates:
```bash
sudo certbot renew
sudo systemctl reload nginx
```

Check certificate status:
```bash
sudo certbot certificates
```

### Nginx Configuration Test Fails

Test configuration:
```bash
sudo nginx -t
```

Fix common issues:
```bash
# Check for syntax errors
sudo nano /etc/nginx/sites-available/flute-cms

# Ensure symlink exists
sudo ln -sf /etc/nginx/sites-available/flute-cms /etc/nginx/sites-enabled/

# Remove default site if conflicting
sudo rm /etc/nginx/sites-enabled/default
```

### Server Won't Start

Check SteamCMD and server paths:
```bash
ls -la /opt/arma-reforger/ArmaReforgerServer
ls -la /opt/steamcmd/steamcmd.sh
```

View detailed errors:
```bash
sudo journalctl -u arma-reforger-backend -n 100
```

Check server logs in Flute UI:
```
https://arma.example.com/arma/logs
```

---

## Additional Resources

- [Security Guide](./SECURITY.md) - Production security hardening
- [Flute CMS Documentation](https://docs.flute-cms.com/) - Official Flute docs
- [Arma Reforger Server Setup](https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting) - Official server docs

---

## Support

If you encounter issues:

1. Check the logs: `/opt/arma-reforger-manager/logs/` and `/opt/flute/storage/logs/`
2. Verify services are running: `sudo systemctl status arma-reforger-backend nginx php8.2-fpm`
3. Check file permissions: Flute storage needs `www-data:www-data` ownership
4. Review Nginx configuration: `sudo nginx -t`
5. Check firewall rules: `sudo ufw status`

For bugs or feature requests, open an issue on GitHub.
