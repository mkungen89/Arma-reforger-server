# TODO – Flute-only Arma Reforger Server Manager (Master Plan)

Detta dokument är en komplett “att göra”-lista för att gå från nuvarande läge (**Flute-only UI start** + första sidor) till en **färdig** lösning där Flute är enda UI, Battlelog är publik, och admin-panelen är säker och komplett.

---

## Status idag (done)
- [x] Projektet relicensat till GPL-3.0-or-later (för kompatibilitet med Flute).
- [x] Flute CMS ligger som submodule i `flute/`.
- [x] React UI borttaget ur repot.
- [x] Node backend kör API/engine-only (serverar inte SPA).
- [x] Installer kan sätta upp PHP 8.2+, Composer, DB (MariaDB default / PostgreSQL), Nginx och proxy `/api/*`.
- [x] Flute-modul start i `flute-ext/` + sidor:
  - [x] `/battlelog` (publik)
  - [x] `/arma/login` (token-login mot Node)
  - [x] `/arma/server` (start/stop/restart/update)

---

## A) Flute-modul: full feature parity med gamla panelen

### A1. Navigation + IA (meny/struktur)
- [ ] Skapa “Arma”-meny i Flute (top-nav eller admin-nav) med:
  - [ ] Dashboard
  - [ ] Server Control
  - [ ] Live Players
  - [ ] Mods
  - [ ] Scheduler/Tasks
  - [ ] Backups
  - [ ] Logs
  - [ ] Config
  - [ ] Users/Roles
- [ ] Rollstyr synlighet i UI (Admin vs GM vs User).

### A2. Dashboard (Flute)
- [ ] Flute-dashboard med sammanfattning:
  - [ ] status/uptime/pid/lastExit/lastError
  - [ ] CPU/mem/disk
  - [ ] “quick actions”
  - [ ] env-varningar (docker/windows-path-on-linux) som Flute-banner

### A3. Server Control (Flute)
- [ ] UI för:
  - [ ] start/stop/restart/update
  - [ ] idempotency UI feedback (already running/stopped)
  - [ ] status polling + “last response”
- [ ] Visa/streama logs (via polling eller websocket via Nginx upgrade).

### A4. Battlelog (Flute) – publikt “BF3-style”
- [ ] Full port från tidigare React-battlelog till Flute-sidor:
  - [ ] overview, leaderboards, player profiles, matches, feed
  - [ ] bättre UI/komponenter (tabeller, paginering, filter)
- [ ] SEO/metadata (title/og) för publika sidor.

### A5. Live Player Management (Flute)
- [ ] Sida: lista aktiva spelare (GM/Admin).
- [ ] Actions: kick/ban/unban/message/broadcast.
- [ ] Bekräftelse-dialoger + toasts.
- [ ] Validering: inga IP-adresser i publika svar (GDPR).

### A6. Scheduler/Automated Tasks (Flute)
- [ ] Sida: lista tasks + create/edit/delete (GM/Admin).
- [ ] “Run now” och execution history.
- [ ] Validera att internal API key flödet fungerar i prod.

### A7. Backup & Restore (Flute)
- [ ] Sida: skapa/lista/download backups (Admin).
- [ ] Restore UI med tydliga varningar.
- [ ] Auto-backup policies (rotate, retention) UI.

### A8. Mods/Workshop (Flute)
- [ ] Sida: mods list + enabled/disabled + dependencies.
- [ ] Visa metadata (version, size, image, game version) + refresh endpoints.
- [ ] “Resolve deps” UI.

### A9. Configuration (Flute)
- [ ] Flute-form UI för `server-config.json` + validering.
- [ ] Skydda secrets (Steam API key): maskning i UI + “update only”.
- [ ] Knapp: “run diagnostics”.

### A10. User management (Flute)
- [ ] Sida: lista/add/remove users + roller (Admin).
- [ ] Audit log: vem ändrade vad (minimalt).

---

## B) Auth/SSO: riktig inloggning i Flute (ta bort SteamID textbox)

### B1. Val av modell (rekommenderad)
- [ ] Flute loggar in användaren via **SSO mot Node** (Steam som “source of truth” för roller).
- [ ] Flute mappar roller: `admin/gm/user` → Flute permissions.

