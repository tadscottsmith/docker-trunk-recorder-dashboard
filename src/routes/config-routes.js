const express = require('express');
const router = express.Router();
const path = require('path');
const talkgroupService = require('../services/talkgroup-service');

// Get version information
router.get('/version', (req, res) => {
    const version = require('../../package.json').version;
    res.json({ version });
});

// Get configuration
router.get('/config', (req, res) => {
    const systemFilters = talkgroupService.getKnownSystems();
    res.json({
        systemFilters
    });
});

module.exports = router;
