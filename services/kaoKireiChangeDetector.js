const mysql = require('mysql2/promise');
const KaoKireiProductScraper = require('./kaoKireiProductScraper');

/**
 * Specialized change detector for Kao Kirei sites
 * Only detects changes in product information, not other page content
 */
class KaoKireiChangeDetector {
    constructor(dbConfig) {
        this.dbConfig = dbConfig;
        this.pool = mysql.createPool(dbConfig);
        this.scraper = new KaoKireiProductScraper();
    }

    /**
     * Detect changes in product information for Kao Kirei sites
     * @param {number} siteId - The site ID to check for changes
     * @returns {Object} Detailed change analysis
     */
    async detectProductChanges(siteId) {
        try {
            console.log(`🔍 Analyzing product changes for Kao Kirei site ID: ${siteId}`);

            // Get site information
            const [sites] = await this.pool.execute(`
                SELECT id, url, name, scraping_method, is_global_notification
                FROM monitored_sites 
                WHERE id = ? AND scraping_method = 'dom_parser'
            `, [siteId]);

            if (sites.length === 0) {
                return {
                    hasChanged: false,
                    reason: 'Site not found or not a Kao Kirei site',
                    isFirstCheck: false
                };
            }

            const site = sites[0];

            // Scrape current products
            const scrapeResult = await this.scraper.scrapeProducts(site.url);
            
            if (!scrapeResult.success) {
                return {
                    hasChanged: false,
                    reason: `Failed to scrape products: ${scrapeResult.error}`,
                    error: scrapeResult.error
                };
            }

            // Get previous product data
            const [previousChecks] = await this.pool.execute(`
                SELECT 
                    sc.id,
                    sc.content_hash,
                    sc.text_content,
                    sc.created_at,
                    sc.changes_detected,
                    sc.reason
                FROM site_checks sc
                WHERE sc.site_id = ?
                ORDER BY sc.created_at DESC
                LIMIT 1
            `, [siteId]);

            // If this is the first check, just store the data
            if (previousChecks.length === 0) {
                await this.storeProductData(siteId, scrapeResult);
                return {
                    hasChanged: false,
                    reason: 'First check - no previous data to compare',
                    isFirstCheck: true,
                    productCount: scrapeResult.productCount
                };
            }

            // Parse previous product data
            let previousProducts = [];
            try {
                const previousData = JSON.parse(previousChecks[0].text_content || '{}');
                previousProducts = previousData.products || [];
            } catch (error) {
                console.log('No previous product data found, treating as first check');
            }

            // Compare products
            const changes = this.scraper.compareProducts(scrapeResult.products, previousProducts);

            // Store current data
            await this.storeProductData(siteId, scrapeResult);

            if (changes.hasChanged) {
                // Save change history
                await this.saveProductChangeHistory(siteId, previousChecks[0].id, changes);
                
                // Update the current check with change information
                await this.updateCheckWithProductChanges(siteId, changes);
            }

            return {
                hasChanged: changes.hasChanged,
                reason: changes.summary,
                changeType: changes.changeType,
                addedProducts: changes.addedProducts,
                removedProducts: changes.removedProducts,
                modifiedProducts: changes.modifiedProducts,
                productCount: scrapeResult.productCount,
                isFirstCheck: false
            };

        } catch (error) {
            console.error('❌ Error in Kao Kirei product change detection:', error);
            throw error;
        }
    }

