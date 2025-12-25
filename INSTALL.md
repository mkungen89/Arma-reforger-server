# Installationsguide (Flute-only UI) – Arma Reforger Server Manager

Det här projektet kör **Node backend (API/engine)** för server-control + SteamCMD + scheduler/backups, och **Flute CMS (PHP)** som **enda UI**.

## Ubuntu VPS (rekommenderat)

```bash
git clone https://github.com/mkungen89/Arma-reforger-server.git
cd Arma-reforger-server
sudo bash install-ubuntu.sh
```

Installern:
- Installerar Node backend (systemd service)
- Installerar SteamCMD + Arma Reforger server-filer
- Installerar Flute CMS + PHP 8.2+ + Composer
- Installerar DB (MariaDB default eller PostgreSQL) och skapar DB/user/password
- Sätter upp Nginx (och valfri SSL)

Efter installation:
- Öppna Flute: `http(s)://<din-flute-domän>/`
- Node API nås via samma host: `http(s)://<din-flute-domän>/api/*`
- Arma-sida (Flute-modul): `http(s)://<din-flute-domän>/arma`

## Docker Desktop (endast API/engine)

Docker-läget kör bara Node backend (ingen Flute/PHP):

```bash
docker compose up --build
```

Öppna API: `http://localhost:3001/api`

## Flute integration

Se även:
- `docs/FLUTE.md`


