#!/bin/bash

# Arma Reforger Server Manager - Ubuntu Installation Script
# This script installs everything needed for the server and web UI on Ubuntu

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "====================================="
echo "Arma Reforger Server Manager"
echo "Ubuntu Installation Script"
echo "====================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: This script must be run as root (use sudo)"
    exit 1
fi

# Configuration
SERVER_PATH="${SERVER_PATH:-/opt/arma-reforger}"
STEAMCMD_PATH="${STEAMCMD_PATH:-/opt/steamcmd}"
WEB_UI_PATH="${WEB_UI_PATH:-/opt/arma-reforger-manager}"
INSTALL_USER="${INSTALL_USER:-arma}"
WEB_UI_PORT="${WEB_UI_PORT:-3001}"
SERVER_PORT="${SERVER_PORT:-2001}"
ADMIN_STEAMID="${ADMIN_STEAMID:-}"
ENABLE_NGINX="${ENABLE_NGINX:-0}"
ENABLE_SSL="${ENABLE_SSL:-0}"
BATTLELOG_DOMAIN="${BATTLELOG_DOMAIN:-}"
PANEL_DOMAIN="${PANEL_DOMAIN:-}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
PANEL_BASIC_AUTH="${PANEL_BASIC_AUTH:-0}"
PANEL_AUTH_USER="${PANEL_AUTH_USER:-admin}"
PANEL_AUTH_PASS="${PANEL_AUTH_PASS:-}"
PANEL_ALLOW_IPS="${PANEL_ALLOW_IPS:-}"
PUBLIC_API_RPM="${PUBLIC_API_RPM:-300}"
ENABLE_FLUTE="${ENABLE_FLUTE:-1}"
FLUTE_PATH="${FLUTE_PATH:-/opt/flute}"
FLUTE_DOMAIN="${FLUTE_DOMAIN:-}"
FLUTE_DB_ENGINE="${FLUTE_DB_ENGINE:-mariadb}"  # mariadb|postgres|supabase
FLUTE_DB_HOST="${FLUTE_DB_HOST:-127.0.0.1}"
FLUTE_DB_PORT="${FLUTE_DB_PORT:-}"
FLUTE_DB_NAME="${FLUTE_DB_NAME:-flute}"
FLUTE_DB_USER="${FLUTE_DB_USER:-flute}"
FLUTE_DB_PASS="${FLUTE_DB_PASS:-}"
FLUTE_ADMIN_EMAIL="${FLUTE_ADMIN_EMAIL:-}"

is_tty() { [ -t 0 ] && [ -t 1 ]; }

prompt() {
  local label="$1"
  local default="${2:-}"
  local value=""
  if [ -n "$default" ]; then
    read -r -p "$label [$default]: " value
    echo "${value:-$default}"
  else
    read -r -p "$label: " value
    echo "$value"
  fi
}

prompt_yes_no() {
  local label="$1"
  local default_yes="${2:-1}" # 1=yes, 0=no
  local def_char="Y/n"
  if [ "$default_yes" = "0" ]; then def_char="y/N"; fi
  while true; do
    local ans
    read -r -p "$label [$def_char]: " ans
    ans="$(echo "${ans:-}" | tr '[:upper:]' '[:lower:]')"
    if [ -z "$ans" ]; then
      if [ "$default_yes" = "1" ]; then echo "1"; else echo "0"; fi
      return
    fi
    case "$ans" in
      y|yes) echo "1"; return ;;
      n|no)  echo "0"; return ;;
    esac
    echo "Please answer y/n."
  done
}

is_valid_steamid64() {
  [[ "$1" =~ ^[0-9]{17}$ ]]
}

echo ""
echo "Quick setup:"
if is_tty; then
  echo "  - If you just run this script, it will ask you the required questions."
  echo "  - Advanced: set env vars to run fully non-interactive."
else
  echo "  - Non-interactive mode detected (no TTY). Using env vars only."
fi
echo ""

# Wizard: gather missing required inputs (only in interactive mode)
if [ -z "$ADMIN_STEAMID" ]; then
  if ! is_tty; then
    echo "ERROR: ADMIN_STEAMID is required for a secure installation."
    echo "Example:"
    echo "  sudo ADMIN_STEAMID=7656119XXXXXXXXXX bash install-ubuntu.sh"
    echo ""
    echo "Tip: find your SteamID64 here: https://steamid.io/"
    exit 1
  fi
  while true; do
    ADMIN_STEAMID="$(prompt 'Enter your ADMIN SteamID64 (17 digits)')"
    if is_valid_steamid64 "$ADMIN_STEAMID"; then break; fi
    echo "Invalid SteamID64. It should be 17 digits."
  done
fi

