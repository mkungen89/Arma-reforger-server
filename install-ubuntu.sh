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

# Hard requirement: when nginx enabled, panel domain is strongly recommended
if [ "$ENABLE_NGINX" = "1" ] && [ -z "$PANEL_DOMAIN" ]; then
  if is_tty; then
    echo ""
    echo "Nginx is enabled but PANEL_DOMAIN is empty."
    PANEL_DOMAIN="$(prompt 'Panel domain (required for private panel, e.g. panel.example.com)')"
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
echo ""

# Update system
echo "[1/10] Updating system packages..."
apt-get update
apt-get upgrade -y

# Install dependencies
echo "[2/10] Installing dependencies..."
apt-get install -y curl wget git build-essential lib32gcc-s1 software-properties-common rsync ca-certificates gnupg

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
echo "[9/10] Installing Web UI dependencies..."
npm ci --omit=dev --no-audit --no-fund

if [ -d "frontend" ]; then
    cd frontend
    npm ci --no-audit --no-fund
    npm run build
    # Security: remove build toolchain deps from the VPS after building
    rm -rf node_modules
    cd ..
fi

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

# Create systemd service
echo "Creating systemd service..."
LISTEN_HOST_ENV="0.0.0.0"
TRUST_PROXY_ENV="0"
if [ "$ENABLE_NGINX" = "1" ]; then
    LISTEN_HOST_ENV="127.0.0.1"
    TRUST_PROXY_ENV="1"
fi
cat > /etc/systemd/system/arma-reforger-webui.service <<EOF
[Unit]
Description=Arma Reforger Server Manager Web UI
After=network.target

[Service]
Type=simple
User=$INSTALL_USER
WorkingDirectory=$WEB_UI_PATH
Environment=NODE_ENV=production
Environment=PORT=$WEB_UI_PORT
Environment=LISTEN_HOST=$LISTEN_HOST_ENV
Environment=TRUST_PROXY=$TRUST_PROXY_ENV
Environment=PUBLIC_API_RPM=$PUBLIC_API_RPM
ExecStart=/usr/bin/node $WEB_UI_PATH/backend/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable arma-reforger-webui.service
systemctl restart arma-reforger-webui.service

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
echo "To start the Web UI:"
echo "  systemctl start arma-reforger-webui"
echo ""
echo "To enable auto-start on boot:"
echo "  systemctl enable arma-reforger-webui"
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
