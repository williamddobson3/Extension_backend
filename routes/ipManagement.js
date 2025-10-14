const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const ipBlockingService = require('../services/ipBlockingService');

const router = express.Router();

/**
 * @route GET /api/ip-management/blocked-ips
 * @description Get list of blocked IP addresses
 * @access Private (Admin only)
 */
router.get('/blocked-ips', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { limit = 50, offset = 0 } = req.query;
        const blockedIPs = await ipBlockingService.getBlockedIPs(parseInt(limit), parseInt(offset));

        res.json({
            success: true,
            data: blockedIPs,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: blockedIPs.length
            }
        });

    } catch (error) {
        console.error('Error getting blocked IPs:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * @route POST /api/ip-management/block-ip
 * @description Block an IP address
 * @access Private (Admin only)
 */
router.post('/block-ip', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { ipAddress, reason, expiresAt } = req.body;

        if (!ipAddress || !reason) {
            return res.status(400).json({
                success: false,
                message: 'IP address and reason are required'
            });
        }

        const result = await ipBlockingService.blockIPAddress(
            ipAddress, 
            reason, 
            req.user.id, 
            expiresAt ? new Date(expiresAt) : null
        );

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    ipAddress,
                    reason,
                    blockedBy: req.user.id,
                    expiresAt
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.error
            });
        }

    } catch (error) {
        console.error('Error blocking IP:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * @route DELETE /api/ip-management/unblock-ip/:ipAddress
 * @description Unblock an IP address
 * @access Private (Admin only)
 */
router.delete('/unblock-ip/:ipAddress', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { ipAddress } = req.params;

        const result = await ipBlockingService.unblockIPAddress(ipAddress, req.user.id);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error unblocking IP:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * @route GET /api/ip-management/statistics
 * @description Get IP blocking statistics
 * @access Private (Admin only)
 */
router.get('/statistics', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { days = 7 } = req.query;
        const statistics = await ipBlockingService.getIPBlockingStatistics(parseInt(days));

        res.json({
            success: true,
            data: statistics,
            period: `${days} days`
        });

    } catch (error) {
        console.error('Error getting IP statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * @route GET /api/ip-management/access-logs
 * @description Get IP access logs
 * @access Private (Admin only)
 */
router.get('/access-logs', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { limit = 100, offset = 0, ipAddress, action, isBlocked } = req.query;

        let query = `
            SELECT 
                ial.id,
                ial.ip_address,
                ial.user_id,
                ial.action,
                ial.user_agent,
                ial.country,
                ial.city,
                ial.isp,
                ial.is_blocked,
                ial.block_reason,
                ial.created_at,
                u.username
            FROM ip_access_logs ial
            LEFT JOIN users u ON ial.user_id = u.id
            WHERE 1=1
        `;
        
        const params = [];

        if (ipAddress) {
            query += ' AND ial.ip_address = ?';
            params.push(ipAddress);
        }

        if (action) {
            query += ' AND ial.action = ?';
            params.push(action);
        }

        if (isBlocked !== undefined) {
            query += ' AND ial.is_blocked = ?';
            params.push(isBlocked === 'true' ? 1 : 0);
        }

        query += ' ORDER BY ial.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await pool.execute(query, params);

        res.json({
            success: true,
            data: logs,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: logs.length
            }
        });

    } catch (error) {
        console.error('Error getting access logs:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * @route GET /api/ip-management/check-ip/:ipAddress
 * @description Check if an IP address is blocked
 * @access Private (Admin only)
 */
router.get('/check-ip/:ipAddress', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { ipAddress } = req.params;
        const blockingResult = await ipBlockingService.checkIPBlocking(ipAddress);

        res.json({
            success: true,
            data: {
                ipAddress,
                isBlocked: blockingResult.isBlocked,
                reason: blockingResult.reason,
                blockType: blockingResult.blockType,
                blockedBy: blockingResult.blockedBy,
                expiresAt: blockingResult.expiresAt
            }
        });

    } catch (error) {
        console.error('Error checking IP:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * @route GET /api/ip-management/dashboard
 * @description Get IP blocking dashboard data
 * @access Private (Admin only)
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Get dashboard data
        const [dashboardData] = await pool.execute(`
            SELECT * FROM ip_blocking_dashboard
            ORDER BY blocked_at DESC
            LIMIT 20
        `);

        const [statistics] = await pool.execute(`
            SELECT * FROM ip_access_statistics
            ORDER BY date DESC
            LIMIT 7
        `);

        res.json({
            success: true,
            data: {
                blockedIPs: dashboardData,
                statistics: statistics
            }
        });

    } catch (error) {
        console.error('Error getting dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
