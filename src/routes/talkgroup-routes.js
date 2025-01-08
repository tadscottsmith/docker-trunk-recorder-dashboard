const express = require('express');
const router = express.Router();
const talkgroupService = require('../services/talkgroup-service');
const mongodbService = require('../services/mongodb-service');

// Get talkgroup metadata
router.get('/', (req, res) => {
    res.json(talkgroupService.getTalkgroupsObject());
});

// Reload talkgroups
router.post('/reload', async (req, res) => {
    try {
        // Clear existing data
        talkgroupService.clear();

        // Load all talkgroup files
        talkgroupService.loadTalkgroups();
        
        res.json({ 
            status: 'success', 
            message: `Reloaded ${talkgroupService.getTalkgroupsObject().talkgroups.length} talkgroups` 
        });
    } catch (error) {
        console.error('Error reloading talkgroup file:', error);
        res.status(500).json({ error: 'Failed to reload talkgroups: ' + error.message });
    }
});

// Update talkgroup metadata
router.post('/:decimal', express.json(), async (req, res) => {
    const decimal = req.params.decimal;
    const metadata = req.body;

    // Validate required fields
    if (!metadata.alphaTag) {
        return res.status(400).json({ error: 'alphaTag is required' });
    }

    // Update talkgroup data
    talkgroupService.updateTalkgroup(decimal, metadata);

    // Save changes
    const talkgroupData = talkgroupService.getTalkgroupInfo(decimal);
    const systemShortName = talkgroupData?.shortName || null;
    await talkgroupService.saveTalkgroups(systemShortName);

    res.json({ status: 'success', message: 'Talkgroup updated' });
});

// Get talkgroup-specific history
router.get('/:id/history', async (req, res) => {
    try {
        const data = await mongodbService.getTalkgroupHistory(req.params.id);
        res.json(data);
    } catch (error) {
        console.error('Error fetching talkgroup history:', error);
        res.status(500).json({ error: 'Failed to fetch talkgroup history' });
    }
});

module.exports = router;
