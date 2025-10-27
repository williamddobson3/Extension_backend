const axios = require('axios');
const { pool } = require('../config/database');
require('dotenv').config();

class TargetedLineNotificationService {
    constructor() {
        this.lineConfig = {
            channelId: process.env.LINE_CHANNEL_ID,
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
            channelSecret: process.env.LINE_CHANNEL_SECRET
        };
    }

    // Send LINE notification to specific users by their LINE user IDs
    async sendToUsers(lineUserIds, message, siteInfo = null) {
        if (!lineUserIds || lineUserIds.length === 0) {
            console.log('📱 No LINE user IDs provided for notification');
            return { success: true, sent: 0 };
        }

        if (!this.lineConfig.channelAccessToken) {
            console.error('❌ LINE channel access token not configured');
            return { success: false, error: 'LINE channel access token not configured' };
        }

        try {
            console.log(`📱 Sending LINE notifications to ${lineUserIds.length} users...`);
            
            // Prepare the message with site info if provided
            let fullMessage = message;
            if (siteInfo) {
                fullMessage += `\n\n🌐 サイト: ${siteInfo.name}`;
                fullMessage += `\n🔗 URL: ${siteInfo.url}`;
            }
            fullMessage += `\n\n📱 友だち追加: https://lin.ee/61Qp02m`;

            // Send individual push messages to each user
            const results = [];
            for (const lineUserId of lineUserIds) {
                try {
                    const pushMessage = {
                        to: lineUserId,
                        messages: [{
                            type: 'text',
                            text: fullMessage
                        }]
                    };

                    const response = await axios.post('https://api.line.me/v2/bot/message/push', pushMessage, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.lineConfig.channelAccessToken}`
                        }
                    });

                    console.log(`✅ LINE notification sent to user: ${lineUserId}`);
                    results.push({ userId: lineUserId, success: true });
                } catch (error) {
                    console.error(`❌ Failed to send LINE notification to user ${lineUserId}:`, error.response?.data || error.message);
                    results.push({ userId: lineUserId, success: false, error: error.message });
                }
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`📱 LINE notifications completed: ${successCount}/${lineUserIds.length} sent successfully`);

            return {
                success: true,
                sent: successCount,
                total: lineUserIds.length,
                results: results
            };

        } catch (error) {
            console.error('❌ Error sending LINE notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Send LINE notification to users watching a specific site
    async sendToSiteWatchers(siteId, message, siteInfo = null) {
        try {
            // Get users watching this site who have LINE enabled
            const [users] = await pool.execute(
                `SELECT DISTINCT u.line_user_id, u.line_display_name
                 FROM users u
                 JOIN monitored_sites ms ON u.id = ms.user_id
                 LEFT JOIN user_notifications un ON u.id = un.user_id
                 WHERE ms.id = ? AND u.is_active = TRUE AND u.line_user_id IS NOT NULL 
                 AND (un.line_enabled = TRUE OR un.line_enabled IS NULL)`,
                [siteId]
            );

            const lineUserIds = users.map(user => user.line_user_id).filter(id => id);
            
            if (lineUserIds.length === 0) {
                console.log(`📱 No LINE users watching site ${siteId}`);
                return { success: true, sent: 0 };
            }

            return await this.sendToUsers(lineUserIds, message, siteInfo);

        } catch (error) {
            console.error('❌ Error getting site watchers for LINE notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Send LINE notification to all users with LINE enabled
    async sendToAllUsers(message, siteInfo = null) {
        try {
            // Get all users who have LINE enabled
            const [users] = await pool.execute(
                `SELECT DISTINCT u.line_user_id, u.line_display_name
                 FROM users u
                 LEFT JOIN user_notifications un ON u.id = un.user_id
                 WHERE u.is_active = TRUE AND u.line_user_id IS NOT NULL 
                 AND (un.line_enabled = TRUE OR un.line_enabled IS NULL)`,
                []
            );

            const lineUserIds = users.map(user => user.line_user_id).filter(id => id);
            
            if (lineUserIds.length === 0) {
                console.log('📱 No LINE users found');
                return { success: true, sent: 0 };
            }

            return await this.sendToUsers(lineUserIds, message, siteInfo);

        } catch (error) {
            console.error('❌ Error getting all LINE users:', error);
            return { success: false, error: error.message };
        }
    }

    // Send LINE notification to specific user by user ID
    async sendToUser(userId, message, siteInfo = null) {
        try {
            // Get user's LINE user ID
            const [users] = await pool.execute(
                `SELECT u.line_user_id, u.line_display_name, un.line_enabled
                 FROM users u
                 LEFT JOIN user_notifications un ON u.id = un.user_id
                 WHERE u.id = ? AND u.is_active = TRUE AND u.line_user_id IS NOT NULL
                 AND (un.line_enabled = TRUE OR un.line_enabled IS NULL)`,
                [userId]
            );

            if (users.length === 0) {
                console.log(`📱 User ${userId} not found or LINE not enabled`);
                return { success: false, error: 'User not found or LINE not enabled' };
            }

            const lineUserId = users[0].line_user_id;
            return await this.sendToUsers([lineUserId], message, siteInfo);

        } catch (error) {
            console.error('❌ Error sending LINE notification to user:', error);
            return { success: false, error: error.message };
        }
    }

    // Get LINE user statistics
    async getLineUserStats() {
        try {
            const [stats] = await pool.execute(
                `SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN u.line_user_id IS NOT NULL THEN 1 END) as users_with_line,
                    COUNT(CASE WHEN u.line_user_id IS NOT NULL AND (un.line_enabled = TRUE OR un.line_enabled IS NULL) THEN 1 END) as line_enabled_users
                 FROM users u
                 LEFT JOIN user_notifications un ON u.id = un.user_id
                 WHERE u.is_active = TRUE`,
                []
            );

            return {
                success: true,
                stats: stats[0]
            };

        } catch (error) {
            console.error('❌ Error getting LINE user stats:', error);
            return { success: false, error: error.message };
        }
    }

    // Test LINE notification to specific user
    async testNotification(lineUserId, message = null) {
        const testMessage = message || `🔔 LINE通知テスト

✅ ウェブサイト監視システムのLINE通知が正常に動作しています。

📅 送信日時: ${new Date().toLocaleString('ja-JP')}

この通知は、システムのテスト目的で送信されました。

📱 友だち追加: https://lin.ee/61Qp02m`;

        return await this.sendToUsers([lineUserId], testMessage);
    }
}

module.exports = new TargetedLineNotificationService();
