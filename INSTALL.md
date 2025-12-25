# Installationsguide - Arma Reforger Server Manager

## Docker Desktop (för test)

Kör **Web-UI + API** i Docker (prod-build) och spara `config/` + `backups/` lokalt.

```bash
docker compose up --build
```

Öppna: **http://localhost:3001**

Stoppa:

```bash
docker compose down
```

**OBS (Windows host):** Containern är Linux. Om du använder Windows-serverfiler (`ArmaReforgerServer.exe`) kan spelservern inte startas i containern – men Web-UI och resten av funktionerna kan testas.

## Snabbinstallation (Rekommenderat)

### Steg 1: Klona repositoryt

```bash
git clone https://github.com/mkungen89/Arma-reforger-server.git
cd Arma-reforger-server
```

### Steg 2: Kör installationsskriptet

1. Högerklicka på `quick-install.bat`
2. Välj **"Kör som administratör"**
3. Vänta tills installationen är klar (kan ta 10-30 minuter beroende på internetanslutning)

### Steg 3: Starta Web-UI

Dubbelklicka på `start.bat` eller kör:

```bash
npm start
```

Öppna din webbläsare och gå till: **http://localhost:3001**

Det är allt!

---

## Detaljerad Manual Installation

### Systemkrav

- **OS:** Windows 10/11 eller Windows Server 2019/2022
- **RAM:** Minst 8 GB (rekommenderat 16 GB)
- **Disk:** Minst 20 GB ledigt utrymme
- **Network:** Stabil internetanslutning

### Steg 1: Installera Node.js

1. Gå till https://nodejs.org/
2. Ladda ner LTS-versionen (18.x eller senare)
3. Kör installationsprogrammet
4. Verifiera installationen:

```bash
node --version
npm --version
```

### Steg 2: Installera Git (valfritt men rekommenderat)

1. Gå till https://git-scm.com/
2. Ladda ner och installera Git för Windows
3. Verifiera:

```bash
git --version
```

### Steg 3: Ladda ner projektet

Med Git:
```bash
git clone https://github.com/mkungen89/Arma-reforger-server.git
cd Arma-reforger-server
```

Utan Git:
1. Gå till https://github.com/mkungen89/Arma-reforger-server
2. Klicka på "Code" → "Download ZIP"
3. Extrahera ZIP-filen
4. Öppna Command Prompt/PowerShell i mappen

### Steg 4: Installera SteamCMD

#### Automatisk installation:
Kör PowerShell som administratör:

```powershell
.\install.ps1
```

#### Manuell installation:

1. Skapa mappen `C:\SteamCMD`
2. Ladda ner SteamCMD:
   https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip
3. Extrahera till `C:\SteamCMD`

### Steg 5: Installera NPM dependencies

I projektmappen:

```bash
npm install
```

För frontend:

```bash
cd frontend
npm install
cd ..
```

### Steg 6: Ladda ner Arma Reforger Server

Kör i Command Prompt:

```bash
C:\SteamCMD\steamcmd.exe +force_install_dir C:\ArmaReforgerServer +login anonymous +app_update 1874900 validate +quit
```

Detta kan ta 10-30 minuter beroende på internetanslutning.

### Steg 7: Konfigurera Windows Firewall

Öppna PowerShell som administratör:

