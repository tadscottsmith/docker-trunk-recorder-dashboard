const fs = require('fs');
const path = require('path');
const systemAliasService = require('./system-alias-service');

class TalkgroupService {
    constructor() {
        this.talkgroupsMap = new Map();
        this.unknownTalkgroups = new Set();
        this.talkgroupFiles = new Map(); // Maps system shortNames to their talkgroup files
        this.knownSystems = new Set(); // Track unique system shortNames
        this.io = null; // Will be set when setupFileWatcher is called

        // Listen for alias changes
        systemAliasService.onAliasChange(() => {
            if (this.io) {
                this.io.emit('systemsUpdated');
            }
        });
    }

    // Get list of known systems with aliases
    getKnownSystems() {
        return Array.from(this.knownSystems).map(shortName => ({
            shortName,
            displayName: systemAliasService.getAlias(shortName)
        }));
    }

    // Add a new system to known systems
    async addSystem(shortName) {
        if (shortName && !this.knownSystems.has(shortName)) {
            this.knownSystems.add(shortName);
            await systemAliasService.addSystem(shortName);
            return true;
        }
        return false;
    }

    getTalkgroupFile(shortName) {
        const talkgroupsDir = path.join('data', 'talkgroups');
        if (!shortName) return path.join(talkgroupsDir, 'talkgroups.csv');
        
        const systemFile = path.join(talkgroupsDir, `${shortName}-talkgroups.csv`);
        return fs.existsSync(systemFile) ? systemFile : path.join(talkgroupsDir, 'talkgroups.csv');
    }

    async saveTalkgroups(shortName) {
        const talkgroupFile = this.getTalkgroupFile(shortName);
        const systemTalkgroups = new Map(
            [...this.talkgroupsMap.entries()].filter(([decimal, data]) => 
                data.shortName === shortName || (!data.shortName && !shortName)
            )
        );

        try {
            // Prepare CSV content
            const header = 'decimal,hex,alphaTag,mode,description,tag,category';
            const lines = [];

            // Add known talkgroups
            for (const [decimal, data] of systemTalkgroups.entries()) {
                const line = [
                    decimal,
                    data.hex || '',
                    data.alphaTag || `Talkgroup ${decimal}`,
                    data.mode || '',
                    data.description || '',
                    data.tag || 'Unknown',
                    data.category || 'Unknown'
                ].map(field => `"${field}"`).join(',');
                lines.push(line);
            }

            // Add unknown talkgroups
            for (const decimal of this.unknownTalkgroups) {
                if (!systemTalkgroups.has(decimal)) {
                    const line = [
                        decimal,
                        '',
                        `Talkgroup ${decimal}`,
                        '',
                        '',
                        'Unknown',
                        'Unknown'
                    ].map(field => `"${field}"`).join(',');
                    lines.push(line);
                }
            }

            // Write to file
            const content = [header, ...lines].join('\n');
            await fs.promises.writeFile(talkgroupFile, content, 'utf-8');
            console.log(`Saved ${lines.length} talkgroups to ${talkgroupFile}`);
        } catch (error) {
            console.error('Error saving talkgroup file:', error);
        }
    }

    loadTalkgroups() {
        const talkgroupsDir = path.join('data', 'talkgroups');
        
        // First load the default talkgroups
        const defaultFile = path.join(talkgroupsDir, 'talkgroups.csv');
        if (fs.existsSync(defaultFile)) {
            this.loadTalkgroupFile(defaultFile);
        }

        // Then load any system-specific files
        if (fs.existsSync(talkgroupsDir)) {
            const files = fs.readdirSync(talkgroupsDir);
            files.forEach(file => {
                if (file.endsWith('-talkgroups.csv')) {
                    this.loadTalkgroupFile(path.join(talkgroupsDir, file));
                }
            });
        }
    }

    loadTalkgroupFile(filePath) {
        try {
            console.log(`Loading talkgroup data from ${filePath}`);
            const csvContent = fs.readFileSync(filePath, 'utf-8');
            const csvLines = csvContent
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('#')); // Skip comments and empty lines

            // Find the header line
            const headerIndex = csvLines.findIndex(line => {
                const lowerLine = line.toLowerCase();
                return lowerLine.includes('decimal') && 
                       (lowerLine.includes('alphatag') || lowerLine.includes('alpha tag'));
            });
            
            if (headerIndex === -1) {
                console.error(`Error: ${filePath} must have a header with at least "decimal" and "alphaTag" columns`);
                return;
            }

            const dataLines = csvLines.slice(headerIndex + 1);
            dataLines.forEach(line => {
                if (line.trim()) {
                    const [decimal, hex, alphaTag, mode, description, tag, category] = line.split(',').map(field => {
                        // Remove quotes and trim whitespace
                        return field ? field.replace(/^"(.*)"$/, '$1').trim() : '';
                    });
                    if (decimal) {
                        this.talkgroupsMap.set(decimal, {
                            hex: hex || '',
                            alphaTag: alphaTag || `Talkgroup ${decimal}`,
                            mode: mode || '',
                            description: description || '',
                            tag: tag || 'Unknown',
                            category: category || 'Unknown',
                            shortName: path.basename(filePath).startsWith('talkgroups.csv') ? null : path.basename(filePath).split('-')[0]
                        });
                    }
                }
            });
            console.log(`Loaded ${dataLines.length} talkgroups from ${filePath}`);
        } catch (error) {
            console.error(`Error loading talkgroup file ${filePath}:`, error);
        }
    }

    setupFileWatcher(io) {
        this.io = io;
        const talkgroupsDir = path.join('data', 'talkgroups');
        
        if (!fs.existsSync(talkgroupsDir)) {
            console.log('Creating talkgroups directory...');
            fs.mkdirSync(talkgroupsDir, { recursive: true });
        }

        // Watch the entire talkgroups directory for changes
        fs.watch(talkgroupsDir, async (eventType, filename) => {
            if (eventType === 'change' && filename.endsWith('.csv')) {
                console.log(`Detected change in ${filename}, reloading...`);
                this.loadTalkgroupFile(path.join(talkgroupsDir, filename));
                io.emit('talkgroupsReloaded');
            }
        });
    }

    getTalkgroupsObject() {
        return {
            talkgroups: Object.fromEntries(this.talkgroupsMap),
            unknownTalkgroups: Array.from(this.unknownTalkgroups)
        };
    }

    updateTalkgroup(decimal, metadata) {
        this.talkgroupsMap.set(decimal, {
            hex: metadata.hex || '',
            alphaTag: metadata.alphaTag,
            mode: metadata.mode || '',
            description: metadata.description || '',
            tag: metadata.tag || 'Unknown',
            category: metadata.category || 'Unknown'
        });

        this.unknownTalkgroups.delete(decimal);
    }

    handleNewTalkgroup(talkgroupId, systemShortName) {
        let changed = false;

        if (talkgroupId && !this.talkgroupsMap.has(talkgroupId)) {
            this.unknownTalkgroups.add(talkgroupId);
            changed = true;
        }

        if (systemShortName) {
            const systemAdded = this.addSystem(systemShortName);
            changed = changed || systemAdded;
        }

        return changed ? this.saveTalkgroups(systemShortName) : Promise.resolve();
    }

    getTalkgroupInfo(talkgroupId) {
        return this.talkgroupsMap.get(talkgroupId?.toString());
    }

    clear() {
        this.talkgroupsMap.clear();
        this.unknownTalkgroups.clear();
    }
}

module.exports = new TalkgroupService();
