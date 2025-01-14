const fs = require('fs');
const path = require('path');

class SystemAliasService {
    constructor() {
        this.aliasMap = new Map();
        this.aliasFile = path.join('data', 'system-alias.csv');
        this.loadAliases();
    }

    validateSystemName(shortName) {
        if (!shortName || typeof shortName !== 'string') {
            throw new Error('System name must be a non-empty string');
        }
        if (!/^[a-zA-Z0-9-_]+$/.test(shortName)) {
            throw new Error('System name can only contain letters, numbers, hyphens, and underscores');
        }
        return shortName;
    }

    loadAliases() {
        try {
            if (!fs.existsSync(this.aliasFile)) {
                console.log('Creating new system alias file');
                fs.writeFileSync(this.aliasFile, 'shortName,alias\n', 'utf-8');
                return;
            }

            const content = fs.readFileSync(this.aliasFile, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
                console.log('Empty alias file, adding header');
                fs.writeFileSync(this.aliasFile, 'shortName,alias\n', 'utf-8');
                return;
            }

            // Validate header
            if (!lines[0].toLowerCase().includes('shortname,alias')) {
                console.error('Invalid alias file format: missing header');
                fs.writeFileSync(this.aliasFile, 'shortName,alias\n' + content, 'utf-8');
            }
            
            // Clear existing aliases before loading
            this.aliasMap.clear();
            
            // Process data lines
            const dataLines = lines.slice(1);
            dataLines.forEach((line, index) => {
                try {
                    const [shortName, alias] = line.split(',').map(s => s.trim());
                    if (!shortName || !alias) {
                        console.warn(`Skipping invalid line ${index + 2}: missing shortName or alias`);
                        return;
                    }
                    
                    try {
                        const validatedName = this.validateSystemName(shortName);
                        this.aliasMap.set(validatedName, alias);
                    } catch (validationError) {
                        console.warn(`Skipping line ${index + 2}: ${validationError.message}`);
                    }
                } catch (parseError) {
                    console.warn(`Error parsing line ${index + 2}: ${parseError.message}`);
                }
            });
            
            console.log(`Loaded ${this.aliasMap.size} system aliases from ${this.aliasFile}`);
        } catch (error) {
            console.error('Error loading system aliases:', error);
            // Create new file with header if there was an error
            fs.writeFileSync(this.aliasFile, 'shortName,alias\n', 'utf-8');
        }
    }

    getAlias(shortName) {
        // Return the alias if it exists, otherwise return the shortName
        return this.aliasMap.get(shortName) || shortName;
    }

    async addSystem(shortName, alias = null) {
        try {
            if (!shortName) {
                throw new Error('System name is required');
            }

            // Validate system name
            const validatedName = this.validateSystemName(shortName);

            // Ensure directory exists
            const dir = path.dirname(this.aliasFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Create file with header if it doesn't exist
            if (!fs.existsSync(this.aliasFile)) {
                fs.writeFileSync(this.aliasFile, 'shortName,alias\n', 'utf-8');
            }

            // Read existing content
            const content = fs.readFileSync(this.aliasFile, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());

            // Ensure header exists
            const header = 'shortName,alias';
            const dataLines = lines[0]?.toLowerCase().includes('shortname,alias') ? lines.slice(1) : lines;

            // Parse existing systems
            const systems = new Map();
            dataLines.forEach((line, index) => {
                try {
                    const [name, existingAlias] = line.split(',').map(s => s.trim());
                    if (name && this.validateSystemName(name)) {
                        systems.set(name, existingAlias || name);
                    }
                } catch (error) {
                    console.warn(`Skipping invalid system at line ${index + 2}: ${error.message}`);
                }
            });

            // Add new system or update existing one
            const displayAlias = alias || validatedName;
            if (!systems.has(validatedName) || systems.get(validatedName) !== displayAlias) {
                systems.set(validatedName, displayAlias);
                const newContent = [
                    header,
                    ...Array.from(systems.entries())
                        .sort(([a], [b]) => a.localeCompare(b)) // Sort systems alphabetically
                        .map(([name, displayName]) => `${name},${displayName}`)
                ].join('\n');
                
                await fs.promises.writeFile(this.aliasFile, newContent + '\n', 'utf-8');
                console.log(`${systems.has(validatedName) ? 'Updated' : 'Added'} system ${validatedName} with alias ${displayAlias}`);

                // Update local map
                this.aliasMap = systems;

                // Notify clients of the update
                if (this.io) {
                    this.io.emit('systemAliasesUpdated');
                }
            }

            return displayAlias;
        } catch (error) {
            console.error('Error managing system alias:', error);
            throw error; // Re-throw to allow caller to handle the error
        }
    }
}

module.exports = new SystemAliasService();
