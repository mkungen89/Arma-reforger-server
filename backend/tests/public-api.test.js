/**
 * Public API Tests
 *
 * Tests for public endpoints (no auth required)
 * - Battlelog
 * - Server Browser
 * - System Info
 * - Health Check
 */

const request = require('supertest');

describe('Public API Endpoints', () => {
    const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

    describe('GET /health', () => {
        it('should return health status', async () => {
            const res = await request(API_URL)
                .get('/health')
                .expect(200);

            expect(res.body.status).toBe('ok');
            expect(res.body.timestamp).toBeDefined();
            expect(res.body.uptime).toBeGreaterThanOrEqual(0);
        });

        it('should not require authentication', async () => {
            // Should work without Authorization header
            const res = await request(API_URL)
                .get('/health')
                .expect(200);

            expect(res.body.status).toBe('ok');
        });
    });

    describe('GET /api/status', () => {
        it('should return server status', async () => {
            const res = await request(API_URL)
                .get('/api/status')
                .expect(200);

            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('uptime');
            // Status should be one of: running, stopped, starting, stopping, error
            expect(['running', 'stopped', 'starting', 'stopping', 'error']).toContain(res.body.status);
        });
    });

    describe('GET /api/battlelog/stats', () => {
        it('should return battlelog statistics', async () => {
            const res = await request(API_URL)
                .get('/api/battlelog/stats')
                .expect(200);

            expect(res.body).toHaveProperty('totalPlayers');
            expect(res.body).toHaveProperty('totalKills');
            expect(res.body).toHaveProperty('totalDeaths');
            expect(typeof res.body.totalPlayers).toBe('number');
            expect(typeof res.body.totalKills).toBe('number');
        });

        it('should not expose IP addresses', async () => {
            const res = await request(API_URL)
                .get('/api/battlelog/stats')
                .expect(200);

            // Check that response doesn't contain IP addresses (GDPR)
            const responseStr = JSON.stringify(res.body);
            const ipPattern = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
            expect(responseStr).not.toMatch(ipPattern);
        });
    });

    describe('GET /api/battlelog/leaderboard', () => {
        it('should return leaderboard', async () => {
            const res = await request(API_URL)
                .get('/api/battlelog/leaderboard')
                .query({ sortBy: 'kills', limit: 50 })
                .expect(200);

            expect(Array.isArray(res.body.players)).toBe(true);
            expect(res.body.players.length).toBeLessThanOrEqual(50);
        });

        it('should validate sortBy parameter', async () => {
            const validSorts = ['kills', 'deaths', 'kd', 'playtime'];

            for (const sortBy of validSorts) {
                const res = await request(API_URL)
                    .get('/api/battlelog/leaderboard')
                    .query({ sortBy, limit: 10 })
                    .expect(200);

                expect(Array.isArray(res.body.players)).toBe(true);
            }
        });
    });

    describe('GET /api/battlelog/feed', () => {
        it('should return activity feed', async () => {
            const res = await request(API_URL)
                .get('/api/battlelog/feed')
                .query({ limit: 20 })
                .expect(200);

            expect(Array.isArray(res.body.events)).toBe(true);
            expect(res.body.events.length).toBeLessThanOrEqual(20);
        });
    });

    describe('GET /api/system/info', () => {
        it('should return system information', async () => {
            const res = await request(API_URL)
                .get('/api/system/info')
                .expect(200);

            expect(res.body).toHaveProperty('cpu');
            expect(res.body).toHaveProperty('memory');
            expect(res.body).toHaveProperty('disk');
            expect(res.body.cpu).toHaveProperty('usage');
            expect(res.body.memory).toHaveProperty('used');
            expect(res.body.memory).toHaveProperty('total');
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits on public endpoints', async () => {
            // Make many requests quickly
            const requests = [];
            for (let i = 0; i < 400; i++) {
                requests.push(
                    request(API_URL)
                        .get('/api/battlelog/stats')
                );
            }

            const responses = await Promise.all(requests);

            // At least one should be rate limited (429)
            const rateLimited = responses.some(res => res.status === 429);
            expect(rateLimited).toBe(true);
        }, 30000); // 30 second timeout for this test
    });
});

describe('Input Validation', () => {
    const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

    describe('Query Parameter Validation', () => {
        it('should reject invalid limit values', async () => {
            const res = await request(API_URL)
                .get('/api/battlelog/leaderboard')
                .query({ limit: -1 });

            // Should either use default or return error
            expect([200, 400]).toContain(res.status);
        });

        it('should handle very large limit values', async () => {
            const res = await request(API_URL)
                .get('/api/battlelog/leaderboard')
                .query({ limit: 999999 });

            // Should cap at maximum or return error
            expect([200, 400]).toContain(res.status);

            if (res.status === 200) {
                expect(res.body.players.length).toBeLessThanOrEqual(1000);
            }
        });
    });

    describe('JSON Payload Validation', () => {
        it('should reject oversized JSON payloads', async () => {
            const hugePayload = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB

            const res = await request(API_URL)
                .post('/api/auth/steam/verify')
                .send(hugePayload);

            expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });
});

describe('Error Handling', () => {
    const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

    describe('Standardized Error Format', () => {
        it('should return consistent error format', async () => {
            const res = await request(API_URL)
                .get('/api/auth/me') // Requires auth, will fail
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(typeof res.body.error).toBe('string');
        });
    });

    describe('404 Handling', () => {
        it('should handle unknown endpoints', async () => {
            const res = await request(API_URL)
                .get('/api/nonexistent-endpoint-xyz')
                .expect(404);

            expect(res.body).toBeDefined();
        });
    });
});

describe('CORS', () => {
    const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

    it('should include CORS headers', async () => {
        const res = await request(API_URL)
            .get('/api/status')
            .set('Origin', 'https://example.com');

        // CORS headers should be present
        expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
});
