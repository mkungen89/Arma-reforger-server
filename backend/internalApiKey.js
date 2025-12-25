const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const keyPath = path.join(__dirname, '../config/internal-api-key.json');

function loadOrCreateInternalApiKey() {
  try {
    if (fs.existsSync(keyPath)) {
      const parsed = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      if (parsed && typeof parsed.key === 'string' && parsed.key.length >= 16) return parsed.key;
    }
  } catch (_) {
    // ignore and regenerate
  }

  const key = crypto.randomBytes(32).toString('hex');
  try {
    const dir = path.dirname(keyPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(keyPath, JSON.stringify({ key, createdAt: new Date().toISOString() }, null, 2));
  } catch (_) {
    // If we cannot persist, still return the generated key for this process.
  }
  return key;
}

const INTERNAL_API_KEY = loadOrCreateInternalApiKey();

function getInternalApiKey() {
  return INTERNAL_API_KEY;
}

function isValidInternalRequest(req) {
  const header = req.headers['x-internal-api-key'];
  return typeof header === 'string' && header === INTERNAL_API_KEY;
}

module.exports = {
  getInternalApiKey,
  isValidInternalRequest,
};


