const express = require('express');
const mysql = require('mysql2/promise');
const KaoKireiIntegrationService = require('../services/kaoKireiIntegrationService');
const enhancedBulkNotificationService = require('../services/enhancedBulkNotificationService');

const router = express.Router();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'website_monitor',
    charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);

// Middleware to check authentication
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const token = authHeader.split(' ')[1];
        // Here you would verify the JWT token
        // For now, we'll assume the token is valid if it exists
        req.user = { id: 1 }; // Mock user for testing
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid authentication'
        });
    }
};

/**
 * Test Kao Kirei scraping and send notifications to all users
 * POST /api/kao-kirei/test-scraping
 */
router.post('/test-scraping', requireAuth, async (req, res) => {
    try {
        console.log('🧪 Starting Kao Kirei scraping test...');
        
        const startTime = Date.now();
        const results = {
            totalSites: 0,
            changesDetected: 0,
            notificationsSent: 0,
            processingTime: 0,
            changes: [],
            errors: []
        };

        // Get Kao Kirei sites from database
        const [sites] = await pool.execute(`
            SELECT id, url, name, scraping_method, is_global_notification
            FROM monitored_sites 
            WHERE scraping_method = 'dom_parser' 
            AND is_global_notification = 1
            AND is_active = 1
        `);

        if (sites.length === 0) {
            return res.json({
                success: true,
                message: 'No Kao Kirei sites found for testing',
                results: {
                    ...results,
                    processingTime: Date.now() - startTime
                }
            });
        }

        results.totalSites = sites.length;
        console.log(`📊 Found ${sites.length} Kao Kirei sites to test`);

        // Initialize Kao Kirei integration service
        const kaoKireiService = new KaoKireiIntegrationService(dbConfig);

        // Test each Kao Kirei site
        for (const site of sites) {
            try {
                console.log(`🔍 Testing site: ${site.name} (${site.url})`);
                
                const siteResult = await kaoKireiService.processSite(site);
                
                if (siteResult.success && siteResult.changesDetected) {
                    results.changesDetected++;
                    results.changes.push({
                        siteId: site.id,
                        siteName: site.name,
                        siteUrl: site.url,
                        changeType: siteResult.changeType || 'Product changes detected',
                        changeDetails: siteResult.changeDetails || 'Products added or removed',
                        timestamp: new Date().toISOString()
                    });
                    
                    console.log(`✅ Changes detected for ${site.name}`);
                } else {
                    console.log(`✅ No changes detected for ${site.name}`);
                }
                
            } catch (error) {
                console.error(`❌ Error testing site ${site.name}:`, error);
                results.errors.push({
                    siteId: site.id,
                    siteName: site.name,
                    error: error.message
                });
            }
        }

        // Send notifications to all users if changes were detected
        if (results.changesDetected > 0) {
            console.log(`📧 Sending notifications for ${results.changesDetected} changes to all users`);
            
            try {
                // Get all active users
                const [users] = await pool.execute(`
                    SELECT id, username, email, line_user_id, email_enabled, line_enabled
                    FROM users 
                    WHERE is_active = 1 AND is_blocked = 0
                `);

                console.log(`👥 Found ${users.length} active users to notify`);

                // Send enhanced notifications for each change with product details
                for (const change of results.changes) {
                    const productChanges = {
                        addedProducts: change.addedProducts || [],
                        removedProducts: change.removedProducts || [],
                        modifiedProducts: change.modifiedProducts || [],
                        changeType: change.changeType,
                        reason: change.changeDetails
                    };

                    const notificationResult = await enhancedBulkNotificationService.notifyKaoKireiProductChange(
                        change.siteId,
                        productChanges
                    );

                    if (notificationResult.success) {
                        results.notificationsSent += notificationResult.successCount;
                        console.log(`✅ Sent ${notificationResult.successCount} enhanced notifications for ${change.siteName}`);
                    } else {
                        console.error(`❌ Failed to send notifications for ${change.siteName}:`, notificationResult.reason);
                    }
                }

            } catch (notificationError) {
                console.error('❌ Error sending notifications:', notificationError);
                results.errors.push({
                    type: 'notification',
                    error: notificationError.message
                });
            }
        } else {
            console.log('ℹ️ No changes detected, no notifications to send');
        }

        results.processingTime = Date.now() - startTime;

        console.log(`🎉 Kao Kirei test completed in ${results.processingTime}ms`);
        console.log(`📊 Results: ${results.changesDetected} changes, ${results.notificationsSent} notifications sent`);

        res.json({
            success: true,
            message: 'Kao Kirei scraping test completed successfully',
            results: results
        });

    } catch (error) {
        console.error('❌ Kao Kirei test error:', error);
        res.status(500).json({
            success: false,
            message: 'Kao Kirei test failed',
            error: error.message
        });
    }
});

/**
 * Get Kao Kirei sites status
 * GET /api/kao-kirei/status
 */
router.get('/status', requireAuth, async (req, res) => {
    try {
        const [sites] = await pool.execute(`
            SELECT 
                id, url, name, 
                last_check, last_status_code, last_response_time_ms,
                is_active, is_global_notification
            FROM monitored_sites 
            WHERE scraping_method = 'dom_parser' 
            AND is_global_notification = 1
            ORDER BY last_check DESC
        `);

        const [recentChanges] = await pool.execute(`
            SELECT 
                sc.site_id, sc.created_at, sc.changes_detected, sc.reason,
                ms.name as site_name, ms.url
            FROM site_checks sc
            JOIN monitored_sites ms ON sc.site_id = ms.id
            WHERE ms.scraping_method = 'dom_parser' 
            AND ms.is_global_notification = 1
            AND sc.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY sc.created_at DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                sites: sites,
                recentChanges: recentChanges
            }
        });

    } catch (error) {
        console.error('❌ Error getting Kao Kirei status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Kao Kirei status',
            error: error.message
        });
    }
});

/**
 * Manually trigger Kao Kirei site check
 * POST /api/kao-kirei/check/:siteId
 */
router.post('/check/:siteId', requireAuth, async (req, res) => {
    try {
        const { siteId } = req.params;
        
        // Get site information
        const [sites] = await pool.execute(`
            SELECT id, url, name, scraping_method, is_global_notification
            FROM monitored_sites 
            WHERE id = ? AND scraping_method = 'dom_parser'
        `, [siteId]);

        if (sites.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kao Kirei site not found'
            });
        }

        const site = sites[0];
        console.log(`🔍 Manual check triggered for: ${site.name}`);

        // Initialize Kao Kirei integration service
        const kaoKireiService = new KaoKireiIntegrationService(dbConfig);

        // Process the site
        const result = await kaoKireiService.processSite(site);

        res.json({
            success: true,
            message: 'Manual check completed',
            result: result
        });

    } catch (error) {
        console.error('❌ Error in manual check:', error);
        res.status(500).json({
            success: false,
            message: 'Manual check failed',
            error: error.message
        });
    }
});

module.exports = router;
