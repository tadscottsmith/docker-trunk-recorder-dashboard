const express = require('express');
const router = express.Router();
const path = require('path');
const talkgroupService = require('../services/talkgroup-service');
const systemAliasService = require('../services/system-alias-service');

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

// Get system alias
router.get('/system-alias/:shortName', (req, res) => {
    const alias = systemAliasService.getAlias(req.params.shortName);
    res.json({ alias });
});

module.exports = router;
