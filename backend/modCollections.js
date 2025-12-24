const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const collectionsFile = path.join(__dirname, '../config/mod-collections.json');
let collections = [];

// Load collections
function loadCollections() {
  try {
    if (fs.existsSync(collectionsFile)) {
      const data = fs.readFileSync(collectionsFile, 'utf8');
      collections = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading mod collections:', error);
    collections = [];
  }
}

// Save collections
function saveCollections() {
  try {
    const dir = path.dirname(collectionsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(collectionsFile, JSON.stringify(collections, null, 2));
  } catch (error) {
    console.error('Error saving mod collections:', error);
  }
}

// Get all collections
router.get('/mod-collections', (req, res) => {
  loadCollections();
  res.json({
    count: collections.length,
    collections: collections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  });
});

// Get collection by ID
router.get('/mod-collections/:id', (req, res) => {
  loadCollections();
  const collection = collections.find(c => c.id === req.params.id);

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  res.json(collection);
});

// Create new collection
router.post('/mod-collections', (req, res) => {
  const { name, description, mods, isPublic } = req.body;

  if (!name || !mods || !Array.isArray(mods)) {
    return res.status(400).json({ error: 'Name and mods array are required' });
  }

  const collection = {
    id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: description || '',
    mods, // Array of mod IDs
    isPublic: isPublic !== false,
    createdAt: new Date(),
    createdBy: req.user?.displayName || 'Admin',
    downloads: 0,
    lastModified: new Date()
  };

  collections.push(collection);
  saveCollections();

  res.json({
    success: true,
    message: 'Collection created successfully',
    collection
  });
});

// Update collection
router.put('/mod-collections/:id', (req, res) => {
  loadCollections();
  const index = collections.findIndex(c => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const collection = collections[index];

  // Update fields
  if (req.body.name) collection.name = req.body.name;
  if (req.body.description !== undefined) collection.description = req.body.description;
  if (req.body.mods) collection.mods = req.body.mods;
  if (req.body.isPublic !== undefined) collection.isPublic = req.body.isPublic;

  collection.lastModified = new Date();

  collections[index] = collection;
  saveCollections();

  res.json({
    success: true,
    message: 'Collection updated successfully',
    collection
  });
});

// Delete collection
router.delete('/mod-collections/:id', (req, res) => {
  loadCollections();
  const index = collections.findIndex(c => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  collections.splice(index, 1);
  saveCollections();

  res.json({
    success: true,
    message: 'Collection deleted successfully'
  });
});

// Export collection
router.get('/mod-collections/:id/export', (req, res) => {
  loadCollections();
  const collection = collections.find(c => c.id === req.params.id);

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  const exportData = {
    name: collection.name,
    description: collection.description,
    mods: collection.mods,
    exportedAt: new Date(),
    version: '1.0'
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${collection.name.replace(/[^a-z0-9]/gi, '_')}.json"`);
  res.json(exportData);
});

// Import collection
router.post('/mod-collections/import', (req, res) => {
  const { name, description, mods } = req.body;

  if (!mods || !Array.isArray(mods)) {
    return res.status(400).json({ error: 'Invalid collection format' });
  }

  const collection = {
    id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name || 'Imported Collection',
    description: description || 'Imported mod collection',
    mods,
    isPublic: false,
    createdAt: new Date(),
    createdBy: req.user?.displayName || 'Admin',
    downloads: 0,
    lastModified: new Date(),
    imported: true
  };

  collections.push(collection);
  saveCollections();

  res.json({
    success: true,
    message: 'Collection imported successfully',
    collection
  });
});

// Apply collection (activate all mods in collection)
router.post('/mod-collections/:id/apply', async (req, res) => {
  loadCollections();
  const collection = collections.find(c => c.id === req.params.id);

  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  // This would integrate with modManager to enable all mods
  // For now, just return the mod list

  res.json({
    success: true,
    message: 'Collection ready to apply',
    mods: collection.mods
  });
});

// Load collections on startup
loadCollections();

module.exports = router;
