const express = require('express');
const router = express.Router();
const path = require('path');
const talkgroupService = require('../services/talkgroup-service');
const systemAliasService = require('../services/system-alias-service');

// Get talkgroup history
router.get('/talkgroup/:talkgroupId/history', async (req, res) => {
    try {
        const talkgroupId = req.params.talkgroupId;
        const history = await talkgroupService.getTalkgroupHistory(talkgroupId);
        res.json(history);
    } catch (error) {
        console.error('Error getting talkgroup history:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get talkgroup history'
        });
    }
});

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
    try {
        const shortName = req.params.shortName;
        
        // Validate system name
        try {
            systemAliasService.validateSystemName(shortName);
        } catch (validationError) {
            return res.status(400).json({
                error: 'Invalid system name',
                message: validationError.message
            });
        }

        const alias = systemAliasService.getAlias(shortName);
        res.json({ shortName, alias });
    } catch (error) {
        console.error('Error getting system alias:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to get system alias'
        });
    }
});

// Update system alias
router.post('/system-alias/:shortName', express.json(), async (req, res) => {
    try {
        const shortName = req.params.shortName;
        const { alias } = req.body;

        if (!alias || typeof alias !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Alias must be a non-empty string'
            });
        }

        // Validate system name
        try {
            systemAliasService.validateSystemName(shortName);
        } catch (validationError) {
            return res.status(400).json({
                error: 'Invalid system name',
                message: validationError.message
            });
        }

        // Add/update system with new alias
        await systemAliasService.addSystem(shortName, alias);
        res.json({ shortName, alias });
    } catch (error) {
        console.error('Error updating system alias:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to update system alias'
        });
    }
});

module.exports = router;