    /**
     * Store product data in the database
     * @param {number} siteId - Site ID
     * @param {Object} scrapeResult - Scraping result
     */
    async storeProductData(siteId, scrapeResult) {
        try {
            const productData = {
                products: scrapeResult.products,
                productCount: scrapeResult.productCount,
                scrapedAt: new Date().toISOString()
            };

            // Insert new site check
            const [result] = await this.pool.execute(`
                INSERT INTO site_checks (
                    site_id, 
                    content_hash, 
                    text_content, 
                    content_length, 
                    status_code, 
                    response_time_ms, 
                    scraping_method, 
                    changes_detected, 
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                siteId,
                scrapeResult.productHash,
                JSON.stringify(productData),
                JSON.stringify(productData).length,
                scrapeResult.statusCode,
                scrapeResult.responseTime,
                'kao_kirei_product_scraper',
                false
            ]);

            console.log(`✅ Stored product data for site ${siteId}, check ID: ${result.insertId}`);
            return result.insertId;

        } catch (error) {
            console.error('❌ Error storing product data:', error);
            throw error;
        }
    }

    /**
     * Save detailed product change history
     * @param {number} siteId - Site ID
     * @param {number} previousCheckId - Previous check ID
     * @param {Object} changes - Change details
     */
    async saveProductChangeHistory(siteId, previousCheckId, changes) {
        try {
            // Get current check ID
            const [currentChecks] = await this.pool.execute(`
                SELECT id FROM site_checks 
                WHERE site_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [siteId]);

            if (currentChecks.length === 0) return;

            const currentCheckId = currentChecks[0].id;

            // Save change history
            await this.pool.execute(`
                INSERT INTO change_history (
                    site_id, 
                    previous_check_id, 
                    current_check_id, 
                    change_type, 
                    change_description, 
                    old_value, 
                    new_value, 
                    severity, 
                    detected_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                siteId,
                previousCheckId,
                currentCheckId,
                changes.changeType,
                changes.summary,
                JSON.stringify({
                    added: changes.addedProducts,
                    removed: changes.removedProducts,
                    modified: changes.modifiedProducts
                }),
                JSON.stringify({
                    totalChanges: changes.addedProducts.length + changes.removedProducts.length + changes.modifiedProducts.length
                }),
                'high'
            ]);

            console.log(`✅ Saved product change history for site ${siteId}`);

        } catch (error) {
            console.error('❌ Error saving product change history:', error);
        }
    }

    /**
     * Update check with product change information
     * @param {number} siteId - Site ID
     * @param {Object} changes - Change details
     */
    async updateCheckWithProductChanges(siteId, changes) {
        try {
            await this.pool.execute(`
                UPDATE site_checks 
                SET 
                    changes_detected = true,
                    reason = ?,
                    change_type = ?,
                    change_reason = ?
                WHERE site_id = ? 
                AND id = (
                    SELECT id FROM (
                        SELECT id FROM site_checks 
                        WHERE site_id = ? 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    ) AS latest_check
                )
            `, [
                changes.summary,
                changes.changeType,
                `Products changed: ${changes.addedProducts.length} added, ${changes.removedProducts.length} removed, ${changes.modifiedProducts.length} modified`,
                siteId,
                siteId
            ]);

            console.log(`✅ Updated check with product changes for site ${siteId}`);

        } catch (error) {
            console.error('❌ Error updating check with product changes:', error);
        }
    }

    /**
     * Get users to notify for Kao Kirei sites
     * @param {number} siteId - Site ID
     * @returns {Array} Array of users to notify
     */
    async getUsersToNotify(siteId) {
        try {
            // Check if this is a global notification site
            const [sites] = await this.pool.execute(`
                SELECT is_global_notification 
                FROM monitored_sites 
                WHERE id = ?
            `, [siteId]);

            if (sites.length === 0) return [];

            const isGlobal = sites[0].is_global_notification;

            if (isGlobal) {
                // Get all active users for global notifications
                const [users] = await this.pool.execute(`
                    SELECT DISTINCT u.id, u.email, u.line_user_id, un.email_enabled, un.line_enabled
                    FROM users u
                    LEFT JOIN user_notifications un ON u.id = un.user_id
                    WHERE u.is_active = 1 AND u.is_blocked = 0
                    AND (un.email_enabled = 1 OR un.line_enabled = 1)
                `);
                return users;
            } else {
                // Get only the user who registered this site
                const [users] = await this.pool.execute(`
                    SELECT DISTINCT u.id, u.email, u.line_user_id, un.email_enabled, un.line_enabled
                    FROM users u
                    LEFT JOIN user_notifications un ON u.id = un.user_id
                    JOIN monitored_sites ms ON u.id = ms.user_id
                    WHERE ms.id = ? AND u.is_active = 1 AND u.is_blocked = 0
                    AND (un.email_enabled = 1 OR un.line_enabled = 1)
                `, [siteId]);
                return users;
            }

        } catch (error) {
            console.error('❌ Error getting users to notify:', error);
            return [];
        }
    }

    /**
     * Generate notification message for product changes
     * @param {Object} changes - Change details
     * @param {string} siteName - Site name
     * @returns {string} Notification message
     */
    generateNotificationMessage(changes, siteName) {
        return this.scraper.generateNotificationMessage(changes, siteName);
    }
}

module.exports = KaoKireiChangeDetector;
