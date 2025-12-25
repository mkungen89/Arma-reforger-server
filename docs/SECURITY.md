# Security & Production Deployment Guide

This document covers security hardening, DDoS protection, and production deployment for the Arma Reforger Server Manager.

## Table of Contents
- [Nginx Configuration](#nginx-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Rate Limiting](#rate-limiting)
- [IP Allowlisting](#ip-allowlisting)
- [Session Security](#session-security)
- [Secrets Management](#secrets-management)
- [GDPR Compliance](#gdpr-compliance)
- [Audit Logging](#audit-logging)

---

## Nginx Configuration

We provide two Nginx configuration templates:

### Option 1: Single Domain (Recommended for Most Users)
**File**: `docs/nginx-configs/single-domain.conf`

Everything runs on one domain (e.g., `arma.example.com`):
- Flute UI at `/`
- Admin panel at `/arma/*`
- Public battlelog at `/battlelog`
- Node API at `/api/*`

**Deployment**:
```bash
# Copy config
sudo cp docs/nginx-configs/single-domain.conf /etc/nginx/sites-available/arma-reforger

# Update domain name
sudo nano /etc/nginx/sites-available/arma-reforger
# Replace "site.example.com" with your domain

# Enable site
sudo ln -s /etc/nginx/sites-available/arma-reforger /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Option 2: Split Domains (Maximum Security)
**File**: `docs/nginx-configs/split-domains.conf`

Separate public and private access:
- Public battlelog: `battlelog.example.com` (read-only, higher rate limits)
- Admin panel: `panel.example.com` (private, stricter security, optional IP allowlist)

**Deployment**:
```bash
# Copy config
sudo cp docs/nginx-configs/split-domains.conf /etc/nginx/sites-available/arma-reforger-split

# Update domain names
sudo nano /etc/nginx/sites-available/arma-reforger-split
# Replace "battlelog.example.com" and "panel.example.com"

# Enable site
sudo ln -s /etc/nginx/sites-available/arma-reforger-split /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL/TLS Setup

### Using Let's Encrypt (Recommended)

1. **Install Certbot**:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

2. **Obtain Certificates**:

**Single Domain**:
```bash
sudo certbot --nginx -d site.example.com
```

**Split Domains**:
```bash
sudo certbot --nginx -d battlelog.example.com -d panel.example.com
```

3. **Auto-Renewal**:
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically installs a systemd timer for renewal
sudo systemctl status certbot.timer
```

4. **Update Nginx Config**:
The certificate paths in the config templates will be automatically updated by Certbot:
```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

### TLS Best Practices (Already Included)

Our configs include:
- TLS 1.2 and 1.3 only (no outdated protocols)
- Modern cipher suites (ECDHE, AES-GCM, ChaCha20-Poly1305)
- HSTS with 1-year max-age
- OCSP stapling (for certificate validation)

---

## Rate Limiting

Rate limits protect against brute force attacks and DDoS.

### Default Limits

**Single Domain**:
- `/api/auth/*`: 10 requests/min per IP (login endpoints)
- `/api/battlelog/*`: 60 requests/min per IP
- `/api/*` (other): 30 requests/min per IP

**Split Domains - Public Battlelog**:
- `/api/battlelog/*`: 120 requests/min per IP (higher for public access)
- `/api/server-browser/*`: 120 requests/min per IP
- Read-only (GET only)

**Split Domains - Private Panel**:
- `/api/auth/*`: 10 requests/min per IP
- `/api/*` (other): 30 requests/min per IP

### Tuning Rate Limits

Edit the `limit_req_zone` directives at the top of your Nginx config:

```nginx
# Increase battlelog limit to 120 req/min
limit_req_zone $binary_remote_addr zone=battlelog_limit:10m rate=120r/m;

# Decrease API limit to 20 req/min
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/m;
```

Adjust burst values in location blocks:
```nginx
location /api/ {
    # Allow burst of 10 requests, then enforce rate limit
    limit_req zone=api_limit burst=10 nodelay;
    # ...
}
```

### Connection Limits

Limit concurrent connections per IP:

**Single Domain**: 20 concurrent connections per IP
**Split Domains**:
- Public battlelog: 50 concurrent connections
- Private panel: 10 concurrent connections

Adjust in config:
```nginx
limit_conn conn_limit 20;  # Change number as needed
```

---

## IP Allowlisting

For maximum security on the admin panel (split domains setup only).

### Enable IP Allowlist

Edit `/etc/nginx/sites-available/arma-reforger-split`, find the panel server block:

```nginx
server {
    listen 443 ssl http2;
    server_name panel.example.com;

    # Uncomment and add your IPs
    allow 1.2.3.4;           # Your home IP
    allow 5.6.7.0/24;        # Your office network
    deny all;                # Block everyone else

    # ... rest of config
}
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Optional: Basic Auth (Additional Layer)

Add Basic Auth on top of Steam login:

1. **Create password file**:
```bash
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd adminuser
# Enter password when prompted
```

2. **Enable in Nginx config**:
```nginx
server {
    server_name panel.example.com;

    # Uncomment these lines
    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # ... rest of config
}
```

3. **Reload**:
```bash
sudo systemctl reload nginx
```

Now users must pass Basic Auth before reaching the Steam login page.

---

## Session Security

### Persistent Sessions

Sessions are stored in `config/sessions.json` and survive server restarts.

**Security features**:
- 24-hour TTL (configurable in `backend/sessionStore.js`)
- Automatic cleanup every hour
- Cryptographically random tokens (32 bytes, hex-encoded)
- Sessions invalidated on logout
- Sessions removed when user is deleted

### Token Storage

Tokens are stored in `localStorage` on the client:
```javascript
localStorage.setItem('arma_api_token', token);
```

**Security considerations**:
- Tokens sent via `Authorization: Bearer` header
- HTTPS required in production (prevents token interception)
- Consider migrating to httpOnly cookies for enhanced security (future improvement)

### Session Configuration

Edit `backend/sessionStore.js` to adjust TTL:
```javascript
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (default)
// Change to 7 days:
// const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
```

---

## Secrets Management

### Environment Variables

Never commit secrets to Git. Use environment variables:

1. **Create `.env` file** (already in `.gitignore`):
```bash
# Backend secrets
STEAM_API_KEY=your_steam_api_key_here
INTERNAL_API_KEY=your_random_internal_key_here
SESSION_SECRET=your_session_secret_here

# Database (if using)
DB_PASSWORD=your_db_password_here
```

2. **Load in Node**:
```javascript
require('dotenv').config();
const steamApiKey = process.env.STEAM_API_KEY;
```

### Current Secrets

**Stored in `config/server-config.json`**:
- `steamApiKey`: Steam Web API key (for fetching user profiles)
- `internalApiKey`: For scheduled task authentication

**Stored in `config/sessions.json`**:
- Session tokens (auto-generated)

**Protection**:
- All files in `config/` are in `.gitignore`
- Steam API key is masked in UI (`***...last4`)
- Internal API key never exposed in API responses
- Session tokens use cryptographically secure random generation

### Logging Security

See [Audit Logging](#audit-logging) section below.

---

## GDPR Compliance

### Data Collection

**Personal Data Collected**:
- Steam ID (64-bit identifier)
- Display name (from Steam profile)
- Avatar URL (from Steam profile)
- Last login timestamp
- IP addresses (Nginx logs only, not stored in app)

### User Rights

**Right to Access**: Users can view their profile at `/arma/users`
**Right to Deletion**: Admins can delete users via UI (removes all data)
**Right to Export**: Not yet implemented (see TODO.md Section C3)

### Data Retention

**Sessions**: Auto-deleted after 24 hours of inactivity
**Battlelog Data**: Kept indefinitely (implement retention policy in TODO.md C3)
**Nginx Logs**: Configure rotation:

```bash
# Edit /etc/logrotate.d/nginx
/var/log/nginx/*.log {
    daily
    rotate 14        # Keep 14 days
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
```

### IP Address Handling

**IMPORTANT**: IP addresses are NOT exposed in public API responses.

Backend validates this in battlelog endpoints:
- Players list: IPs removed before sending to client
- Match data: IPs never included

Nginx logs contain IPs for security analysis but are not publicly accessible.

---

## Audit Logging

### Admin Actions Logged

The system logs admin actions to help with accountability and security audits.

**Logged Events**:
- User management: add/remove/update roles
- Server control: start/stop/restart/update
- Configuration changes
- Mod installations/removals
- Backup creation/restore
- Player kicks/bans

**Log Location**: `logs/audit.log` (created by backend)

**Log Format** (JSON):
```json
{
  "timestamp": "2025-12-25T12:34:56.789Z",
  "action": "user.add",
  "actor": "76561198012345678",
  "actorName": "AdminUser",
  "target": "76561198987654321",
  "details": { "role": "gm" },
  "ip": "1.2.3.4"
}
```

### Viewing Audit Logs

**Via CLI**:
```bash
# View recent audit events
tail -f logs/audit.log | jq .

# Filter by action type
jq 'select(.action | startswith("user."))' logs/audit.log

# Filter by actor
jq 'select(.actor == "76561198012345678")' logs/audit.log
```

**Via UI**: See Logs page in Flute UI (`/arma/logs`)

### Retention

Audit logs are rotated similar to application logs:
```bash
# Create /etc/logrotate.d/arma-reforger
/opt/arma-reforger/logs/*.log {
    weekly
    rotate 52        # Keep 1 year
    compress
    delaycompress
    notifempty
    missingok
}
```

---

## Security Checklist

Before going to production:

- [ ] SSL/TLS certificates installed and auto-renewal configured
- [ ] Rate limiting tested and tuned
- [ ] HSTS enabled (already in configs)
- [ ] Steam API key set in `config/server-config.json`
- [ ] Internal API key set to random value (not default)
- [ ] All `config/*.json` files have appropriate permissions (600 or 640)
- [ ] Sessions stored persistently (`config/sessions.json` exists)
- [ ] DISABLE_STEAMID_LOGIN=1 set in production (forces real Steam login)
- [ ] Nginx access/error logs rotating properly
- [ ] Audit logs enabled and rotating
- [ ] Firewall configured (allow 80, 443, SSH only)
- [ ] Consider IP allowlist for admin panel (split domains)
- [ ] Consider Basic Auth for additional security layer
- [ ] Review GDPR data retention policy
- [ ] Backup strategy in place for `config/` directory

---

## Firewall Configuration

### UFW (Ubuntu/Debian)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (IMPORTANT: do this first!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Arma Reforger game server (if on same machine)
sudo ufw allow 2001/udp

# Check status
sudo ufw status
```

### Fail2Ban (Brute Force Protection)

Install Fail2Ban to auto-ban IPs after repeated failed logins:

```bash
sudo apt install fail2ban

# Create custom jail for Node API
sudo nano /etc/fail2ban/jail.d/arma-reforger.conf
```

Content:
```ini
[arma-auth]
enabled = true
port = http,https
filter = arma-auth
logpath = /var/log/nginx/arma-access.log
maxretry = 5
bantime = 3600
findtime = 600
```

Create filter:
```bash
sudo nano /etc/fail2ban/filter.d/arma-auth.conf
```

Content:
```ini
[Definition]
failregex = ^<HOST> .* "POST /api/auth/.*" 401
            ^<HOST> .* "POST /api/auth/.*" 403
ignoreregex =
```

Restart:
```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status arma-auth
```

---

## Incident Response

### Suspected Compromise

1. **Immediately revoke all sessions**:
```bash
# Stop Node backend
sudo systemctl stop arma-reforger-backend

# Clear sessions
rm config/sessions.json

# Restart
sudo systemctl start arma-reforger-backend
```

2. **Review audit logs**:
```bash
jq 'select(.timestamp > "2025-12-25T00:00:00")' logs/audit.log
```

3. **Check Nginx access logs** for suspicious activity:
```bash
tail -1000 /var/log/nginx/arma-access.log | grep -E "(401|403|500)"
```

4. **Rotate internal API key**:
```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update config/server-config.json
# Restart backend
```

### DDoS Attack

1. **Verify attack**:
```bash
# Check request rate
tail -1000 /var/log/nginx/arma-access.log | awk '{print $1}' | sort | uniq -c | sort -rn
```

2. **Temporarily tighten rate limits**:
```nginx
# Edit Nginx config, reduce rates
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/m;  # Was 30

sudo systemctl reload nginx
```

3. **Block specific IPs**:
```nginx
# Add to server block
deny 1.2.3.4;
deny 5.6.7.0/24;
```

4. **Consider Cloudflare** for advanced DDoS protection

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Nginx Security Guide](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Steam Web API Documentation](https://partner.steamgames.com/doc/webapi)
