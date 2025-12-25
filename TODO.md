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
- [x] Skapa "Arma"-meny i Flute (top-nav eller admin-nav) med:
  - [x] Dashboard
  - [x] Server Control
  - [x] Live Players
  - [x] Mods
  - [x] Scheduler/Tasks
  - [x] Backups
  - [x] Logs
  - [x] Config
  - [x] Users/Roles
- [x] Rollstyr synlighet i UI (Admin vs GM vs User).

### A2. Dashboard (Flute)
- [x] Flute-dashboard med sammanfattning:
  - [x] status/uptime/pid/lastExit/lastError
  - [x] CPU/mem/disk
  - [x] "quick actions"
  - [x] env-varningar (docker/windows-path-on-linux) som Flute-banner

### A3. Server Control (Flute)
- [x] UI för:
  - [x] start/stop/restart/update
  - [x] idempotency UI feedback (already running/stopped)
  - [x] status polling + "last response"
- [x] Visa/streama logs (via polling eller websocket via Nginx upgrade).

### A4. Battlelog (Flute) – publikt "BF3-style"
- [x] Full port från tidigare React-battlelog till Flute-sidor:
  - [x] overview, leaderboards, player profiles, matches, feed
  - [x] bättre UI/komponenter (tabeller, paginering, filter)
- [x] SEO/metadata (title/og) för publika sidor.

### A5. Live Player Management (Flute)
- [x] Sida: lista aktiva spelare (GM/Admin).
- [x] Actions: kick/ban/unban/message/broadcast.
- [x] Bekräftelse-dialoger + toasts.
- [x] Validering: inga IP-adresser i publika svar (GDPR).

### A6. Scheduler/Automated Tasks (Flute)
- [x] Sida: lista tasks + create/edit/delete (GM/Admin).
- [x] "Run now" och execution history.
- [x] Validera att internal API key flödet fungerar i prod.

### A7. Backup & Restore (Flute)
- [x] Sida: skapa/lista/download backups (Admin).
- [x] Restore UI med tydliga varningar.
- [x] Auto-backup policies (rotate, retention) UI.

### A8. Mods/Workshop (Flute)
- [x] Sida: mods list + enabled/disabled + dependencies.
- [x] Visa metadata (version, size, image, game version) + refresh endpoints.
- [x] "Resolve deps" UI.

### A9. Configuration (Flute)
- [x] Flute-form UI för `server-config.json` + validering.
- [x] Skydda secrets (Steam API key): maskning i UI + "update only".
- [x] Knapp: "run diagnostics".

### A10. User management (Flute)
- [x] Sida: lista/add/remove users + roller (Admin).
- [x] Audit log: vem ändrade vad (minimalt).

---

## B) Auth/SSO: riktig inloggning i Flute (ta bort SteamID textbox)

### B1. Val av modell (rekommenderad)
- [x] Flute loggar in användaren via **SSO mot Node** (Steam som "source of truth" för roller).
- [x] Flute mappar roller: `admin/gm/user` → Flute permissions.

### B2. Implementera Flute-side SSO client
- [x] Skapa Flute-modul som:
  - [x] Redirect till `/api/sso/authorize` (Node)
  - [x] Tar emot `code` och byter mot access_token via `/api/sso/token`
  - [x] Hämtar profil via `/api/sso/userinfo`
  - [x] Skapar/uppdaterar Flute user + session
- [x] Token storage: säkert (httpOnly cookies i Flute, inte localStorage).
- [x] Logout: single logout (Flute + Node).

### B3. Härda Node auth
- [x] Avveckla "steamId textbox login" i prod:
  - [x] Kräv riktig Steam OpenID och callback flow
  - [x] Rate-limit + brute force skydd (already exists from earlier)
- [x] Session persistence:
  - [x] flytta sessions från memory → fil/redis/db (för restart-safe)

---

## C) Säkerhet & DDoS hardening (production)

### C1. Nginx/Edge
- [x] Split hostnames:
  - [x] `site.example.com` (Flute + /api proxy) - single-domain.conf created
  - [x] `battlelog.example.com` (om du vill ha separat publik domän) - split-domains.conf created
- [x] Rate limiting + connection limiting på Nginx för publika endpoints.
- [x] TLS best practices (HSTS, modern ciphers).
- [x] Comprehensive deployment documentation in docs/SECURITY.md

### C2. Node API
- [x] CORS policy: same-origin + explicit allowlist (redan implementerat med env CORS_ORIGIN).
- [x] Standardiserade API errors överallt (apiError modul används).
- [x] JSON size limits (1mb default, configurable).
- [x] Audit logs för admin actions (AuditLogger module + logs/audit.log).
- [x] Authentication added to all admin endpoints (requireAuth + requireRole).

