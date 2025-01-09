require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');

// Import services
const mongodbService = require('./services/mongodb-service');
const talkgroupService = require('./services/talkgroup-service');
const websocketService = require('./services/websocket-service');

// Import routes
const talkgroupRoutes = require('./routes/talkgroup-routes');
const historyRoutes = require('./routes/history-routes');
const configRoutes = require('./routes/config-routes');

// Import middleware
const corsMiddleware = require('./middleware/cors');
const errorHandler = require('./middleware/error-handler');

// Validate required environment variables
if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is required');
    process.exit(1);
}

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const io = websocketService.initialize(server);

// Apply middleware
app.use(corsMiddleware);
app.use(express.json());

// Serve socket.io client
app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../node_modules/socket.io/client-dist/socket.io.js'));
});

// Mount routes
app.use('/api/talkgroups', talkgroupRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', configRoutes);

// Serve static files
app.use(express.static('public'));

// Error handling
app.use(errorHandler);

// Initialize services
async function initializeServices() {
    try {
        // Connect to MongoDB
        await mongodbService.connect(
            process.env.MONGODB_URI,
            process.env.DB_NAME || 'trunk_recorder',
            process.env.COLLECTION_NAME || 'radio_events'
        );

        // Setup MongoDB change stream
        await mongodbService.setupChangeStream(io);

        // Load talkgroups
        talkgroupService.loadTalkgroups();

        // Setup talkgroup file watcher
        talkgroupService.setupFileWatcher(io);

        // Start periodic talkgroup saves
        setInterval(() => {
            talkgroupService.saveTalkgroups(null);
            const systems = [...talkgroupService.knownSystems];
            systems.forEach(shortName => talkgroupService.saveTalkgroups(shortName));
        }, 5 * 60 * 1000);

    } catch (error) {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeServices().catch(console.error);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await mongodbService.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await mongodbService.close();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
