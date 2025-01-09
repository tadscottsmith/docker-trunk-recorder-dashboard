const express = require('express');
const router = express.Router();
const mongodbService = require('../services/mongodb-service');

// Get historical events for a specific duration
router.get('/:duration', async (req, res) => {
    try {
        const data = await mongodbService.getHistoricalEvents(req.params.duration);
        res.json(data);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;
