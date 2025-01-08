const fs = require('fs');
const path = require('path');

class SystemAliasService {
    constructor() {
        this.aliasMap = new Map();
        this.aliasFile = path.join('data', 'system-alias.csv');
        this.ensureAliasFile();
        this.loadAliases();
        this.setupFileWatcher();
    }

    setupFileWatcher() {
        const dir = path.dirname(this.aliasFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.watch(this.aliasFile, (eventType) => {
            if (eventType === 'change') {
                console.log('System alias file changed, reloading...');
                this.loadAliases();
                // Notify any registered listeners
                if (this.onAliasesChanged) {
                    this.onAliasesChanged();
                }
            }
        });

        // Also watch the directory for file creation
        fs.watch(dir, (eventType, filename) => {
            if (filename === 'system-alias.csv' && !fs.existsSync(this.aliasFile)) {
                console.log('System alias file created, ensuring defaults...');
                this.ensureAliasFile();
                this.loadAliases();
                if (this.onAliasesChanged) {
                    this.onAliasesChanged();
                }
            }
        });
    }

    // Register a callback for alias changes
    onAliasChange(callback) {
        this.onAliasesChanged = callback;
    }

    ensureAliasFile() {
        const dir = path.dirname(this.aliasFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.aliasFile)) {
            fs.writeFileSync(this.aliasFile, 'shortName,alias\n', 'utf-8');
        }
    }

    loadAliases() {
        try {
            const content = fs.readFileSync(this.aliasFile, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            // Skip header
            lines.slice(1).forEach(line => {
                const [shortName, alias] = line.split(',').map(s => s.trim());
                if (shortName && alias) {
                    this.aliasMap.set(shortName, alias);
                }
            });
            
            console.log(`Loaded ${this.aliasMap.size} system aliases`);
        } catch (error) {
            console.error('Error loading system aliases:', error);
        }
    }

    async saveAliases() {
        try {
            const lines = ['shortName,alias'];
            for (const [shortName, alias] of this.aliasMap.entries()) {
                lines.push(`${shortName},${alias}`);
            }
            await fs.promises.writeFile(this.aliasFile, lines.join('\n'), 'utf-8');
        } catch (error) {
            console.error('Error saving system aliases:', error);
        }
    }

    getAlias(shortName) {
        return this.aliasMap.get(shortName) || this.generateDefaultAlias(shortName);
    }

    generateDefaultAlias(shortName) {
        // Convert e.g., "butco" to "Butler"
        return shortName
            .replace(/co$/, '') // Remove 'co' suffix
            .split(/[_-]/) // Split on underscore or hyphen
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    async addSystem(shortName) {
        if (!this.aliasMap.has(shortName)) {
            const defaultAlias = this.generateDefaultAlias(shortName);
            this.aliasMap.set(shortName, defaultAlias);
            await this.saveAliases();
            return true;
        }
        return false;
    }

    async updateAlias(shortName, alias) {
        if (alias && alias.trim()) {
            this.aliasMap.set(shortName, alias.trim());
            await this.saveAliases();
            return true;
        }
        return false;
    }
}

module.exports = new SystemAliasService();