# If user didn't specify nginx/ssl choices, pick safe defaults via prompts
if is_tty && [ "$ENABLE_NGINX" = "0" ] && [ "$ENABLE_SSL" = "0" ] && [ -z "$BATTLELOG_DOMAIN" ] && [ -z "$PANEL_DOMAIN" ]; then
  echo ""
  echo "Recommended setup: Public Battlelog + Private Panel (behind Nginx)"
  if [ "$(prompt_yes_no 'Enable Nginx reverse proxy (recommended)?' 1)" = "1" ]; then
    ENABLE_NGINX=1
    PANEL_DOMAIN="$(prompt 'Panel domain (e.g. panel.example.com)')"
    BATTLELOG_DOMAIN="$(prompt 'Battlelog domain (e.g. battlelog.example.com, optional)' '')"

    if [ "$(prompt_yes_no 'Enable HTTPS (Let\\x27s Encrypt)?' 1)" = "1" ]; then
      ENABLE_SSL=1
      CERTBOT_EMAIL="$(prompt 'Email for Let\\x27s Encrypt (required for SSL)')"
    fi

    if [ "$(prompt_yes_no 'Protect panel with Basic Auth (recommended)?' 1)" = "1" ]; then
      PANEL_BASIC_AUTH=1
      PANEL_AUTH_USER="$(prompt 'Basic Auth username' "$PANEL_AUTH_USER")"
      PANEL_AUTH_PASS="$(prompt 'Basic Auth password (leave blank to auto-generate)' '')"
    fi

    if [ "$(prompt_yes_no 'Restrict panel by IP allowlist (optional)?' 0)" = "1" ]; then
      PANEL_ALLOW_IPS="$(prompt 'Allowed IPs (comma separated, e.g. 1.2.3.4,5.6.7.8)')"
    fi
  fi
fi

# SSL via certbot requires nginx
if [ "$ENABLE_SSL" = "1" ] && [ "$ENABLE_NGINX" != "1" ]; then
    echo "NOTE: ENABLE_SSL=1 requires ENABLE_NGINX=1. Enabling nginx automatically."
    ENABLE_NGINX=1
fi

# Hard requirements when SSL is enabled (fail fast)
if [ "$ENABLE_SSL" = "1" ]; then
  if [ -z "$CERTBOT_EMAIL" ]; then
    echo "ERROR: ENABLE_SSL=1 requires CERTBOT_EMAIL."
    exit 1
  fi
  if [ -z "$BATTLELOG_DOMAIN" ] && [ -z "$PANEL_DOMAIN" ]; then
    echo "ERROR: ENABLE_SSL=1 requires at least one domain (BATTLELOG_DOMAIN and/or PANEL_DOMAIN)."
    exit 1
  fi
fi

# Flute requires nginx in our setup (php-fpm + nginx vhost)
if [ "$ENABLE_FLUTE" = "1" ] && [ "$ENABLE_NGINX" != "1" ]; then
    echo "NOTE: ENABLE_FLUTE=1 requires ENABLE_NGINX=1. Enabling nginx automatically."
    ENABLE_NGINX=1
fi

# Hard requirement: when nginx enabled, panel domain is strongly recommended
if [ "$ENABLE_NGINX" = "1" ] && [ -z "$PANEL_DOMAIN" ]; then
  if is_tty; then
    echo ""
    echo "Nginx is enabled but PANEL_DOMAIN is empty."
    PANEL_DOMAIN="$(prompt 'Panel domain (required for private panel, e.g. panel.example.com)')"
  fi
fi

