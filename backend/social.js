const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * Social System - Friends & Platoons (BF3-style)
 */

const socialDbPath = path.join(__dirname, '../config/social.json');

let socialData = {
  friendships: [],
  platoons: [],
  friendRequests: [],
  platoonInvites: []
};

// Load social data
function loadSocialData() {
  try {
    if (fs.existsSync(socialDbPath)) {
      socialData = JSON.parse(fs.readFileSync(socialDbPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading social data:', error);
  }
}

function saveSocialData() {
  try {
    const dir = path.dirname(socialDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(socialDbPath, JSON.stringify(socialData, null, 2));
  } catch (error) {
    console.error('Error saving social data:', error);
  }
}

loadSocialData();

// ============ FRIENDS SYSTEM ============

// Send friend request
router.post('/social/friends/request', (req, res) => {
  const { fromSteamId, fromName, toSteamId, toName } = req.body;

  if (!fromSteamId || !toSteamId) {
    return res.status(400).json({ error: 'Missing steamId parameters' });
  }

  // Check if already friends
  const alreadyFriends = socialData.friendships.some(f =>
    (f.player1 === fromSteamId && f.player2 === toSteamId) ||
    (f.player1 === toSteamId && f.player2 === fromSteamId)
  );

  if (alreadyFriends) {
    return res.status(400).json({ error: 'Already friends' });
  }

  // Check if request already exists
  const existingRequest = socialData.friendRequests.find(r =>
    (r.from === fromSteamId && r.to === toSteamId) ||
    (r.from === toSteamId && r.to === fromSteamId)
  );

  if (existingRequest) {
    return res.status(400).json({ error: 'Friend request already pending' });
  }

  const request = {
    id: `freq_${Date.now()}`,
    from: fromSteamId,
    fromName,
    to: toSteamId,
    toName,
    sentAt: new Date().toISOString(),
    status: 'pending'
  };

  socialData.friendRequests.push(request);
  saveSocialData();

  res.json({
    success: true,
    message: `Friend request sent to ${toName}`,
    request
  });
});

// Get friend requests
router.get('/social/friends/requests', (req, res) => {
  const steamId = req.user?.steamId;

  if (!steamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const received = socialData.friendRequests.filter(r =>
    r.to === steamId && r.status === 'pending'
  );

  const sent = socialData.friendRequests.filter(r =>
    r.from === steamId && r.status === 'pending'
  );

  res.json({ received, sent });
});

// Accept friend request
router.post('/social/friends/accept/:requestId', (req, res) => {
  const { requestId } = req.params;
  const steamId = req.user?.steamId;

  const request = socialData.friendRequests.find(r => r.id === requestId);

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  if (request.to !== steamId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Create friendship
  const friendship = {
    id: `friend_${Date.now()}`,
    player1: request.from,
    player2: request.to,
    since: new Date().toISOString()
  };

  socialData.friendships.push(friendship);

  // Remove request
  socialData.friendRequests = socialData.friendRequests.filter(r => r.id !== requestId);
  saveSocialData();

  res.json({
    success: true,
    message: 'Friend request accepted',
    friendship
  });
});

// Decline friend request
router.post('/social/friends/decline/:requestId', (req, res) => {
  const { requestId } = req.params;

  socialData.friendRequests = socialData.friendRequests.filter(r => r.id !== requestId);
  saveSocialData();

  res.json({ success: true, message: 'Friend request declined' });
});

// Get friends list
router.get('/social/friends', (req, res) => {
  const steamId = req.user?.steamId;

  if (!steamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const friendships = socialData.friendships.filter(f =>
    f.player1 === steamId || f.player2 === steamId
  );

  const friendIds = friendships.map(f =>
    f.player1 === steamId ? f.player2 : f.player1
  );

  res.json({
    friends: friendIds,
    count: friendIds.length
  });
});

// Remove friend
router.delete('/social/friends/:friendSteamId', (req, res) => {
  const { friendSteamId } = req.params;
  const steamId = req.user?.steamId;

  socialData.friendships = socialData.friendships.filter(f =>
    !((f.player1 === steamId && f.player2 === friendSteamId) ||
      (f.player1 === friendSteamId && f.player2 === steamId))
  );

  saveSocialData();

  res.json({ success: true, message: 'Friend removed' });
});

// ============ PLATOONS SYSTEM ============

// Create platoon
router.post('/social/platoons', (req, res) => {
  const { name, tag, description, isPublic } = req.body;
  const creatorSteamId = req.user?.steamId;
  const creatorName = req.user?.displayName;

  if (!creatorSteamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!name || !tag) {
    return res.status(400).json({ error: 'Name and tag are required' });
  }

  // Check if tag already exists
  const existingPlatoon = socialData.platoons.find(p =>
    p.tag.toLowerCase() === tag.toLowerCase()
  );

  if (existingPlatoon) {
    return res.status(400).json({ error: 'Tag already taken' });
  }

  const platoon = {
    id: `platoon_${Date.now()}`,
    name,
    tag,
    description: description || '',
    isPublic: isPublic !== false,
    createdAt: new Date().toISOString(),
    founder: creatorSteamId,
    founderName: creatorName,
    leaders: [creatorSteamId],
    members: [creatorSteamId],
    stats: {
      totalKills: 0,
      totalScore: 0,
      matchesPlayed: 0
    },
    emblem: '🎖️'
  };

  socialData.platoons.push(platoon);
  saveSocialData();

  res.json({
    success: true,
    message: 'Platoon created',
    platoon
  });
});

// Get all platoons
router.get('/social/platoons', (req, res) => {
  const { search, sortBy = 'members' } = req.query;

  let platoons = [...socialData.platoons];

  // Filter by search
  if (search) {
    platoons = platoons.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tag.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Only show public platoons unless user is member
  const userSteamId = req.user?.steamId;
  platoons = platoons.filter(p =>
    p.isPublic || (userSteamId && p.members.includes(userSteamId))
  );

  // Sort
  switch (sortBy) {
    case 'members':
      platoons.sort((a, b) => b.members.length - a.members.length);
      break;
    case 'score':
      platoons.sort((a, b) => b.stats.totalScore - a.stats.totalScore);
      break;
    case 'kills':
      platoons.sort((a, b) => b.stats.totalKills - a.stats.totalKills);
      break;
    case 'name':
      platoons.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  res.json(platoons);
});

// Get platoon details
router.get('/social/platoons/:platoonId', (req, res) => {
  const { platoonId } = req.params;
  const platoon = socialData.platoons.find(p => p.id === platoonId);

  if (!platoon) {
    return res.status(404).json({ error: 'Platoon not found' });
  }

  res.json(platoon);
});

// Update platoon
router.put('/social/platoons/:platoonId', (req, res) => {
  const { platoonId } = req.params;
  const { name, description, isPublic, emblem } = req.body;
  const userSteamId = req.user?.steamId;

  const platoon = socialData.platoons.find(p => p.id === platoonId);

  if (!platoon) {
    return res.status(404).json({ error: 'Platoon not found' });
  }

  // Check if user is leader
  if (!platoon.leaders.includes(userSteamId)) {
    return res.status(403).json({ error: 'Only leaders can update platoon' });
  }

  if (name) platoon.name = name;
  if (description !== undefined) platoon.description = description;
  if (isPublic !== undefined) platoon.isPublic = isPublic;
  if (emblem) platoon.emblem = emblem;

  saveSocialData();

  res.json({
    success: true,
    message: 'Platoon updated',
    platoon
  });
});

// Join platoon
router.post('/social/platoons/:platoonId/join', (req, res) => {
  const { platoonId } = req.params;
  const userSteamId = req.user?.steamId;

  if (!userSteamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const platoon = socialData.platoons.find(p => p.id === platoonId);

  if (!platoon) {
    return res.status(404).json({ error: 'Platoon not found' });
  }

  if (platoon.members.includes(userSteamId)) {
    return res.status(400).json({ error: 'Already a member' });
  }

  if (!platoon.isPublic) {
    return res.status(403).json({ error: 'Platoon is private' });
  }

  platoon.members.push(userSteamId);
  saveSocialData();

  res.json({
    success: true,
    message: 'Joined platoon',
    platoon
  });
});

// Leave platoon
router.post('/social/platoons/:platoonId/leave', (req, res) => {
  const { platoonId } = req.params;
  const userSteamId = req.user?.steamId;

  const platoon = socialData.platoons.find(p => p.id === platoonId);

  if (!platoon) {
    return res.status(404).json({ error: 'Platoon not found' });
  }

  if (platoon.founder === userSteamId) {
    return res.status(400).json({ error: 'Founder cannot leave. Transfer leadership or delete platoon.' });
  }

  platoon.members = platoon.members.filter(m => m !== userSteamId);
  platoon.leaders = platoon.leaders.filter(l => l !== userSteamId);
  saveSocialData();

  res.json({ success: true, message: 'Left platoon' });
});

// Invite to platoon
router.post('/social/platoons/:platoonId/invite', (req, res) => {
  const { platoonId } = req.params;
  const { targetSteamId, targetName } = req.body;
  const userSteamId = req.user?.steamId;
  const userName = req.user?.displayName;

  const platoon = socialData.platoons.find(p => p.id === platoonId);

  if (!platoon) {
    return res.status(404).json({ error: 'Platoon not found' });
  }

  if (!platoon.members.includes(userSteamId)) {
    return res.status(403).json({ error: 'Must be a member to invite' });
  }

  const invite = {
    id: `pinv_${Date.now()}`,
    platoonId,
    platoonName: platoon.name,
    platoonTag: platoon.tag,
    from: userSteamId,
    fromName: userName,
    to: targetSteamId,
    toName: targetName,
    sentAt: new Date().toISOString(),
    status: 'pending'
  };

  socialData.platoonInvites.push(invite);
  saveSocialData();

  res.json({
    success: true,
    message: 'Platoon invite sent',
    invite
  });
});

// Get platoon invites
router.get('/social/platoons/invites', (req, res) => {
  const userSteamId = req.user?.steamId;

  if (!userSteamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const invites = socialData.platoonInvites.filter(i =>
    i.to === userSteamId && i.status === 'pending'
  );

  res.json(invites);
});

// Accept platoon invite
router.post('/social/platoons/invites/:inviteId/accept', (req, res) => {
  const { inviteId } = req.params;
  const userSteamId = req.user?.steamId;

  const invite = socialData.platoonInvites.find(i => i.id === inviteId);

  if (!invite) {
    return res.status(404).json({ error: 'Invite not found' });
  }

  if (invite.to !== userSteamId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const platoon = socialData.platoons.find(p => p.id === invite.platoonId);

  if (!platoon) {
    return res.status(404).json({ error: 'Platoon not found' });
  }

  if (!platoon.members.includes(userSteamId)) {
    platoon.members.push(userSteamId);
  }

  socialData.platoonInvites = socialData.platoonInvites.filter(i => i.id !== inviteId);
  saveSocialData();

  res.json({
    success: true,
    message: 'Joined platoon',
    platoon
  });
});

// Delete platoon (founder only)
router.delete('/social/platoons/:platoonId', (req, res) => {
  const { platoonId } = req.params;
  const userSteamId = req.user?.steamId;

  const platoon = socialData.platoons.find(p => p.id === platoonId);

  if (!platoon) {
    return res.status(404).json({ error: 'Platoon not found' });
  }

  if (platoon.founder !== userSteamId) {
    return res.status(403).json({ error: 'Only founder can delete platoon' });
  }

  socialData.platoons = socialData.platoons.filter(p => p.id !== platoonId);
  saveSocialData();

  res.json({ success: true, message: 'Platoon deleted' });
});

module.exports = router;
