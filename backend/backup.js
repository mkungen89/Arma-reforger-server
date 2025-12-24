const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const backupsDir = path.join(__dirname, '../backups');
const configPath = path.join(__dirname, '../config');

// Ensure backups directory exists
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Backup metadata storage
const backupMetadataFile = path.join(backupsDir, 'backups.json');
let backups = [];

// Load backup metadata
function loadBackups() {
  try {
    if (fs.existsSync(backupMetadataFile)) {
      const data = fs.readFileSync(backupMetadataFile, 'utf8');
      backups = JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading backup metadata:', error);
    backups = [];
  }
}

// Save backup metadata
function saveBackups() {
  try {
    fs.writeFileSync(backupMetadataFile, JSON.stringify(backups, null, 2));
  } catch (error) {
    console.error('Error saving backup metadata:', error);
  }
}

// Get folder size
function getFolderSize(folderPath) {
  let totalSize = 0;

  if (!fs.existsSync(folderPath)) return 0;

  const files = fs.readdirSync(folderPath);

  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      totalSize += getFolderSize(filePath);
    } else {
      totalSize += stats.size;
    }
  });

  return totalSize;
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Get all backups
router.get('/backup/list', (req, res) => {
  loadBackups();

  // Update sizes
  backups.forEach(backup => {
    const backupPath = path.join(backupsDir, backup.filename);
    if (fs.existsSync(backupPath)) {
      backup.size = fs.statSync(backupPath).size;
      backup.sizeFormatted = formatBytes(backup.size);
    }
  });

  saveBackups();

  res.json({
    count: backups.length,
    totalSize: formatBytes(backups.reduce((sum, b) => sum + (b.size || 0), 0)),
    backups: backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  });
});

// Create new backup
router.post('/backup/create', async (req, res) => {
  const { name, description, includeConfig, includeMods, includeProfiles, includeServer } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Backup name is required' });
  }

  const backupId = `backup_${Date.now()}`;
  const filename = `${backupId}.zip`;
  const backupPath = path.join(backupsDir, filename);

  try {
    const zip = new AdmZip();

    // Add config files
    if (includeConfig !== false && fs.existsSync(configPath)) {
      const configFiles = fs.readdirSync(configPath);
      configFiles.forEach(file => {
        const filePath = path.join(configPath, file);
        if (fs.statSync(filePath).isFile()) {
          zip.addLocalFile(filePath, 'config/');
        }
      });
    }

    // Add mods (if workshop mods exist)
    if (includeMods !== false) {
      const modsPath = path.join(__dirname, '../mods');
      if (fs.existsSync(modsPath)) {
        zip.addLocalFolder(modsPath, 'mods');
      }
    }

    // Add server profiles
    if (includeProfiles !== false) {
      // This would include server profiles from the game server directory
      // Path might vary based on configuration
      const serverConfig = JSON.parse(fs.readFileSync(path.join(configPath, 'server-config.json'), 'utf8'));
      const profilesPath = path.join(serverConfig.serverPath || '', 'profile');

      if (fs.existsSync(profilesPath)) {
        zip.addLocalFolder(profilesPath, 'profiles');
      }
    }

    // Add server files (optional, usually very large)
    if (includeServer) {
      // Not recommended for regular backups due to size
      const serverConfig = JSON.parse(fs.readFileSync(path.join(configPath, 'server-config.json'), 'utf8'));
      const serverPath = serverConfig.serverPath;

      if (fs.existsSync(serverPath)) {
        zip.addLocalFolder(serverPath, 'server');
      }
    }

    // Write zip file
    zip.writeZip(backupPath);

    const stats = fs.statSync(backupPath);
    const backup = {
      id: backupId,
      filename,
      name,
      description: description || '',
      createdAt: new Date(),
      createdBy: req.user?.displayName || 'Admin',
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      includes: {
        config: includeConfig !== false,
        mods: includeMods !== false,
        profiles: includeProfiles !== false,
        server: includeServer === true
      }
    };

    backups.push(backup);
    saveBackups();

    res.json({
      success: true,
      message: 'Backup created successfully',
      backup
    });

  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download backup
router.get('/backup/download/:id', (req, res) => {
  loadBackups();

  const backup = backups.find(b => b.id === req.params.id);
  if (!backup) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  const backupPath = path.join(backupsDir, backup.filename);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: 'Backup file not found' });
  }

  res.download(backupPath, backup.filename);
});