# Wizard: Flute is the only UI (prompt for domain if missing)
if is_tty && [ "$ENABLE_FLUTE" = "1" ] && [ -z "$FLUTE_DOMAIN" ]; then
  echo ""
  echo "Flute CMS will be installed as the ONLY UI."
  echo ""
  echo "NOTE: You can use either a domain name OR your VPS IP address."
  echo "  - Domain name: Enables HTTPS/SSL (recommended)"
  echo "  - IP address: HTTP only (no SSL, but works fine for testing)"
  echo ""
  FLUTE_DOMAIN="$(prompt 'Domain or IP address (e.g. arma.example.com or 192.168.1.100)')"

  # Auto-detect if it's an IP address and disable SSL
  if [[ "$FLUTE_DOMAIN" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    echo ""
    echo "Detected IP address: $FLUTE_DOMAIN"
    echo "SSL will be DISABLED (Let's Encrypt requires a domain name)"
    ENABLE_SSL=0
  fi

  if [ -z "$FLUTE_ADMIN_EMAIL" ]; then
    FLUTE_ADMIN_EMAIL="$(prompt 'Flute admin email (for future setup)' '')"
  fi

  # Database selection
  echo ""
  echo "Database options for Flute:"
  echo "  1) MariaDB (local, auto-installed)"
  echo "  2) PostgreSQL (local, auto-installed)"
  echo "  3) Supabase (cloud PostgreSQL, managed service)"
  while true; do
    read -r -p "Choose database [1-3]: " db_choice
    case "$db_choice" in
      1) FLUTE_DB_ENGINE="mariadb"; break ;;
      2) FLUTE_DB_ENGINE="postgres"; break ;;
      3) FLUTE_DB_ENGINE="supabase"; break ;;
      *) echo "Please enter 1, 2, or 3." ;;
    esac
  done

  if [ "$FLUTE_DB_ENGINE" = "supabase" ]; then
    echo ""
    echo "Supabase setup - You need a Supabase project first:"
    echo "  1. Go to https://supabase.com and create a project"
    echo "  2. Find your connection details in Project Settings > Database"
    echo ""
    FLUTE_DB_HOST="$(prompt 'Supabase database host (e.g. db.xxxxx.supabase.co)')"
    FLUTE_DB_PORT="$(prompt 'Database port' '5432')"
    FLUTE_DB_NAME="$(prompt 'Database name' 'postgres')"
    FLUTE_DB_USER="$(prompt 'Database user' 'postgres')"
    FLUTE_DB_PASS="$(prompt 'Database password')"
  fi
fi

echo "Installation paths:"
echo "  Server: $SERVER_PATH"
echo "  SteamCMD: $STEAMCMD_PATH"
echo "  Web UI: $WEB_UI_PATH"
echo "  User: $INSTALL_USER"
  echo "  Web UI Port: $WEB_UI_PORT"
  echo "  Server Port: $SERVER_PORT"
  echo "  Nginx: $ENABLE_NGINX (SSL: $ENABLE_SSL)"
  echo "  Flute CMS: $ENABLE_FLUTE (Domain: ${FLUTE_DOMAIN:-n/a}, Path: $FLUTE_PATH, DB: $FLUTE_DB_ENGINE)"
echo ""

# Update system
echo "[1/10] Updating system packages..."
apt-get update
apt-get upgrade -y

# Install dependencies
echo "[2/10] Installing dependencies..."
apt-get install -y curl wget git build-essential lib32gcc-s1 software-properties-common rsync ca-certificates gnupg

# Flute prerequisites (optional): PHP 8.2+, DB, Composer
if [ "$ENABLE_FLUTE" = "1" ]; then
    echo "Installing Flute CMS prerequisites (PHP/DB/Composer)..."

    # DB engine (skip installation if using Supabase)
    if [ "$FLUTE_DB_ENGINE" = "supabase" ]; then
        echo "Using Supabase (cloud PostgreSQL) - skipping local database installation."
        # Install PostgreSQL client tools only (for connection testing)
        apt-get install -y postgresql-client
    elif [ "$FLUTE_DB_ENGINE" = "postgres" ]; then
        echo "Installing local PostgreSQL server..."
        apt-get install -y postgresql postgresql-contrib
    else
        # default MariaDB
        echo "Installing local MariaDB server..."
        apt-get install -y mariadb-server mariadb-client
    fi

    # PHP 8.2+
    if command -v php >/dev/null 2>&1; then
        PHP_VER="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
    else
        PHP_VER="0.0"
    fi

    need_php82=1
    if [ "$PHP_VER" != "0.0" ]; then
        php_major="${PHP_VER%%.*}"
        php_minor="${PHP_VER#*.}"
        if [ "$php_major" -gt 8 ] || { [ "$php_major" -eq 8 ] && [ "$php_minor" -ge 2 ]; }; then
            need_php82=0
        fi
    fi

    if [ "$need_php82" = "1" ]; then
        echo "PHP >= 8.2 not detected. Installing PHP 8.2 packages..."
        # Try native packages first
        if ! apt-get install -y php8.2-cli php8.2-fpm php8.2-mysql php8.2-pgsql php8.2-xml php8.2-mbstring php8.2-curl php8.2-zip php8.2-gd php8.2-intl; then
            echo "php8.2 packages not available. Trying ondrej/php PPA..."
            apt-get install -y lsb-release apt-transport-https
            add-apt-repository -y ppa:ondrej/php || true
            apt-get update
            apt-get install -y php8.2-cli php8.2-fpm php8.2-mysql php8.2-pgsql php8.2-xml php8.2-mbstring php8.2-curl php8.2-zip php8.2-gd php8.2-intl
        fi
    fi

    # Composer (prefer apt for simplicity)
    if ! command -v composer >/dev/null 2>&1; then
        apt-get install -y composer || true
    fi
    if ! command -v composer >/dev/null 2>&1; then
        echo "Installing Composer (fallback installer)..."
        curl -fsSL https://getcomposer.org/installer -o /tmp/composer-setup.php
        php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
        rm -f /tmp/composer-setup.php
    fi
