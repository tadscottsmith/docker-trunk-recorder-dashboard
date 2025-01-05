#!/usr/bin/env node
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Configuration
const PORT = process.env.HTTP_MONGO_PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'trunk_recorder';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'radio_events';
const DEDUPE_WINDOW = 5; // 5 seconds, matching log_mongo.sh

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required');
  process.exit(1);
}

class MongoService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.dedupeCache = new Map();
  }

  async connect() {
    try {
      this.client = new MongoClient(MONGODB_URI, {
        connectTimeoutMS: 5000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10
      });
      
      await this.client.connect();
      this.collection = this.client.db(DB_NAME).collection(COLLECTION_NAME);
      console.log('Connected to MongoDB');
      return true;
    } catch (err) {
      console.error('MongoDB connection error:', err);
      return false;
    }
  }

  async handleEvent(event) {
    const cacheKey = `${event.shortName}-${event.radioID}-${event.eventType}-${event.talkgroupOrSource}`;
    
    // Check deduplication cache
    if (this.dedupeCache.has(cacheKey)) {
      return { status: 'skipped', message: 'Duplicate event within time window' };
    }

    try {
      // Add to dedupe cache with timeout
      this.dedupeCache.set(cacheKey, true);
      setTimeout(() => this.dedupeCache.delete(cacheKey), DEDUPE_WINDOW * 1000);

      // Format timestamp to match log_mongo.sh format (without milliseconds)
      const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      
      // Insert the event in the same format expected by the main app
      const doc = {
        ...event,
        timestamp,
        // Ensure talkgroupOrSource is stored as a string to match CSV lookup
        talkgroupOrSource: event.talkgroupOrSource?.toString()
      };

      // Use insertOne to trigger change stream in main app
      await this.collection.insertOne(doc);
      return { status: 'success', message: 'Event logged successfully' };
    } catch (err) {
      console.error('Error logging event:', err);
      return { status: 'error', message: err.message };
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Create Express app and MongoDB service
const app = express();
const mongoService = new MongoService();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Event logging endpoint
app.post('/event', async (req, res) => {
  const { shortName, radioID, eventType, talkgroupOrSource, patchedTalkgroups } = req.body;

  // Validate required fields
  if (!shortName || !radioID || !eventType) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: shortName, radioID, and eventType are required'
    });
  }

  const result = await mongoService.handleEvent({
    shortName,
    radioID,
    eventType,
    talkgroupOrSource,
    patchedTalkgroups
  });

  if (result.status === 'error') {
    return res.status(500).json(result);
  }

  res.json(result);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await mongoService.close();
  process.exit();
});

// Start service
(async () => {
  const connected = await mongoService.connect();
  if (!connected) {
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`HTTP MongoDB service listening on port ${PORT}`);
  });
})();
