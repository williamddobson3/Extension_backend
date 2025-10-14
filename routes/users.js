const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const ipBlockingService = require('../services/ipBlockingService');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.line_user_id, 
                u.is_active, 
                u.is_admin, 
                u.is_blocked,
                u.blocked_at,
                u.block_reason,
                u.created_at,
                COUNT(ms.id) as site_count
            FROM users u
            LEFT JOIN monitored_sites ms ON u.id = ms.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        res.json({
            success: true,
            users: users.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                line_user_id: user.line_user_id,
                is_active: user.is_active,
                is_admin: user.is_admin,
                is_blocked: user.is_blocked,
                blocked_at: user.blocked_at,
                block_reason: user.block_reason,
                created_at: user.created_at,
                site_count: user.site_count
            }))
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT id, is_admin FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deleting other admins
        if (users[0].is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete admin users'
            });
        }

        // Delete user (cascade will handle related records)
        await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: 'ユーザーが正常に削除されました'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Toggle user active status (admin only)
router.put('/:id/toggle-active', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT id, is_admin, is_active FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deactivating other admins
        if (users[0].is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Cannot deactivate admin users'
            });
        }

        // Toggle active status
        const newStatus = !users[0].is_active;
        await pool.execute(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [newStatus, userId]
        );

        res.json({
            success: true,
            message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
            is_active: newStatus
        });
    } catch (error) {
        console.error('Toggle user active error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Block user (admin only)
router.put('/:id/block', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { reason } = req.body;
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT id, is_admin, is_blocked FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent blocking other admins
        if (users[0].is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Cannot block admin users'
            });
        }

        // Check if already blocked
        if (users[0].is_blocked) {
            return res.status(400).json({
                success: false,
                message: 'User is already blocked'
            });
        }

        // Get user's recent IP addresses
        const [userIPs] = await pool.execute(`
            SELECT DISTINCT ip_address, MAX(created_at) as latest_created_at
            FROM user_ip_history 
            WHERE user_id = ? 
            GROUP BY ip_address
            ORDER BY latest_created_at DESC 
            LIMIT 5
        `, [userId]);

        // Block user
        await pool.execute(
            'UPDATE users SET is_blocked = 1, blocked_at = NOW(), blocked_by = ?, block_reason = ? WHERE id = ?',
            [req.user.id, reason || null, userId]
        );

        // Block user's IP addresses (if any exist)
        let ipBlockingResults = [];
        if (userIPs.length > 0) {
            for (const ipRecord of userIPs) {
                const ipAddress = ipRecord.ip_address;
                const blockReason = `User blocked: ${reason || 'No reason provided'}`;
                
                try {
                    const ipBlockResult = await ipBlockingService.blockIPAddress(
                        ipAddress, 
                        blockReason, 
                        req.user.id
                    );
                    
                    if (ipBlockResult.success) {
                        ipBlockingResults.push({
                            ip: ipAddress,
                            status: 'blocked',
                            message: 'IP blocked successfully'
                        });
                    } else {
                        ipBlockingResults.push({
                            ip: ipAddress,
                            status: 'failed',
                            message: ipBlockResult.error || 'Failed to block IP'
                        });
                    }
                } catch (ipError) {
                    console.error(`Error blocking IP ${ipAddress}:`, ipError);
                    ipBlockingResults.push({
                        ip: ipAddress,
                        status: 'error',
                        message: ipError.message
                    });
                }
            }
        } else {
            // No IP history found - add a note about this
            ipBlockingResults.push({
                ip: 'N/A',
                status: 'no_history',
                message: 'No IP history found for this user'
            });
        }

        res.json({
            success: true,
            message: 'User blocked successfully',
            is_blocked: true,
            ip_blocking_results: ipBlockingResults
        });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Unblock user (admin only)
router.put('/:id/unblock', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Check if user exists
        const [users] = await pool.execute(
            'SELECT id, is_admin, is_blocked FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if not blocked
        if (!users[0].is_blocked) {
            return res.status(400).json({
                success: false,
                message: 'User is not blocked'
            });
        }

        // Get user's recent IP addresses
        const [userIPs] = await pool.execute(`
            SELECT DISTINCT ip_address, MAX(created_at) as latest_created_at
            FROM user_ip_history 
            WHERE user_id = ? 
            GROUP BY ip_address
            ORDER BY latest_created_at DESC 
            LIMIT 5
        `, [userId]);

        // Unblock user
        await pool.execute(
            'UPDATE users SET is_blocked = 0, blocked_at = NULL, blocked_by = NULL, block_reason = NULL WHERE id = ?',
            [userId]
        );

        // Unblock user's IP addresses (if any exist)
        let ipUnblockingResults = [];
        if (userIPs.length > 0) {
            for (const ipRecord of userIPs) {
                const ipAddress = ipRecord.ip_address;
                
                try {
                    const ipUnblockResult = await ipBlockingService.unblockIPAddress(
                        ipAddress, 
                        req.user.id
                    );
                    
                    if (ipUnblockResult.success) {
                        ipUnblockingResults.push({
                            ip: ipAddress,
                            status: 'unblocked',
                            message: 'IP unblocked successfully'
                        });
                    } else {
                        ipUnblockingResults.push({
                            ip: ipAddress,
                            status: 'failed',
                            message: ipUnblockResult.message || 'Failed to unblock IP'
                        });
                    }
                } catch (ipError) {
                    console.error(`Error unblocking IP ${ipAddress}:`, ipError);
                    ipUnblockingResults.push({
                        ip: ipAddress,
                        status: 'error',
                        message: ipError.message
                    });
                }
            }
        } else {
            // No IP history found - add a note about this
            ipUnblockingResults.push({
                ip: 'N/A',
                status: 'no_history',
                message: 'No IP history found for this user'
            });
        }

        res.json({
            success: true,
            message: 'User unblocked successfully',
            is_blocked: false,
            ip_unblocking_results: ipUnblockingResults
        });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
