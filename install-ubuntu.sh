#!/bin/bash

# Arma Reforger Server Manager - Ubuntu Installation Script
# This script installs everything needed for the server and web UI on Ubuntu

set -e

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

echo "Installation paths:"
echo "  Server: $SERVER_PATH"
echo "  SteamCMD: $STEAMCMD_PATH"
echo "  Web UI: $WEB_UI_PATH"
echo "  User: $INSTALL_USER"
echo ""

# Update system
echo "[1/10] Updating system packages..."
apt-get update
apt-get upgrade -y

# Install dependencies
echo "[2/10] Installing dependencies..."
apt-get install -y curl wget git build-essential lib32gcc-s1 software-properties-common

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
if [ ! -d "$STEAMCMD_PATH" ]; then
    mkdir -p "$STEAMCMD_PATH"
    cd "$STEAMCMD_PATH"

    # Add i386 architecture for SteamCMD
    dpkg --add-architecture i386
    apt-get update

    # Accept Steam license
    echo steam steam/question select "I AGREE" | debconf-set-selections
    echo steam steam/license note '' | debconf-set-selections

    # Install steamcmd
    apt-get install -y steamcmd

    # Create symlink
    ln -s /usr/games/steamcmd "$STEAMCMD_PATH/steamcmd.sh"

    chown -R "$INSTALL_USER:$INSTALL_USER" "$STEAMCMD_PATH"
fi

# Create server directory
echo "[6/10] Creating server directory..."
mkdir -p "$SERVER_PATH"
chown -R "$INSTALL_USER:$INSTALL_USER" "$SERVER_PATH"

# Download/Update Arma Reforger Server
echo "[7/10] Installing/Updating Arma Reforger Server..."
echo "This may take a while (approx 10-30 GB download)..."

sudo -u "$INSTALL_USER" /usr/games/steamcmd +force_install_dir "$SERVER_PATH" +login anonymous +app_update 1874900 validate +quit

# Copy Web UI files
echo "[8/10] Setting up Web UI..."
if [ -d "$WEB_UI_PATH" ]; then
    rm -rf "$WEB_UI_PATH"
fi

mkdir -p "$WEB_UI_PATH"
cp -r . "$WEB_UI_PATH/"
cd "$WEB_UI_PATH"

# Install NPM dependencies
echo "[9/10] Installing Web UI dependencies..."
npm install

if [ -d "frontend" ]; then
    cd frontend
    npm install
    npm run build
    cd ..
fi

# Set permissions
chown -R "$INSTALL_USER:$INSTALL_USER" "$WEB_UI_PATH"

# Create config directory
echo "[10/10] Creating configuration..."
mkdir -p "$WEB_UI_PATH/config"

# Create server config
cat > "$WEB_UI_PATH/config/server-config.json" <<EOF
{
  "serverPath": "$SERVER_PATH",
  "steamCmdPath": "/usr/games/steamcmd",
  "webUIPort": 3001,
  "serverPort": 2001,
  "serverName": "My Arma Reforger Server",
  "maxPlayers": 32,
  "password": "",
  "adminPassword": "admin123",
  "steamApiKey": ""
}
EOF

# Create users database with default admin
cat > "$WEB_UI_PATH/config/users.json" <<EOF
{
  "users": [
    {
      "steamId": "76561199176944069",
      "displayName": "Default Admin",
      "role": "admin",
      "addedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    }
  ]
}
EOF

chown -R "$INSTALL_USER:$INSTALL_USER" "$WEB_UI_PATH/config"

# Configure firewall (UFW)
echo "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 2001/udp comment 'Arma Reforger Server'
    ufw allow 3001/tcp comment 'Arma Reforger Web UI'
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
echo "  http://YOUR_SERVER_IP:3001"
echo ""
echo "Default admin SteamID: 76561199176944069"
echo ""
