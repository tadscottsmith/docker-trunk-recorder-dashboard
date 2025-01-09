const fs = require('fs');
const path = require('path');

class SystemAliasService {
    constructor() {
        this.aliasMap = new Map();
        this.aliasFile = path.join('data', 'system-alias.csv');
        this.loadAliases();
    }

    loadAliases() {
        try {
            if (!fs.existsSync(this.aliasFile)) {
                console.log('No system alias file found');
                return;
            }

            const content = fs.readFileSync(this.aliasFile, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            // Clear existing aliases before loading
            this.aliasMap.clear();
            
            // Skip header if present
            const dataLines = lines[0].toLowerCase().includes('shortname,alias') ? lines.slice(1) : lines;
            
            dataLines.forEach(line => {
                const [shortName, alias] = line.split(',').map(s => s.trim());
                if (shortName && alias) {
                    this.aliasMap.set(shortName, alias);
                }
            });
            
            console.log(`Loaded ${this.aliasMap.size} system aliases from ${this.aliasFile}`);
        } catch (error) {
            console.error('Error loading system aliases:', error);
        }
    }

    getAlias(shortName) {
        // Return the alias if it exists, otherwise return the shortName
        return this.aliasMap.get(shortName) || shortName;
    }
}

module.exports = new SystemAliasService();
