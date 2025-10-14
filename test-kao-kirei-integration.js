#!/usr/bin/env node

require('dotenv').config();
const fetch = require('node-fetch');

const API_BASE_URL = 'http://49.212.153.246:3000/api';

async function testKaoKireiIntegration() {
    console.log('🧪 Testing Kao Kirei Integration');
    console.log('================================\n');

    let authToken = null;

    try {
        // Step 1: Login to get auth token
        console.log('🔐 Step 1: Logging in...');
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'testuser', password: 'password123' })
        });

        const loginData = await loginResponse.json();
        if (!loginData.success) {
            throw new Error(`Login failed: ${loginData.message}`);
        }

        authToken = loginData.token;
        console.log('✅ Login successful\n');

        // Step 2: Test Kao Kirei scraping endpoint
        console.log('🔍 Step 2: Testing Kao Kirei scraping...');
        const scrapingResponse = await fetch(`${API_BASE_URL}/kao-kirei/test-scraping`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        const scrapingData = await scrapingResponse.json();
        if (!scrapingData.success) {
            throw new Error(`Kao Kirei scraping failed: ${scrapingData.message}`);
        }

        console.log('✅ Kao Kirei scraping successful');
        console.log(`   📊 Sites tested: ${scrapingData.results.totalSites}`);
        console.log(`   🔄 Changes detected: ${scrapingData.results.changesDetected}`);
        console.log(`   📧 Notifications sent: ${scrapingData.results.notificationsSent}`);
        console.log(`   ⏰ Processing time: ${scrapingData.results.processingTime}ms\n`);

        if (scrapingData.results.changes && scrapingData.results.changes.length > 0) {
            console.log('🔔 Detected changes:');
            scrapingData.results.changes.forEach((change, index) => {
                console.log(`   ${index + 1}. ${change.siteName}: ${change.changeType}`);
                if (change.addedProducts && change.addedProducts.length > 0) {
                    console.log(`      New products: ${change.addedProducts.length}`);
                }
                if (change.removedProducts && change.removedProducts.length > 0) {
                    console.log(`      Removed products: ${change.removedProducts.length}`);
                }
            });
            console.log('');
        }

        // Step 3: Test email notification with Kao Kirei results
        console.log('📧 Step 3: Testing email notification with Kao Kirei results...');
        
        // Create detailed message with scraping results
        let message = `🏭 花王キレイサイトスクレイピング結果通知\n\n`;
        message += `📊 テスト済みサイト: ${scrapingData.results.totalSites || 0}\n`;
        message += `🔄 変更検出: ${scrapingData.results.changesDetected || 0}件\n`;
        message += `📧 通知送信: ${scrapingData.results.notificationsSent || 0}件\n`;
        message += `⏰ 処理時間: ${scrapingData.results.processingTime || 0}ms\n\n`;
        
        if (scrapingData.results.changes && scrapingData.results.changes.length > 0) {
            message += `🔔 検出された変更:\n`;
            scrapingData.results.changes.forEach((change, index) => {
                message += `${index + 1}. ${change.siteName}: ${change.changeType}\n`;
                if (change.addedProducts && change.addedProducts.length > 0) {
                    message += `   新商品: ${change.addedProducts.length}件\n`;
                }
                if (change.removedProducts && change.removedProducts.length > 0) {
                    message += `   削除商品: ${change.removedProducts.length}件\n`;
                }
            });
        } else {
            message += `✅ 変更は検出されませんでした\n`;
        }
        
        message += `\nこの通知は、花王キレイ商品監視システムによって自動的に送信されました。`;

        // Create HTML email message
        const htmlMessage = createHtmlEmailMessage(scrapingData.results);

        const emailResponse = await fetch(`${API_BASE_URL}/notifications/test-email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                subject: '花王キレイサイトスクレイピング結果通知',
                htmlMessage: htmlMessage
            })
        });

        const emailData = await emailResponse.json();
        if (!emailData.success) {
            throw new Error(`Email test failed: ${emailData.message}`);
        }

        console.log('✅ Email notification with Kao Kirei results successful');
        console.log(`   📧 Emails sent to: ${emailData.results?.length || 0} users\n`);

        // Step 4: Test LINE notification with Kao Kirei results
        console.log('📱 Step 4: Testing LINE notification with Kao Kirei results...');
        
        const lineResponse = await fetch(`${API_BASE_URL}/broadcast/test-channel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message
            })
        });

        const lineData = await lineResponse.json();
        if (!lineData.success) {
            throw new Error(`LINE test failed: ${lineData.message}`);
        }

        console.log('✅ LINE notification with Kao Kirei results successful');
        console.log(`   📱 LINE message sent to channel\n`);

        // Step 5: Summary
        console.log('🎉 All tests completed successfully!');
        console.log('\n📋 Test Summary:');
        console.log('   ✅ Kao Kirei scraping: Working');
        console.log('   ✅ Email notifications: Working with Kao Kirei results');
        console.log('   ✅ LINE notifications: Working with Kao Kirei results');
        console.log('   ✅ HTML email support: Working');
        console.log('   ✅ Product change detection: Working');
        
        console.log('\n🎯 Key Features Verified:');
        console.log('   • Kao Kirei site scraping (khg and kbb)');
        console.log('   • Product change detection');
        console.log('   • Enhanced email notifications with HTML');
        console.log('   • LINE notifications with detailed results');
        console.log('   • Processing statistics and timing');
        console.log('   • Product-specific information');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Create HTML email message for Kao Kirei scraping results
function createHtmlEmailMessage(results) {
    const timestamp = new Date().toLocaleString('ja-JP');
    
    let changeSummary = '';
    let productDetails = '';
    
    // Build change summary
    if (results.changesDetected > 0) {
        changeSummary += `<p><strong>🔄 変更検出:</strong> ${results.changesDetected}件</p>`;
    } else {
        changeSummary += `<p><strong>✅ 変更は検出されませんでした</strong></p>`;
    }
    
    // Build detailed product information
    if (results.changes && results.changes.length > 0) {
        productDetails += '<h3>🔔 検出された変更:</h3><ul>';
        results.changes.forEach((change, index) => {
            productDetails += `<li><strong>${change.siteName}</strong>`;
            productDetails += `<br/>変更タイプ: ${change.changeType}`;
            if (change.addedProducts && change.addedProducts.length > 0) {
                productDetails += `<br/>新商品: ${change.addedProducts.length}件`;
            }
            if (change.removedProducts && change.removedProducts.length > 0) {
                productDetails += `<br/>削除商品: ${change.removedProducts.length}件`;
            }
            if (change.modifiedProducts && change.modifiedProducts.length > 0) {
                productDetails += `<br/>変更商品: ${change.modifiedProducts.length}件`;
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
    <title>花王キレイサイトスクレイピング結果通知</title>
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
            <h1>🏭 花王キレイサイトスクレイピング結果通知</h1>
            <p><strong>📊 テスト済みサイト:</strong> ${results.totalSites || 0}</p>
            <p><strong>📧 通知送信:</strong> ${results.notificationsSent || 0}件</p>
            <p><strong>⏰ 処理時間:</strong> ${results.processingTime || 0}ms</p>
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

// Run tests if this file is executed directly
if (require.main === module) {
    testKaoKireiIntegration().then(() => {
        console.log('\n🎉 Kao Kirei integration testing completed successfully!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Integration test failed:', error);
        process.exit(1);
    });
}

module.exports = { testKaoKireiIntegration };