// Restore backup
router.post('/backup/restore/:id', async (req, res) => {
  loadBackups();

  const backup = backups.find(b => b.id === req.params.id);
  if (!backup) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  const backupPath = path.join(backupsDir, backup.filename);
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: 'Backup file not found' });
  }

  try {
    const zip = new AdmZip(backupPath);
    const zipEntries = zip.getEntries();

    // Extract config
    if (backup.includes.config) {
      zipEntries.forEach(entry => {
        if (entry.entryName.startsWith('config/')) {
          const targetPath = path.join(__dirname, '..', entry.entryName);
          const targetDir = path.dirname(targetPath);

          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          fs.writeFileSync(targetPath, entry.getData());
        }
      });
    }

    // Extract mods
    if (backup.includes.mods) {
      zipEntries.forEach(entry => {
        if (entry.entryName.startsWith('mods/')) {
          const targetPath = path.join(__dirname, '..', entry.entryName);
          const targetDir = path.dirname(targetPath);

          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          if (!entry.isDirectory) {
            fs.writeFileSync(targetPath, entry.getData());
          }
        }
      });
    }

    // Extract profiles
    if (backup.includes.profiles) {
      const serverConfig = JSON.parse(fs.readFileSync(path.join(configPath, 'server-config.json'), 'utf8'));
      const profilesBasePath = path.join(serverConfig.serverPath || '', 'profile');

      zipEntries.forEach(entry => {
        if (entry.entryName.startsWith('profiles/')) {
          const relativePath = entry.entryName.replace('profiles/', '');
          const targetPath = path.join(profilesBasePath, relativePath);
          const targetDir = path.dirname(targetPath);

          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          if (!entry.isDirectory) {
            fs.writeFileSync(targetPath, entry.getData());
          }
        }
      });
    }

    res.json({
      success: true,
      message: 'Backup restored successfully',
      backup
    });

  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete backup
router.delete('/backup/:id', (req, res) => {
  loadBackups();

  const backupIndex = backups.findIndex(b => b.id === req.params.id);
  if (backupIndex === -1) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  const backup = backups[backupIndex];
  const backupPath = path.join(backupsDir, backup.filename);

  try {
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }

    backups.splice(backupIndex, 1);
    saveBackups();

    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get backup info
router.get('/backup/:id', (req, res) => {
  loadBackups();

  const backup = backups.find(b => b.id === req.params.id);
  if (!backup) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  const backupPath = path.join(backupsDir, backup.filename);

  if (fs.existsSync(backupPath)) {
    const zip = new AdmZip(backupPath);
    const entries = zip.getEntries();

    backup.files = entries.map(entry => ({
      name: entry.entryName,
      size: entry.header.size,
      compressed: entry.header.compressedSize,
      isDirectory: entry.isDirectory
    }));
  }

  res.json(backup);
});

// Get backup statistics
router.get('/backup/stats/summary', (req, res) => {
  loadBackups();

  const stats = {
    totalBackups: backups.length,
    totalSize: backups.reduce((sum, b) => sum + (b.size || 0), 0),
    totalSizeFormatted: formatBytes(backups.reduce((sum, b) => sum + (b.size || 0), 0)),
    oldestBackup: backups.length > 0
      ? backups.reduce((oldest, b) => new Date(b.createdAt) < new Date(oldest.createdAt) ? b : oldest)
      : null,
    newestBackup: backups.length > 0
      ? backups.reduce((newest, b) => new Date(b.createdAt) > new Date(newest.createdAt) ? b : newest)
      : null,
    backupsThisWeek: backups.filter(b => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(b.createdAt) > weekAgo;
    }).length
  };

  res.json(stats);
});

// Load backups on startup
loadBackups();

module.exports = router;
