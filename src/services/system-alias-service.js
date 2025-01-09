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

    async addSystem(shortName) {
        if (!shortName) {
            return;
        }

        try {
            // Ensure directory exists
            const dir = path.dirname(this.aliasFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Read existing content or create new file
            let content = '';
            if (fs.existsSync(this.aliasFile)) {
                content = fs.readFileSync(this.aliasFile, 'utf-8');
            }

            // Parse existing systems
            const lines = content.split('\n').filter(line => line.trim());
            const header = lines[0]?.toLowerCase().includes('shortname,alias') ? lines[0] : 'shortName,alias';
            const systems = new Map(
                lines.slice(header === lines[0] ? 1 : 0)
                    .map(line => {
                        const [name, alias] = line.split(',').map(s => s.trim());
                        return [name, alias || name];
                    })
                    .filter(([name]) => name)
            );

            // Add new system if not exists
            if (!systems.has(shortName)) {
                systems.set(shortName, shortName);
                const newContent = [
                    header,
                    ...Array.from(systems.entries()).map(([name, alias]) => `${name},${alias}`)
                ].join('\n');
                await fs.promises.writeFile(this.aliasFile, newContent + '\n', 'utf-8');
                console.log(`Added system ${shortName} to alias file`);

                // Update local map
                this.aliasMap = systems;

                // Notify clients of the update
                if (this.io) {
                    this.io.emit('systemAliasesUpdated');
                }
            }
        } catch (error) {
            console.error('Error adding system to alias file:', error);
        }
    }
}

module.exports = new SystemAliasService();
