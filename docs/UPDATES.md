# Update Guide

Guide for updating the Arma Reforger Server Manager and its components.

## Table of Contents
- [Update Strategy Overview](#update-strategy-overview)
- [Pre-Update Checklist](#pre-update-checklist)
- [Updating Node Backend](#updating-node-backend)
- [Updating Flute CMS](#updating-flute-cms)
- [Database Migrations](#database-migrations)
- [Rollback Procedures](#rollback-procedures)

---

## Update Strategy Overview

The system has three main components that can be updated independently:

1. **Node Backend** (Arma Manager API)
   - Located: `/opt/arma-reforger-manager`
   - Updates via: Git pull + npm install
   - Requires: Backend restart

2. **Flute CMS** (Web UI)
   - Located: `/opt/flute` (Git submodule)
   - Updates via: Git submodule update or manual pull
   - Requires: Composer install + cache clear

3. **Arma Reforger Module** (Custom Flute module)
   - Located: `/opt/arma-reforger-manager/flute-ext` (source)
   - Deployed to: `/opt/flute/app/Modules/ArmaReforgerManager`
   - Updates via: rsync from source + cache clear

---

## Pre-Update Checklist

Before updating, **always**:

1. **Create a backup**:
```bash
# Backup the entire manager directory
sudo -u arma tar -czf /opt/backups/arma-manager-$(date +%Y%m%d-%H%M%S).tar.gz \
  /opt/arma-reforger-manager/config \
  /opt/arma-reforger-manager/logs

# Backup Flute database
sudo mysqldump -u flute -p flute > /opt/backups/flute-db-$(date +%Y%m%d-%H%M%S).sql
# OR for PostgreSQL:
sudo -u postgres pg_dump flute > /opt/backups/flute-db-$(date +%Y%m%d-%H%M%S).sql
```

2. **Check current versions**:
```bash
# Backend version
cd /opt/arma-reforger-manager
git log -1 --oneline

# Flute version
cd /opt/flute
git log -1 --oneline

# Node.js version
node --version
```

3. **Read the changelog**:
```bash
# Check what's new in the update
cd /opt/arma-reforger-manager
git fetch origin
git log HEAD..origin/main --oneline
```

4. **Schedule maintenance window**:
   - Updates may cause brief downtime (1-5 minutes)
   - Notify users if server will be offline
   - Choose low-traffic time

---

## Updating Node Backend

### Standard Update (Minor/Patch Versions)

```bash
# 1. Navigate to manager directory
cd /opt/arma-reforger-manager

# 2. Pull latest code
sudo -u arma git pull origin main

# 3. Install/update dependencies
sudo -u arma npm ci

# 4. Restart the backend service
sudo systemctl restart arma-reforger-backend

# 5. Verify it's running
sudo systemctl status arma-reforger-backend

# 6. Check logs for errors
sudo journalctl -u arma-reforger-backend -n 50 -f
```

### Major Version Update (Breaking Changes)

For major version upgrades (e.g., v3.x to v4.x):

```bash
# 1. Read the migration guide
cd /opt/arma-reforger-manager
cat docs/MIGRATION-v4.md  # (example)

# 2. Stop the backend
sudo systemctl stop arma-reforger-backend

# 3. Backup config files
sudo cp -r /opt/arma-reforger-manager/config /opt/backups/config-$(date +%Y%m%d)

# 4. Pull and update
sudo -u arma git pull origin main
sudo -u arma npm ci

# 5. Run migration scripts (if any)
sudo -u arma node backend/migrate.js  # (example, if provided)

# 6. Update config files (manual review)
# Compare old config with new schema
diff /opt/backups/config-$(date +%Y%m%d)/server-config.json config/server-config.json.example

# 7. Restart backend
sudo systemctl start arma-reforger-backend

# 8. Verify
sudo journalctl -u arma-reforger-backend -n 100
```

### Environment Variable Changes

If the update adds new environment variables:

```bash
# 1. Edit systemd service
sudo nano /etc/systemd/system/arma-reforger-backend.service

# 2. Add new environment variables under [Service]
# Example:
# Environment=NEW_FEATURE_FLAG=1

# 3. Reload systemd
sudo systemctl daemon-reload

# 4. Restart service
sudo systemctl restart arma-reforger-backend
```

---

## Updating Flute CMS

Flute is included as a Git submodule. We recommend **pinning to a specific version** rather than always using latest.

### Check Current Flute Version

```bash
cd /opt/arma-reforger-manager
git submodule status
# Output shows commit hash and version
```

### Update to Specific Flute Version (Recommended)

```bash
# 1. Navigate to manager repo
cd /opt/arma-reforger-manager

# 2. Update submodule to specific tag/version
cd flute
sudo -u arma git fetch --tags
sudo -u arma git checkout v1.2.3  # Replace with desired version

# 3. Return to parent repo
cd ..
sudo -u arma git add flute
sudo -u arma git commit -m "Update Flute to v1.2.3"

# 4. Deploy to production location
sudo rsync -a --delete flute/ /opt/flute/

# 5. Update dependencies
cd /opt/flute
sudo -u www-data composer install --no-dev --optimize-autoloader

# 6. Run Flute migrations (if needed)
sudo -u www-data php artisan migrate --force

# 7. Clear cache
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan view:clear
sudo -u www-data php artisan route:clear

# 8. Verify permissions
sudo chown -R www-data:www-data /opt/flute/storage
sudo chmod -R 775 /opt/flute/storage
```

### Update to Latest Flute (Use with Caution)

```bash
# 1. Navigate to Flute submodule
cd /opt/arma-reforger-manager/flute

# 2. Pull latest
sudo -u arma git fetch origin
sudo -u arma git checkout main
sudo -u arma git pull origin main

# 3. Follow steps 3-8 from above
```

### Update Arma Reforger Flute Module

The custom Arma Reforger module lives in the main repo at `flute-ext/`:

```bash
# 1. Pull latest manager code
cd /opt/arma-reforger-manager
sudo -u arma git pull origin main

# 2. Deploy module to Flute
sudo rsync -a flute-ext/app/Modules/ /opt/flute/app/Modules/

# 3. Clear Flute cache
cd /opt/flute
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan view:clear

# 4. No restart needed (Flute PHP-FPM auto-reloads)
```

---

## Database Migrations

### Flute CMS Database Migrations

Flute uses Laravel migrations. Run after Flute updates:

```bash
cd /opt/flute

# 1. Check migration status
sudo -u www-data php artisan migrate:status

# 2. Run pending migrations
sudo -u www-data php artisan migrate --force

# 3. If migration fails, rollback
sudo -u www-data php artisan migrate:rollback
```

### Custom Module Migrations

If the Arma Reforger module adds database tables/columns:

```bash
cd /opt/flute

# 1. Run module-specific migrations (if provided)
sudo -u www-data php artisan migrate --path=/app/Modules/ArmaReforgerManager/Database/Migrations --force

# 2. Verify tables exist
mysql -u flute -p flute -e "SHOW TABLES LIKE 'arma_%';"
```

### Manual Database Updates

If manual SQL is required (rare):

```bash
# 1. Read the migration SQL file
cat /opt/arma-reforger-manager/docs/migrations/2025-01-add-feature.sql

# 2. Backup database first
sudo mysqldump -u flute -p flute > /opt/backups/pre-migration-$(date +%Y%m%d).sql

# 3. Apply migration
mysql -u flute -p flute < /opt/arma-reforger-manager/docs/migrations/2025-01-add-feature.sql

# 4. Verify
mysql -u flute -p flute -e "DESCRIBE new_table;"
```

---

## Rollback Procedures

If an update causes issues:

### Rollback Node Backend

```bash
# 1. Stop backend
sudo systemctl stop arma-reforger-backend

# 2. Revert to previous version
cd /opt/arma-reforger-manager
sudo -u arma git log --oneline -10  # Find previous commit
sudo -u arma git reset --hard <previous-commit-hash>

# 3. Reinstall old dependencies
sudo -u arma npm ci

# 4. Start backend
sudo systemctl start arma-reforger-backend
```

### Rollback Flute CMS

```bash
# 1. Revert Flute submodule
cd /opt/arma-reforger-manager/flute
sudo -u arma git checkout <previous-version-tag>

# 2. Deploy old version
cd ..
sudo rsync -a --delete flute/ /opt/flute/

# 3. Rollback database migrations
cd /opt/flute
sudo -u www-data php artisan migrate:rollback

# 4. Clear cache
sudo -u www-data php artisan cache:clear
```

### Rollback Database

```bash
# Restore from backup
mysql -u flute -p flute < /opt/backups/flute-db-YYYYMMDD-HHMMSS.sql

# OR for PostgreSQL
sudo -u postgres psql flute < /opt/backups/flute-db-YYYYMMDD-HHMMSS.sql
```

---

## Automated Update Script

For convenience, create an update script:

```bash
#!/bin/bash
# /opt/scripts/update-arma-manager.sh

set -e

echo "=== Arma Reforger Manager Update Script ==="
echo ""

# Backup
echo "[1/5] Creating backup..."
sudo -u arma tar -czf /opt/backups/arma-manager-$(date +%Y%m%d-%H%M%S).tar.gz \
  /opt/arma-reforger-manager/config \
  /opt/arma-reforger-manager/logs
echo "Backup created"

# Update Node backend
echo ""
echo "[2/5] Updating Node backend..."
cd /opt/arma-reforger-manager
sudo -u arma git pull origin main
sudo -u arma npm ci

# Update Flute module
echo ""
echo "[3/5] Updating Arma Reforger Flute module..."
sudo rsync -a flute-ext/app/Modules/ /opt/flute/app/Modules/

# Clear Flute cache
echo ""
echo "[4/5] Clearing Flute cache..."
cd /opt/flute
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan view:clear

# Restart backend
echo ""
echo "[5/5] Restarting backend service..."
sudo systemctl restart arma-reforger-backend

echo ""
echo "=== Update Complete ==="
echo "Check logs: sudo journalctl -u arma-reforger-backend -f"
```

Make it executable:
```bash
sudo chmod +x /opt/scripts/update-arma-manager.sh
```

Run updates:
```bash
sudo /opt/scripts/update-arma-manager.sh
```

---

## Update Notifications

### Enable Update Notifications (Optional)

Create a systemd timer to check for updates:

```bash
# /etc/systemd/system/arma-update-check.service
[Unit]
Description=Check for Arma Manager Updates

[Service]
Type=oneshot
User=arma
WorkingDirectory=/opt/arma-reforger-manager
ExecStart=/usr/bin/bash -c 'git fetch origin && git log HEAD..origin/main --oneline | head -5'
StandardOutput=journal
```

```bash
# /etc/systemd/system/arma-update-check.timer
[Unit]
Description=Check for Arma Manager Updates Daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:
```bash
sudo systemctl enable arma-update-check.timer
sudo systemctl start arma-update-check.timer
```

---

## Version Pinning Best Practices

### Node Dependencies

Use `npm ci` instead of `npm install` to ensure reproducible builds:
- `npm ci` uses exact versions from `package-lock.json`
- `npm install` may install newer patch versions

### Flute CMS

**Recommended approach**:
1. Pin to specific Flute release tags (e.g., `v1.2.3`)
2. Test updates in staging environment first
3. Only update production after validation

**Not recommended**:
- Using `main` branch in production (untested, may break)
- Auto-updating on every commit

### Database Backups Before Migrations

Always backup before running migrations:
```bash
# Automate with this one-liner
sudo mysqldump -u flute -p flute > /opt/backups/pre-migrate-$(date +%Y%m%d-%H%M%S).sql && \
sudo -u www-data php artisan migrate --force
```

---

## Troubleshooting Updates

### Backend won't start after update

```bash
# Check logs
sudo journalctl -u arma-reforger-backend -n 100

# Common fixes:
# 1. Missing dependencies
cd /opt/arma-reforger-manager
sudo -u arma npm ci

# 2. Config file format changed
diff config/server-config.json config/server-config.json.example

# 3. Permissions issue
sudo chown -R arma:arma /opt/arma-reforger-manager
```

### Flute shows errors after update

```bash
# Clear all caches
cd /opt/flute
sudo -u www-data php artisan optimize:clear

# Check permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

# Check logs
sudo tail -f storage/logs/laravel.log
```

### Database migration failed

```bash
# Rollback the failed migration
cd /opt/flute
sudo -u www-data php artisan migrate:rollback

# Check migration file for errors
cat database/migrations/2025_01_01_000000_example.php

# Try again or restore from backup
mysql -u flute -p flute < /opt/backups/pre-migrate-YYYYMMDD-HHMMSS.sql
```

---

## Update Schedule Recommendations

**Security updates**: Apply immediately
**Feature updates**: Test in staging, deploy within 1 week
**Flute core updates**: Test thoroughly, deploy monthly
**Node backend**: Deploy weekly (if active development)
**Arma module**: Deploy as needed with feature releases

---

## Further Reading

- [Deployment Guide](./DEPLOYMENT.md) - Initial deployment procedures
- [Security Guide](./SECURITY.md) - Security hardening
- [Flute Documentation](https://docs.flute-cms.com/) - Flute CMS guides
