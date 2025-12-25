const fs = require('fs');
const path = require('path');

const AUDIT_LOG_DIR = path.join(__dirname, '../logs');
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, 'audit.log');

// Ensure logs directory exists
if (!fs.existsSync(AUDIT_LOG_DIR)) {
    fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
}

/**
 * Audit logger for admin actions
 * Logs to logs/audit.log in JSON format
 */
class AuditLogger {
    /**
     * Log an audit event
     * @param {Object} event - Audit event
     * @param {string} event.action - Action type (e.g., 'user.add', 'server.start')
     * @param {Object} event.actor - User who performed the action
     * @param {string} event.actor.steamId - Actor's Steam ID
     * @param {string} event.actor.displayName - Actor's display name
     * @param {string} event.actor.role - Actor's role
     * @param {string} [event.target] - Target of the action (Steam ID, mod ID, etc.)
     * @param {Object} [event.details] - Additional details
     * @param {string} [event.ip] - IP address (optional)
     * @param {string} [event.result] - Result (success, failure, error)
     */
    static log(event) {
        const entry = {
            timestamp: new Date().toISOString(),
            action: event.action,
            actor: event.actor.steamId,
            actorName: event.actor.displayName || 'Unknown',
            actorRole: event.actor.role,
            target: event.target || null,
            details: event.details || {},
            ip: event.ip || null,
            result: event.result || 'success'
        };

        // Sanitize: ensure no secrets in details
        if (entry.details.password) delete entry.details.password;
        if (entry.details.token) delete entry.details.token;
        if (entry.details.apiKey) entry.details.apiKey = '***';
        if (entry.details.steamApiKey) entry.details.steamApiKey = '***';
        if (entry.details.internalApiKey) entry.details.internalApiKey = '***';

        const line = JSON.stringify(entry) + '\n';

        try {
            fs.appendFileSync(AUDIT_LOG_FILE, line, 'utf8');
        } catch (error) {
            console.error('[AuditLogger] Failed to write audit log:', error);
        }
    }

    /**
     * Log user management action
     */
    static logUserAction(action, actor, targetSteamId, details = {}) {
        this.log({
            action: `user.${action}`,
            actor,
            target: targetSteamId,
            details
        });
    }

    /**
     * Log server control action
     */
    static logServerAction(action, actor, details = {}) {
        this.log({
            action: `server.${action}`,
            actor,
            details
        });
    }

    /**
     * Log mod management action
     */
    static logModAction(action, actor, modId, details = {}) {
        this.log({
            action: `mod.${action}`,
            actor,
            target: modId,
            details
        });
    }

    /**
     * Log backup action
     */
    static logBackupAction(action, actor, backupName, details = {}) {
        this.log({
            action: `backup.${action}`,
            actor,
            target: backupName,
            details
        });
    }

    /**
     * Log configuration change
     */
    static logConfigAction(action, actor, details = {}) {
        this.log({
            action: `config.${action}`,
            actor,
            details
        });
    }

    /**
     * Log player management action
     */
    static logPlayerAction(action, actor, playerId, details = {}) {
        this.log({
            action: `player.${action}`,
            actor,
            target: playerId,
            details
        });
    }

    /**
     * Log scheduler action
     */
    static logSchedulerAction(action, actor, taskId, details = {}) {
        this.log({
            action: `scheduler.${action}`,
            actor,
            target: taskId,
            details
        });
    }

    /**
     * Log authentication action
     */
    static logAuthAction(action, actor, details = {}) {
        this.log({
            action: `auth.${action}`,
            actor,
            details
        });
    }

    /**
     * Get audit log entries (for UI display)
     * @param {number} limit - Maximum number of entries to return
     * @param {string} [filter] - Filter by action prefix (e.g., 'user', 'server')
     * @returns {Array} Array of audit log entries
     */
    static getRecentEntries(limit = 100, filter = null) {
        try {
            if (!fs.existsSync(AUDIT_LOG_FILE)) {
                return [];
            }

            const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.length > 0);

            let entries = lines
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch (e) {
                        return null;
                    }
                })
                .filter(entry => entry !== null);

            // Filter by action prefix
            if (filter) {
                entries = entries.filter(entry => entry.action.startsWith(filter + '.'));
            }

            // Return most recent first
            return entries.reverse().slice(0, limit);
        } catch (error) {
            console.error('[AuditLogger] Failed to read audit log:', error);
            return [];
        }
    }
}

module.exports = AuditLogger;
