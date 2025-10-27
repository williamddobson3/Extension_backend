const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const targetedLineNotificationService = require('../services/targetedLineNotificationService');
const router = express.Router();

// Send LINE notification to specific users
router.post('/send-to-users', authenticateToken, async (req, res) => {
    try {
        const { lineUserIds, message, siteInfo } = req.body;

        if (!lineUserIds || !Array.isArray(lineUserIds) || lineUserIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'LINE user IDs array is required'
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const result = await targetedLineNotificationService.sendToUsers(lineUserIds, message, siteInfo);
        res.json(result);

    } catch (error) {
        console.error('Error sending targeted LINE notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send LINE notifications'
        });
    }
});

// Send LINE notification to users watching a specific site
router.post('/send-to-site-watchers', authenticateToken, async (req, res) => {
    try {
        const { siteId, message, siteInfo } = req.body;

        if (!siteId) {
            return res.status(400).json({
                success: false,
                message: 'Site ID is required'
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const result = await targetedLineNotificationService.sendToSiteWatchers(siteId, message, siteInfo);
        res.json(result);

    } catch (error) {
        console.error('Error sending LINE notifications to site watchers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send LINE notifications'
        });
    }
});

// Send LINE notification to all users
router.post('/send-to-all', authenticateToken, async (req, res) => {
    try {
        const { message, siteInfo } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const result = await targetedLineNotificationService.sendToAllUsers(message, siteInfo);
        res.json(result);

    } catch (error) {
        console.error('Error sending LINE notifications to all users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send LINE notifications'
        });
    }
});

// Send LINE notification to specific user
router.post('/send-to-user', authenticateToken, async (req, res) => {
    try {
        const { userId, message, siteInfo } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const result = await targetedLineNotificationService.sendToUser(userId, message, siteInfo);
        res.json(result);

    } catch (error) {
        console.error('Error sending LINE notification to user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send LINE notification'
        });
    }
});

// Send LINE notification to specific LINE user ID (for frontend compatibility)
router.post('/send', authenticateToken, async (req, res) => {
    try {
        const { line_user_id, message } = req.body;

        if (!line_user_id) {
            return res.status(400).json({
                success: false,
                message: 'LINE user ID is required'
            });
        }

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const result = await targetedLineNotificationService.testNotification(line_user_id, message);
        res.json(result);

    } catch (error) {
        console.error('Error sending LINE notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send LINE notification'
        });
    }
});

// Test LINE notification
router.post('/test', authenticateToken, async (req, res) => {
    try {
        const { lineUserId, message } = req.body;

        if (!lineUserId) {
            return res.status(400).json({
                success: false,
                message: 'LINE user ID is required'
            });
        }

        const result = await targetedLineNotificationService.testNotification(lineUserId, message);
        res.json(result);

    } catch (error) {
        console.error('Error testing LINE notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test LINE notification'
        });
    }
});

// Get LINE user statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const result = await targetedLineNotificationService.getLineUserStats();
        res.json(result);

    } catch (error) {
        console.error('Error getting LINE user stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get LINE user statistics'
        });
    }
});

module.exports = router;
