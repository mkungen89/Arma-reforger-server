const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const { requireAuth } = require('./auth');
const ApiError = require('./apiError');

const router = express.Router();

const ssoClientsPath = path.join(__dirname, '../config/sso-clients.json');

function readSsoClients() {
  // Primary: env var for containerized deploys
  if (process.env.SSO_CLIENTS_JSON) {
    try {
      const parsed = JSON.parse(process.env.SSO_CLIENTS_JSON);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {
      // ignore
    }
  }

  // Fallback: file
  try {
    if (fs.existsSync(ssoClientsPath)) {
      const parsed = JSON.parse(fs.readFileSync(ssoClientsPath, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.error('[sso] Failed to read sso-clients.json:', e.message);
  }

  return { clients: [] };
}

function findClient(clientId) {
  const db = readSsoClients();
  const clients = Array.isArray(db.clients) ? db.clients : [];
  return clients.find((c) => c && c.clientId === clientId);
}

function isRedirectAllowed(client, redirectUri) {
  if (!client || !redirectUri) return false;
  const allowed = Array.isArray(client.redirectUris) ? client.redirectUris : [];
  return allowed.includes(redirectUri);
}

// One-time authorization codes (in-memory)
// { code -> { clientId, steamId, displayName, avatarUrl, role, createdAt } }
const codes = new Map();
const CODE_TTL_MS = 2 * 60 * 1000; // 2 minutes

function cleanupCodes() {
  const now = Date.now();
  for (const [code, entry] of codes.entries()) {
    if (!entry?.createdAt || now - entry.createdAt > CODE_TTL_MS) {
      codes.delete(code);
    }
  }
}

function getJwtSecret() {
  const secret = process.env.SSO_JWT_SECRET;
  if (!secret) {
    throw new ApiError(
      'SSO is not configured on this server',
      500,
      { missing: 'SSO_JWT_SECRET' },
      'Set SSO_JWT_SECRET (random long string) and configure clients in config/sso-clients.json or SSO_CLIENTS_JSON.'
    );
  }
  return secret;
}

// Step 1: Panel (logged-in) issues code, then redirects back to Flute.
// GET /api/sso/authorize?client_id=...&redirect_uri=...&state=...
router.get('/sso/authorize', requireAuth, (req, res, next) => {
  try {
    cleanupCodes();

    const clientId = req.query.client_id;
    const redirectUri = req.query.redirect_uri;
    const state = req.query.state || '';

    if (!clientId || !redirectUri) {
      throw new ApiError('Missing client_id or redirect_uri', 400);
    }

    const client = findClient(clientId);
    if (!client) {
      throw new ApiError('Unknown client_id', 400);
    }
    if (!isRedirectAllowed(client, redirectUri)) {
      throw new ApiError('redirect_uri not allowed', 400, { redirectUri });
    }

    const code = crypto.randomBytes(24).toString('hex');
    codes.set(code, {
      clientId,
      createdAt: Date.now(),
      user: {
        steamId: req.user.steamId,
        displayName: req.user.displayName,
        avatarUrl: req.user.avatarUrl || '',
        role: req.user.role
      }
    });

    const url = new URL(redirectUri);
    url.searchParams.set('code', code);
    if (state) url.searchParams.set('state', String(state));
    res.redirect(url.toString());
  } catch (e) {
    next(e);
  }
});

// Step 2: Flute exchanges code for token.
// POST /api/sso/token { client_id, client_secret, code }
router.post('/sso/token', express.json({ limit: process.env.JSON_LIMIT || '1mb' }), (req, res, next) => {
  try {
    cleanupCodes();

    const { client_id: clientId, client_secret: clientSecret, code } = req.body || {};
    if (!clientId || !clientSecret || !code) {
      throw new ApiError('Missing client_id, client_secret, or code', 400);
    }

    const client = findClient(clientId);
    if (!client) throw new ApiError('Unknown client_id', 400);
    if (!client.clientSecret || client.clientSecret !== clientSecret) {
      throw new ApiError('Invalid client_secret', 401);
    }

    const entry = codes.get(code);
    if (!entry || entry.clientId !== clientId) {
      throw new ApiError('Invalid or expired code', 401);
    }
    if (Date.now() - entry.createdAt > CODE_TTL_MS) {
      codes.delete(code);
      throw new ApiError('Code expired', 401);
    }

    // one-time use
    codes.delete(code);

    const secret = getJwtSecret();
    const token = jwt.sign(
      {
        iss: 'arma-reforger-server-manager',
        aud: clientId,
        sub: entry.user.steamId,
        role: entry.user.role,
        displayName: entry.user.displayName,
        avatarUrl: entry.user.avatarUrl || ''
      },
      secret,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      tokenType: 'Bearer',
      accessToken: token,
      expiresIn: 8 * 60 * 60,
      user: entry.user
    });
  } catch (e) {
    next(e);
  }
});

// Step 3: Flute can fetch profile / validate token
// GET /api/sso/userinfo (Authorization: Bearer <token>)
router.get('/sso/userinfo', (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
    if (!token) throw new ApiError('Missing bearer token', 401);

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    // Minimal GDPR-safe claims
    res.json({
      success: true,
      user: {
        steamId: decoded.sub,
        displayName: decoded.displayName,
        avatarUrl: decoded.avatarUrl || '',
        role: decoded.role
      }
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;


