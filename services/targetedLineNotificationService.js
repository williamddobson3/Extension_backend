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
        
        // Rate limiting for LINE push notifications (LINE API allows 600 messages/second)
        this.lineRateLimit = {
            tokens: 50, // Conservative: 50 notifications per window
            maxTokens: 50,
            windowMs: 60000, // 1 minute
            lastRefill: Date.now()
        };
        
        // Circuit breaker for LINE API
        this.lineCircuitBreaker = {
            state: 'closed',
            failureCount: 0,
            lastFailureTime: null,
            successCount: 0,
            failureThreshold: 10, // Open after 10 failures
            successThreshold: 3, // Close after 3 successes
            timeout: 60000 // 1 minute timeout
        };
        
        // Per-user rate limiting to prevent abuse
        this.userRateLimits = new Map(); // Map<lineUserId, {count, windowStart}>
        this.userRateLimitWindow = 60000; // 1 minute
        this.userRateLimitMax = 5; // Max 5 notifications per user per minute
    }

    // Refill rate limit tokens
    _refillRateLimitTokens() {
        const now = Date.now();
        const elapsed = now - this.lineRateLimit.lastRefill;
        
        if (elapsed >= this.lineRateLimit.windowMs) {
            this.lineRateLimit.tokens = this.lineRateLimit.maxTokens;
            this.lineRateLimit.lastRefill = now;
        } else {
            const tokensToAdd = Math.floor(
                (elapsed / this.lineRateLimit.windowMs) * this.lineRateLimit.maxTokens
            );
            this.lineRateLimit.tokens = Math.min(
                this.lineRateLimit.maxTokens,
                this.lineRateLimit.tokens + tokensToAdd
            );
            this.lineRateLimit.lastRefill = now;
        }
    }

    // Check global rate limit
    _checkRateLimit() {
        this._refillRateLimitTokens();
        if (this.lineRateLimit.tokens <= 0) {
            throw new Error('Global rate limit exceeded. Please wait before sending more notifications.');
        }
        this.lineRateLimit.tokens--;
    }

    // Check per-user rate limit
    _checkUserRateLimit(lineUserId) {
        const now = Date.now();
        const userLimit = this.userRateLimits.get(lineUserId);
        
        if (!userLimit || (now - userLimit.windowStart) >= this.userRateLimitWindow) {
            // Reset window
            this.userRateLimits.set(lineUserId, { count: 1, windowStart: now });
            return true;
        }
        
        if (userLimit.count >= this.userRateLimitMax) {
            return false; // Rate limit exceeded
        }
        
        userLimit.count++;
        return true;
    }

    // Check circuit breaker
    _checkCircuitBreaker() {
        const now = Date.now();
        
        if (this.lineCircuitBreaker.state === 'open') {
            if (this.lineCircuitBreaker.lastFailureTime && 
                (now - this.lineCircuitBreaker.lastFailureTime) >= this.lineCircuitBreaker.timeout) {
                this.lineCircuitBreaker.state = 'half-open';
                this.lineCircuitBreaker.successCount = 0;
                console.log('🔄 LINE circuit breaker: Attempting half-open state');
            } else {
                throw new Error('Circuit breaker is open. LINE API is temporarily unavailable.');
            }
        }
    }

    // Update circuit breaker on success
    _updateCircuitBreakerOnSuccess() {
        if (this.lineCircuitBreaker.state === 'half-open') {
            this.lineCircuitBreaker.successCount++;
            if (this.lineCircuitBreaker.successCount >= this.lineCircuitBreaker.successThreshold) {
                this.lineCircuitBreaker.state = 'closed';
                this.lineCircuitBreaker.failureCount = 0;
                console.log('✅ LINE circuit breaker: Closed (service recovered)');
            }
        } else {
            this.lineCircuitBreaker.failureCount = Math.max(0, this.lineCircuitBreaker.failureCount - 1);
        }
    }

    // Update circuit breaker on failure
    _updateCircuitBreakerOnFailure() {
        this.lineCircuitBreaker.failureCount++;
        this.lineCircuitBreaker.lastFailureTime = Date.now();
        
        if (this.lineCircuitBreaker.failureCount >= this.lineCircuitBreaker.failureThreshold) {
            this.lineCircuitBreaker.state = 'open';
            console.error('⚠️ LINE circuit breaker: Opened (too many failures)');
        }
    }

    // Sleep helper
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Send single notification with retry
    async _sendSingleNotification(lineUserId, message, maxRetries = 2) {
        const pushMessage = {
            to: lineUserId,
            messages: [{ type: 'text', text: message }]
        };

        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const response = await axios.post(
                    'https://api.line.me/v2/bot/message/push',
                    pushMessage,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.lineConfig.channelAccessToken}`
                        },
                        timeout: 10000
                    }
                );

                this._updateCircuitBreakerOnSuccess();
                return { success: true, response: response.data };
            } catch (error) {
                attempt++;
                const httpStatus = error.response?.status;
                const errorMessage = error.response?.data?.message || error.message;

                // Don't retry on auth errors or bad requests
                if (httpStatus === 400 || httpStatus === 401 || httpStatus === 403) {
                    this._updateCircuitBreakerOnFailure();
                    return { success: false, error: `LINE API error (${httpStatus}): ${errorMessage}` };
                }

                // If last attempt, return failure
                if (attempt >= maxRetries) {
                    this._updateCircuitBreakerOnFailure();
                    return { success: false, error: errorMessage };
                }

                // Wait before retry (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                await this._sleep(delay);
            }
        }

        return { success: false, error: 'Max retries exceeded' };
    }

    // Send LINE notification to specific users by their LINE user IDs with enhanced reliability
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
            // Check circuit breaker
            this._checkCircuitBreaker();

            // Check global rate limit
            if (lineUserIds.length > this.lineRateLimit.tokens) {
                console.warn(`⚠️ Rate limit: ${lineUserIds.length} users requested, but only ${this.lineRateLimit.tokens} tokens available`);
                // Still proceed, but rate limit will be checked per message
            }

            console.log(`📱 Sending LINE notifications to ${lineUserIds.length} users...`);
            
            // Prepare the message with site info if provided
            let fullMessage = message;
            if (siteInfo) {
                fullMessage += `\n\n🌐 サイト: ${siteInfo.name}`;
                fullMessage += `\n🔗 URL: ${siteInfo.url}`;
            }
            fullMessage += `\n\n📱 友だち追加: https://lin.ee/zGt9q9V`;

            // Send individual push messages to each user with rate limiting and retry
            const results = [];
            for (const lineUserId of lineUserIds) {
                try {
                    // Check per-user rate limit
                    if (!this._checkUserRateLimit(lineUserId)) {
                        console.log(`⏭️ Skipping user ${lineUserId} due to rate limit`);
                        results.push({ userId: lineUserId, success: false, error: 'User rate limit exceeded', skipped: true });
                        continue;
                    }

                    // Check global rate limit
                    this._checkRateLimit();

                    // Send notification with retry
                    const result = await this._sendSingleNotification(lineUserId, fullMessage);
                    
                    if (result.success) {
                        console.log(`✅ LINE notification sent to user: ${lineUserId}`);
                        results.push({ userId: lineUserId, success: true });
                    } else {
                        console.error(`❌ Failed to send LINE notification to user ${lineUserId}:`, result.error);
                        results.push({ userId: lineUserId, success: false, error: result.error });
                    }

                    // Small delay between messages to avoid overwhelming the API
                    if (lineUserIds.length > 1) {
                        await this._sleep(100); // 100ms delay between messages
                    }
                } catch (error) {
                    console.error(`❌ Error sending to user ${lineUserId}:`, error.message);
                    results.push({ userId: lineUserId, success: false, error: error.message });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const skippedCount = results.filter(r => r.skipped).length;
            console.log(`📱 LINE notifications completed: ${successCount}/${lineUserIds.length} sent successfully${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`);

            return {
                success: successCount > 0,
                sent: successCount,
                skipped: skippedCount,
                total: lineUserIds.length,
                results: results
            };

        } catch (error) {
            console.error('❌ Error sending LINE notifications:', error);
            this._updateCircuitBreakerOnFailure();
            return { success: false, error: error.message };
        }
    }

    // Send LINE notification to users watching a specific site
    async sendToSiteWatchers(siteId, message, siteInfo = null) {
        try {
            // Get users watching this site who have LINE enabled
            const [users] = await pool.execute(
                `SELECT DISTINCT 
                    COALESCE(u.line_official_user_id, u.line_user_id) AS line_user_id,
                    u.line_display_name
                 FROM users u
                 JOIN monitored_sites ms ON u.id = ms.user_id
                 LEFT JOIN user_notifications un ON u.id = un.user_id
                 WHERE ms.id = ? 
                 AND u.is_active = TRUE 
                 AND COALESCE(u.line_official_user_id, u.line_user_id) IS NOT NULL
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
                `SELECT DISTINCT 
                    COALESCE(u.line_official_user_id, u.line_user_id) AS line_user_id,
                    u.line_display_name
                 FROM users u
                 LEFT JOIN user_notifications un ON u.id = un.user_id
                 WHERE u.is_active = TRUE 
                 AND COALESCE(u.line_official_user_id, u.line_user_id) IS NOT NULL
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
                `SELECT 
                    COALESCE(u.line_official_user_id, u.line_user_id) AS line_user_id,
                    u.line_display_name, 
                    un.line_enabled
                 FROM users u
                 LEFT JOIN user_notifications un ON u.id = un.user_id
                 WHERE u.id = ? 
                 AND u.is_active = TRUE 
                 AND COALESCE(u.line_official_user_id, u.line_user_id) IS NOT NULL
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

📱 友だち追加: https://lin.ee/zGt9q9V`;

        return await this.sendToUsers([lineUserId], testMessage);
    }
}

module.exports = new TargetedLineNotificationService();
