const KaoKireiChangeDetector = require('./kaoKireiChangeDetector');
const bulkNotificationService = require('./bulkNotificationService');

/**
 * Integration service for Kao Kirei sites
 * Handles the specialized product-only change detection
 */
class KaoKireiIntegrationService {
    constructor(dbConfig) {
        this.dbConfig = dbConfig;
        this.changeDetector = new KaoKireiChangeDetector(dbConfig);
    }

    /**
     * Check for product changes on Kao Kirei sites
     * @param {number} siteId - Site ID to check
     * @returns {Object} Check result
     */
    async checkKaoKireiSite(siteId) {
        try {
            console.log(`🔍 Checking Kao Kirei site ID: ${siteId}`);

            // Detect product changes
            const changeResult = await this.changeDetector.detectProductChanges(siteId);
            
            if (changeResult.hasChanged) {
                console.log(`🔄 Product changes detected for site ID: ${siteId}`);
                console.log(`   Reason: ${changeResult.reason}`);
                console.log(`   Change Type: ${changeResult.changeType}`);
                
                // Get site information
                const siteInfo = await this.getSiteInfo(siteId);
                
                // Send notifications
                const notificationResult = await this.sendProductChangeNotifications(
                    siteId, 
                    changeResult, 
                    siteInfo
                );
                
                return {
                    hasChanged: true,
                    reason: changeResult.reason,
                    changeType: changeResult.changeType,
                    addedProducts: changeResult.addedProducts,
                    removedProducts: changeResult.removedProducts,
                    modifiedProducts: changeResult.modifiedProducts,
                    notificationsSent: notificationResult.success,
                    notificationDetails: notificationResult
                };
            } else {
                console.log(`✅ No product changes detected for site ID: ${siteId}`);
                return {
                    hasChanged: false,
                    reason: changeResult.reason,
                    isFirstCheck: changeResult.isFirstCheck
                };
            }

        } catch (error) {
            console.error(`❌ Error checking Kao Kirei site ${siteId}:`, error);
            return {
                hasChanged: false,
                error: error.message
            };
        }
    }

    /**
     * Get site information
     * @param {number} siteId - Site ID
     * @returns {Object} Site information
     */
    async getSiteInfo(siteId) {
        try {
            const mysql = require('mysql2/promise');
            const pool = mysql.createPool(this.dbConfig);
            
            const [sites] = await pool.execute(`
                SELECT id, url, name, is_global_notification
                FROM monitored_sites 
                WHERE id = ?
            `, [siteId]);

            await pool.end();
            
            return sites.length > 0 ? sites[0] : null;
        } catch (error) {
            console.error('❌ Error getting site info:', error);
            return null;
        }
    }

    /**
     * Send notifications for product changes
     * @param {number} siteId - Site ID
     * @param {Object} changeResult - Change detection result
     * @param {Object} siteInfo - Site information
     * @returns {Object} Notification result
     */
    async sendProductChangeNotifications(siteId, changeResult, siteInfo) {
        try {
            // Get users to notify
            const users = await this.changeDetector.getUsersToNotify(siteId);
            
            if (users.length === 0) {
                return {
                    success: false,
                    reason: 'No users to notify',
                    successCount: 0,
                    totalUsers: 0
                };
            }

            // Generate notification message
            const message = this.changeDetector.generateNotificationMessage(changeResult, siteInfo.name);
            
            if (!message) {
                return {
                    success: false,
                    reason: 'Could not generate notification message',
                    successCount: 0,
                    totalUsers: users.length
                };
            }

            // Send notifications
            const notificationResult = await this.sendNotificationsToUsers(users, message, siteInfo);
            
            return {
                success: true,
                successCount: notificationResult.successCount,
                totalUsers: users.length,
                siteName: siteInfo.name,
                message: message
            };

        } catch (error) {
            console.error('❌ Error sending product change notifications:', error);
            return {
                success: false,
                error: error.message,
                successCount: 0,
                totalUsers: 0
            };
        }
    }

