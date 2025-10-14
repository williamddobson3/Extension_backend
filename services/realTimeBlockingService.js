const { pool } = require('../config/database');
const ipBlockingService = require('./ipBlockingService');

/**
 * Real-time Blocking Verification Service
 * リアルタイムでユーザーのブロック状態を検証し、ブロックされたユーザーを即座にログアウトさせる
 */

class RealTimeBlockingService {
    constructor() {
        this.checkInterval = 30000; // 30秒間隔でチェック
        this.activeChecks = new Map(); // アクティブなチェックを管理
    }

    /**
     * ユーザーのブロック状態をリアルタイムで検証
     */
    async verifyUserBlocking(userId, userIP, userEmail) {
        try {
            console.log(`🔍 Verifying blocking status for user ${userId}`);
            
            // 1. ユーザーがブロックされているかチェック
            const [userRows] = await pool.execute(
                'SELECT is_blocked, is_active FROM users WHERE id = ?',
                [userId]
            );

            if (userRows.length === 0) {
                return { isBlocked: true, reason: 'User not found' };
            }

            const user = userRows[0];
            
            // 2. ユーザーがブロックされている場合
            if (user.is_blocked || !user.is_active) {
                return { 
                    isBlocked: true, 
                    reason: user.is_blocked ? 'User is blocked' : 'User is inactive',
                    blockType: user.is_blocked ? 'blocked' : 'inactive'
                };
            }

            // 3. IPアドレスがブロックされているかチェック
            const ipCheck = await ipBlockingService.checkIPBlocking(userIP);
            if (ipCheck.isBlocked) {
                return { 
                    isBlocked: true, 
                    reason: 'IP address is blocked',
                    blockType: 'ip_blocked',
                    ipDetails: ipCheck
                };
            }

            // 4. メールアドレスがブロックされているかチェック
            const emailCheck = await this.checkEmailBlocking(userEmail);
            if (emailCheck.isBlocked) {
                return { 
                    isBlocked: true, 
                    reason: 'Email address is blocked',
                    blockType: 'email_blocked',
                    emailDetails: emailCheck
                };
            }

            return { isBlocked: false, reason: 'User is not blocked' };

        } catch (error) {
            console.error('Error verifying user blocking:', error);
            // エラーの場合は安全のためブロックとみなす
            return { isBlocked: true, reason: 'Verification error', error: error.message };
        }
    }

    /**
     * メールアドレスのブロック状態をチェック
     */
    async checkEmailBlocking(email) {
        try {
            // ブロックされたメールアドレスのリストをチェック
            const [blockedEmails] = await pool.execute(
                'SELECT id, reason, blocked_at FROM blocked_emails WHERE email = ? AND is_active = 1',
                [email]
            );

            if (blockedEmails.length > 0) {
                return {
                    isBlocked: true,
                    reason: blockedEmails[0].reason,
                    blockedAt: blockedEmails[0].blocked_at
                };
            }

            return { isBlocked: false };

        } catch (error) {
            console.error('Error checking email blocking:', error);
            return { isBlocked: true, reason: 'Email check error' };
        }
    }

    /**
     * フロントエンド用のブロック検証API
     */
    async verifyUserStatus(userId, userIP, userEmail) {
        const result = await this.verifyUserBlocking(userId, userIP, userEmail);
        
        // ブロックされている場合、ログを記録
        if (result.isBlocked) {
            await this.logBlockedAccess(userId, userIP, userEmail, result);
        }

        return result;
    }

    /**
     * ブロックされたアクセスをログに記録
     */
    async logBlockedAccess(userId, userIP, userEmail, blockResult) {
        try {
            await pool.execute(`
                INSERT INTO blocked_access_logs 
                (user_id, ip_address, email, block_reason, block_type, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [
                userId,
                userIP,
                userEmail,
                blockResult.reason,
                blockResult.blockType || 'unknown'
            ]);

            console.log(`🚫 Blocked access logged for user ${userId}: ${blockResult.reason}`);
        } catch (error) {
            console.error('Error logging blocked access:', error);
        }
    }

    /**
     * ユーザーのセッションを無効化
     */
    async invalidateUserSession(userId) {
        try {
            // ユーザーのトークンを無効化
            await pool.execute(
                'UPDATE users SET last_logout = NOW() WHERE id = ?',
                [userId]
            );

            // セッション情報をクリア
            await pool.execute(
                'DELETE FROM user_sessions WHERE user_id = ?',
                [userId]
            );

            console.log(`🔒 Session invalidated for user ${userId}`);
        } catch (error) {
            console.error('Error invalidating session:', error);
        }
    }
}

module.exports = new RealTimeBlockingService();
