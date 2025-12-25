const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const execPromise = promisify(exec);

// GitHub repository info
const GITHUB_REPO = 'mkungen89/Arma-reforger-server';

// Get current branch
async function getCurrentBranch() {
    try {
        const { stdout } = await execPromise('git rev-parse --abbrev-ref HEAD');
        return stdout.trim();
    } catch (error) {
        console.error('Error getting current branch:', error);
        return 'main'; // fallback to main
    }
}

// Get current version from package.json
async function getCurrentVersion() {
    try {
        const packagePath = path.join(__dirname, '../package.json');
        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
        return packageJson.version || '1.0.0';
    } catch (error) {
        console.error('Error reading package.json:', error);
        return '1.0.0';
    }
}

// Get current git commit hash
async function getCurrentCommit() {
    try {
        const { stdout } = await execPromise('git rev-parse HEAD');
        return stdout.trim();
    } catch (error) {
        console.error('Error getting current commit:', error);
        return null;
    }
}

// Get latest commit from GitHub
async function getLatestCommit(branch = 'main') {
    try {
        const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/commits/${branch}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Arma-Reforger-Server-Manager'
            }
        });
        return {
            sha: response.data.sha,
            message: response.data.commit.message,
            author: response.data.commit.author.name,
            date: response.data.commit.author.date
        };
    } catch (error) {
        console.error(`Error fetching latest commit from GitHub (branch: ${branch}):`, error.message);
        return null;
    }
}

// Check for updates
router.get('/system/check-update', async (req, res) => {
    try {
        const currentBranch = await getCurrentBranch();
        const currentCommit = await getCurrentCommit();
        const latestCommit = await getLatestCommit(currentBranch);
        const currentVersion = await getCurrentVersion();

        if (!currentCommit || !latestCommit) {
            return res.json({
                updateAvailable: false,
                error: 'Could not check for updates. Make sure this is a git repository.',
                currentVersion,
                currentBranch
            });
        }

        const updateAvailable = currentCommit !== latestCommit.sha;

        res.json({
            updateAvailable,
            currentVersion,
            currentCommit: currentCommit.substring(0, 7),
            latestCommit: {
                sha: latestCommit.sha.substring(0, 7),
                message: latestCommit.message,
                author: latestCommit.author,
                date: latestCommit.date
            }
        });
    } catch (error) {
        console.error('Error checking for updates:', error);
        res.status(500).json({ error: 'Failed to check for updates' });
    }
});

// Perform update
router.post('/system/update', async (req, res) => {
    try {
        // Check if we're in a git repository
        try {
            await execPromise('git rev-parse --git-dir');
        } catch (error) {
            return res.status(400).json({
                error: 'Not a git repository. Cannot auto-update.',
                message: 'Please update manually using: git pull'
            });
        }

        // Get current branch
        const currentBranch = await getCurrentBranch();

        // Stash any local changes
        console.log('Stashing local changes...');
        await execPromise('git stash');

        // Pull latest changes
        console.log(`Pulling latest changes from GitHub (branch: ${currentBranch})...`);
        const { stdout: pullOutput } = await execPromise(`git pull origin ${currentBranch}`);

        // Install/update npm dependencies in root
        console.log('Installing npm dependencies...');
        await execPromise('npm install');

        // Install/update frontend dependencies and rebuild
        console.log('Building frontend...');
        await execPromise('cd frontend && npm install && npm run build');

        // Get new version
        const newVersion = await getCurrentVersion();
        const newCommit = await getCurrentCommit();

        res.json({
            success: true,
            message: 'Update completed successfully! Please restart the service.',
            pullOutput,
            newVersion,
            newCommit: newCommit ? newCommit.substring(0, 7) : 'unknown',
            restartRequired: true
        });

        // Auto-restart after 5 seconds to allow response to be sent
        setTimeout(() => {
            console.log('Restarting service after update...');
            process.exit(0); // systemd will auto-restart the service
        }, 5000);

    } catch (error) {
        console.error('Error performing update:', error);
        res.status(500).json({
            error: 'Failed to update',
            details: error.message
        });
    }
});

// Get system info
router.get('/system/info', async (req, res) => {
    try {
        const version = await getCurrentVersion();
        const commit = await getCurrentCommit();

        // Get git remote URL
        let repoUrl = '';
        try {
            const { stdout } = await execPromise('git config --get remote.origin.url');
            repoUrl = stdout.trim();
        } catch (error) {
            repoUrl = `https://github.com/${GITHUB_REPO}`;
        }

        // Get branch
        const branch = await getCurrentBranch();

        res.json({
            version,
            commit: commit ? commit.substring(0, 7) : 'unknown',
            branch,
            repoUrl,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        });
    } catch (error) {
        console.error('Error getting system info:', error);
        res.status(500).json({ error: 'Failed to get system info' });
    }
});

module.exports = router;
