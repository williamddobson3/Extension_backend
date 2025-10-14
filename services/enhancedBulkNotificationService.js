const { pool } = require('../config/database');
const notificationService = require('./notificationService');

class EnhancedBulkNotificationService {
    constructor() {
        this.notificationService = notificationService;
    }

    // Get all users watching a specific site
    async getAllActiveUsers() {
        try {
            const [users] = await pool.execute(
                `SELECT DISTINCT u.id, u.email, u.line_user_id, un.email_enabled, un.line_enabled
                 FROM users u
                 LEFT JOIN user_notifications un ON u.id = un.user_id
                 WHERE u.is_active = TRUE`,
                []
            );

            // Set default preferences if none exist
            return users.map(user => ({
                ...user,
                email_enabled: user.email_enabled !== null ? user.email_enabled : true,
                line_enabled: user.line_enabled !== null ? user.line_enabled : false
            }));
        } catch (error) {
            console.error('Error getting all active users:', error);
            throw error;
        }
    }

    async getUsersWatchingSite(siteId) {
        try {
            const [users] = await pool.execute(
                `SELECT DISTINCT u.id, u.email, u.line_user_id, un.email_enabled, un.line_enabled
                 FROM users u
                 JOIN monitored_sites ms ON u.id = ms.user_id
                 LEFT JOIN user_notifications un ON u.id = un.user_id
                 WHERE ms.id = ? AND u.is_active = TRUE`,
                [siteId]
            );

            // Set default preferences if none exist
            return users.map(user => ({
                ...user,
                email_enabled: user.email_enabled !== null ? user.email_enabled : true,
                line_enabled: user.line_enabled !== null ? user.line_enabled : false
            }));
        } catch (error) {
            console.error('Error getting users watching site:', error);
            throw error;
        }
    }

