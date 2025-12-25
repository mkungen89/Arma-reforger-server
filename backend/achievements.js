const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * Achievements & Assignments System
 * BF3-style challenges and unlockables
 */

const achievementsPath = path.join(__dirname, '../config/achievements.json');

// Achievement definitions (BF3-style)
const achievementDefinitions = [
  // Kill-based achievements
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Get your first kill',
    icon: '💀',
    type: 'kill',
    requirement: { kills: 1 },
    xp: 50,
    dogtag: 'first_blood_tag'
  },
  {
    id: 'killing_spree',
    name: 'Killing Spree',
    description: 'Get 100 kills',
    icon: '🔥',
    type: 'kill',
    requirement: { kills: 100 },
    xp: 500,
    dogtag: 'killing_spree_tag'
  },
  {
    id: 'grim_reaper',
    name: 'Grim Reaper',
    description: 'Get 1000 kills',
    icon: '☠️',
    type: 'kill',
    requirement: { kills: 1000 },
    xp: 2000,
    dogtag: 'grim_reaper_tag'
  },
  {
    id: 'headhunter',
    name: 'Headhunter',
    description: 'Get 50 headshot kills',
    icon: '🎯',
    type: 'headshot',
    requirement: { headshots: 50 },
    xp: 750,
    dogtag: 'headhunter_tag'
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Get a kill from 500m or more',
    icon: '🔭',
    type: 'distance',
    requirement: { distance: 500 },
    xp: 1000,
    dogtag: 'sharpshooter_tag'
  },

  // Killstreak achievements
  {
    id: 'double_kill',
    name: 'Double Kill',
    description: 'Get 2 kills in a row',
    icon: '✌️',
    type: 'streak',
    requirement: { streak: 2 },
    xp: 100
  },
  {
    id: 'triple_kill',
    name: 'Triple Kill',
    description: 'Get 3 kills in a row',
    icon: '🎖️',
    type: 'streak',
    requirement: { streak: 3 },
    xp: 200
  },
  {
    id: 'mega_kill',
    name: 'Mega Kill',
    description: 'Get 5 kills in a row',
    icon: '⭐',
    type: 'streak',
    requirement: { streak: 5 },
    xp: 500
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Get 10 kills in a row',
    icon: '🏆',
    type: 'streak',
    requirement: { streak: 10 },
    xp: 1000,
    dogtag: 'unstoppable_tag'
  },

  // Weapon mastery
  {
    id: 'rifle_expert',
    name: 'Rifle Expert',
    description: 'Get 250 kills with rifles',
    icon: '🎖️',
    type: 'weapon_category',
    requirement: { category: 'rifle', kills: 250 },
    xp: 600
  },
  {
    id: 'sniper_elite',
    name: 'Sniper Elite',
    description: 'Get 100 kills with sniper rifles',
    icon: '🎯',
    type: 'weapon_category',
    requirement: { category: 'sniper', kills: 100 },
    xp: 800
  },

  // Team-based
  {
    id: 'team_player',
    name: 'Team Player',
    description: 'Win 10 matches',
    icon: '🤝',
    type: 'win',
    requirement: { wins: 10 },
    xp: 500
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Play 100 matches',
    icon: '🎮',
    type: 'match',
    requirement: { matches: 100 },
    xp: 1000,
    dogtag: 'veteran_tag'
  },

  // Time-based
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Play for 24 hours total',
    icon: '⏰',
    type: 'playtime',
    requirement: { hours: 24 },
    xp: 750
  },
  {
    id: 'no_life',
    name: 'No Life',
    description: 'Play for 100 hours total',
    icon: '🕐',
    type: 'playtime',
    requirement: { hours: 100 },
    xp: 2500,
    dogtag: 'no_life_tag'
  },

  // Special achievements
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Survive a match without dying',
    icon: '🛡️',
    type: 'special',
    requirement: { deathless_match: true },
    xp: 500
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Win a match while being 20 points behind',
    icon: '🔄',
    type: 'special',
    requirement: { comeback_win: true },
    xp: 750
  },
  {
    id: 'legendary',
    name: 'Legendary',
    description: 'Reach Colonel rank (Level 10)',
    icon: '👑',
    type: 'rank',
    requirement: { rank: 10 },
    xp: 5000,
    dogtag: 'legendary_tag'
  }
];

// Dog tags (BF3-style collectibles)
const dogtagDefinitions = {
  first_blood_tag: { name: 'First Blood', rarity: 'common', image: '🔴' },
  killing_spree_tag: { name: 'Killing Spree', rarity: 'rare', image: '🔥' },
  grim_reaper_tag: { name: 'Grim Reaper', rarity: 'epic', image: '☠️' },
  headhunter_tag: { name: 'Headhunter', rarity: 'rare', image: '🎯' },
  sharpshooter_tag: { name: 'Sharpshooter', rarity: 'epic', image: '🔭' },
  unstoppable_tag: { name: 'Unstoppable', rarity: 'legendary', image: '🏆' },
  veteran_tag: { name: 'Veteran', rarity: 'epic', image: '🎖️' },
  no_life_tag: { name: 'No Life', rarity: 'legendary', image: '💀' },
  legendary_tag: { name: 'Legendary', rarity: 'legendary', image: '👑' }
};