```powershell
New-NetFirewallRule -DisplayName "Arma Reforger Server" -Direction Inbound -Protocol UDP -LocalPort 2001 -Action Allow
New-NetFirewallRule -DisplayName "Arma Reforger Web UI" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

### Steg 8: Starta servern

```bash
npm start
```

Öppna webbläsaren till: http://localhost:3001

---

## Konfiguration efter installation

### Grundkonfiguration

1. Öppna Web-UI (http://localhost:3001)
2. Gå till **Configuration**
3. Ändra följande inställningar:
   - **Server Name:** Ditt servernamn
   - **Max Players:** Antal spelare (default: 32)
   - **Server Password:** (valfritt)
   - **Admin Password:** Lösenord för admin

4. Klicka **Save Configuration**

### Port Forwarding (För extern access)

För att spelare från internet ska kunna ansluta:

1. Logga in på din router (vanligtvis 192.168.1.1 eller 192.168.0.1)
2. Hitta "Port Forwarding" sektionen
3. Lägg till följande regel:
   - **Service Name:** Arma Reforger
   - **Protocol:** UDP
   - **External Port:** 2001
   - **Internal Port:** 2001
   - **Internal IP:** Din servers lokala IP (t.ex. 192.168.1.100)

4. Spara och starta om routern om nödvändigt

### Hitta din lokala IP:

```bash
ipconfig
```

Leta efter "IPv4 Address" under din nätverksadapter.

---

## Starta servern första gången

### 1. Via Web-UI (Rekommenderat)

1. Öppna http://localhost:3001
2. Gå till **Server Control**
3. Klicka **Start Server**
4. Vänta tills status blir "RUNNING"
5. Servern är nu tillgänglig!

### 2. Testa anslutning

I Arma Reforger:
1. Öppna Server Browser
2. Sök efter ditt servernamn
3. Eller anslut direkt via IP: `45.67.15.187:2001`

---

## Lägga till mods

### Steam Workshop Mods

1. Gå till Steam Workshop för Arma Reforger
2. Hitta en mod du vill ha
3. Kopiera Workshop URL (t.ex. https://steamcommunity.com/sharedfiles/filedetails/?id=123456789)

4. I Web-UI:
   - Gå till **Mod Manager**
   - Klistra in URL:en
   - Klicka **Search**
   - Granska mod-info och dependencies
   - Klicka **Add Mod**
   - Klicka **Install**
   - Aktivera moden med checkboxen

5. Starta om servern för att ladda modsen

### Viktigt om Dependencies!

Mod Manager kontrollerar automatiskt dependencies:
- ✅ **Grönt:** Alla dependencies OK
- ⚠️ **Orange:** Varningar (dependencies inte aktiverade)
- ❌ **Rött:** Fel (dependencies saknas)

Du kan **inte** aktivera en mod om dess dependencies saknas!

---

## Felsökning

### Problem: Servern startar inte

**Lösningar:**
1. Kör **Diagnostics** → **Run Diagnostics**
2. Kontrollera att server-filerna finns i `C:\ArmaReforgerServer`
3. Verifiera att port 2001 är ledig:
   ```bash
   netstat -ano | findstr :2001
   ```
4. Kontrollera logs i Web-UI

### Problem: Web-UI laddas inte

**Lösningar:**
1. Kontrollera att backend körs (`npm start`)
2. Verifiera port 3001:
   ```bash
   netstat -ano | findstr :3001
   ```
3. Testa med `http://127.0.0.1:3001`
4. Kontrollera Windows Firewall
5. Prova starta om datorn

### Problem: Spelare kan inte ansluta

**Lösningar:**
1. Kontrollera att servern kör (Web-UI → Dashboard)
2. Verifiera port forwarding i router
3. Testa från samma nätverk först
4. Kontrollera Windows Firewall
5. Verifiera public IP: https://whatismyipaddress.com/

### Problem: Mods laddar inte

**Lösningar:**
1. Kontrollera att SteamCMD är installerat
2. Verifiera diskutrymme
3. Kontrollera dependencies i Mod Manager
4. Se loggar under installation
5. Prova installera om moden

---

## Uppdatera servern

### Uppdatera Arma Reforger Server

1. Stoppa servern (**Server Control** → **Stop Server**)
2. Klicka **Update Server**
3. Vänta tills uppdateringen är klar (följ i **Logs**)
4. Starta servern igen

### Uppdatera Web-UI

```bash
cd Arma-reforger-server
git pull
npm install
cd frontend
npm install
cd ..
npm start
```

---

## Avancerad konfiguration

### Ändra server-sökvägar

I Web-UI → Configuration:
- **Server Path:** Var Arma Reforger server är installerad
- **SteamCMD Path:** Var SteamCMD är installerat

### Anpassa portar

I Web-UI → Configuration:
- **Server Port:** Game server port (default: 2001)
- **Web UI Port:** Web interface port (default: 3001)

**OBS:** Kräver omstart!

### Backup och Restore

#### Backup

Kopiera dessa mappar:
- `C:\ArmaReforgerServer\profile\` - Server profil och saves
- `.\config\` - Web-UI konfiguration

#### Restore

Kopiera tillbaka mapparna till samma plats.

---

## Köra i bakgrunden (Windows Service)

För att köra servern som en Windows Service:

### Använd NSSM (Non-Sucking Service Manager)

1. Ladda ner NSSM: https://nssm.cc/download
2. Extrahera och öppna Command Prompt som Admin
3. Navigera till NSSM-mappen
4. Kör:

```bash
nssm install ArmaReforgerWebUI "C:\Program Files\nodejs\node.exe" "C:\Arma-reforger-server\backend\server.js"
nssm set ArmaReforgerWebUI AppDirectory "C:\Arma-reforger-server"
nssm start ArmaReforgerWebUI
```

Nu startar Web-UI automatiskt vid systemstart!

---

## Support och hjälp

- **GitHub Issues:** https://github.com/mkungen89/Arma-reforger-server/issues
- **README:** Se README.md för mer information
- **Diagnostics:** Använd inbyggda diagnostikverktyget i Web-UI

---

**Lycka till med din Arma Reforger server!**
