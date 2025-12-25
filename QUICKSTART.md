# 🚀 QUICKSTART - Installera på 15 minuter

Komplett guide för att installera Arma Reforger Server Manager med Flute CMS på en VPS.

---

## ✅ Förberedelser (5 minuter)

### 1. VPS Requirements
- **OS:** Ubuntu 22.04 LTS (fresh installation)
- **RAM:** Minst 4GB (8GB rekommenderat)
- **Disk:** 50GB+ free space
- **Access:** Root eller sudo

### 2. Domän setup (VALFRITT)

**Har du ett domännamn?**
- ✅ Peka ditt domännamn till VPS IP-adress (A-record)
- ✅ Vänta tills DNS propagerat (test med `ping arma.example.com`)
- ✅ SSL/HTTPS kommer aktiveras automatiskt

**Har du INGET domännamn?**
- ✅ **Använd bara din VPS IP-adress!** (t.ex. `192.168.1.100`)
- ⚠️ SSL/HTTPS fungerar INTE med IP-adress (bara HTTP)
- ✅ Allt annat fungerar precis som vanligt
- 💡 **Tips:** Skaffa gratis subdomain från https://www.duckdns.org om du vill ha SSL

### 3. Hämta ditt SteamID64
1. Gå till: https://steamid.io/
2. Mata in din Steam profil-URL
3. Kopiera **steamID64** (17 siffror, börjar med 7656119...)
4. Spara detta - du behöver det snart!

### 4. Välj databas

**Alternativ 1: MariaDB (lokal, gratis, rekommenderat för de flesta)**
- Inget extra behövs - installeras automatiskt

**Alternativ 2: Supabase (cloud, managed, gratis tier)**
- Skapa konto på https://supabase.com
- Skapa nytt projekt
- Gå till: Project Settings → Database
- Kopiera: **Host**, **Database name**, **User**, **Password**
- Spara dessa credentials!

---

## 📦 Installation (10 minuter)

### Steg 1: Logga in på VPS

```bash
ssh root@your-vps-ip
# eller
ssh your-user@your-vps-ip
```

### Steg 2: Klona repository

```bash
# Installera git om det inte finns
apt update
apt install -y git

# Klona projektet
cd /tmp
git clone --recurse-submodules https://github.com/mkungen89/Arma-reforger-server.git
cd Arma-reforger-server
```

### Steg 3: Kör installern

**Alternativ A: Interaktivt (rekommenderat första gången)**

```bash
sudo bash install-ubuntu.sh
```

