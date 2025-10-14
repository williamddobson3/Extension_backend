const mysql = require('mysql2/promise');
const { pool } = require('../config/database');

/**
 * Notification Guard Service
 * Ensures that notifications are only sent when actual changes are detected
 * Prevents spam notifications and ensures users only get notified of real changes
 */
class NotificationGuardService {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        };
    }

    /**
     * Check if notifications should be sent for a site
     * @param {number} siteId - Site ID to check
     * @param {Object} changeResult - Change detection result
     * @returns {Object} Guard result with recommendation
     */
    async shouldSendNotifications(siteId, changeResult) {
        try {
            console.log(`🛡️ Notification Guard: Checking site ID ${siteId}`);

            // Guard 1: Must have actual changes detected
            if (!changeResult.hasChanged) {
                console.log(`🛡️ Guard 1 FAILED: No changes detected for site ID ${siteId}`);
                return {
                    shouldSend: false,
                    reason: 'No changes detected',
                    guardChecks: {
                        hasChanges: false,
                        isFirstCheck: changeResult.isFirstCheck || false,
                        hasError: !!changeResult.error
                    }
                };
            }

            // Guard 2: Check if this is a first-time check (should not send notifications)
            if (changeResult.isFirstCheck) {
                console.log(`🛡️ Guard 2 FAILED: First-time check detected for site ID ${siteId} - no notifications`);
                return {
                    shouldSend: false,
                    reason: 'First-time check - no notifications needed',
                    guardChecks: {
                        hasChanges: true,
                        isFirstCheck: true,
                        hasError: false
                    }
                };
            }

            // Guard 3: Check for errors in change detection
            if (changeResult.error) {
                console.log(`🛡️ Guard 3 FAILED: Error in change detection for site ID ${siteId}: ${changeResult.error}`);
                return {
                    shouldSend: false,
                    reason: `Change detection error: ${changeResult.error}`,
                    guardChecks: {
                        hasChanges: false,
                        isFirstCheck: false,
                        hasError: true
                    }
                };
            }

            // Guard 4: Verify change reason is meaningful
            if (!changeResult.reason || changeResult.reason.trim() === '') {
                console.log(`🛡️ Guard 4 FAILED: No meaningful change reason for site ID ${siteId}`);
                return {
                    shouldSend: false,
                    reason: 'No meaningful change reason provided',
                    guardChecks: {
                        hasChanges: true,
                        isFirstCheck: false,
                        hasError: false,
                        hasReason: false
                    }
                };
            }

            // Guard 5: Check for duplicate recent notifications (prevent spam)
            const duplicateCheck = await this.checkForDuplicateNotifications(siteId, changeResult);
            if (duplicateCheck.isDuplicate) {
                console.log(`🛡️ Guard 5 FAILED: Duplicate notification detected for site ID ${siteId}`);
                return {
                    shouldSend: false,
                    reason: `Duplicate notification: ${duplicateCheck.reason}`,
                    guardChecks: {
                        hasChanges: true,
                        isFirstCheck: false,
                        hasError: false,
                        hasReason: true,
                        isDuplicate: true
                    }
                };
            }

            // All guards passed
            console.log(`🛡️ All guards PASSED: Notifications approved for site ID ${siteId}`);
            return {
                shouldSend: true,
                reason: 'All guard checks passed',
                guardChecks: {
                    hasChanges: true,
                    isFirstCheck: false,
                    hasError: false,
                    hasReason: true,
                    isDuplicate: false
                }
            };

        } catch (error) {
            console.error(`❌ Notification Guard error for site ID ${siteId}:`, error);
            return {
                shouldSend: false,
                reason: `Guard service error: ${error.message}`,
                guardChecks: {
                    hasChanges: false,
                    isFirstCheck: false,
                    hasError: true,
                    guardError: true
                }
            };
        }
    }

    /**
     * Check for duplicate recent notifications to prevent spam
     * @param {number} siteId - Site ID
     * @param {Object} changeResult - Change detection result
     * @returns {Object} Duplicate check result
     */
    async checkForDuplicateNotifications(siteId, changeResult) {
        try {
            // Check for notifications sent in the last 30 minutes for the same site
            const [recentNotifications] = await pool.execute(`
                SELECT COUNT(*) as notification_count
                FROM notifications 
                WHERE site_id = ? 
                AND sent_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
                AND status = 'sent'
            `, [siteId]);

            const notificationCount = recentNotifications[0].notification_count;

            if (notificationCount > 0) {
                return {
                    isDuplicate: true,
                    reason: `Recent notification sent ${notificationCount} times in last 30 minutes`,
                    count: notificationCount
                };
            }

            // Check for similar change reasons in the last hour
            const [similarChanges] = await pool.execute(`
                SELECT COUNT(*) as change_count
                FROM site_checks 
                WHERE site_id = ? 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
                AND changes_detected = true
                AND reason = ?
            `, [siteId, changeResult.reason]);

            const changeCount = similarChanges[0].change_count;

            if (changeCount > 1) {
                return {
                    isDuplicate: true,
                    reason: `Similar change detected ${changeCount} times in last hour`,
                    count: changeCount
                };
            }

            return {
                isDuplicate: false,
                reason: 'No duplicate notifications found',
                count: 0
            };

        } catch (error) {
            console.error('❌ Error checking for duplicate notifications:', error);
            return {
                isDuplicate: false,
                reason: `Duplicate check error: ${error.message}`,
                count: 0
            };
        }
    }

    /**
     * Log notification guard decision
     * @param {number} siteId - Site ID
     * @param {Object} guardResult - Guard result
     * @param {Object} changeResult - Change detection result
     */
    async logGuardDecision(siteId, guardResult, changeResult) {
        try {
            // Ensure all values are properly defined (no undefined values)
            const safeGuardResult = {
                shouldSend: Boolean(guardResult?.shouldSend),
                reason: guardResult?.reason || null,
                guardChecks: {
                    hasChanges: Boolean(guardResult?.guardChecks?.hasChanges),
                    isFirstCheck: Boolean(guardResult?.guardChecks?.isFirstCheck),
                    hasError: Boolean(guardResult?.guardChecks?.hasError),
                    isDuplicate: Boolean(guardResult?.guardChecks?.isDuplicate)
                }
            };

            const safeChangeResult = {
                reason: changeResult?.reason || null
            };

            await pool.execute(`
                INSERT INTO notification_guard_logs 
                (site_id, decision, reason, guard_checks, change_detected, change_reason)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                siteId,
                safeGuardResult.shouldSend ? 'allow' : 'block',
                safeGuardResult.reason,
                JSON.stringify(safeGuardResult.guardChecks),
                safeGuardResult.guardChecks.hasChanges,
                safeChangeResult.reason
            ]);

            console.log(`📝 Guard decision logged for site ID ${siteId}: ${safeGuardResult.shouldSend ? 'APPROVED' : 'BLOCKED'}`);
        } catch (error) {
            console.error('❌ Error logging guard decision:', error);
        }
    }

    /**
     * Get notification guard statistics
     * @param {number} hours - Hours to look back
     * @returns {Object} Statistics
     */
    async getGuardStatistics(hours = 24) {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN should_send = 1 THEN 1 ELSE 0 END) as approved_notifications,
                    SUM(CASE WHEN should_send = 0 THEN 1 ELSE 0 END) as blocked_notifications,
                    SUM(CASE WHEN has_changes = 1 THEN 1 ELSE 0 END) as changes_detected,
                    SUM(CASE WHEN is_first_check = 1 THEN 1 ELSE 0 END) as first_checks,
                    SUM(CASE WHEN has_error = 1 THEN 1 ELSE 0 END) as errors,
                    SUM(CASE WHEN is_duplicate = 1 THEN 1 ELSE 0 END) as duplicates
                FROM notification_guard_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            `, [hours]);

            return stats[0];
        } catch (error) {
            console.error('❌ Error getting guard statistics:', error);
            return null;
        }
    }
}

module.exports = new NotificationGuardService();