fi

# Optional: install nginx/ssl packages early (idempotent)
if [ "$ENABLE_NGINX" = "1" ] || [ "$ENABLE_SSL" = "1" ]; then
    echo "Installing nginx prerequisites..."
    apt-get install -y nginx
    if [ "$PANEL_BASIC_AUTH" = "1" ]; then
        apt-get install -y apache2-utils
    fi
    if [ "$ENABLE_SSL" = "1" ]; then
        apt-get install -y certbot python3-certbot-nginx
    fi
fi

# Install Node.js 20.x (LTS)
echo "[3/10] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    # Check if Node.js version is less than 20
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo "Upgrading Node.js from v$NODE_VERSION to v20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
fi

echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Create user for running server
echo "[4/10] Creating user '$INSTALL_USER'..."
if ! id "$INSTALL_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$INSTALL_USER"
    echo "User created: $INSTALL_USER"
else
    echo "User already exists: $INSTALL_USER"
fi

# Install SteamCMD
echo "[5/10] Installing SteamCMD..."
mkdir -p "$STEAMCMD_PATH"

# Add i386 architecture for SteamCMD (safe to run multiple times)
dpkg --add-architecture i386 || true
apt-get update

# Ensure multiverse is enabled (steamcmd package lives there on Ubuntu)
if command -v add-apt-repository &> /dev/null; then
    add-apt-repository -y multiverse || true
    apt-get update
fi

# Accept Steam license
echo steam steam/question select "I AGREE" | debconf-set-selections
echo steam steam/license note '' | debconf-set-selections

# Install steamcmd
apt-get install -y steamcmd

# Create symlink helper (some setups prefer a dedicated path)
ln -sf /usr/games/steamcmd "$STEAMCMD_PATH/steamcmd.sh"

chown -R "$INSTALL_USER:$INSTALL_USER" "$STEAMCMD_PATH"

# Create server directory
echo "[6/10] Creating server directory..."
mkdir -p "$SERVER_PATH"
chown -R "$INSTALL_USER:$INSTALL_USER" "$SERVER_PATH"

# Download/Update Arma Reforger Server
echo "[7/10] Installing/Updating Arma Reforger Server..."
echo "This may take a while (approx 10-30 GB download)..."

sudo -u "$INSTALL_USER" /usr/games/steamcmd +force_install_dir "$SERVER_PATH" +login anonymous +app_update 1874900 validate +quit

# Deploy Web UI files (idempotent, preserves config/backups/mods)
echo "[8/10] Setting up Web UI..."
mkdir -p "$WEB_UI_PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# If Flute is added as a git submodule, make sure it's initialized.
if [ "$ENABLE_FLUTE" = "1" ] && [ -f "$SCRIPT_DIR/.gitmodules" ]; then
    echo "Initializing git submodules (Flute)..."
    git -C "$SCRIPT_DIR" submodule update --init --recursive || true
fi

# Preserve runtime data directories across updates
mkdir -p "$WEB_UI_PATH/config" "$WEB_UI_PATH/backups" "$WEB_UI_PATH/mods"

# Sync code, but don't overwrite user data directories
rsync -a --delete \
  --exclude "config/" \
  --exclude "backups/" \
  --exclude "mods/" \
  --exclude "node_modules/" \
  --exclude "frontend/node_modules/" \
  "$SCRIPT_DIR/" "$WEB_UI_PATH/"

cd "$WEB_UI_PATH"

# Install NPM dependencies
echo "[9/10] Installing Node backend dependencies..."
npm ci --omit=dev --no-audit --no-fund

echo "Skipping React build (Flute CMS is the only UI)."

# Set permissions
chown -R "$INSTALL_USER:$INSTALL_USER" "$WEB_UI_PATH"

# Create config directory
echo "[10/10] Creating configuration..."
mkdir -p "$WEB_UI_PATH/config"

# Create server config (only if missing)
SERVER_CONFIG_PATH="$WEB_UI_PATH/config/server-config.json"
if [ ! -f "$SERVER_CONFIG_PATH" ]; then
  # Generate a random default adminPassword for the game server (user should still change it)
  GAME_ADMIN_PASSWORD="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 20)"
  cat > "$SERVER_CONFIG_PATH" <<EOF
{
  "serverPath": "$SERVER_PATH",
  "steamCmdPath": "/usr/games/steamcmd",
  "webUIPort": $WEB_UI_PORT,
  "serverPort": $SERVER_PORT,
  "serverName": "My Arma Reforger Server",
  "maxPlayers": 32,
  "password": "",
  "adminPassword": "$GAME_ADMIN_PASSWORD",
  "steamApiKey": ""
}
EOF
  echo ""
  echo "Generated game adminPassword (for Arma server): $GAME_ADMIN_PASSWORD"
  echo "Change it later in Web-UI -> Configuration."
  echo ""
