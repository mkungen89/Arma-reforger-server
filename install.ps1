# Arma Reforger Server Manager - Installation Script
# This script installs everything needed for the server and web UI

param(
    [string]$ServerPath = "C:\ArmaReforgerServer",
    [string]$SteamCMDPath = "C:\SteamCMD"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Arma Reforger Server Manager Installer" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Function to check if a command exists
function Test-CommandExists {
    param($command)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'stop'
    try {
        if (Get-Command $command) { return $true }
    }
    catch { return $false }
    finally { $ErrorActionPreference = $oldPreference }
}

# Install Chocolatey if not installed
Write-Host "[1/8] Checking Chocolatey..." -ForegroundColor Yellow
if (-not (Test-CommandExists choco)) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Green
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    refreshenv
} else {
    Write-Host "Chocolatey already installed" -ForegroundColor Green
}

# Install Node.js if not installed
Write-Host "[2/8] Checking Node.js..." -ForegroundColor Yellow
if (-not (Test-CommandExists node)) {
    Write-Host "Installing Node.js..." -ForegroundColor Green
    choco install nodejs -y
    refreshenv
} else {
    Write-Host "Node.js already installed: $(node --version)" -ForegroundColor Green
}

# Install Git if not installed
Write-Host "[3/8] Checking Git..." -ForegroundColor Yellow
if (-not (Test-CommandExists git)) {
    Write-Host "Installing Git..." -ForegroundColor Green
    choco install git -y
    refreshenv
} else {
    Write-Host "Git already installed" -ForegroundColor Green
}

# Install SteamCMD
Write-Host "[4/8] Installing SteamCMD..." -ForegroundColor Yellow
if (-not (Test-Path $SteamCMDPath)) {
    New-Item -ItemType Directory -Path $SteamCMDPath -Force | Out-Null
    $steamCmdZip = "$SteamCMDPath\steamcmd.zip"
    Write-Host "Downloading SteamCMD..." -ForegroundColor Green
    Invoke-WebRequest -Uri "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip" -OutFile $steamCmdZip
    Write-Host "Extracting SteamCMD..." -ForegroundColor Green
    Expand-Archive -Path $steamCmdZip -DestinationPath $SteamCMDPath -Force
    Remove-Item $steamCmdZip
} else {
    Write-Host "SteamCMD already installed" -ForegroundColor Green
}

# Create server directory
Write-Host "[5/8] Creating server directory..." -ForegroundColor Yellow
if (-not (Test-Path $ServerPath)) {
    New-Item -ItemType Directory -Path $ServerPath -Force | Out-Null
    Write-Host "Created: $ServerPath" -ForegroundColor Green
} else {
    Write-Host "Server directory already exists" -ForegroundColor Green
}

# Download/Update Arma Reforger Server
Write-Host "[6/8] Installing/Updating Arma Reforger Server..." -ForegroundColor Yellow
Write-Host "This may take a while (approx 10-30 GB download)..." -ForegroundColor Cyan
$steamCmdExe = "$SteamCMDPath\steamcmd.exe"
& $steamCmdExe +force_install_dir $ServerPath +login anonymous +app_update 1874900 validate +quit

# Install NPM dependencies
Write-Host "[7/8] Installing Web UI dependencies..." -ForegroundColor Yellow
npm install
if (Test-Path ".\frontend\package.json") {
    Set-Location frontend
    npm install
    Set-Location ..
}

# Create config directory
Write-Host "[8/8] Creating configuration files..." -ForegroundColor Yellow
$configDir = ".\config"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

# Create server config
$serverConfigPath = "$configDir\server-config.json"
if (-not (Test-Path $serverConfigPath)) {
    $serverConfig = @{
        serverPath = $ServerPath
        steamCmdPath = $SteamCMDPath
        webUIPort = 3001
        serverPort = 2001
        serverName = "My Arma Reforger Server"
        maxPlayers = 32
        password = ""
        adminPassword = "admin123"
    }
    $serverConfig | ConvertTo-Json | Out-File $serverConfigPath -Encoding UTF8
    Write-Host "Created server config: $serverConfigPath" -ForegroundColor Green
}

# Add firewall rules
Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "Arma Reforger Server" -Direction Inbound -Protocol UDP -LocalPort 2001 -Action Allow -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Arma Reforger Web UI" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -ErrorAction SilentlyContinue
    Write-Host "Firewall rules added" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not add firewall rules automatically" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server installed at: $ServerPath" -ForegroundColor White
Write-Host "Config file: $serverConfigPath" -ForegroundColor White
Write-Host ""
Write-Host "To start the Web UI, run:" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "Then open your browser to:" -ForegroundColor Yellow
Write-Host "  http://localhost:3001" -ForegroundColor White
Write-Host ""
