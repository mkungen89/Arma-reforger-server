const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/discord-config.json');

// Discord configuration
let discordConfig = {
  webhookUrl: '',
  enabled: false,
  notifications: {
    serverStart: true,
    serverStop: true,
    serverCrash: true,
    playerJoin: false,
    playerLeave: false,
    playerKick: true,
    playerBan: true,
    taskComplete: true,
    taskFailed: true,
    backupComplete: true
  },
  mentionRole: '' // Discord role ID to mention for important events
};

// Load config
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      discordConfig = { ...discordConfig, ...JSON.parse(data) };
    } else {
      saveConfig();
    }
  } catch (error) {
    console.error('Error loading Discord config:', error);
  }
}

// Save config
function saveConfig() {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(discordConfig, null, 2));
  } catch (error) {
    console.error('Error saving Discord config:', error);
  }
}

// Send Discord notification
async function sendDiscordNotification(type, data) {
  if (!discordConfig.enabled || !discordConfig.webhookUrl) {
    return;
  }

  if (!discordConfig.notifications[type]) {
    return;
  }

  try {
    const embed = createEmbed(type, data);

    await axios.post(discordConfig.webhookUrl, {
      username: 'Arma Reforger Server',
      avatar_url: 'https://i.imgur.com/AfFp7pu.png', // Arma Reforger logo
      embeds: [embed]
    });

    console.log(`Discord notification sent: ${type}`);
  } catch (error) {
    console.error('Error sending Discord notification:', error.message);
  }
}

// Create embed based on event type
function createEmbed(type, data) {
  const timestamp = new Date().toISOString();

  const embeds = {
    serverStart: {
      title: '🟢 Server Started',
      description: 'The Arma Reforger server has started successfully',
      color: 0x4ade80,
      fields: [
        { name: 'Server Name', value: data.serverName || 'Arma Reforger Server', inline: true },
        { name: 'Port', value: (data.port || 2001).toString(), inline: true }
      ]
    },

    serverStop: {
      title: '🔴 Server Stopped',
      description: 'The Arma Reforger server has been stopped',
      color: 0xef4444,
      fields: [
        { name: 'Uptime', value: data.uptime || 'Unknown', inline: true },
        { name: 'Players Online', value: (data.playerCount || 0).toString(), inline: true }
      ]
    },

    serverCrash: {
      title: '💥 Server Crashed',
      description: discordConfig.mentionRole ? `<@&${discordConfig.mentionRole}> Server has crashed!` : 'Server has crashed!',
      color: 0xff0000,
      fields: [
        { name: 'Error', value: data.error || 'Unknown error', inline: false },
        { name: 'Time', value: new Date().toLocaleString(), inline: true }
      ]
    },

    playerJoin: {
      title: '👋 Player Joined',
      description: `${data.playerName} has joined the server`,
      color: 0x4fc3f7,
      fields: [
        { name: 'Steam ID', value: data.steamId || 'Unknown', inline: true },
        { name: 'Players Online', value: (data.playerCount || 0).toString(), inline: true }
      ]
    },

    playerLeave: {
      title: '👋 Player Left',
      description: `${data.playerName} has left the server`,
      color: 0x718096,
      fields: [
        { name: 'Session Duration', value: data.duration || 'Unknown', inline: true },
        { name: 'Players Online', value: (data.playerCount || 0).toString(), inline: true }
      ]
    },

    playerKick: {
      title: '👢 Player Kicked',
      description: `${data.playerName} was kicked from the server`,
      color: 0xfb923c,
      fields: [
        { name: 'Reason', value: data.reason || 'No reason provided', inline: false },
        { name: 'Kicked By', value: data.kickedBy || 'Admin', inline: true }
      ]
    },

    playerBan: {
      title: '🚫 Player Banned',
      description: `${data.playerName} was banned from the server`,
      color: 0xef4444,
      fields: [
        { name: 'Reason', value: data.reason || 'No reason provided', inline: false },
        { name: 'Duration', value: data.permanent ? 'Permanent' : data.duration, inline: true },
        { name: 'Banned By', value: data.bannedBy || 'Admin', inline: true }
      ]
    },

    taskComplete: {
      title: '✅ Scheduled Task Completed',
      description: `Task "${data.taskName}" completed successfully`,
      color: 0x4ade80,
      fields: [
        { name: 'Task Type', value: data.taskType || 'Unknown', inline: true },
        { name: 'Duration', value: data.duration || 'Unknown', inline: true }
      ]
    },

    taskFailed: {
      title: '❌ Scheduled Task Failed',
      description: `Task "${data.taskName}" failed`,
      color: 0xef4444,
      fields: [
        { name: 'Error', value: data.error || 'Unknown error', inline: false },
        { name: 'Task Type', value: data.taskType || 'Unknown', inline: true }
      ]
    },

    backupComplete: {
      title: '💾 Backup Completed',
      description: `Backup "${data.backupName}" created successfully`,
      color: 0x4fc3f7,
      fields: [
        { name: 'Size', value: data.size || 'Unknown', inline: true },
        { name: 'Created By', value: data.createdBy || 'System', inline: true }
      ]
    }
  };

  const embed = embeds[type] || {
    title: 'Server Event',
    description: JSON.stringify(data),
    color: 0x4fc3f7
  };

  embed.timestamp = timestamp;
  embed.footer = {
    text: 'Arma Reforger Server Manager'
  };

  return embed;
}

// API Routes

// Get Discord configuration
router.get('/discord/config', (req, res) => {
  // Don't expose webhook URL to non-admins
  const safeConfig = { ...discordConfig };
  if (req.user?.role !== 'admin') {
    safeConfig.webhookUrl = discordConfig.webhookUrl ? '***configured***' : '';
  }
  res.json(safeConfig);
});

// Update Discord configuration (Admin only)
router.put('/discord/config', (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  discordConfig = { ...discordConfig, ...req.body };
  saveConfig();

  res.json({
    success: true,
    message: 'Discord configuration updated',
    config: discordConfig
  });
});

// Test Discord webhook (Admin only)
router.post('/discord/test', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    await sendDiscordNotification('serverStart', {
      serverName: 'Test Server',
      port: 2001
    });

    res.json({
      success: true,
      message: 'Test notification sent to Discord'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to send test notification',
      message: error.message
    });
  }
});

// Send custom notification (Admin only)
router.post('/discord/notify', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { type, data } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Notification type is required' });
  }

  try {
    await sendDiscordNotification(type, data || {});

    res.json({
      success: true,
      message: 'Notification sent'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to send notification',
      message: error.message
    });
  }
});

// Load config on startup
loadConfig();

// Export both router and notification function
module.exports = {
  router,
  sendDiscordNotification
};
