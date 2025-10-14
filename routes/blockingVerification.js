const express = require('express');
const router = express.Router();
const realTimeBlockingService = require('../services/realTimeBlockingService');
const { authenticateToken } = require('../middleware/auth');

/**
 * リアルタイムブロック検証ルート
 * フロントエンドが定期的にユーザーのブロック状態をチェックするためのAPI
 */

// ユーザーのブロック状態を検証
router.post('/verify-user-status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userIP = req.clientIP || req.ip || req.connection?.remoteAddress || '127.0.0.1';
        const userEmail = req.user.email;

        console.log(`🔍 Verifying blocking status for user ${userId} (IP: ${userIP})`);

        const result = await realTimeBlockingService.verifyUserStatus(userId, userIP, userEmail);

        if (result.isBlocked) {
            console.log(`🚫 User ${userId} is blocked: ${result.reason}`);
            
            // セッションを無効化
            await realTimeBlockingService.invalidateUserSession(userId);

            return res.status(403).json({
                success: false,
                blocked: true,
                reason: result.reason,
                blockType: result.blockType,
                message: 'アクセスが拒否されました',
                logoutRequired: true
            });
        }

        // ブロックされていない場合
        res.json({
            success: true,
            blocked: false,
            message: 'アクセス許可',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error verifying user status:', error);
        res.status(500).json({
            success: false,
            error: '検証エラーが発生しました',
            logoutRequired: true
        });
    }
});

// ユーザーのIPアドレスを更新
router.post('/update-user-ip', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const newIP = req.clientIP || req.ip || req.connection?.remoteAddress || '127.0.0.1';

        // ユーザーのIP履歴を更新
        const { pool } = require('../config/database');
        await pool.execute(`
            INSERT INTO user_ip_history (user_id, ip_address, action, user_agent, created_at)
            VALUES (?, ?, 'ip_update', ?, NOW())
        `, [userId, newIP, req.headers['user-agent'] || null]);

        console.log(`📍 Updated IP for user ${userId}: ${newIP}`);

        res.json({
            success: true,
            message: 'IPアドレスを更新しました',
            newIP: newIP
        });

    } catch (error) {
        console.error('Error updating user IP:', error);
        res.status(500).json({
            success: false,
            error: 'IP更新エラーが発生しました'
        });
    }
});

// 管理者用：ブロックされたアクセスログを取得
router.get('/blocked-access-logs', authenticateToken, async (req, res) => {
    try {
        // 管理者のみアクセス可能
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: '管理者権限が必要です'
            });
        }

        const { pool } = require('../config/database');
        const [logs] = await pool.execute(`
            SELECT 
                bal.*,
                u.username,
                u.email as user_email
            FROM blocked_access_logs bal
            LEFT JOIN users u ON bal.user_id = u.id
            ORDER BY bal.created_at DESC
            LIMIT 100
        `);

        res.json({
            success: true,
            logs: logs
        });

    } catch (error) {
        console.error('Error fetching blocked access logs:', error);
        res.status(500).json({
            success: false,
            error: 'ログ取得エラーが発生しました'
        });
    }
});

module.exports = router;
