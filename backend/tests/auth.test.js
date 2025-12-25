/**
 * Authentication & Authorization Tests
 *
 * Tests for auth endpoints and role-based access control
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Mock server setup
const express = require('express');
const app = express();

// Import auth router
const { router: authRouter } = require('../auth');
app.use(express.json());
app.use('/api', authRouter);

describe('Authentication Tests', () => {
    let testUsersDbPath;
    let originalUsersDb;

    beforeAll(() => {
        // Backup original users.json
        testUsersDbPath = path.join(__dirname, '../../config/users.json');
        if (fs.existsSync(testUsersDbPath)) {
            originalUsersDb = fs.readFileSync(testUsersDbPath, 'utf8');
        }

        // Create test users
        const testUsers = {
            users: [
                {
                    steamId: '76561198012345678',
                    displayName: 'TestAdmin',
                    role: 'admin',
                    addedAt: new Date().toISOString()
                },
                {
                    steamId: '76561198087654321',
                    displayName: 'TestGM',
                    role: 'gm',
                    addedAt: new Date().toISOString()
                },
                {
                    steamId: '76561198011111111',
                    displayName: 'TestUser',
                    role: 'user',
                    addedAt: new Date().toISOString()
                }
            ]
        };

        fs.writeFileSync(testUsersDbPath, JSON.stringify(testUsers, null, 2));
    });

    afterAll(() => {
        // Restore original users.json
        if (originalUsersDb) {
            fs.writeFileSync(testUsersDbPath, originalUsersDb);
        } else if (fs.existsSync(testUsersDbPath)) {
            fs.unlinkSync(testUsersDbPath);
        }
    });

    describe('GET /api/auth/steam/openid/start', () => {
        it('should return Steam login URL', async () => {
            const res = await request(app)
                .get('/api/auth/steam/openid/start')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.url).toContain('steamcommunity.com');
            expect(res.body.url).toContain('openid');
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return 401 without token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .expect(401);

            expect(res.body.error).toBeDefined();
        });

        it('should return 401 with invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token-123')
                .expect(401);

            expect(res.body.error).toBeDefined();
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should return 401 without token', async () => {
            const res = await request(app)
                .post('/api/auth/logout')
                .expect(401);

            expect(res.body.error).toBeDefined();
        });
    });

    describe('GET /api/users', () => {
        it('should return 401 without token', async () => {
            const res = await request(app)
                .get('/api/users')
                .expect(401);

            expect(res.body.error).toBeDefined();
        });
    });

    describe('POST /api/users', () => {
        it('should return 401 without token', async () => {
            const res = await request(app)
                .post('/api/users')
                .send({ steamId: '76561198099999999', role: 'user' })
                .expect(401);

            expect(res.body.error).toBeDefined();
        });
    });
});

describe('DEPRECATED: SteamID Login (Development Only)', () => {
    it('should be disabled in production', async () => {
        // Set production env
        const oldEnv = process.env.DISABLE_STEAMID_LOGIN;
        process.env.DISABLE_STEAMID_LOGIN = '1';

        const res = await request(app)
            .post('/api/auth/steam/login')
            .send({ steamId: '76561198012345678' })
            .expect(403);

        expect(res.body.error).toContain('disabled');

        // Restore env
        process.env.DISABLE_STEAMID_LOGIN = oldEnv;
    });
});
