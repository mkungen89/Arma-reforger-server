const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SESSIONS_FILE = path.join(__dirname, '../config/sessions.json');
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

class SessionStore {
    constructor() {
        this.sessions = new Map();
        this.loadSessions();

        // Periodic cleanup of expired sessions
        setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    }

    loadSessions() {
        try {
            if (fs.existsSync(SESSIONS_FILE)) {
                const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
                if (data && typeof data === 'object') {
                    // Convert object to Map and filter out expired sessions
                    const now = Date.now();
                    Object.entries(data).forEach(([token, session]) => {
                        if (session && session.createdAt && (now - session.createdAt < SESSION_TTL_MS)) {
                            this.sessions.set(token, session);
                        }
                    });
                    console.log(`[sessionStore] Loaded ${this.sessions.size} active sessions`);
                }
            }
        } catch (error) {
            console.error('[sessionStore] Error loading sessions:', error.message);
        }
    }

    saveSessions() {
        try {
            const configDir = path.dirname(SESSIONS_FILE);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Convert Map to object for JSON serialization
            const data = {};
            this.sessions.forEach((session, token) => {
                data[token] = session;
            });

            fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[sessionStore] Error saving sessions:', error.message);
        }
    }

    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    createSession(user) {
        const token = this.generateToken();
        const session = {
            user: {
                steamId: user.steamId,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl || '',
                role: user.role
            },
            createdAt: Date.now()
        };

        this.sessions.set(token, session);
        this.saveSessions();

        return token;
    }

    getSession(token) {
        if (!token) return null;

        const session = this.sessions.get(token);
        if (!session) return null;

        // Check if session expired
        if (Date.now() - session.createdAt > SESSION_TTL_MS) {
            this.sessions.delete(token);
            this.saveSessions();
            return null;
        }

        return session;
    }

    deleteSession(token) {
        const existed = this.sessions.delete(token);
        if (existed) {
            this.saveSessions();
        }
        return existed;
    }

    deleteSessionsBySteamId(steamId) {
        let deleted = 0;
        for (const [token, session] of this.sessions.entries()) {
            if (session && session.user && session.user.steamId === steamId) {
                this.sessions.delete(token);
                deleted++;
            }
        }
        if (deleted > 0) {
            this.saveSessions();
        }
        return deleted;
    }

    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [token, session] of this.sessions.entries()) {
            if (!session || !session.createdAt || (now - session.createdAt > SESSION_TTL_MS)) {
                this.sessions.delete(token);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[sessionStore] Cleaned up ${cleaned} expired sessions`);
            this.saveSessions();
        }
    }

    getSessions() {
        return Array.from(this.sessions.entries()).map(([token, session]) => ({
            token,
            ...session
        }));
    }

    getActiveSessionCount() {
        return this.sessions.size;
    }
}

// Export singleton instance
module.exports = new SessionStore();