// Load player achievements
let playerAchievements = {};

function loadAchievements() {
  try {
    if (fs.existsSync(achievementsPath)) {
      playerAchievements = JSON.parse(fs.readFileSync(achievementsPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading achievements:', error);
  }
}

function saveAchievements() {
  try {
    const dir = path.dirname(achievementsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(achievementsPath, JSON.stringify(playerAchievements, null, 2));
  } catch (error) {
    console.error('Error saving achievements:', error);
  }
}

loadAchievements();

// Get player achievements
function getPlayerAchievements(steamId) {
  if (!playerAchievements[steamId]) {
    playerAchievements[steamId] = {
      unlocked: [],
      progress: {},
      dogtags: [],
      totalXP: 0
    };
  }
  return playerAchievements[steamId];
}

// Check and unlock achievements for a player
function checkAchievements(steamId, playerStats) {
  const playerAchvs = getPlayerAchievements(steamId);
  const newlyUnlocked = [];

  achievementDefinitions.forEach(achievement => {
    // Skip if already unlocked
    if (playerAchvs.unlocked.includes(achievement.id)) {
      return;
    }

    let unlocked = false;

    switch (achievement.type) {
      case 'kill':
        unlocked = playerStats.kills >= achievement.requirement.kills;
        break;
      case 'headshot':
        unlocked = playerStats.headshots >= achievement.requirement.headshots;
        break;
      case 'distance':
        unlocked = playerStats.longestKill >= achievement.requirement.distance;
        break;
      case 'streak':
        unlocked = playerStats.longestKillstreak >= achievement.requirement.streak;
        break;
      case 'win':
        unlocked = playerStats.wins >= achievement.requirement.wins;
        break;
      case 'match':
        unlocked = playerStats.matches >= achievement.requirement.matches;
        break;
      case 'playtime':
        const hours = playerStats.playtime / (1000 * 60 * 60);
        unlocked = hours >= achievement.requirement.hours;
        break;
      case 'rank':
        unlocked = playerStats.rank >= achievement.requirement.rank;
        break;
    }

    if (unlocked) {
      playerAchvs.unlocked.push(achievement.id);
      playerAchvs.totalXP += achievement.xp;

      // Award dogtag if achievement has one
      if (achievement.dogtag && !playerAchvs.dogtags.includes(achievement.dogtag)) {
        playerAchvs.dogtags.push(achievement.dogtag);
      }

      newlyUnlocked.push(achievement);
    }
  });

  if (newlyUnlocked.length > 0) {
    saveAchievements();
  }

  return newlyUnlocked;
}

// API Routes

// Get all achievement definitions
router.get('/achievements/definitions', (req, res) => {
  res.json({
    achievements: achievementDefinitions,
    dogtags: dogtagDefinitions
  });
});

// Get player achievements
router.get('/achievements/player/:steamId', (req, res) => {
  const { steamId } = req.params;
  const playerAchvs = getPlayerAchievements(steamId);

  const unlockedDetails = playerAchvs.unlocked.map(id => {
    const achv = achievementDefinitions.find(a => a.id === id);
    return achv;
  }).filter(a => a);

  const lockedAchievements = achievementDefinitions.filter(a =>
    !playerAchvs.unlocked.includes(a.id)
  );

  res.json({
    unlocked: unlockedDetails,
    locked: lockedAchievements,
    dogtags: playerAchvs.dogtags.map(tag => ({
      id: tag,
      ...dogtagDefinitions[tag]
    })),
    totalXP: playerAchvs.totalXP,
    progress: Math.round((unlockedDetails.length / achievementDefinitions.length) * 100)
  });
});

// Check achievements for player (called by battlelog integration)
router.post('/achievements/check', (req, res) => {
  const { steamId, playerStats } = req.body;

  if (!steamId || !playerStats) {
    return res.status(400).json({ error: 'Missing steamId or playerStats' });
  }

  const newAchievements = checkAchievements(steamId, playerStats);

  res.json({
    newAchievements,
    totalUnlocked: getPlayerAchievements(steamId).unlocked.length
  });
});

// Get leaderboard for achievements
router.get('/achievements/leaderboard', (req, res) => {
  const leaderboard = Object.entries(playerAchievements)
    .map(([steamId, data]) => ({
      steamId,
      achievementCount: data.unlocked.length,
      totalXP: data.totalXP,
      dogtagCount: data.dogtags.length
    }))
    .sort((a, b) => b.achievementCount - a.achievementCount)
    .slice(0, 100);

  res.json(leaderboard);
});

module.exports = {
  router,
  checkAchievements,
  getPlayerAchievements
};
