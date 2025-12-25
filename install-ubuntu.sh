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

if [ -z "$ADMIN_STEAMID" ]; then
    echo "ERROR: ADMIN_STEAMID is required for a secure installation."
    echo "Example:"
    echo "  sudo ADMIN_STEAMID=7656119XXXXXXXXXX bash install-ubuntu.sh"
    echo ""
    echo "Tip: find your SteamID64 here: https://steamid.io/"
    exit 1
fi

echo "Installation paths:"
echo "  Server: $SERVER_PATH"
echo "  SteamCMD: $STEAMCMD_PATH"
echo "  Web UI: $WEB_UI_PATH"
echo "  User: $INSTALL_USER"
  echo "  Web UI Port: $WEB_UI_PORT"
  echo "  Server Port: $SERVER_PORT"
echo ""

# Update system
echo "[1/10] Updating system packages..."
apt-get update
apt-get upgrade -y

# Install dependencies
echo "[2/10] Installing dependencies..."
apt-get install -y curl wget git build-essential lib32gcc-s1 software-properties-common rsync ca-certificates gnupg

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
    ufw allow "${WEB_UI_PORT}/tcp" comment 'Arma Reforger Web UI' || true
    echo "Firewall rules added"
fi

# Create systemd service
echo "Creating systemd service..."
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