fi

# Create users database (only if missing) with your provided admin SteamID
USERS_DB_PATH="$WEB_UI_PATH/config/users.json"
if [ ! -f "$USERS_DB_PATH" ]; then
  cat > "$USERS_DB_PATH" <<EOF
{
  "users": [
    {
      "steamId": "$ADMIN_STEAMID",
      "displayName": "Initial Admin",
      "role": "admin",
      "addedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    }
  ]
}
EOF
fi

chown -R "$INSTALL_USER:$INSTALL_USER" "$WEB_UI_PATH/config"

# Configure firewall (UFW)
echo "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow "${SERVER_PORT}/udp" comment 'Arma Reforger Server' || true
    # Only expose the Node port directly when NOT using nginx.
    # When nginx is enabled we bind Node to 127.0.0.1 and expose only 80/443.
    if [ "$ENABLE_NGINX" != "1" ]; then
        ufw allow "${WEB_UI_PORT}/tcp" comment 'Arma Reforger Web UI' || true
    fi
    if [ "$ENABLE_NGINX" = "1" ]; then
        ufw allow 80/tcp comment 'HTTP' || true
        ufw allow 443/tcp comment 'HTTPS' || true
    fi
    echo "Firewall rules added"
fi

# Create systemd service for Node backend
echo "Creating systemd service for Node backend..."
LISTEN_HOST_ENV="0.0.0.0"
TRUST_PROXY_ENV="0"
if [ "$ENABLE_NGINX" = "1" ]; then
    LISTEN_HOST_ENV="127.0.0.1"
    TRUST_PROXY_ENV="1"
fi
cat > /etc/systemd/system/arma-reforger-backend.service <<EOF
[Unit]
Description=Arma Reforger Server Manager Backend API
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$INSTALL_USER
WorkingDirectory=$WEB_UI_PATH
Environment=NODE_ENV=production
Environment=PORT=$WEB_UI_PORT
Environment=LISTEN_HOST=$LISTEN_HOST_ENV
Environment=TRUST_PROXY=$TRUST_PROXY_ENV
Environment=PUBLIC_API_RPM=$PUBLIC_API_RPM
Environment=DISABLE_STEAMID_LOGIN=1
ExecStart=/usr/bin/node $WEB_UI_PATH/backend/server.js
Restart=always
RestartSec=10
StartLimitInterval=300
StartLimitBurst=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=arma-backend

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$WEB_UI_PATH $SERVER_PATH
CapabilityBoundingSet=

# Resource limits
LimitNOFILE=65536
TasksMax=4096

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable arma-reforger-backend.service
systemctl restart arma-reforger-backend.service

# Remove old service name if it exists
if systemctl is-enabled arma-reforger-webui.service >/dev/null 2>&1; then
    systemctl stop arma-reforger-webui.service || true
    systemctl disable arma-reforger-webui.service || true
fi

# Optional: Flute CMS deploy
if [ "$ENABLE_FLUTE" = "1" ]; then
    echo "Deploying Flute CMS..."

    # Ensure code exists (prefer submodule in this repo)
    if [ -d "$SCRIPT_DIR/flute" ] && [ -f "$SCRIPT_DIR/flute/composer.json" ]; then
        mkdir -p "$FLUTE_PATH"
        rsync -a --delete "$SCRIPT_DIR/flute/" "$FLUTE_PATH/"
    else
        echo "Flute not found in repo. Cloning..."
        if [ -d "$FLUTE_PATH/.git" ]; then
            git -C "$FLUTE_PATH" fetch --depth 1 origin main || true
            git -C "$FLUTE_PATH" checkout main || true
            git -C "$FLUTE_PATH" pull --ff-only || true
        else
            rm -rf "$FLUTE_PATH"
            git clone --depth 1 https://github.com/Flute-CMS/cms.git "$FLUTE_PATH"
        fi
    fi

    # Copy our Flute extensions/modules (kept in this repo, not in the Flute submodule)
    if [ -d "$SCRIPT_DIR/flute-ext/app/Modules" ]; then
        echo "Copying Arma Reforger Flute module..."
        mkdir -p "$FLUTE_PATH/app/Modules"
        rsync -a "$SCRIPT_DIR/flute-ext/app/Modules/" "$FLUTE_PATH/app/Modules/"
    fi

    # Create DB credentials (only if missing)
    FLUTE_CREDS_FILE="$WEB_UI_PATH/config/flute-db.json"
    if [ ! -f "$FLUTE_CREDS_FILE" ]; then
        if [ -z "$FLUTE_DB_PASS" ]; then
            FLUTE_DB_PASS="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 28)"
        fi

        if [ "$FLUTE_DB_ENGINE" = "supabase" ]; then
            # Test Supabase connection
            echo "Testing Supabase connection..."
            export PGPASSWORD="$FLUTE_DB_PASS"
            if psql -h "$FLUTE_DB_HOST" -p "${FLUTE_DB_PORT:-5432}" -U "$FLUTE_DB_USER" -d "$FLUTE_DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
                echo "✓ Supabase connection successful!"
            else
                echo "ERROR: Could not connect to Supabase. Please verify your credentials:"
                echo "  Host: $FLUTE_DB_HOST"
                echo "  Port: ${FLUTE_DB_PORT:-5432}"
                echo "  Database: $FLUTE_DB_NAME"
                echo "  User: $FLUTE_DB_USER"
                exit 1
            fi
            unset PGPASSWORD

            # Set actual engine to postgres for Flute config (Supabase uses PostgreSQL)
            DB_ENGINE_FOR_FLUTE="postgres"
        elif [ "$FLUTE_DB_ENGINE" = "postgres" ]; then
            systemctl enable postgresql || true
            systemctl restart postgresql || true
            sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${FLUTE_DB_NAME}'" | grep -q 1 || sudo -u postgres createdb "${FLUTE_DB_NAME}"
            sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${FLUTE_DB_USER}'" | grep -q 1 || sudo -u postgres psql -c "CREATE USER \"${FLUTE_DB_USER}\" WITH PASSWORD '${FLUTE_DB_PASS}';"
            sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"${FLUTE_DB_NAME}\" TO \"${FLUTE_DB_USER}\";"
            DB_ENGINE_FOR_FLUTE="postgres"
            FLUTE_DB_HOST="127.0.0.1"
            FLUTE_DB_PORT="5432"
        else
            # MariaDB
            systemctl enable mariadb || true
            systemctl restart mariadb || true
            mysql -uroot -e "CREATE DATABASE IF NOT EXISTS \`${FLUTE_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            mysql -uroot -e "CREATE USER IF NOT EXISTS '${FLUTE_DB_USER}'@'localhost' IDENTIFIED BY '${FLUTE_DB_PASS}';"
            mysql -uroot -e "GRANT ALL PRIVILEGES ON \`${FLUTE_DB_NAME}\`.* TO '${FLUTE_DB_USER}'@'localhost'; FLUSH PRIVILEGES;"
            DB_ENGINE_FOR_FLUTE="mariadb"
            FLUTE_DB_HOST="127.0.0.1"
            FLUTE_DB_PORT="3306"
        fi

        cat > "$FLUTE_CREDS_FILE" <<EOF
{
  "engine": "$DB_ENGINE_FOR_FLUTE",
  "host": "$FLUTE_DB_HOST",
  "port": "${FLUTE_DB_PORT}",
  "database": "$FLUTE_DB_NAME",
  "username": "$FLUTE_DB_USER",
  "password": "$FLUTE_DB_PASS"
}
EOF
        chmod 600 "$FLUTE_CREDS_FILE"
        chown "$INSTALL_USER:$INSTALL_USER" "$FLUTE_CREDS_FILE"
    else
        echo "Flute DB credentials already exist at $FLUTE_CREDS_FILE (not overwriting)."
    fi

    # Install dependencies (composer)
    if command -v composer >/dev/null 2>&1; then
        (cd "$FLUTE_PATH" && composer install --no-dev --optimize-autoloader) || \
            echo "WARNING: Composer install failed. You may need to run it manually inside $FLUTE_PATH."
    else
        echo "WARNING: composer not found. Skipping composer install."
    fi

    # Set permissions for Flute storage and cache directories
    echo "Setting Flute storage/ permissions..."
    mkdir -p "$FLUTE_PATH/storage"
    mkdir -p "$FLUTE_PATH/storage/app"
    mkdir -p "$FLUTE_PATH/storage/app/public"
    mkdir -p "$FLUTE_PATH/storage/app/uploads"
    mkdir -p "$FLUTE_PATH/storage/framework"
    mkdir -p "$FLUTE_PATH/storage/framework/cache"
    mkdir -p "$FLUTE_PATH/storage/framework/sessions"
    mkdir -p "$FLUTE_PATH/storage/framework/views"
    mkdir -p "$FLUTE_PATH/storage/logs"

    # Set ownership to web server user (www-data for nginx/php-fpm)
    chown -R www-data:www-data "$FLUTE_PATH/storage"
    chmod -R 775 "$FLUTE_PATH/storage"

    # Also ensure bootstrap/cache is writable
    if [ -d "$FLUTE_PATH/bootstrap/cache" ]; then
        chown -R www-data:www-data "$FLUTE_PATH/bootstrap/cache"
        chmod -R 775 "$FLUTE_PATH/bootstrap/cache"
    fi

    # Nginx php-fpm vhost (requires nginx)
    if [ "$ENABLE_NGINX" != "1" ]; then
        echo "NOTE: Flute is installed but nginx is disabled. Enable nginx to serve Flute via domain."
    else
        if [ -z "$FLUTE_DOMAIN" ]; then
            echo "WARNING: ENABLE_FLUTE=1 but FLUTE_DOMAIN is empty. Skipping nginx vhost."
        else
            # Find php-fpm socket
            PHP_FPM_SOCK=""
            if [ -S "/run/php/php8.2-fpm.sock" ]; then
                PHP_FPM_SOCK="/run/php/php8.2-fpm.sock"
            else
                PHP_FPM_SOCK="$(ls -1 /run/php/php*-fpm.sock 2>/dev/null | head -n 1 || true)"
            fi

            if [ -z "$PHP_FPM_SOCK" ]; then
                echo "WARNING: php-fpm socket not found. Cannot configure nginx for Flute."
            else
                cat > /etc/nginx/sites-available/flute-cms <<EOF
server {
    listen 80;
    server_name $FLUTE_DOMAIN;
    root $FLUTE_PATH/public;

    index index.php index.html;

    # Proxy Node API (same-origin for Flute UI)
    location /api/ {
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_pass http://127.0.0.1:$WEB_UI_PORT;
    }

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \\.php\$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:$PHP_FPM_SOCK;
    }

    location ~ /\\.ht {
        deny all;
    }
}
EOF
                ln -sf /etc/nginx/sites-available/flute-cms /etc/nginx/sites-enabled/flute-cms
                nginx -t
                systemctl restart nginx
            fi
        fi
    fi
