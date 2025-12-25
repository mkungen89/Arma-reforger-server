const axios = require('axios');
const crypto = require('crypto');

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

/**
 * Generate Steam OpenID authentication URL
 * @param {string} returnUrl - The URL to return to after authentication
 * @param {string} realm - The realm (base URL of your site)
 * @returns {string} The Steam OpenID URL to redirect to
 */
function getSteamLoginUrl(returnUrl, realm) {
    const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': returnUrl,
        'openid.realm': realm,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });

    return `${STEAM_OPENID_URL}?${params.toString()}`;
}

/**
 * Verify Steam OpenID response
 * @param {Object} query - The query parameters from the Steam callback
 * @returns {Promise<string|null>} Steam ID if valid, null otherwise
 */
async function verifySteamOpenId(query) {
    try {
        // Check if the response is positive
        if (query['openid.mode'] !== 'id_res') {
            return null;
        }

        // Extract Steam ID before verification
        const claimedId = query['openid.claimed_id'] || query['openid.identity'];
        if (!claimedId) {
            return null;
        }

        const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
        if (!steamIdMatch) {
            return null;
        }

        const steamId = steamIdMatch[1];

        // Verify the response with Steam
        const verifyParams = new URLSearchParams(query);
        verifyParams.set('openid.mode', 'check_authentication');

        const response = await axios.post(
            STEAM_OPENID_URL,
            verifyParams.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            }
        );

        // Check if Steam confirms the authentication
        const responseText = response.data;
        if (typeof responseText === 'string' && responseText.includes('is_valid:true')) {
            return steamId;
        }

        return null;
    } catch (error) {
        console.error('[steamOpenId] Verification error:', error.message);
        return null;
    }
}

module.exports = {
    getSteamLoginUrl,
    verifySteamOpenId
};