    /**
     * Send notifications to users
     * @param {Array} users - Array of users
     * @param {string} message - Notification message
     * @param {Object} siteInfo - Site information
     * @returns {Object} Notification result
     */
    async sendNotificationsToUsers(users, message, siteInfo) {
        let successCount = 0;
        const errors = [];

        for (const user of users) {
            try {
                // Send email notification if enabled
                if (user.email_enabled && user.email) {
                    await this.sendEmailNotification(user.email, message, siteInfo);
                    successCount++;
                }

                // Send LINE notification if enabled
                if (user.line_enabled && user.line_user_id) {
                    await this.sendLineNotification(user.line_user_id, message, siteInfo);
                    successCount++;
                }

            } catch (error) {
                console.error(`❌ Error sending notification to user ${user.id}:`, error);
                errors.push({
                    userId: user.id,
                    error: error.message
                });
            }
        }

        return {
            successCount,
            errors
        };
    }

    /**
     * Send email notification
     * @param {string} email - User email
     * @param {string} message - Notification message
     * @param {Object} siteInfo - Site information
     */
    async sendEmailNotification(email, message, siteInfo) {
        try {
            // Use the existing bulk notification service for email
            await bulkNotificationService.sendEmailNotification(email, {
                subject: `🔄 ${siteInfo.name} - 商品変更通知`,
                message: message,
                siteName: siteInfo.name,
                siteUrl: siteInfo.url
            });
            
            console.log(`✅ Email notification sent to ${email}`);
        } catch (error) {
            console.error(`❌ Error sending email to ${email}:`, error);
            throw error;
        }
    }

    /**
     * Send LINE notification
     * @param {string} lineUserId - LINE user ID
     * @param {string} message - Notification message
     * @param {Object} siteInfo - Site information
     */
    async sendLineNotification(lineUserId, message, siteInfo) {
        try {
            // Use the existing bulk notification service for LINE
            await bulkNotificationService.sendLineNotification(lineUserId, {
                message: message,
                siteName: siteInfo.name,
                siteUrl: siteInfo.url
            });
            
            console.log(`✅ LINE notification sent to ${lineUserId}`);
        } catch (error) {
            console.error(`❌ Error sending LINE to ${lineUserId}:`, error);
            throw error;
        }
    }

    /**
     * Check all Kao Kirei sites for product changes
     * @returns {Object} Overall check result
     */
    async checkAllKaoKireiSites() {
        try {
            console.log('🔍 Checking all Kao Kirei sites for product changes...');

            const mysql = require('mysql2/promise');
            const pool = mysql.createPool(this.dbConfig);
            
            // Get all Kao Kirei sites
            const [sites] = await pool.execute(`
                SELECT id, url, name, is_active
                FROM monitored_sites 
                WHERE scraping_method = 'dom_parser' 
                AND is_active = 1
            `);

            await pool.end();

            const results = [];
            let totalChanges = 0;

            for (const site of sites) {
                try {
                    const result = await this.checkKaoKireiSite(site.id);
                    results.push({
                        siteId: site.id,
                        siteName: site.name,
                        siteUrl: site.url,
                        ...result
                    });

                    if (result.hasChanged) {
                        totalChanges++;
                    }

                } catch (error) {
                    console.error(`❌ Error checking site ${site.name}:`, error);
                    results.push({
                        siteId: site.id,
                        siteName: site.name,
                        siteUrl: site.url,
                        hasChanged: false,
                        error: error.message
                    });
                }
            }

            console.log(`✅ Checked ${sites.length} Kao Kirei sites, found ${totalChanges} with changes`);

            return {
                success: true,
                totalSites: sites.length,
                totalChanges: totalChanges,
                results: results
            };

        } catch (error) {
            console.error('❌ Error checking all Kao Kirei sites:', error);
            return {
                success: false,
                error: error.message,
                totalSites: 0,
                totalChanges: 0,
                results: []
            };
        }
    }
}

module.exports = KaoKireiIntegrationService;
