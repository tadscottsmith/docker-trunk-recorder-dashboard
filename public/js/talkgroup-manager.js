const systemAliasService = window.systemAliasService;

export class TalkgroupManager {
    constructor() {
        this.talkgroups = {};
        this.metadata = {};
        this.timestamps = {};
        this.radioStates = {};
        this.glowStates = {};
        this.callStats = {};
        this.shortNameFilter = null;
        this.encounteredSystems = new Set();
    }

    setMetadata(metadata) {
        this.metadata = metadata;
        // Add systems from metadata to encounteredSystems
        Object.values(metadata).forEach(data => {
            if (data.shortName) {
                this.encounteredSystems.add(data.shortName);
                console.log('Added system to encounteredSystems:', data.shortName);
            }
        });
        console.log('Current encounteredSystems:', Array.from(this.encounteredSystems));
    }

    reset() {
        Object.keys(this.talkgroups).forEach(key => {
            this.talkgroups[key] = new Set();
            this.radioStates[key] = {};
            this.callStats[key] = {
                count: 0,
                timestamps: []
            };
        });
    }

    handleEvent(event) {
        const talkgroup = event.talkgroupOrSource;
        const radioId = event.radioID;
        const system = event.systemShortName || event.shortName;

        if (system) {
            this.encounteredSystems.add(system);
        }

        if (!this.talkgroups[talkgroup]) {
            this.talkgroups[talkgroup] = new Set();
            this.radioStates[talkgroup] = {};
            this.callStats[talkgroup] = {
                count: 0,
                timestamps: []
            };
        }

        if (event.eventType === 'call') {
            this.callStats[talkgroup].count++;
            this.callStats[talkgroup].timestamps.push(new Date(event.timestamp || Date.now()));
            this.cleanupOldTimestamps(talkgroup);
        }

        if (event.eventType === 'off') {
            this.talkgroups[talkgroup].delete(radioId);
            delete this.radioStates[talkgroup][radioId];
        } else {
            this.talkgroups[talkgroup].add(radioId);
            this.radioStates[talkgroup][radioId] = {
                eventType: event.eventType,
                shortName: event.systemShortName || event.shortName
            };
        }

        this.timestamps[talkgroup] = event.timestamp;
        this.glowStates[talkgroup] = event.eventType;

        // Remove glow after 30 seconds
        setTimeout(() => {
            delete this.glowStates[talkgroup];
        }, 30000);
    }

    cleanupOldTimestamps(talkgroup) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        this.callStats[talkgroup].timestamps = this.callStats[talkgroup].timestamps.filter(
            ts => ts > fiveMinutesAgo
        );
    }

    setShortNameFilter(shortName) {
        this.shortNameFilter = shortName;
    }

    clearShortNameFilter() {
        this.shortNameFilter = null;
    }

    getTalkgroupEntries({ showActiveOnly = false, sortBy = 'id', excludedTalkgroups = new Set(), currentCategory = null, currentTag = null, showUnassociated = true }) {
        let entries = Object.entries(this.talkgroups);
        
        // Filter by shortName if set
        if (this.shortNameFilter) {
            entries = entries.filter(([talkgroup]) => {
                const radioStates = this.radioStates[talkgroup];
                if (!radioStates) return false;
                return Object.values(radioStates).some(state => 
                    state.shortName === this.shortNameFilter
                );
            });
        }
        
        // Filter excluded talkgroups
        entries = entries.filter(([talkgroup]) => !excludedTalkgroups.has(talkgroup));

        // Filter by category
        if (currentCategory) {
            entries = entries.filter(([talkgroup]) => {
                const metadata = this.metadata[talkgroup];
                return metadata?.category === currentCategory;
            });
        }

        // Filter by tag
        if (currentTag) {
            entries = entries.filter(([talkgroup]) => {
                const metadata = this.metadata[talkgroup];
                return metadata?.tag === currentTag;
            });
        }

        // Filter unassociated talkgroups (those without meaningful metadata)
        if (!showUnassociated) {
            entries = entries.filter(([talkgroup]) => {
                const metadata = this.metadata[talkgroup];
                // Consider a talkgroup "associated" if it has any of these meaningful metadata fields
                return metadata && (
                    metadata.alphaTag || 
                    metadata.description || 
                    metadata.category || 
                    metadata.tag
                );
            });
        }
        
        // Filter active only if requested
        if (showActiveOnly) {
            entries = entries.filter(([talkgroup]) => {
                const stats = this.callStats[talkgroup];
                return stats && stats.count > 0;
            });
        }

        // Sort entries based on selected method
        switch (sortBy) {
            case 'calls':
                entries.sort(([a], [b]) => {
                    const countA = this.callStats[a]?.count || 0;
                    const countB = this.callStats[b]?.count || 0;
                    return countB - countA || parseInt(a) - parseInt(b);
                });
                break;
            case 'recent':
                entries.sort(([a], [b]) => {
                    const timeA = this.timestamps[a] ? new Date(this.timestamps[a]).getTime() : 0;
                    const timeB = this.timestamps[b] ? new Date(this.timestamps[b]).getTime() : 0;
                    return timeB - timeA || parseInt(a) - parseInt(b);
                });
                break;
            case 'id':
            default:
                entries.sort(([a], [b]) => parseInt(a) - parseInt(b));
                break;
        }

        return entries;
    }

    getMetadata(talkgroup) {
        return this.metadata[talkgroup] || {};
    }

    getTimestamp(talkgroup) {
        return this.timestamps[talkgroup];
    }

    getGlowState(talkgroup) {
        return this.glowStates[talkgroup];
    }

    getRadioState(talkgroup, radioId) {
        return this.radioStates[talkgroup]?.[radioId]?.eventType;
    }

    getCallStats(talkgroup) {
        return this.callStats[talkgroup] || { count: 0 };
    }

    async getKnownSystems() {
        // Convert encounteredSystems to array of objects with shortName and displayName
        const systems = Array.from(this.encounteredSystems);
        const systemsWithAliases = await Promise.all(
            systems.map(async shortName => ({
                shortName,
                displayName: await systemAliasService.getAlias(shortName)
            }))
        );
        return systemsWithAliases;
    }
}