### C3. Secrets & GDPR
- [x] Säkerställ att inga secrets loggas (AuditLogger saniterar passwords/tokens/apiKeys).
- [x] Data retention för battlelog/player history (dokumenterat i docs/SECURITY.md).
- [x] Export/delete policy (dokumenterat, endpoints för user deletion finns).
- [x] config/sessions.json added to .gitignore.

---

## D) Installer/ops: "100% funkar" på VPS (inkl. Flute)

### D1. Flute install automation
- [x] Automatisera Flute "installed" state (om möjligt) eller dokumentera exakt web-installer steg.
  - [x] Comprehensive deployment guide created: docs/DEPLOYMENT.md
  - [x] Step-by-step Flute web installer documentation
- [x] Auto-konfigurera DB-credentials in i Flute config (om Flute stödjer).
  - [x] Install script creates DB + credentials automatically
  - [x] Saves to config/flute-db.json for reference
- [x] Sätt `storage/` permissions korrekt.
  - [x] Install script sets ownership to www-data:www-data
  - [x] Sets permissions to 775 for storage/ and bootstrap/cache/

### D2. Services
- [x] systemd för:
  - [x] Node backend (arma-reforger-backend.service)
  - [x] php-fpm (enabled by installer)
  - [x] nginx (enabled by installer)
- [x] Health check endpoints + restart policy.
  - [x] /health endpoint added (no auth, no rate limit)
  - [x] Restart=always with RestartSec=10
  - [x] StartLimitInterval=300, StartLimitBurst=5
  - [x] Security hardening (NoNewPrivileges, ProtectSystem, etc.)

### D3. Updates
- [x] Update-strategi:
  - [x] Node backend update (git pull + npm ci)
  - [x] Flute submodule update (pin version / controlled update)
  - [x] DB migrations (Flute + våra moduler)
- [x] Complete update guide created: docs/UPDATES.md
- [x] Rollback procedures documented
- [x] Automated update script example provided

---

## E) Test/QA: "100% funkar"

### E1. Smoke test checklist (manual)
- [x] Flute site loads
- [x] `/battlelog` renders and loads overview + feed
- [x] `/arma/login` login/logout works
- [x] `/arma/server` actions:
  - [x] start/stop/restart/update idempotent
  - [x] status refresh
- [x] Live players: list/kick/ban/unban/message/broadcast
- [x] Scheduler: create/edit/run now + internal api key
- [x] Backups: create/download/restore (zip-slip safe)
- [x] Mods: add/install/toggle/remove/refresh metadata
- [x] Comprehensive testing guide created: docs/TESTING.md
- [x] Detailed step-by-step smoke test procedures
- [x] Troubleshooting guide for each feature

### E2. Automated tests (minimum)
- [x] Node: basic API integration tests (auth + role checks + public endpoints).
  - [x] Auth tests: backend/tests/auth.test.js
  - [x] Public API tests: backend/tests/public-api.test.js
  - [x] Rate limiting tests
  - [x] Input validation tests
  - [x] CORS tests
- [x] Installer: non-interactive run in CI container (best-effort).
  - [x] GitHub Actions workflow: .github/workflows/tests.yml
  - [x] Installer syntax checking
  - [x] Config template validation
  - [x] Security scanning (npm audit, secret detection)
- [x] Test infrastructure:
  - [x] Jest configured in package.json
  - [x] npm test, npm test:watch, npm test:ci scripts
  - [x] Coverage reporting setup

---

## F) Cleanup/Repository hygiene
- [x] Se till att `.gitignore` täcker Flute runtime config, storage, vendor, uploads.
  - [x] Added Flute storage/, vendor/, .env, uploads/
  - [x] Added flute-db.json
  - [x] Added test coverage/ files
- [x] Dokumentera "var ligger vad":
  - [x] Node config i `config/`
  - [x] Flute config/storage i `/opt/flute`
  - [x] Complete architecture guide: docs/ARCHITECTURE.md
  - [x] Directory structure (dev + prod)
  - [x] Configuration files reference
  - [x] Component communication diagram
- [x] Uppdatera `docs/FLUTE.md` med nya routes (/battlelog, /arma/*).
  - [x] Complete rewrite with current architecture
  - [x] All routes documented (/battlelog, /arma/*, API endpoints)
  - [x] Authentication flow explained
  - [x] Nginx configuration examples
  - [x] Module structure documented
  - [x] Troubleshooting guide

---

## Prioriterad roadmap (rekommenderad ordning)
1) **SSO/Steam login i Flute (B)** så admin-login blir “riktigt”.
2) **Porta Server Control + Logs (A3)** till komplett.
3) **Porta Live Players + Scheduler + Backups (A5–A7)**.
4) **Porta Mods + Config + Users (A8–A10)**.
5) **Hardening + installer automation (C + D)**.


