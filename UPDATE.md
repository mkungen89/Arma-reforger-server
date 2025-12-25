# 🔄 Uppdateringsguide

## Automatisk Uppdatering (Rekommenderat)

Version 3.1.0+ har inbyggd auto-uppdateringsfunktion!

### Via Web-UI (Enklast):

1. **Logga in på Web-UI** som Admin
2. **Gå till Dashboard**
3. **Leta efter uppdateringskortet** högst upp
4. Om det finns uppdateringar:
   - Klicka på **"Update Now"**
   - Tjänsten kommer automatiskt att:
     - Ladda ner senaste koden från GitHub
     - Installera nya dependencies
     - Bygga om frontend
     - Starta om tjänsten

**OBS:** Sidan laddas om automatiskt efter uppdateringen!

---

## Manuell Uppdatering

Om du föredrar att uppdatera manuellt eller om auto-uppdateringen inte fungerar:

### Ubuntu/Linux:

```bash
# 1. Gå till installationskatalogen
cd /opt/Arma-reforger-server

# 2. Stoppa tjänsten
sudo systemctl stop arma-reforger-webui

# 3. Spara eventuella lokala ändringar
git stash

# 4. Hämta senaste uppdateringarna
git pull origin main

# 5. Uppdatera backend dependencies
npm install

# 6. Uppdatera frontend
cd frontend
npm install
npm run build
cd ..

# 7. Fixa rättigheter
sudo chown -R arma:arma /opt/arma-reforger-manager

# 8. Starta tjänsten igen
sudo systemctl start arma-reforger-webui

# 9. Kontrollera att allt fungerar
sudo systemctl status arma-reforger-webui
```

### Windows:

```bash
# 1. Gå till projektmappen
cd C:\path\to\Arma-Reforger-Server

# 2. Spara eventuella lokala ändringar
git stash

# 3. Hämta senaste uppdateringarna
git pull origin main

# 4. Uppdatera backend dependencies
npm install

# 5. Uppdatera frontend
cd frontend
npm install
npm run build
cd ..

# 6. Starta om Web-UI
# Tryck Ctrl+C för att stoppa, sedan:
npm start
```

---

## Versionskontroll

### Kontrollera aktuell version:

**Via Web-UI:**
- Gå till Dashboard
- Se uppdateringskortet för versionsinformation

**Via terminal:**
```bash
# Se Node.js version
node --version

# Se git commit
cd /opt/Arma-reforger-server
git log -1 --oneline

# Se package.json version
cat package.json | grep version
```

---

## Felsökning

### Auto-uppdatering fungerar inte

**Problem:** "Not a git repository" fel

**Lösning:**
```bash
cd /opt/arma-reforger-manager
git init
git remote add origin https://github.com/mkungen89/Arma-reforger-server.git
git fetch
git reset --hard origin/main
```

**Problem:** Uppdateringen hänger sig

**Lösning:**
```bash
# Kolla loggar
sudo journalctl -u arma-reforger-webui -n 50

# Starta om manuellt
sudo systemctl restart arma-reforger-webui
```

**Problem:** Frontend uppdateras inte

**Lösning:**
```bash
cd /opt/arma-reforger-manager/frontend
rm -rf node_modules package-lock.json
npm install
npm run build
sudo systemctl restart arma-reforger-webui
```

---

## Node.js Version Uppgradering

Om du kör Node.js v18 och behöver uppgradera till v20:

```bash
# Ta bort gamla versionen
sudo apt remove -y nodejs

# Installera Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Verifiera version
node --version  # Ska visa v20.x.x eller högre

# Installera om dependencies
cd /opt/arma-reforger-manager
rm -rf node_modules
npm install

cd frontend
rm -rf node_modules
npm install
npm run build
cd ..

# Starta om
sudo systemctl restart arma-reforger-webui
```

---

## Vad händer vid uppdatering?

1. ✅ **Git pull** - Hämtar senaste koden från GitHub
2. ✅ **npm install** - Installerar nya/uppdaterade paket
3. ✅ **Frontend build** - Bygger om React-appen
4. ✅ **Auto-restart** - Systemd startar om tjänsten automatiskt
5. ✅ **Bevara config** - Dina konfigurationsfiler påverkas inte

**Konfigurationsfiler som bevaras:**
- `/opt/arma-reforger-manager/config/server-config.json`
- `/opt/arma-reforger-manager/config/users.json`
- Alla mod-installationer
- Serverloggar och backups

---

## Rollback (Ångra uppdatering)

Om något går fel kan du rulla tillbaka:

```bash
cd /opt/Arma-reforger-server

# Se tidigare commits
git log --oneline -10

# Rollback till specifik commit (byt COMMIT_HASH)
git reset --hard COMMIT_HASH

# Installera om dependencies
npm install
cd frontend && npm install && npm run build && cd ..

# Starta om
sudo systemctl restart arma-reforger-webui
```

---

## Notiser om Uppdateringar

Web-UI:n kontrollerar automatiskt efter uppdateringar och visar en notis i Dashboard.

**Uppdateringsfrekvens:** Vid varje Dashboard-besök

**Vad kollas:**
- Senaste commit på GitHub
- Din nuvarande commit
- Commit-meddelande och författare

---

## Best Practices

1. ✅ **Backup innan uppdatering** - Använd Backup-funktionen i Web-UI
2. ✅ **Läs changelog** - Se vad som ändrats innan uppdatering
3. ✅ **Testa i dev först** - Om du kör production
4. ✅ **Ha SSH-tillgång** - Ifall något går fel
5. ✅ **Dokumentera ändringar** - Om du gjort egna anpassningar

---

## Support

Om du får problem med uppdateringar:

1. **GitHub Issues:** https://github.com/mkungen89/Arma-reforger-server/issues
2. **Logs:** `sudo journalctl -u arma-reforger-webui -f`
3. **Discord:** (lägg till din Discord-server här)

---

**Version 3.1.0 Features:**
- ✨ Auto-update från GitHub
- 🔍 Update checker i Dashboard
- 📊 Version och commit tracking
- 🔄 En-klicks uppdatering
- 🛡️ Node.js v20 support
