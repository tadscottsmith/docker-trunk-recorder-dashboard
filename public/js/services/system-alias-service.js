export class SystemAliasService {
    constructor() {
        this.aliasCache = new Map();
        
        // Listen for system alias updates
        window.socketIo.on('systemAliasesUpdated', () => {
            console.log('System aliases updated, clearing cache');
            this.aliasCache.clear();
        });
    }

    async getAlias(shortName) {
        try {
            // Check cache first
            if (this.aliasCache.has(shortName)) {
                return this.aliasCache.get(shortName);
            }

            // Fetch from server
            const response = await fetch(`/api/system-alias/${shortName}`);
            if (!response.ok) {
                throw new Error(`Failed to get alias: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Cache the result
            this.aliasCache.set(shortName, data.alias);
            
            return data.alias;
        } catch (error) {
            console.error('Error getting system alias:', error);
            return shortName;
        }
    }

    async addSystem(shortName, alias = null) {
        try {
            const response = await fetch(`/api/system-alias/${shortName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ alias: alias || shortName })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to add system: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Update cache
            this.aliasCache.set(shortName, data.alias);
            
            return data.alias;
        } catch (error) {
            console.error('Error adding system:', error);
            return shortName;
        }
    }
}

// Export singleton instance
export const systemAliasService = new SystemAliasService();