fi

# Optional: Nginx reverse proxy + HTTPS
if [ "$ENABLE_NGINX" = "1" ]; then
    echo "Setting up Nginx reverse proxy..."
    # Packages are installed earlier when ENABLE_NGINX/ENABLE_SSL are enabled.

    # Rate limiting zones (http context)
    cat > /etc/nginx/conf.d/arma-reforger-limits.conf <<'EOF'
limit_req_zone $binary_remote_addr zone=public_api:10m rate=5r/s;
limit_conn_zone $binary_remote_addr zone=addr:10m;
EOF

    # Panel basic auth (optional)
    AUTH_SNIPPET=""
    if [ "$PANEL_BASIC_AUTH" = "1" ]; then
        if [ -z "$PANEL_AUTH_PASS" ]; then
            PANEL_AUTH_PASS="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)"
            echo "Generated PANEL_AUTH_PASS: $PANEL_AUTH_PASS"
        fi
        htpasswd -bc /etc/nginx/.htpasswd_arma_reforger_panel "$PANEL_AUTH_USER" "$PANEL_AUTH_PASS"
        AUTH_SNIPPET="$(printf 'auth_basic \"Restricted\";\n        auth_basic_user_file /etc/nginx/.htpasswd_arma_reforger_panel;')"
    fi

    # IP allowlist (optional)
    IP_SNIPPET=""
    if [ -n "$PANEL_ALLOW_IPS" ]; then
        # Build: allow <ip>; ... then deny all;
        IP_SNIPPET=""
        IFS=',' read -ra IPS <<< "$PANEL_ALLOW_IPS"
        for ip in "${IPS[@]}"; do
            ip_trimmed="$(echo "$ip" | xargs)"
            if [ -n "$ip_trimmed" ]; then
                IP_SNIPPET+=$(printf 'allow %s;\n        ' "$ip_trimmed")
            fi
        done
        IP_SNIPPET+="deny all;"
    fi

    # Battlelog public vhost (path-restricted)
    if [ -n "$BATTLELOG_DOMAIN" ]; then
        cat > /etc/nginx/sites-available/arma-reforger-battlelog <<EOF