### B2. Implementera Flute-side SSO client
- [ ] Skapa Flute-modul som:
  - [ ] Redirect till `/api/sso/authorize` (Node)
  - [ ] Tar emot `code` och byter mot access_token via `/api/sso/token`
  - [ ] Hämtar profil via `/api/sso/userinfo`
  - [ ] Skapar/uppdaterar Flute user + session
- [ ] Token storage: säkert (httpOnly cookies i Flute, inte localStorage).
- [ ] Logout: single logout (Flute + Node).

### B3. Härda Node auth
- [ ] Avveckla “steamId textbox login” i prod:
  - [ ] Kräv riktig Steam OpenID och callback flow
  - [ ] Rate-limit + brute force skydd
- [ ] Session persistence:
  - [ ] flytta sessions från memory → fil/redis/db (för restart-safe)

---

## C) Säkerhet & DDoS hardening (production)

### C1. Nginx/Edge
- [ ] Split hostnames:
  - [ ] `site.example.com` (Flute + /api proxy)
  - [ ] ev. `battlelog.example.com` (om du vill ha separat publik domän)
- [ ] Rate limiting + connection limiting på Nginx för publika endpoints.
- [ ] TLS best practices (HSTS, modern ciphers).

### C2. Node API
- [ ] CORS policy: same-origin + explicit allowlist (redan påbörjat).
- [ ] Standardiserade API errors överallt (redan påbörjat – säkerställ full coverage).
- [ ] JSON size limits (redan).
- [ ] Audit logs för admin actions (minimalt, GDPR-safe).

### C3. Secrets & GDPR
- [ ] Säkerställ att inga secrets loggas (internal API key, tokens).
- [ ] Data retention för battlelog/player history.
- [ ] Export/delete policy (om ni behöver).

---

## D) Installer/ops: “100% funkar” på VPS (inkl. Flute)

### D1. Flute install automation
- [ ] Automatisera Flute “installed” state (om möjligt) eller dokumentera exakt web-installer steg.
- [ ] Auto-konfigurera DB-credentials in i Flute config (om Flute stödjer).
- [ ] Sätt `storage/` permissions korrekt.

### D2. Services
- [ ] systemd för:
  - [ ] Node backend
  - [ ] php-fpm
  - [ ] nginx
- [ ] Health check endpoints + restart policy.

### D3. Updates
- [ ] Update-strategi:
  - [ ] Node backend update (git pull + npm ci)
  - [ ] Flute submodule update (pin version / controlled update)
  - [ ] DB migrations (Flute + våra moduler)

---

## E) Test/QA: “100% funkar”

### E1. Smoke test checklist (manual)
- [ ] Flute site loads
- [ ] `/battlelog` renders and loads overview + feed
- [ ] `/arma/login` login/logout works
- [ ] `/arma/server` actions:
  - [ ] start/stop/restart/update idempotent
  - [ ] status refresh
- [ ] Live players: list/kick/ban/unban/message/broadcast
- [ ] Scheduler: create/edit/run now + internal api key
- [ ] Backups: create/download/restore (zip-slip safe)
- [ ] Mods: add/install/toggle/remove/refresh metadata

### E2. Automated tests (minimum)
- [ ] Node: basic API integration tests (auth + role checks + public endpoints).
- [ ] Installer: non-interactive run in CI container (best-effort).

---

## F) Cleanup/Repository hygiene
- [ ] Se till att `.gitignore` täcker Flute runtime config, storage, vendor, uploads.
- [ ] Dokumentera “var ligger vad”:
  - [ ] Node config i `config/`
  - [ ] Flute config/storage i `/opt/flute`
- [ ] Uppdatera `docs/FLUTE.md` med nya routes (/battlelog, /arma/*).

---

## Prioriterad roadmap (rekommenderad ordning)
1) **SSO/Steam login i Flute (B)** så admin-login blir “riktigt”.
2) **Porta Server Control + Logs (A3)** till komplett.
3) **Porta Live Players + Scheduler + Backups (A5–A7)**.
4) **Porta Mods + Config + Users (A8–A10)**.
5) **Hardening + installer automation (C + D)**.


