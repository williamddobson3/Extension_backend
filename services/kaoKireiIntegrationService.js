const KaoKireiChangeDetector = require('./kaoKireiChangeDetector');
const enhancedBulkNotificationService = require('./enhancedBulkNotificationService');

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
            
            // Use notification guard to ensure notifications are only sent when appropriate
            const notificationGuardService = require('./notificationGuardService');
            const guardResult = await notificationGuardService.shouldSendNotifications(siteId, changeResult);
            
            // Log the guard decision
            await notificationGuardService.logGuardDecision(siteId, guardResult, changeResult);
            
            if (guardResult.shouldSend) {
                console.log(`🔄 Product changes detected and approved for site ID: ${siteId}`);
                console.log(`   Reason: ${changeResult.reason}`);
                console.log(`   Change Type: ${changeResult.changeType}`);
                console.log(`   Guard Result: ${guardResult.reason}`);
                
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
                    notificationDetails: notificationResult,
                    guardResult: guardResult
                };
            } else {
                console.log(`🛡️ Kao Kirei notifications BLOCKED for site ID ${siteId}: ${guardResult.reason}`);
                console.log(`   Change detected: ${changeResult.hasChanged}`);
                console.log(`   Guard checks:`, guardResult.guardChecks);
                
                return {
                    hasChanged: changeResult.hasChanged,
                    reason: changeResult.reason,
                    changeType: changeResult.changeType,
                    addedProducts: changeResult.addedProducts,
                    removedProducts: changeResult.removedProducts,
                    modifiedProducts: changeResult.modifiedProducts,
                    notificationsSent: false,
                    notificationsBlocked: true,
                    blockReason: guardResult.reason,
                    guardResult: guardResult
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
            console.log(`🔔 Sending Kao Kirei product change notifications for site ID: ${siteId}`);

            // Prepare product changes data for enhanced notification
            const productChanges = {
                addedProducts: changeResult.addedProducts || [],
                removedProducts: changeResult.removedProducts || [],
                modifiedProducts: changeResult.modifiedProducts || [],
                changeType: changeResult.changeType,
                reason: changeResult.reason
            };

            // Use enhanced notification service for Kao Kirei sites
            const notificationResult = await enhancedBulkNotificationService.notifyKaoKireiProductChange(
                siteId, 
                productChanges
            );
            
            return {
                success: notificationResult.success,
                successCount: notificationResult.successCount || 0,
                totalUsers: notificationResult.totalUsers || 0,
                message: notificationResult.success ? 'Kao Kirei product notifications sent successfully' : 'Failed to send notifications',
                details: notificationResult
            };

        } catch (error) {
            console.error('❌ Error sending Kao Kirei product change notifications:', error);
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
     * Process a single Kao Kirei site (scrape, detect changes, send notifications)
     * @param {Object} site - Site object with id, url, name, etc.
     * @returns {Object} Processing result
     */
    async processSite(site) {
        try {
            console.log(`🚀 Processing Kao Kirei site: ${site.name} (${site.url})`);

            // Check for product changes
            const changeResult = await this.checkKaoKireiSite(site.id);
            
            if (changeResult.hasChanged) {
                console.log(`🔔 Changes detected for site ${site.name}: ${changeResult.reason}`);
                
                return {
                    success: true,
                    hasChanged: true,
                    changeResult: changeResult,
                    siteName: site.name,
                    siteUrl: site.url,
                    message: `Successfully processed ${site.name} with changes detected`
                };
            } else {
                console.log(`✅ No changes detected for site ${site.name}`);
                
                return {
                    success: true,
                    hasChanged: false,
                    changeResult: changeResult,
                    siteName: site.name,
                    siteUrl: site.url,
                    message: `Successfully processed ${site.name} - no changes detected`
                };
            }

        } catch (error) {
            console.error(`❌ Error processing site ${site.name}:`, error);
            return {
                success: false,
                hasChanged: false,
                error: error.message,
                siteName: site.name,
                siteUrl: site.url,
                message: `Error processing ${site.name}: ${error.message}`
            };
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
