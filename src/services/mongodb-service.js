const { MongoClient } = require('mongodb');
const talkgroupService = require('./talkgroup-service');

class MongoDBService {
    constructor() {
        this.client = null;
        this.db = null;
        this.collection = null;
        this.messageCount = 0;
    }

    async connect(uri, dbName, collectionName) {
        this.client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 60000,
            connectTimeoutMS: 60000,
        });

        let retries = 0;
        const maxRetries = 5;
        
        while (retries < maxRetries) {
            try {
                console.log('Attempting to connect to MongoDB...');
                await this.client.connect();
                console.log('Successfully connected to MongoDB');
                break;
            } catch (error) {
                retries++;
                if (retries === maxRetries) {
                    console.error('Failed to connect to MongoDB after maximum retries:', error);
                    throw error;
                }
                const delay = Math.min(1000 * Math.pow(2, retries), 10000);
                console.log(`Connection attempt ${retries} failed. Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        this.db = this.client.db(dbName);
        this.collection = this.db.collection(collectionName);

        // Setup periodic status reporting
        setInterval(() => {
            console.log(`[Status] Processed ${this.messageCount} messages in the last 30 seconds`);
            this.messageCount = 0;
        }, 30000);
    }

    async setupChangeStream(io) {
        try {
            await this.waitForReplicaSet();
            console.log('Setting up change stream...');
            const changeStream = this.collection.watch();
            
            changeStream.on('change', async (change) => {
                if (change.operationType === 'insert') {
                    const event = change.fullDocument;
                    this.messageCount++;

                    // Track unknown talkgroups and new systems
                    const talkgroupId = event.talkgroupOrSource?.toString();
                    const changed = await talkgroupService.handleNewTalkgroup(talkgroupId, event.systemShortName);
                    
                    // If a new system was added, notify clients
                    if (changed) {
                        io.emit('systemsUpdated');
                    }

                    // Add talkgroup and system metadata to the event
                    const talkgroupInfo = talkgroupService.getTalkgroupInfo(talkgroupId);
                    if (talkgroupInfo) {
                        event.talkgroupInfo = talkgroupInfo;
                        // Add system alias if this talkgroup belongs to a system
                        if (talkgroupInfo.shortName) {
                            event.systemInfo = {
                                shortName: talkgroupInfo.shortName,
                                displayName: talkgroupService.getKnownSystems()
                                    .find(s => s.shortName === talkgroupInfo.shortName)?.displayName
                            };
                        }
                    }
                    io.emit('radioEvent', event);
                }
            });

            changeStream.on('error', async (error) => {
                console.error('Change stream error:', error);
                await new Promise(resolve => setTimeout(resolve, 5000));
                console.log('Attempting to reconnect change stream...');
                await this.setupChangeStream(io);
            });

            changeStream.on('close', async () => {
                console.log('Change stream closed, attempting to reconnect...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                await this.setupChangeStream(io);
            });

            console.log('Change stream setup successfully');
        } catch (error) {
            console.error('Error setting up change stream:', error);
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log('Attempting to reconnect change stream...');
            await this.setupChangeStream(io);
        }
    }

    async waitForReplicaSet() {
        while (true) {
            try {
                const status = await this.db.admin().command({ replSetGetStatus: 1 });
                if (status.ok && status.members && status.members.some(m => m.stateStr === "PRIMARY")) {
                    console.log('MongoDB replica set is ready');
                    return;
                }
            } catch (error) {
                console.log('Waiting for replica set to be ready...');
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    async getTalkgroupHistory(talkgroupId) {
        // Get last 24 hours of events for this talkgroup
        const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z');

        // First get the most recent 200 records
        const recentEvents = await this.collection
            .find({
                talkgroupOrSource: talkgroupId
            })
            .sort({ timestamp: -1 })
            .limit(200)
            .toArray();

        // Then get events from last 24 hours
        const dayEvents = await this.collection
            .find({
                talkgroupOrSource: talkgroupId,
                timestamp: { $gte: startTime }
            })
            .sort({ timestamp: -1 })
            .toArray();

        // Use whichever result set is smaller
        const events = recentEvents.length <= dayEvents.length ? recentEvents : dayEvents;

        // Add metadata to events
        const systemMap = new Map(talkgroupService.getKnownSystems()
            .map(s => [s.shortName, s.displayName]));

        events.forEach(event => {
            const talkgroupInfo = talkgroupService.getTalkgroupInfo(event.talkgroupOrSource);
            if (talkgroupInfo) {
                event.talkgroupInfo = talkgroupInfo;
                // Add system alias if this talkgroup belongs to a system
                if (talkgroupInfo.shortName) {
                    event.systemInfo = {
                        shortName: talkgroupInfo.shortName,
                        displayName: systemMap.get(talkgroupInfo.shortName)
                    };
                }
            }
        });

        // Get unique radios that have been affiliated
        const uniqueRadios = [...new Set(events.map(event => event.radioID))];

        return {
            talkgroupId,
            totalEvents: events.length,
            uniqueRadios,
            events
        };
    }

    async getHistoricalEvents(duration) {
        let minutes;
        switch (duration) {
            case '30m': minutes = 30; break;
            case '2h': minutes = 120; break;
            case '6h': minutes = 360; break;
            case '12h': minutes = 720; break;
            default: throw new Error(`Invalid duration parameter: ${duration}`);
        }

        const startTime = new Date(Date.now() - minutes * 60 * 1000)
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z');
        
        const events = await this.collection
            .find({
                timestamp: { $gte: startTime },
                eventType: { $nin: ['location'] }
            })
            .sort({ timestamp: 1 })
            .toArray();

        // Add metadata to events
        const systemMap = new Map(talkgroupService.getKnownSystems()
            .map(s => [s.shortName, s.displayName]));

        events.forEach(event => {
            const talkgroupInfo = talkgroupService.getTalkgroupInfo(event.talkgroupOrSource);
            if (talkgroupInfo) {
                event.talkgroupInfo = talkgroupInfo;
                // Add system alias if this talkgroup belongs to a system
                if (talkgroupInfo.shortName) {
                    event.systemInfo = {
                        shortName: talkgroupInfo.shortName,
                        displayName: systemMap.get(talkgroupInfo.shortName)
                    };
                }
            }
        });

        return {
            duration: minutes,
            totalEvents: events.length,
            events
        };
    }

    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.collection = null;
        }
    }
}

module.exports = new MongoDBService();
