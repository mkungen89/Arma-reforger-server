# Arma Reforger Server Manager

En komplett lösning för att hantera din Arma Reforger dedikerade server med modern Web-UI, Steam authentication, och avancerade automatiseringsfunktioner.

![Version](https://img.shields.io/badge/version-3.2.4-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey.svg)

## ⭐ NYTT I VERSION 3.0

### 🎯 Battlefield 3-Style Battlelog (PUBLIKT!)
- **Publik åtkomst** - ingen inloggning krävs!
- Spårning av kills, deaths, K/D ratio, score
- XP och rangsystem (Recruit → Colonel)
- Live event feed med realtidsuppdateringar
- Leaderboards med olika sorteringsalternativ
- Detaljerade spelarprofiler med vapenstatistik
- Matchhistorik
- BF3-inspirerad orange/svart design

### 👥 Live Player Management
- Realtidsövervakning av alla spelare
- Kick/Ban/Warn system
- Private messages till spelare
- Broadcast till alla online
- Ban-hantering med temporära/permanenta ban
- Player history och event log
- Session duration tracking
- Statistik per spelare (K/D, score, ping)

### ⏰ Automated Tasks & Scheduling
- Schemalägg automatiska uppgifter
- 3 schema-typer: Cron, Interval, En gång
- 8 olika task-typer:
  - Server Restart (med varning)
  - Server Update (SteamCMD)
  - Backup Creation
  - Broadcast Messages
  - Kick Idle Players
  - Clear Logs
  - Mod Updates
  - Custom Shell Commands
- Task execution history
- Enable/disable tasks dynamiskt
- "Run Now" för manuell körning

### 💾 Backup & Restore System
- Skapa ZIP-backups av server-filer
- Konfigurerbart innehåll (config, mods, profiles, server)
- Download backups
- Restore från backups
- Backup statistics
- Automatisk backup via scheduler

## Funktioner

### 🔐 Steam Authentication
- Säker inloggning med Steam ID
- Rollbaserad åtkomstkontroll (Admin/GM/User)
- Session-hantering
- Steam API-integration för användarinformation

### 🎮 Serverhantering
- Starta, stoppa och starta om servern med ett klick
- Realtidsövervakning av serverstatus
- Automatiska uppdateringar via SteamCMD
- Systemresursövervakning (CPU, minne, disk)

### 🔧 Mod Manager med Dependency-kontroll
- Sök och lägg till mods från Steam Workshop
- Automatisk dependency-kontroll
- Förhindrar fel konfiguration av mods
- Visar vilka mods som är beroende av varandra
- Enkel aktivering/inaktivering av mods

### 🔍 Diagnostik och Felsökning
- Automatiska systemkontroller
- Identifierar vanliga problem
- Föreslår lösningar för upptäckta fel
- Auto-fix för vissa problem
- Omfattande kunskapsbas

### 👥 Användarhantering
- Lägg till/ta bort användare
- Tre rollnivåer:
  - **Admin**: Full åtkomst till alla funktioner
  - **GM**: Kan hantera server och mods
  - **User**: Endast läsåtkomst
- Steam-profil integration

### 📊 Dashboard
- Översikt över serverstatus
- Systemstatistik i realtid
- Serverkonfiguration
- Uptime tracking

### 📝 Logghantering
- Realtidsloggar från servern
- Filtrera efter nivå (info, warning, error)
- Exportera loggar
- Auto-scroll funktion

### ⚙️ Konfiguration
- Enkelt gränssnitt för serverinställningar
- Ändra portar, servernamn, max spelare
- Hantera lösenord
- Anpassade installationssökvägar

## Plattformar

- ✅ **Ubuntu 20.04/22.04 LTS** (Rekommenderat för VPS)
- ✅ **Windows 10/11**
- ✅ **Windows Server 2019/2022**

## Köra via Docker (Docker Desktop) – för test

Detta kör **Web-UI + API** i en container (prod-build). Dina data ligger kvar på din dator via volymer.

### Starta

```bash
docker compose up --build
```

Öppna: **http://localhost:3001**

### Persistenta mappar

- **`./config`**: `server-config.json`, `users.json`, `mods.json` m.m.
- **`./backups`**: skapade backups + `backups.json`
- **`./mods`**: mod-relaterade filer (om du använder SteamCMD för mods)

### Viktigt (Windows host)

- Docker-containern är **Linux**. Om din `serverPath` pekar på **Windows `.exe`** (t.ex. `ArmaReforgerServer.exe`) så kan själva spelserver-processen inte startas i containern. Docker-läget är främst för att testa **Web-UI, Battlelog, användare, scheduler, backups, API** osv.
- På din **Ubuntu VPS** kan du köra antingen “native” enligt guiden nedan, eller använda Docker och peka `serverPath`/`steamCmdPath` mot en Linux-installation.

## Snabbstart - Ubuntu VPS

### Installation med ett kommando

```bash
# Klona repository
git clone https://github.com/mkungen89/Arma-reforger-server.git
cd Arma-reforger-server

# Kör installation (kräver root/sudo)
sudo ADMIN_STEAMID=7656119XXXXXXXXXX bash install-ubuntu.sh
```

Installationen kommer att:
- Installera Node.js, Git och dependencies
- Installera SteamCMD
- Ladda ner Arma Reforger Server (~10-30 GB)
- Installera Web-UI
- Konfigurera systemd service
- Konfigurera firewall (UFW)
- Skapa standardanvändare

### Efter installation:

1. **Hämta Steam Web API Key:**
   - Gå till https://steamcommunity.com/dev/apikey
   - Registrera en API-nyckel
   - Lägg till den i `/opt/arma-reforger-manager/config/server-config.json`:
   ```json
   {
     "steamApiKey": "DIN_API_NYCKEL_HÄR"
   }
   ```

2. **Starta Web-UI:**
   ```bash
   sudo systemctl start arma-reforger-webui
   sudo systemctl enable arma-reforger-webui  # Auto-start vid boot
   ```

3. **Öppna i webbläsare:**
   ```
   http://DIN_SERVER_IP:3001
   ```

4. **Logga in:**
   - Du kan bara logga in om din SteamID finns i `/opt/arma-reforger-manager/config/users.json`
   - Under installationen skapas en admin-användare med den SteamID du angav via `ADMIN_STEAMID`

### Systemd Kommandon

```bash
# Starta Web-UI
sudo systemctl start arma-reforger-webui

# Stoppa Web-UI
sudo systemctl stop arma-reforger-webui

# Restart Web-UI
sudo systemctl restart arma-reforger-webui

# Status
sudo systemctl status arma-reforger-webui

# Se loggar
sudo journalctl -u arma-reforger-webui -f
```

## Snabbstart - Windows

### Installation med ett kommando

1. Klona repository:
```bash
git clone https://github.com/mkungen89/Arma-reforger-server.git
cd Arma-reforger-server
```

2. Högerklicka på `quick-install.bat` och välj **"Kör som administratör"**

### Starta Web-UI (Windows)

```bash
npm start
```

Eller dubbelklicka på `start.bat`

Öppna din webbläsare: **http://localhost:3001**

## Första inloggningen

När du öppnar Web-UI första gången:

1. **Hitta ditt Steam ID:**
   - Gå till https://steamid.io/
   - Logga in med Steam
   - Kopiera din **steamID64** (format: 76561199XXXXXXXXX)

2. **Logga in:**
   - Ange ditt Steam ID i login-formuläret
   - Om ditt ID inte är auktoriserat, be en admin att lägga till dig

3. **För första användaren:**
   - Editera `config/users.json` manuellt
   - Byt standardanvändarens SteamID till ditt eget:
   ```json
   {
     "users": [
       {
         "steamId": "DITT_STEAM_ID_HÄR",
         "displayName": "Admin",
         "role": "admin",
         "addedAt": "2024-01-01T00:00:00Z"
       }
     ]
   }
   ```

## Användarroller

### Admin
- Full åtkomst till alla funktioner
- Kan hantera användare
- Kan ändra all konfiguration
- Kan starta/stoppa server
- Kan hantera mods

### GM (Game Master)
- Kan starta/stoppa/restart server
- Kan hantera mods
- Kan se loggar
- Kan INTE ändra konfiguration
- Kan INTE hantera användare

### User
- Endast läsåtkomst
- Kan se dashboard och status
- Kan se loggar
- Kan INTE göra några ändringar

## Användarhantering

### Lägga till användare (via Web-UI)

1. Logga in som **Admin**
2. Gå till **Users** i menyn
3. Klicka **Add User**
4. Ange användarens Steam ID
5. Välj roll (Admin/GM/User)
6. Klicka **Add User**

### Lägga till användare (manuellt)

Editera `config/users.json`:

```json
{
  "users": [
    {
      "steamId": "76561199176944069",
      "displayName": "Admin User",
      "role": "admin",
      "addedAt": "2024-01-01T00:00:00Z"
    },
    {
      "steamId": "76561198XXXXXXXXX",
      "displayName": "Game Master",
      "role": "gm",
      "addedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

Starta om Web-UI efter ändring.

## Konfiguration

### Portar

Standard portar:
- **Game Server:** UDP 2001
- **Web UI:** TCP 3001

### Firewall (Ubuntu)

```bash
# Tillåt Web UI
sudo ufw allow 3001/tcp

# Tillåt Game Server
sudo ufw allow 2001/udp

# Enable firewall
sudo ufw enable
```

### Firewall (Windows)

Installationsskriptet lägger automatiskt till regler. Manuellt:

```powershell
New-NetFirewallRule -DisplayName "Arma Reforger Server" -Direction Inbound -Protocol UDP -LocalPort 2001 -Action Allow
New-NetFirewallRule -DisplayName "Arma Reforger Web UI" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

### Reverse Proxy (Nginx) - Rekommenderat för produktion

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Med SSL (Let's Encrypt):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## API Endpoints

### Authentication
- `POST /api/auth/steam/login` - Login med Steam ID
- `POST /api/auth/steam/verify` - Verifiera Steam OpenID
- `GET /api/auth/me` - Hämta nuvarande användare
- `POST /api/auth/logout` - Logga ut

### User Management (Admin only)
- `GET /api/users` - Lista alla användare
- `POST /api/users` - Lägg till användare
- `PUT /api/users/:steamId` - Uppdatera användarroll
- `DELETE /api/users/:steamId` - Ta bort användare

### Server Management
- `GET /api/status` - Hämta serverstatus
- `POST /api/server/start` - Starta servern
- `POST /api/server/stop` - Stoppa servern
- `POST /api/server/restart` - Starta om servern
- `POST /api/server/update` - Uppdatera server

### Mod Management
- `GET /api/mods` - Lista alla mods
- `GET /api/mods/search?url=<workshop_url>` - Sök mod
- `POST /api/mods/add` - Lägg till mod
- `POST /api/mods/:id/install` - Installera mod
- `POST /api/mods/:id/toggle` - Aktivera/inaktivera mod
- `DELETE /api/mods/:id` - Ta bort mod

### Diagnostics
- `GET /api/diagnostics/run` - Kör diagnostik
- `GET /api/diagnostics/issues` - Lista kända problem
- `POST /api/diagnostics/autofix/:issueId` - Försök auto-fix

### Configuration
- `GET /api/config` - Hämta konfiguration
- `PUT /api/config` - Uppdatera konfiguration

### Logs
- `GET /api/logs` - Hämta loggar
- `DELETE /api/logs` - Rensa loggar

## Utveckling

### Köra i utvecklingsläge

```bash
# Backend
npm run server

# Frontend (ny terminal)
cd frontend
npm start

# Eller båda samtidigt
npm run dev
```

### Projektstruktur

```
Arma-Reforger-Server/
├── backend/
│   ├── server.js          # Main server
│   ├── auth.js            # Authentication
│   ├── modManager.js      # Mod management
│   └── diagnostics.js     # Diagnostics
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js
│   │   │   ├── UserManagement.js
│   │   │   ├── Dashboard.js
│   │   │   └── ...
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── config/
│   ├── server-config.json # Server config
│   └── users.json         # Users database
├── install-ubuntu.sh      # Ubuntu installer
├── install.ps1            # Windows installer
└── package.json
```

## Felsökning

### Kan inte logga in

1. Kontrollera att ditt Steam ID är i `config/users.json`
2. Verifiera att backend är igång
3. Kontrollera browser console för fel

### Web-UI laddas inte

**Ubuntu:**
```bash
sudo systemctl status arma-reforger-webui
sudo journalctl -u arma-reforger-webui -n 50
```

**Windows:**
```bash
# Kontrollera om processen kör
netstat -ano | findstr :3001
```

### Servern startar inte

1. Kör **Diagnostics** i Web-UI
2. Kontrollera serverfiler finns
3. Verifiera att port 2001 är ledig
4. Se loggar i Web-UI

## Säkerhet

### Best Practices

1. **Säkerställ att endast dina SteamID(s) finns i** `config/users.json`
2. **Använd HTTPS** i produktion (Nginx + Let's Encrypt)
3. **Håll Steam API key hemlig** - lägg aldrig i Git
4. **Begränsa admin-åtkomst** - ge endast GM-roll när möjligt
5. **Regelbundna uppdateringar** av både server och Web-UI
6. **Firewall** - öppna endast nödvändiga portar

### Steam API Key

För att få användarnamn och avatarer från Steam:

1. Gå till https://steamcommunity.com/dev/apikey
2. Skapa en API-nyckel
3. Lägg till i `config/server-config.json`:
   ```json
   {
     "steamApiKey": "YOUR_KEY_HERE"
   }
   ```

**OBS:** Lägg ALDRIG API-nyckeln i Git!

## Bidra

Bidrag är välkomna! Skapa en pull request eller öppna ett issue.

## Support

- **GitHub Issues:** https://github.com/mkungen89/Arma-reforger-server/issues
- **Server IP:** 45.67.15.187
- **Documentation:** Se INSTALL.md för detaljerad installationsguide

## Licens

MIT License - se LICENSE fil för detaljer

## Changelog

### Version 3.2.4 (2025-12-25) 🛡️
**Secure VPS install + reproducible deps**

#### Improvements / Security:
- ✅ Ubuntu install kräver `ADMIN_STEAMID` (ingen hårdkodad default-admin längre)
- ✅ Installer är idempotent och bevarar `config/`, `backups/`, `mods/` vid ominstall/update
- ✅ Runtime-config och persondata flyttade till `config.example/` + ignoreras i Git (GDPR-säkrare)
- ✅ Lockfiles spåras igen → VPS-install använder `npm ci` (reproducerbart)
- ✅ Tog bort oanvänd sårbar dependency (`multer`)
- ✅ Auto-update använder nu `npm ci` och rensar `frontend/node_modules` efter build

---

### Version 3.2.3 (2025-12-25) 🚀
**Docker + Mod Metadata + Security/UX Improvements**

#### New Features / Improvements:
- ✅ Docker Desktop support (`Dockerfile`, `docker-compose.yml`, `.dockerignore`)
- ✅ Platform-agnostic executable resolution (Windows/Linux) via `backend/platform.js`
- ✅ Clear Docker/Linux environment warning banner in UI (`/api/env`)
- ✅ Mod metadata: **version**, **size**, **thumbnail**, **game version** (via stable `__NEXT_DATA__` parsing)
- ✅ Mod metadata refresh (per mod + refresh all) + TTL/`lastFetchedAt`
- ✅ Better server status payload (`lastExit`, `lastStartAt`, `lastStopRequestedAt`, `lastError`)
- ✅ Rate-limiting on auth endpoints + stricter role guards for server/mod/config actions
- ✅ Toast notifications + skeleton loader in Mod Manager

---

### Version 3.2.2 (2025-12-25) 🔓
**Bug Fix - Public System Info Endpoints**

#### Fixes:
- ✅ Made `/system/check-update` and `/system/info` publicly accessible
- ✅ Dashboard can now check for updates without authentication
- ✅ Fixed "Authentication required" error on system endpoints

---

### Version 3.2.1 (2025-12-25) 🔧
**Bug Fix - Auto-Update Branch Detection**

#### Fixes:
- ✅ Fixed auto-update system to detect current git branch automatically
- ✅ Supports both `main` and `master` branches
- ✅ Better error messages when git repository is not initialized
- ✅ Improved GitHub API error handling

---

### Version 3.2.0 (2025-12-25) ⚙️
**Complete Server Configuration System**

#### New Features:
- ✅ **Comprehensive Configuration UI**
  - 5 organized tabs: Basic, Network, Game Properties, RCON, Advanced
  - All Arma Reforger config.json parameters
  - Real-time validation and hints
  - Unsaved changes tracking

- ✅ **Game Properties Configuration**
  - View distance settings (server max, network, grass)
  - BattlEye anti-cheat toggle
  - Fast validation option
  - Third-person view control
  - Voice chat (VON) settings

- ✅ **RCON Support**
  - Enable/disable remote console
  - Port and password configuration
  - Max clients and permission levels
  - Security warnings

- ✅ **Advanced Settings**
  - AI configuration (enable/disable, limits)
  - Player save intervals
  - Join queue management
  - Slot reservation timeouts
  - System options (crash reporter, shutdown control)
  - Cross-platform play toggle

#### Documentation:
- Integrated help links to official Arma Reforger docs
- Inline hints for every setting
- Recommended values and ranges

---

### Version 3.1.0 (2025-12-25) 🔄
**Auto-Update System & Node.js v20 Support**

#### New Features:
- ✅ **Auto-Update System**
  - Check for updates directly in Dashboard
  - One-click update from GitHub
  - Automatic service restart after update
  - Version and commit tracking
  - Update notifications in real-time

- ✅ **Node.js v20 Support**
  - Fixed compatibility issues with Node.js v18
  - Auto-upgrade to Node.js v20 in install script
  - Better performance and stability

#### Improvements:
- Enhanced installation script with Node.js version detection
- Automatic dependency updates
- Improved error handling in backend
- Better systemd service management

#### Documentation:
- New UPDATE.md with comprehensive update guide
- Troubleshooting section for common update issues
- Rollback instructions

See [UPDATE.md](UPDATE.md) for detailed update instructions.

---

### Version 3.0.0 (2025-12-25) 🎄
**Major Update - Advanced Automation & Player Management**

#### New Features:
- ✅ **Battlefield 3-Style Battlelog** (PUBLIC)
  - Live player statistics tracking
  - XP and rank progression system (10 levels)
  - Kill/death/weapon statistics
  - Leaderboards and player profiles
  - Live event feed
  - BF3-inspired orange/black theme
  - Accessible without login!

- ✅ **Live Player Management**
  - Real-time player monitoring
  - Kick/Ban/Warn system with reasons
  - Private messaging to players
  - Broadcast messages to all online players
  - Ban management (temporary/permanent)
  - Player history and event log
  - Session tracking with duration
  - Auto-kick idle players

- ✅ **Automated Tasks & Scheduling**
  - Complete scheduling system with cron support
  - Schedule types: Cron, Interval, One-time
  - 8 task types: Restart, Update, Backup, Broadcast, Kick Idle, Clear Logs, Mod Update, Custom Commands
  - Task execution history (500 events)
  - Enable/disable tasks dynamically
  - Manual execution ("Run Now")
  - Next run time display

- ✅ **Backup & Restore System**
  - Create ZIP backups of server files
  - Configurable backup contents (config/mods/profiles/server)
  - Download and restore backups
  - Backup statistics and management
  - Automated backups via scheduler

#### Improvements:
- Enhanced navigation with new menu items
- Admin-only access to advanced features
- Improved real-time updates (WebSocket)
- Better error handling and notifications
- Optimized frontend build (83KB gzipped)

### Version 2.0.0
- ✅ Steam authentication
- ✅ Rollbaserad åtkomstkontroll (Admin/GM/User)
- ✅ Användarhantering
- ✅ Ubuntu/Linux support
- ✅ Systemd service
- ✅ Steam API integration

### Version 1.0.0
- ✅ Grundläggande serverhantering
- ✅ Mod manager med dependency-kontroll
- ✅ Diagnostik och monitoring
- ✅ Web-UI
- ✅ Windows support

---

Made with ❤️ for the Arma Reforger community