    // Enhanced notification for Kao Kirei sites with detailed product information
    async notifyKaoKireiProductChange(siteId, productChanges) {
        try {
            console.log(`🔔 Notifying users about Kao Kirei product changes for site ID: ${siteId}`);

            // Get site information
            const [sites] = await pool.execute(
                'SELECT id, name, url, scraping_method FROM monitored_sites WHERE id = ?',
                [siteId]
            );

            if (sites.length === 0) {
                console.log(`Site ${siteId} not found`);
                return { success: false, reason: 'Site not found' };
            }

            const site = sites[0];

            // Get all active users for global notifications
            const users = await this.getAllActiveUsers();
            console.log(`Found ${users.length} active users for Kao Kirei notifications`);

            if (users.length === 0) {
                console.log(`No active users found`);
                return { success: false, reason: 'No active users found' };
            }

            // Create detailed product change notification
            const notificationMessage = this.createKaoKireiProductNotification(site, productChanges);

            // Send notifications to each user
            const results = [];
            for (const user of users) {
                try {
                    const result = await this.notifyUserWithProductDetails(user, siteId, notificationMessage, productChanges);
                    results.push({
                        userId: user.id,
                        email: user.email,
                        success: result.success,
                        error: result.error || result.reason
                    });
                } catch (error) {
                    console.error(`Failed to notify user ${user.id}:`, error);
                    results.push({
                        userId: user.id,
                        email: user.email,
                        success: false,
                        error: error.message
                    });
                }
            }

            // Log summary
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.length - successCount;
            
            console.log(`📊 Kao Kirei notification summary for site "${site.name}":`);
            console.log(`   ✅ Successfully notified: ${successCount} users`);
            console.log(`   ❌ Failed to notify: ${failureCount} users`);

            return {
                success: true,
                siteName: site.name,
                totalUsers: users.length,
                successCount,
                failureCount,
                results
            };

        } catch (error) {
            console.error('Error in Kao Kirei product notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create detailed Kao Kirei product change notification
    createKaoKireiProductNotification(site, productChanges) {
        const timestamp = new Date().toLocaleString('ja-JP');
        
        let changeSummary = '';
        let productDetails = '';
        
        // Build change summary
        if (productChanges.addedProducts && productChanges.addedProducts.length > 0) {
            changeSummary += `🆕 新商品追加: ${productChanges.addedProducts.length}件\n`;
        }
        if (productChanges.removedProducts && productChanges.removedProducts.length > 0) {
            changeSummary += `🗑️ 商品削除: ${productChanges.removedProducts.length}件\n`;
        }
        if (productChanges.modifiedProducts && productChanges.modifiedProducts.length > 0) {
            changeSummary += `🔄 商品変更: ${productChanges.modifiedProducts.length}件\n`;
        }

        // Build detailed product information
        if (productChanges.addedProducts && productChanges.addedProducts.length > 0) {
            productDetails += '\n📦 新しく追加された商品:\n';
            productChanges.addedProducts.forEach((product, index) => {
                productDetails += `${index + 1}. ${product.name}\n`;
                if (product.category) productDetails += `   カテゴリ: ${product.category}\n`;
                if (product.status) productDetails += `   ステータス: ${product.status}\n`;
                if (product.regulation) productDetails += `   規制: ${product.regulation}\n`;
                if (product.link) productDetails += `   リンク: ${product.link}\n`;
                productDetails += '\n';
            });
        }

        if (productChanges.removedProducts && productChanges.removedProducts.length > 0) {
            productDetails += '\n🗑️ 削除された商品:\n';
            productChanges.removedProducts.forEach((product, index) => {
                productDetails += `${index + 1}. ${product.name}\n`;
                if (product.category) productDetails += `   カテゴリ: ${product.category}\n`;
                productDetails += '\n';
            });
        }

        if (productChanges.modifiedProducts && productChanges.modifiedProducts.length > 0) {
            productDetails += '\n🔄 変更された商品:\n';
            productChanges.modifiedProducts.forEach((product, index) => {
                productDetails += `${index + 1}. ${product.name}\n`;
                if (product.changes) {
                    productDetails += `   変更内容: ${product.changes}\n`;
                }
                productDetails += '\n';
            });
        }

        const message = `🏭 花王キレイ商品情報更新通知

📊 サイト: ${site.name}
🌐 URL: ${site.url}
🕐 検出時刻: ${timestamp}

${changeSummary}
${productDetails}
この通知は、花王キレイ商品監視システムによって自動的に送信されました。
最新の商品情報をご確認ください。`;

        return message;
    }

    // Enhanced HTML notification for email
    createKaoKireiProductHtmlNotification(site, productChanges) {
        const timestamp = new Date().toLocaleString('ja-JP');
        
        let changeSummary = '';
        let productDetails = '';
        
        // Build change summary
        if (productChanges.addedProducts && productChanges.addedProducts.length > 0) {
            changeSummary += `<p><strong>🆕 新商品追加:</strong> ${productChanges.addedProducts.length}件</p>`;
        }
        if (productChanges.removedProducts && productChanges.removedProducts.length > 0) {
            changeSummary += `<p><strong>🗑️ 商品削除:</strong> ${productChanges.removedProducts.length}件</p>`;
        }
        if (productChanges.modifiedProducts && productChanges.modifiedProducts.length > 0) {
            changeSummary += `<p><strong>🔄 商品変更:</strong> ${productChanges.modifiedProducts.length}件</p>`;
        }

        // Build detailed product information
        if (productChanges.addedProducts && productChanges.addedProducts.length > 0) {
            productDetails += '<h3>📦 新しく追加された商品:</h3><ul>';
            productChanges.addedProducts.forEach((product) => {
                productDetails += `<li><strong>${product.name}</strong>`;
                if (product.category) productDetails += `<br/>カテゴリ: ${product.category}`;
                if (product.status) productDetails += `<br/>ステータス: ${product.status}`;
                if (product.regulation) productDetails += `<br/>規制: ${product.regulation}`;
                if (product.link) productDetails += `<br/><a href="${product.link}" target="_blank">商品ページ</a>`;
                productDetails += '</li>';
            });
            productDetails += '</ul>';
        }

        if (productChanges.removedProducts && productChanges.removedProducts.length > 0) {
            productDetails += '<h3>🗑️ 削除された商品:</h3><ul>';
            productChanges.removedProducts.forEach((product) => {
                productDetails += `<li><strong>${product.name}</strong>`;
                if (product.category) productDetails += `<br/>カテゴリ: ${product.category}`;
                productDetails += '</li>';
            });
            productDetails += '</ul>';
        }

        if (productChanges.modifiedProducts && productChanges.modifiedProducts.length > 0) {
            productDetails += '<h3>🔄 変更された商品:</h3><ul>';
            productChanges.modifiedProducts.forEach((product) => {
                productDetails += `<li><strong>${product.name}</strong>`;
                if (product.changes) {
                    productDetails += `<br/>変更内容: ${product.changes}`;
                }
                productDetails += '</li>';
            });
            productDetails += '</ul>';
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>花王キレイ商品情報更新通知</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .product-section { margin: 20px 0; }
        .product-list { background: #f8f9fa; padding: 15px; border-radius: 5px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏭 花王キレイ商品情報更新通知</h1>
            <p><strong>📊 サイト:</strong> ${site.name}</p>
            <p><strong>🌐 URL:</strong> <a href="${site.url}" target="_blank">${site.url}</a></p>
            <p><strong>🕐 検出時刻:</strong> ${timestamp}</p>
        </div>
        
        <div class="product-section">
            <h2>📊 変更サマリー</h2>
            ${changeSummary}
        </div>
        
        <div class="product-section">
            ${productDetails}
        </div>
        
        <div class="footer">
            <p>この通知は、花王キレイ商品監視システムによって自動的に送信されました。</p>
            <p>最新の商品情報をご確認ください。</p>
        </div>
    </div>
</body>
</html>`;
    }

    // Notify a single user with detailed product information
    async notifyUserWithProductDetails(user, siteId, message, productChanges) {
        try {
            const results = {
                email: null,
                line: null
            };

            // Send email notification if enabled
            if (user.email_enabled && user.email) {
                try {
                    const htmlMessage = this.createKaoKireiProductHtmlNotification(
                        { name: 'Kao Kirei Site', url: 'https://www.kao-kirei.com' }, 
                        productChanges
                    );
                    
                    results.email = await this.notificationService.sendEmail(
                        user.id,
                        siteId,
                        htmlMessage,
                        '花王キレイ商品情報更新通知'
                    );
                } catch (error) {
                    console.error(`Email notification failed for user ${user.id}:`, error);
                    results.email = { success: false, error: error.message };
                }
            }

            // Send LINE notification if enabled
            if (user.line_enabled && user.line_user_id) {
                try {
                    results.line = await this.notificationService.sendLineNotification(
                        user.id,
                        siteId,
                        message
                    );
                } catch (error) {
                    console.error(`LINE notification failed for user ${user.id}:`, error);
                    results.line = { success: false, error: error.message };
                }
            }

            // Determine overall success
            const hasSuccess = (results.email && results.email.success) || 
                             (results.line && results.line.success);

            return {
                success: hasSuccess,
                results: results
            };

        } catch (error) {
            console.error(`Error notifying user ${user.id}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Legacy method for backward compatibility
    async notifySiteChange(siteId, changeDetails) {
        // Check if this is a Kao Kirei site with product changes
        const [sites] = await pool.execute(
            'SELECT scraping_method, is_global_notification FROM monitored_sites WHERE id = ?',
            [siteId]
        );

        if (sites.length > 0 && sites[0].scraping_method === 'dom_parser' && sites[0].is_global_notification) {
            // Use enhanced Kao Kirei notification
            return await this.notifyKaoKireiProductChange(siteId, changeDetails);
        } else {
            // Use regular notification for other sites
            return await this.notifyRegularSiteChange(siteId, changeDetails);
        }
    }

    // Regular site change notification (for non-Kao Kirei sites)
    async notifyRegularSiteChange(siteId, changeDetails) {
        try {
            console.log(`🔔 Notifying users about regular site change for site ID: ${siteId}`);

            // Get site information
            const [sites] = await pool.execute(
                'SELECT id, name, url FROM monitored_sites WHERE id = ?',
                [siteId]
            );

            if (sites.length === 0) {
                console.log(`Site ${siteId} not found`);
                return { success: false, reason: 'Site not found' };
            }

            const site = sites[0];

            // Get users watching this specific site
            const users = await this.getUsersWatchingSite(siteId);
            console.log(`Found ${users.length} users watching site "${site.name}"`);

            if (users.length === 0) {
                console.log(`No users watching site "${site.name}"`);
                return { success: false, reason: 'No users watching this site' };
            }

            // Prepare notification message
            const notificationMessage = this.createChangeNotificationMessage(site, changeDetails);

            // Send notifications to each user
            const results = [];
            for (const user of users) {
                try {
                    const result = await this.notifyUser(user, siteId, notificationMessage, changeDetails);
                    results.push({
                        userId: user.id,
                        email: user.email,
                        success: result.success,
                        error: result.error || result.reason
                    });
                } catch (error) {
                    console.error(`Failed to notify user ${user.id}:`, error);
                    results.push({
                        userId: user.id,
                        email: user.email,
                        success: false,
                        error: error.message
                    });
                }
            }

            // Log summary
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.length - successCount;
            
            console.log(`📊 Notification summary for site "${site.name}":`);
            console.log(`   ✅ Successfully notified: ${successCount} users`);
            console.log(`   ❌ Failed to notify: ${failureCount} users`);

            return {
                success: true,
                siteName: site.name,
                totalUsers: users.length,
                successCount,
                failureCount,
                results
            };

        } catch (error) {
            console.error('Error in regular site notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create a detailed notification message for regular sites
    createChangeNotificationMessage(site, changeDetails) {
        const timestamp = new Date().toLocaleString('ja-JP');
        
        let changeReason = 'コンテンツが更新されました';
        if (changeDetails.reason) {
            if (changeDetails.reason.includes('新しいキーワードが検出されました')) {
                changeReason = '新しいキーワードが検出されました';
            } else if (changeDetails.reason.includes('キーワードが削除されました')) {
                changeReason = 'キーワードが削除されました';
            } else if (changeDetails.reason.includes('以前のスナップショットと比較して内容が変更されました')) {
                changeReason = 'ページコンテンツが変更されました';
            }
        }

        return `🌐 ウェブサイト更新が検出されました！
📊 サイト: ${site.name}
🌐 URL: ${site.url}
🔄 変更: ${changeReason}
🕐 検出時刻: ${timestamp}

監視中のウェブサイトが更新されました。
最新情報をご確認ください。

この通知は、ウェブサイト監視システムによって自動的に送信されました。`;
    }

    // Notify a single user about a site change
    async notifyUser(user, siteId, message, changeDetails) {
        try {
            const results = {
                email: null,
                line: null
            };

            // Send email notification if enabled
            if (user.email_enabled && user.email) {
                try {
                    results.email = await this.notificationService.sendEmail(
                        user.id,
                        siteId,
                        message,
                        'ウェブサイト更新が検出されました'
                    );
                } catch (error) {
                    console.error(`Email notification failed for user ${user.id}:`, error);
                    results.email = { success: false, error: error.message };
                }
            }

            // Send LINE notification if enabled
            if (user.line_enabled && user.line_user_id) {
                try {
                    results.line = await this.notificationService.sendLineNotification(
                        user.id,
                        siteId,
                        message
                    );
                } catch (error) {
                    console.error(`LINE notification failed for user ${user.id}:`, error);
                    results.line = { success: false, error: error.message };
                }
            }

            // Determine overall success
            const hasSuccess = (results.email && results.email.success) || 
                             (results.line && results.line.success);

            return {
                success: hasSuccess,
                results: results
            };

        } catch (error) {
            console.error(`Error notifying user ${user.id}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new EnhancedBulkNotificationService();
