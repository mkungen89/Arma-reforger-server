# Arma Reforger Server Manager

En komplett lösning för att hantera din Arma Reforger dedikerade server med modern Web-UI.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Funktioner

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

## Snabbstart

### Installation med ett kommando

1. Klona detta repository:
```bash
git clone https://github.com/mkungen89/Arma-reforger-server.git
cd Arma-reforger-server
```

2. Högerklicka på `quick-install.bat` och välj **"Kör som administratör"**

Det är allt! Scriptet kommer att:
- Installera Chocolatey (om det inte finns)
- Installera Node.js och Git (om de inte finns)
- Installera SteamCMD
- Ladda ner Arma Reforger Server
- Installera alla dependencies för Web-UI
- Konfigurera Windows Firewall

### Starta Web-UI

Efter installationen, kör:
```bash
npm start
```

Eller dubbelklicka på `start.bat`

Öppna din webbläsare och gå till: **http://localhost:3001**

## Manuell Installation

Om du föredrar manuell installation:

### Krav
- Windows 10/11 eller Windows Server 2019/2022
- Node.js 18.x eller senare
- SteamCMD
- Minst 20 GB ledigt diskutrymme

### Steg-för-steg

1. Installera Node.js från https://nodejs.org/

2. Klona repository:
```bash
git clone https://github.com/mkungen89/Arma-reforger-server.git
cd Arma-reforger-server
```

3. Installera backend dependencies:
```bash
npm install
```

4. Installera frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

5. Installera SteamCMD manuellt eller kör:
```powershell
.\install.ps1
```

6. Starta servern:
```bash
npm start
```

## Användarguide

### Starta Arma Reforger Server

1. Öppna Web-UI (http://localhost:3001)
2. Gå till **Server Control**
3. Klicka på **Start Server**
4. Servern startar nu och du kan se status i realtid

### Lägga till Mods

1. Gå till **Mod Manager**
2. Klistra in Steam Workshop URL (t.ex. https://steamcommunity.com/sharedfiles/filedetails/?id=123456789)
3. Klicka **Search**
4. Granska mod-informationen och dependencies
5. Klicka **Add Mod**
6. Klicka **Install** för att ladda ner moden
7. Aktivera moden med checkboxen

**OBS:** Mod Manager kontrollerar automatiskt dependencies och varnar dig om något saknas!

### Felsöka Problem

1. Gå till **Diagnostics**
2. Klicka **Run Diagnostics**
3. Granska resultaten
4. Om problem upptäcks, följ föreslagna lösningar
5. Vissa problem kan fixas automatiskt med **Try Auto-Fix**

### Uppdatera Servern

1. Stoppa servern först (om den kör)
2. Gå till **Server Control**
3. Klicka **Update Server**
4. Vänta tills uppdateringen är klar (följ i Logs)

## Konfiguration

### Portar

Standard portar:
- **Game Server:** UDP 2001
- **Web UI:** TCP 3001

Du kan ändra dessa i **Configuration** sektionen.

### Firewall

Installationsskriptet lägger automatiskt till firewall-regler. Om du installerade manuellt, öppna dessa portar:

```powershell
New-NetFirewallRule -DisplayName "Arma Reforger Server" -Direction Inbound -Protocol UDP -LocalPort 2001 -Action Allow
New-NetFirewallRule -DisplayName "Arma Reforger Web UI" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

### Port Forwarding

För att spelare ska kunna ansluta från internet, måste du port-forwarda följande i din router:
- **UDP 2001** -> Din servers lokala IP

## API Endpoints

Web-UI kommunicerar med backend via följande API:

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

Backend och frontend separat:

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

Eller båda samtidigt:
```bash
npm run dev
```

### Projektstruktur

```
Arma-Reforger-Server/
├── backend/
│   ├── server.js          # Main backend server
│   ├── modManager.js      # Mod management API
│   └── diagnostics.js     # Diagnostics API
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/    # React components
│       ├── App.js
│       └── index.js
├── config/                # Configuration files
├── install.ps1           # PowerShell installer
├── quick-install.bat     # Quick install script
├── start.bat             # Start script
└── package.json
```

## Felsökning

### Servern startar inte

1. Kontrollera att server-filerna är installerade korrekt
2. Verifiera att port 2001 är ledig
3. Kör diagnostik för att identifiera problemet
4. Kontrollera logs för felmeddelanden

### Kan inte ansluta till Web-UI

1. Kontrollera att backend är igång (`npm start`)
2. Verifiera att port 3001 är ledig
3. Testa med `http://localhost:3001` istället för IP-adress
4. Kontrollera Windows Firewall

### Mods laddas inte

1. Kontrollera att SteamCMD är installerat korrekt
2. Verifiera att alla dependencies är installerade
3. Kontrollera att du har tillräckligt diskutrymme
4. Granska logs under installation

## Bidra

Bidrag är välkomna! Skapa en pull request eller öppna ett issue.

## Licens

MIT License - se LICENSE fil för detaljer

## Support

- **Issues:** https://github.com/mkungen89/Arma-reforger-server/issues
- **Discord:** [Din Discord server]
- **Wiki:** [Din wiki]

## Tack till

- Bohemia Interactive för Arma Reforger
- Node.js och React communities
- Alla bidragsgivare

---

**Server IP:** 45.67.15.187

Made with ❤️ for the Arma Reforger community