server {
    listen 80;
    server_name $BATTLELOG_DOMAIN;

    # Basic connection limits
    limit_conn addr 50;

    location = / { return 302 /battlelog; }

    # Public SPA + assets
    location /battlelog {
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://127.0.0.1:$WEB_UI_PORT;
    }

    location /static/ {
        proxy_pass http://127.0.0.1:$WEB_UI_PORT;
    }
    location = /asset-manifest.json { proxy_pass http://127.0.0.1:$WEB_UI_PORT; }
    location = /manifest.json { proxy_pass http://127.0.0.1:$WEB_UI_PORT; }
    location = /favicon.ico { proxy_pass http://127.0.0.1:$WEB_UI_PORT; }

    # Public APIs (rate limited)
    location /api/battlelog {
        limit_req zone=public_api burst=60 nodelay;
        proxy_pass http://127.0.0.1:$WEB_UI_PORT;
    }
    location /api/battle-reports {
        limit_req zone=public_api burst=60 nodelay;
        proxy_pass http://127.0.0.1:$WEB_UI_PORT;
    }
    location /api/achievements {
        limit_req zone=public_api burst=60 nodelay;
        proxy_pass http://127.0.0.1:$WEB_UI_PORT;
    }

    # Everything else is blocked on the public hostname
    location / { return 404; }
}
EOF
        ln -sf /etc/nginx/sites-available/arma-reforger-battlelog /etc/nginx/sites-enabled/arma-reforger-battlelog
    fi

    # Private panel vhost (protected)
    if [ -n "$PANEL_DOMAIN" ]; then
        cat > /etc/nginx/sites-available/arma-reforger-panel <<EOF
server {
    listen 80;
    server_name $PANEL_DOMAIN;

    limit_conn addr 50;

    location / {
        ${IP_SNIPPET}
        ${AUTH_SNIPPET}

        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_pass http://127.0.0.1:$WEB_UI_PORT;
    }
}
EOF
        ln -sf /etc/nginx/sites-available/arma-reforger-panel /etc/nginx/sites-enabled/arma-reforger-panel
    fi

    # Remove default site if present
    rm -f /etc/nginx/sites-enabled/default || true

    nginx -t
    systemctl enable nginx
    systemctl restart nginx

    if [ "$ENABLE_SSL" = "1" ]; then
        echo "Requesting Let's Encrypt certificates via certbot..."
        DOMAINS=()
        if [ -n "$BATTLELOG_DOMAIN" ]; then DOMAINS+=("-d" "$BATTLELOG_DOMAIN"); fi
        if [ -n "$PANEL_DOMAIN" ]; then DOMAINS+=("-d" "$PANEL_DOMAIN"); fi

        certbot --nginx --non-interactive --agree-tos -m "$CERTBOT_EMAIL" "${DOMAINS[@]}" --redirect || \
            echo "WARNING: certbot failed (check DNS points to this server and ports 80/443 are open)."
    fi
fi

echo ""
echo "====================================="
echo "Installation Complete!"
echo "====================================="
echo ""
echo "Server installed at: $SERVER_PATH"
echo "Web UI installed at: $WEB_UI_PATH"
echo "Config file: $WEB_UI_PATH/config/server-config.json"
echo ""
echo "IMPORTANT: Get your Steam API Key:"
echo "1. Go to https://steamcommunity.com/dev/apikey"
echo "2. Register for a Steam Web API Key"
echo "3. Add it to config/server-config.json (steamApiKey field)"
echo ""
echo "To start the backend API:"
echo "  systemctl start arma-reforger-backend"
echo ""
echo "To enable auto-start on boot:"
echo "  systemctl enable arma-reforger-backend"
echo ""
echo "Then open your browser to:"
echo "  http://YOUR_SERVER_IP:$WEB_UI_PORT"
echo ""
echo "Admin SteamID: $ADMIN_STEAMID"
echo ""

if [ "$ENABLE_NGINX" = "1" ]; then
    echo "Nginx is enabled."
    if [ -n "$BATTLELOG_DOMAIN" ]; then
        echo "Public Battlelog:  http://${BATTLELOG_DOMAIN}/battlelog"
    fi
    if [ -n "$PANEL_DOMAIN" ]; then
        echo "Private Panel:     http://${PANEL_DOMAIN}/"
    fi
    if [ "$PANEL_BASIC_AUTH" = "1" ]; then
        echo "Panel Basic Auth user: $PANEL_AUTH_USER"
        echo "Panel Basic Auth pass: $PANEL_AUTH_PASS"
    fi
fi

if [ "$ENABLE_FLUTE" = "1" ]; then
    echo ""
    echo "Flute CMS:"
    if [ -n "$FLUTE_DOMAIN" ]; then
        echo "  Site: http://${FLUTE_DOMAIN}/"
    else
        echo "  Site domain not set (FLUTE_DOMAIN)."
    fi
    echo "  Flute path: $FLUTE_PATH"
    echo "  DB credentials saved to: $WEB_UI_PATH/config/flute-db.json"
    echo "  IMPORTANT: Save these credentials somewhere safe."
    echo ""
    echo "NEXT STEP (inside Flute):"
    echo "  1) Run Flute web installer: http://${FLUTE_DOMAIN}/"
    echo "  2) Enable the module: /admin/modules → install/activate \"Arma Reforger Manager\""
    echo "  3) Open:"
    echo "     - Public Battlelog: http://${FLUTE_DOMAIN}/battlelog"
    echo "     - Admin:           http://${FLUTE_DOMAIN}/arma/login"
fi
