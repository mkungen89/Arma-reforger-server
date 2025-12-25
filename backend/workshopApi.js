const axios = require('axios');
const cheerio = require('cheerio');

// Arma Reforger Workshop API client
class WorkshopAPI {
    constructor() {
        this.baseUrl = 'https://reforger.armaplatform.com';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Get mod details from workshop
    async getModDetails(workshopId) {
        // Check cache first
        const cached = this.cache.get(workshopId);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            // Try official API first
            const apiUrl = `${this.baseUrl}/api/workshop/item/${workshopId}`;
            const response = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'Arma-Reforger-Server-Manager/2.0',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            if (response.data) {
                const modData = this.parseApiResponse(response.data, workshopId);

                // Cache the result
                this.cache.set(workshopId, {
                    data: modData,
                    timestamp: Date.now()
                });

                return modData;
            }
        } catch (apiError) {
            console.log(`API fetch failed for ${workshopId}, trying web scraping...`);
        }

        // Fallback to web scraping
        try {
            const webUrl = `${this.baseUrl}/workshop/${workshopId}`;
            const response = await axios.get(webUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });

            const modData = this.parseWebPage(response.data, workshopId);

            // Cache the result
            this.cache.set(workshopId, {
                data: modData,
                timestamp: Date.now()
            });

            return modData;
        } catch (webError) {
            console.error(`Failed to fetch mod ${workshopId}:`, webError.message);
            throw new Error(`Could not fetch mod details for ${workshopId}`);
        }
    }

    // Parse API response
    parseApiResponse(data, workshopId) {
        const fileSizeBytes = data.size || data.fileSize || 0;
        const gameVersion =
            data.gameVersion ||
            data.requiredGameVersion ||
            data.minGameVersion ||
            data.game?.version ||
            data.game?.gameVersion ||
            '';

        const modInfo = {
            id: workshopId,
            name: data.name || data.title || 'Unknown Mod',
            author: data.author?.name || data.authorName || 'Unknown',
            description: data.description || data.summary || '',
            version: data.version || data.latestVersion || '1.0.0',
            size: this.formatBytes(fileSizeBytes),
            fileSizeBytes,
            gameVersion,
            updated: data.updated || data.timeUpdated || new Date().toISOString(),
            downloads: data.downloads || data.subscriptions || 0,
            rating: data.rating || 0,
            thumbnailUrl: data.thumbnail || data.thumbnailUrl || '',
            dependencies: [],
            status: 'not_installed',
            enabled: false
        };

        // Parse dependencies
        if (data.dependencies && Array.isArray(data.dependencies)) {
            modInfo.dependencies = data.dependencies.map(dep => {
                if (typeof dep === 'string') {
                    return dep;
                } else if (dep.id || dep.workshopId) {
                    return (dep.id || dep.workshopId).toString();
                }
                return null;
            }).filter(Boolean);
        } else if (data.requiredMods && Array.isArray(data.requiredMods)) {
            modInfo.dependencies = data.requiredMods.map(mod =>
                (mod.id || mod.workshopId || mod).toString()
            );
        }

        return modInfo;
    }

    // Parse web page (fallback)
    parseWebPage(html, workshopId) {
        const $ = cheerio.load(html);

        const modInfo = {
            id: workshopId,
            name: 'Unknown Mod',
            author: 'Unknown',
            description: '',
            version: '1.0.0',
            size: 'Unknown',
            fileSizeBytes: 0,
            gameVersion: '',
            updated: new Date().toISOString(),
            downloads: 0,
            rating: 0,
            thumbnailUrl: '',
            dependencies: [],
            status: 'not_installed',
            enabled: false
        };

        // Preferred: parse Next.js payload (stable and includes all metadata)
        try {
            const nextDataRaw = $('#__NEXT_DATA__').text();
            if (nextDataRaw) {
                const nextData = JSON.parse(nextDataRaw);
                const asset = nextData?.props?.pageProps?.asset;
                if (asset) {
                    modInfo.name = asset.name || modInfo.name;
                    modInfo.author = asset.author?.username || asset.author?.name || modInfo.author;
                    modInfo.description = asset.description || asset.summary || modInfo.description;

                    const versionNumber = asset.currentVersionNumber || asset.latestVersionNumber;
                    if (versionNumber) modInfo.version = versionNumber;

                    const sizeBytes = asset.currentVersionSize || asset.currentVersionSizeBytes || asset.totalFileSize || 0;
                    if (typeof sizeBytes === 'number') {
                        modInfo.fileSizeBytes = sizeBytes;
                        modInfo.size = this.formatBytes(sizeBytes);
                    }

                    modInfo.rating = asset.averageRating || asset.ratings?.rating || modInfo.rating;
                    modInfo.updated = asset.updatedAt || modInfo.updated;
                    modInfo.downloads =
                        nextData?.props?.pageProps?.getAssetDownloadTotal?.total ||
                        asset.getAssetDownloadTotal?.total ||
                        asset.downloadTotal ||
                        modInfo.downloads;

                    // Game version can be on asset, dependencyTree, or current version
                    modInfo.gameVersion =
                        asset.gameVersion ||
                        asset.dependencyTree?.gameVersion ||
                        asset.versions?.[0]?.gameVersion ||
                        modInfo.gameVersion;

                    // Thumbnail / preview
                    const preview0 = asset.previews?.[0];
                    const thumb =
                        preview0?.thumbnails?.['image/jpeg']?.[0]?.url ||
                        preview0?.url ||
                        $('meta[property="og:image"]').attr('content') ||
                        modInfo.thumbnailUrl;
                    if (thumb) modInfo.thumbnailUrl = thumb;

                    // Dependencies (best-effort)
                    if (Array.isArray(asset.dependencies)) {
                        modInfo.dependencies = asset.dependencies
                            .map((d) => (d?.id || d?.workshopId || d)?.toString?.())
                            .filter(Boolean);
                    }

                    return modInfo;
                }
            }
        } catch (e) {
            // Fall back to DOM scraping below
        }

        // Extract mod name
        const title = $('h1.workshop-item-title, .item-title, h1').first().text().trim();
        if (title) modInfo.name = title;

        // Extract author
        const author = $('.author-name, .workshop-author, a[href*="/profile/"]').first().text().trim();
        if (author) modInfo.author = author;

        // Extract description
        const description = $('.workshop-description, .item-description, .description').first().text().trim();
        if (description) modInfo.description = description;

        // Extract version
        const version = $('meta[name="version"]').attr('content') ||
                       $('.version, .mod-version').first().text().trim();
        if (version) modInfo.version = version;

        // Extract size
        const size = $('.file-size, .item-size').first().text().trim();
        if (size) modInfo.size = size;

        // Extract game version (best-effort)
        const gameVersion =
            $('meta[name="gameVersion"]').attr('content') ||
            $('meta[name="requiredGameVersion"]').attr('content') ||
            $('.game-version, .required-game-version, .min-game-version').first().text().trim();
        if (gameVersion) modInfo.gameVersion = gameVersion;

        // If we got a size string (e.g. "196.94 KB"), keep fileSizeBytes as 0 (unknown)

        // Extract thumbnail
        const thumbnail = $('meta[property="og:image"]').attr('content') ||
                         $('.workshop-thumbnail img, .item-thumbnail img').first().attr('src');
        if (thumbnail) modInfo.thumbnailUrl = thumbnail;

        // Extract dependencies - this is the key part!
        const dependencies = [];

        // Method 1: Look for dependency section
        $('.dependencies, .required-mods, .requirements').find('a[href*="/workshop/"]').each((i, elem) => {
            const href = $(elem).attr('href');
            const match = href.match(/\/workshop\/([A-Z0-9]+)/i);
            if (match && match[1]) {
                dependencies.push(match[1]);
            }
        });

        // Method 2: Look for data attributes
        $('[data-dependency-id], [data-required-mod]').each((i, elem) => {
            const depId = $(elem).attr('data-dependency-id') || $(elem).attr('data-required-mod');
            if (depId) dependencies.push(depId);
        });

        // Method 3: Parse from script tags (workshop data)
        $('script').each((i, elem) => {
            const scriptContent = $(elem).html();
            if (scriptContent && scriptContent.includes('dependencies')) {
                try {
                    // Try to extract JSON data
                    const jsonMatch = scriptContent.match(/dependencies["\s:]+\[([^\]]+)\]/);
                    if (jsonMatch) {
                        const depStr = jsonMatch[1];
                        const depMatches = depStr.match(/[A-Z0-9]{16,}/gi);
                        if (depMatches) {
                            dependencies.push(...depMatches);
                        }
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }
        });

        modInfo.dependencies = [...new Set(dependencies)]; // Remove duplicates

        return modInfo;
    }

    // Recursively get all dependencies
    async getAllDependencies(workshopId, visited = new Set()) {
        if (visited.has(workshopId)) {
            return { mods: [], tree: {} };
        }

        visited.add(workshopId);

        try {
            const modInfo = await this.getModDetails(workshopId);
            const dependencyTree = {
                [workshopId]: {
                    ...modInfo,
                    dependencies: []
                }
            };

            const allMods = [modInfo];

            // Recursively fetch dependencies
            for (const depId of modInfo.dependencies) {
                if (!visited.has(depId)) {
                    const depResult = await this.getAllDependencies(depId, visited);
                    allMods.push(...depResult.mods);
                    Object.assign(dependencyTree, depResult.tree);
                    dependencyTree[workshopId].dependencies.push(depId);
                }
            }

            return {
                mods: allMods,
                tree: dependencyTree
            };
        } catch (error) {
            console.error(`Error fetching dependencies for ${workshopId}:`, error.message);
            return { mods: [], tree: {} };
        }
    }

    // Format bytes to human readable
    formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Search workshop
    async searchMods(query, options = {}) {
        try {
            const params = new URLSearchParams({
                q: query,
                limit: options.limit || 20,
                offset: options.offset || 0,
                sort: options.sort || 'popular'
            });

            const response = await axios.get(`${this.baseUrl}/api/workshop/search?${params}`, {
                headers: {
                    'User-Agent': 'Arma-Reforger-Server-Manager/2.0',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            if (response.data && response.data.items) {
                return response.data.items.map(item => this.parseApiResponse(item, item.id));
            }

            return [];
        } catch (error) {
            console.error('Search failed:', error.message);
            return [];
        }
    }
}

module.exports = new WorkshopAPI();