Installern kommer fråga:
1. **Admin SteamID64:** Klistra in ditt SteamID64
2. **Enable Nginx reverse proxy?** → `y` (yes)
3. **Panel domain:** → `arma.example.com` (ditt domännamn) ELLER `192.168.1.100` (din VPS IP)
4. **Battlelog domain (optional):** → Tryck Enter (skip, eller ange separat domän)
5. **Enable HTTPS (Let's Encrypt)?** →
   - `y` (yes) om du angav domännamn
   - `n` (no) om du angav IP-adress (SSL fungerar inte med IP)
6. **Email for Let's Encrypt:** → Din email (hoppa över om ingen SSL)
7. **Protect panel with Basic Auth?** → `y` (rekommenderat)
   - Username: `admin` (eller välj eget)
   - Password: (lämna tom för auto-genererat ELLER ange eget)
8. **Restrict panel by IP allowlist?** → `n` (no, om du inte har fast IP)
9. **Domain or IP address:** →
   - Med domän: `arma.example.com`
   - Utan domän: `192.168.1.100` (din VPS IP)
   - Installern auto-detekterar IP och stänger av SSL
10. **Flute admin email:** → Din email
11. **Database options:**
    - `1` = MariaDB (lokal, auto-installed)
    - `2` = PostgreSQL (lokal, auto-installed)
    - `3` = Supabase (cloud, managed)

**Om du väljer Supabase (alternativ 3):**
- **Supabase database host:** → `db.xxxxxxxxxxxxx.supabase.co`
- **Database port:** → `5432` (default, tryck Enter)
- **Database name:** → `postgres` (default, tryck Enter)
- **Database user:** → `postgres` (default, tryck Enter)
- **Database password:** → Klistra in ditt Supabase password

**Vänta nu ~10-15 minuter** medan installern:
- Installerar Node.js, PHP 8.2, Nginx, MariaDB/PostgreSQL (om inte Supabase)
- Laddar ner SteamCMD och Arma Reforger Server (~10-30GB)
- Installerar Flute CMS
- Konfigurerar SSL certifikat (Let's Encrypt)
- Skapar systemd services

---

**Alternativ B: Non-interaktivt (för automation)**

**Med domännamn + SSL + MariaDB:**
```bash
sudo ADMIN_STEAMID="76561198012345678" \
     FLUTE_DOMAIN="arma.example.com" \
     CERTBOT_EMAIL="admin@example.com" \
     ENABLE_SSL=1 \
     ENABLE_NGINX=1 \
     FLUTE_DB_ENGINE="mariadb" \
     bash install-ubuntu.sh
```

**Med IP-adress (ingen SSL) + MariaDB:**
```bash
sudo ADMIN_STEAMID="76561198012345678" \
     FLUTE_DOMAIN="192.168.1.100" \
     ENABLE_SSL=0 \
     ENABLE_NGINX=1 \
     FLUTE_DB_ENGINE="mariadb" \
     bash install-ubuntu.sh
```

**Med domännamn + Supabase:**
```bash
sudo ADMIN_STEAMID="76561198012345678" \
     FLUTE_DOMAIN="arma.example.com" \
     CERTBOT_EMAIL="admin@example.com" \
     ENABLE_SSL=1 \
     ENABLE_NGINX=1 \
     FLUTE_DB_ENGINE="supabase" \
     FLUTE_DB_HOST="db.xxxxxxxxxxxxx.supabase.co" \
     FLUTE_DB_PORT="5432" \
     FLUTE_DB_NAME="postgres" \
     FLUTE_DB_USER="postgres" \
     FLUTE_DB_PASS="your-supabase-password" \
     bash install-ubuntu.sh
```

**Med IP-adress + Supabase:**
```bash
sudo ADMIN_STEAMID="76561198012345678" \
     FLUTE_DOMAIN="192.168.1.100" \
     ENABLE_SSL=0 \
     ENABLE_NGINX=1 \
     FLUTE_DB_ENGINE="supabase" \
     FLUTE_DB_HOST="db.xxxxxxxxxxxxx.supabase.co" \
     FLUTE_DB_PORT="5432" \
     FLUTE_DB_NAME="postgres" \
     FLUTE_DB_USER="postgres" \
     FLUTE_DB_PASS="your-supabase-password" \
     bash install-ubuntu.sh
```

---

### Steg 4: Verifiera installation

```bash
# Kolla att backend körs
sudo systemctl status arma-reforger-backend

# Kolla att Nginx körs
sudo systemctl status nginx

# Kolla att PHP-FPM körs
sudo systemctl status php8.2-fpm

# Kolla att databas körs (om lokal)
sudo systemctl status mariadb
# eller
sudo systemctl status postgresql
```

Alla services ska visa: **`active (running)`** ✅

---

## 🌐 Flute Web Installer (första gången)

### Steg 5: Öppna webbläsaren

**Med domännamn:**
- Gå till: **`https://arma.example.com`** (om SSL aktiverat)
- Eller: **`http://arma.example.com`** (om ingen SSL)

**Med IP-adress:**
- Gå till: **`http://192.168.1.100`** (byt till din VPS IP)
- ⚠️ HTTPS fungerar INTE med IP-adress

Du kommer se Flute installeraren.

### Steg 6: Gå igenom Flute setup

**Skärm 1: Välj språk**
- Välj: **English** eller **Русский** (Flute har inte svenska än)
- Klicka: **Next**

**Skärm 2: System requirements**
- Alla checks ska vara gröna ✅
- Klicka: **Next**

**Skärm 3: Database configuration**

Hämta credentials först:
```bash
# SSH till servern och kör:
cat /opt/arma-reforger-manager/config/flute-db.json
```

Fyll i formuläret:
- **Database Type:** `MySQL` (för MariaDB) eller `PostgreSQL` (för PostgreSQL/Supabase)
- **Host:** Kopiera `"host"` från filen (t.ex. `127.0.0.1` eller `db.xxxxx.supabase.co`)
- **Port:** Kopiera `"port"` från filen (t.ex. `3306` eller `5432`)
- **Database Name:** Kopiera `"database"` från filen (t.ex. `flute` eller `postgres`)
- **Username:** Kopiera `"username"` från filen (t.ex. `flute` eller `postgres`)
- **Password:** Kopiera `"password"` från filen

Klicka: **Next**

**Skärm 4: Admin account (för Flute CMS)**

Detta är INTE samma som server manager - detta är för Flute CMS själv.

- **Email:** Din email
- **Username:** `admin` (eller välj eget)
- **Password:** Välj ett starkt lösenord
- **Confirm Password:** Samma lösenord igen

Klicka: **Next**

**Skärm 5: Site configuration**

- **Site Name:** `Arma Reforger Server` (eller välj eget namn)
- **Site URL:**
  - Med domän + SSL: `https://arma.example.com`
  - Med domän utan SSL: `http://arma.example.com`
  - Med IP-adress: `http://192.168.1.100`
  - ⚠️ VIKTIGT: Använd `http://` (inte `https://`) om du inte har SSL!
- **Site Description:** (valfritt)

Klicka: **Install**

**Vänta 30-60 sekunder** medan Flute:
- Skapar databastabeller
- Sätter upp admin-konto
- Konfigurerar CMS

När installationen är klar visas: **"Installation completed successfully!"** ✅

Klicka: **Go to site**

---

## 🎮 Logga in på Server Manager

### Steg 7: Steam authentication

1. Gå till login-sidan:
   - **Med domän:** `https://arma.example.com/arma/login` eller `http://arma.example.com/arma/login`
   - **Med IP:** `http://192.168.1.100/arma/login`
2. Du ser en sida med: **"Sign in through Steam"**
3. Klicka på knappen
4. Du redirectas till **steamcommunity.com**
5. Logga in med ditt Steam-konto
6. Klicka **"Sign In"** på Steam's authorization-sida
7. Du redirectas tillbaka till: **`/arma`** (dashboard)

**Du är nu inloggad!** 🎉

### Steg 8: Första kontrollen

På dashboard ska du se:
- ✅ Server status (Stopped / Running)
- ✅ System resources (CPU, RAM, Disk)
- ✅ Quick actions (Start Server, Stop Server, Restart, Update)

**Testa starta servern:**
1. Gå till: **Server Control** (i menyn)
2. Klicka: **Start Server**
3. Vänta 10-30 sekunder
4. Status ska ändras till: **Running** ✅

---

## 📊 Testa att allt fungerar

### Public Battlelog
1. Öppna battlelog:
   - **Med domän:** `https://arma.example.com/battlelog` eller `http://arma.example.com/battlelog`
   - **Med IP:** `http://192.168.1.100/battlelog`
2. Ingen login krävs - publik sida ✅
3. Du ska se: Overview, Leaderboard, Live Feed, Recent Matches

### Admin features
Logga in på `/arma` och testa:
- ✅ **Dashboard** - Serveröversikt
- ✅ **Server Control** - Start/Stop/Restart/Update
- ✅ **Live Players** - Spelare online (när servern körs)
- ✅ **Scheduler** - Schemalagda uppgifter
- ✅ **Backups** - Skapa backup
- ✅ **Mods** - Sök och installera mods
- ✅ **Configuration** - Serverinställningar
- ✅ **Users** - Hantera admin-användare
- ✅ **Logs** - Serverloggar

---

## 🔧 Konfiguration (valfritt)

### Lägg till Steam Web API Key (rekommenderat)

Detta krävs för Steam Workshop mods:

1. Gå till: https://steamcommunity.com/dev/apikey
2. Registrera en API key (ange din domän som `arma.example.com`)
3. Kopiera API key

```bash
# SSH till servern
ssh root@your-vps-ip

# Öppna config
nano /opt/arma-reforger-manager/config/server-config.json

# Lägg till din API key:
{
  "steamApiKey": "PASTE_YOUR_KEY_HERE",
  ...
}

# Spara: Ctrl+O, Enter, Ctrl+X

# Starta om backend
sudo systemctl restart arma-reforger-backend
```

### Ändra serverinställningar

Använd Web UI:
1. Gå till: **`https://arma.example.com/arma/config`**
2. Redigera inställningar (server name, max players, password, etc.)
3. Klicka: **Save Configuration**
4. Klicka: **Restart Server** (för att applicera ändringar)

---

## 🚨 Troubleshooting - Om något går fel

### Problem 1: "502 Bad Gateway" när jag öppnar domänen

**Orsak:** Backend körs inte eller Nginx kan inte nå den.

**Lösning:**
```bash
# Kolla backend status
sudo systemctl status arma-reforger-backend

# Om stoppad, starta:
sudo systemctl start arma-reforger-backend

# Kolla loggar för fel:
sudo journalctl -u arma-reforger-backend -n 50
```

### Problem 2: "Flute installation page is blank"

**Orsak:** PHP permissions eller cache.

**Lösning:**
```bash
# Fix permissions
sudo chown -R www-data:www-data /opt/flute/storage
sudo chown -R www-data:www-data /opt/flute/bootstrap/cache
sudo chmod -R 775 /opt/flute/storage
sudo chmod -R 775 /opt/flute/bootstrap/cache

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm
```

### Problem 3: "Module ArmaReforgerManager not found" efter Flute install

**Orsak:** Modulen kopierades inte korrekt.

**Lösning:**
```bash
# Kopiera modulen manuellt
cd /opt/arma-reforger-manager
sudo rsync -a flute-ext/app/Modules/ /opt/flute/app/Modules/

# Fix ownership
sudo chown -R www-data:www-data /opt/flute/app/Modules/

# Clear Flute cache
cd /opt/flute
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan view:clear
```

### Problem 4: "/arma routes return 404"

**Orsak:** Flute känner inte till modulens routes.

**Lösning:**
```bash
# Clear Flute cache
cd /opt/flute
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan route:clear

# Verify routes exist
sudo -u www-data php artisan route:list | grep -i arma

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm
```

### Problem 5: "Can't connect to Supabase"

**Orsak:** Fel credentials eller firewall.

**Lösning:**
```bash
# Test connection manually
export PGPASSWORD="your-supabase-password"
psql -h db.xxxxxxxxxxxxx.supabase.co -p 5432 -U postgres -d postgres -c "SELECT 1;"
unset PGPASSWORD

# Om det fungerar här men inte i Flute:
# 1. Kontrollera /opt/arma-reforger-manager/config/flute-db.json
# 2. Kontrollera /opt/flute/.env (ska ha samma credentials)
cat /opt/flute/.env | grep DB_

# Om credentials är fel i .env, uppdatera:
nano /opt/flute/.env
# Uppdatera DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
# Spara och starta om PHP-FPM:
sudo systemctl restart php8.2-fpm
```

### Problem 6: "Let's Encrypt SSL failed"

**Orsak:** Domän inte propagerad eller port 80/443 blockerad.

**Lösning:**
```bash
# Testa DNS först
ping arma.example.com
# Ska visa VPS IP-adress

# Testa port 80
curl -I http://arma.example.com
# Ska returnera HTTP response

# Om port blockerad, öppna firewall:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Försök igen med certbot:
sudo certbot --nginx -d arma.example.com
```

### Problem 7: "Can't login with Steam"

**Orsak:** SteamID inte i users.json eller session problem.

**Lösning:**
```bash
# Kontrollera att ditt SteamID finns
cat /opt/arma-reforger-manager/config/users.json

# Om det saknas, lägg till:
nano /opt/arma-reforger-manager/config/users.json

# Exempel:
{
  "users": [
    {
      "steamId": "76561198012345678",
      "displayName": "YourName",
      "role": "admin",
      "addedAt": "2025-12-25T00:00:00.000Z"
    }
  ]
}

# Spara och starta om backend:
sudo systemctl restart arma-reforger-backend
```

---

## 📚 Nästa steg

### Rekommenderade konfigurationer:

1. **Lägg till fler admin-användare**
   - Gå till: `/arma/users`
   - Klicka: **Add User**
   - Ange SteamID64, Display Name, Role

2. **Installera mods**
   - Gå till: `/arma/mods`
   - Sök efter mod (t.ex. "ACE")
   - Klicka: **Install**
   - Enable mod
   - Restart server

3. **Skapa automatiska backups**
   - Gå till: `/arma/scheduler`
   - Klicka: **Create Task**
   - Task Type: **Backup**
   - Schedule: Cron expression (t.ex. `0 4 * * *` = kl 04:00 varje dag)
   - Enable task

4. **Schemalagda restarts**
   - Gå till: `/arma/scheduler`
   - Klicka: **Create Task**
   - Task Type: **Server Restart**
   - Warning minutes: `5` (varnar spelare 5 min innan)
   - Schedule: `0 6 * * *` (kl 06:00 varje dag)
   - Enable task

---

## 🆘 Support

Om du stöter på problem:

1. **Kolla loggarna:**
   ```bash
   # Backend logs
   sudo journalctl -u arma-reforger-backend -f

   # Nginx error log
   sudo tail -f /var/log/nginx/error.log

   # Flute logs
   sudo tail -f /opt/flute/storage/logs/laravel.log
   ```

2. **Läs fullständig dokumentation:**
   - `docs/DEPLOYMENT.md` - Deployment guide
   - `docs/FLUTE.md` - Flute integration
   - `docs/TESTING.md` - Manual testing guide
   - `docs/SECURITY.md` - Security hardening

3. **GitHub Issues:**
   - https://github.com/mkungen89/Arma-reforger-server/issues

---

## ✅ Installation Checklist

Kryssa av när du gjort varje steg:

- [ ] VPS förberedd (Ubuntu 22.04, 4GB+ RAM, 50GB+ disk)
- [ ] Domän pekat till VPS IP (eller använder bara IP-adress)
- [ ] SteamID64 hämtat
- [ ] (Om Supabase) Supabase projekt skapat, credentials sparade
- [ ] Repository klonat med `--recurse-submodules`
- [ ] Installer körd (`sudo bash install-ubuntu.sh`)
- [ ] Services verifierade (backend, nginx, php-fpm, db)
- [ ] Flute web installer genomförd
- [ ] Steam login testad
- [ ] Server startad från Web UI
- [ ] Public battlelog öppnad och fungerar
- [ ] Steam Web API key tillagd (valfritt men rekommenderat)
- [ ] Backup schedule skapad (rekommenderat)

---

**Grattis! 🎉 Din Arma Reforger Server Manager är nu live!**

Servern är nu tillgänglig:
- **Public Battlelog:** `http(s)://arma.example.com/battlelog` eller `http://VPS-IP/battlelog`
- **Admin Panel:** `http(s)://arma.example.com/arma` eller `http://VPS-IP/arma`
- **Game Server:** `VPS-IP:2001` (connect via Arma Reforger)
