# Flute CMS integration (Battlelog module + SSO)

Flute CMS is a separate PHP-based CMS (GPL-3.0) with its own database and runtime.
Repo: `https://github.com/Flute-CMS/cms.git`
Website: `https://flute-cms.com/en`

This project (Arma Reforger Server Manager) is MIT-licensed. **Do not vendor Flute CMS code into this repository** unless you understand GPL implications. Prefer running Flute side-by-side and integrating via HTTP APIs + SSO.

## Option B: Flute module (Battlelog)

Our Battlelog read endpoints are public:
- `GET /api/battlelog/overview`
- `GET /api/battlelog/feed?limit=...`
- `GET /api/battlelog/matches?limit=...`
- `GET /api/battlelog/leaderboard?sortBy=score&limit=...`

Recommended approach for Flute:
- Fetch these endpoints **server-side** from PHP (no browser CORS needed).
- Cache responses in Flute (e.g., 15–60s TTL) to avoid hammering the API.

## Option C: SSO (Panel → Flute)

We implement a simple OAuth-like flow:

1) User logs into **Panel** (Steam).
2) Flute redirects user to:
   - `GET https://panel.example.com/api/sso/authorize?client_id=flute&redirect_uri=https://site.example.com/sso/callback&state=...`
3) Panel redirects back to Flute with `?code=...&state=...`
4) Flute exchanges code for token:
   - `POST https://panel.example.com/api/sso/token`
   - Body: `{ "client_id": "...", "client_secret": "...", "code": "..." }`
5) Flute can validate/get profile:
   - `GET https://panel.example.com/api/sso/userinfo` with `Authorization: Bearer <accessToken>`

### What user data is shared (GDPR-minimal)

Only:
- `steamId`
- `displayName`
- `avatarUrl`
- `role`

No IP addresses, no logs, no config.

## Server configuration (Panel)

Create `config/sso-clients.json` (NOT committed) based on `config.example/sso-clients.json`.

Set environment variables:
- `SSO_JWT_SECRET` (required): long random secret used to sign tokens
- Optional: `SSO_CLIENTS_JSON` (JSON string), if you prefer env-only config instead of a file.

## Nginx setup (recommended)

Run everything with separate hostnames:
- `site.example.com` → Flute
- `battlelog.example.com` → public battlelog (our app)
- `panel.example.com` → private panel (our app, protected)


