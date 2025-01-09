class SystemAliasService {
    constructor() {
        this.aliasCache = new Map();
        
        // Listen for system alias updates
        window.socketIo.on('systemAliasesUpdated', () => {
            console.log('System aliases updated, clearing cache');
            this.aliasCache.clear();
        });
    }

    async getAlias(shortName) {
        // Check cache first
        if (this.aliasCache.has(shortName)) {
            return this.aliasCache.get(shortName);
        }

        try {
            const response = await fetch(`/api/system-alias/${shortName}`);
            const data = await response.json();
            this.aliasCache.set(shortName, data.alias);
            return data.alias;
        } catch (error) {
            console.error('Error fetching system alias:', error);
            return shortName;
        }
    }
}

// Export singleton instance
window.systemAliasService = new SystemAliasService();
