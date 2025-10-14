#!/usr/bin/env node

require('dotenv').config();
const KaoKireiProductScraper = require('./services/kaoKireiProductScraper');
const KaoKireiIntegrationService = require('./services/kaoKireiIntegrationService');

console.log('🧪 Testing Kao Kirei Product Scraper');
console.log('=====================================\n');

async function testProductScraper() {
    try {
        const scraper = new KaoKireiProductScraper();
        
        // Test URLs
        const testUrls = [
            'https://www.kao-kirei.com/ja/expire-item/khg/?tw=khg',
            'https://www.kao-kirei.com/ja/expire-item/kbb/?tw=kbb'
        ];

        for (const url of testUrls) {
            console.log(`\n🔍 Testing URL: ${url}`);
            console.log('─'.repeat(80));
            
            const result = await scraper.scrapeProducts(url);
            
            if (result.success) {
                console.log(`✅ Successfully scraped ${result.productCount} products`);
                console.log(`📊 Product Hash: ${result.productHash.substring(0, 16)}...`);
                console.log(`⏱️  Response Time: ${result.responseTime}ms`);
                console.log(`📡 Status Code: ${result.statusCode}`);
                
                // Show first few products
                console.log('\n📦 Sample Products:');
                result.products.slice(0, 3).forEach((product, index) => {
                    console.log(`   ${index + 1}. ${product.name}`);
                    console.log(`      Category: ${product.category}`);
                    console.log(`      Status: ${product.status}`);
                    console.log(`      Regulation: ${product.regulation}`);
                });
                
                if (result.products.length > 3) {
                    console.log(`   ... and ${result.products.length - 3} more products`);
                }
                
            } else {
                console.log(`❌ Failed to scrape: ${result.error}`);
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function testProductComparison() {
    try {
        console.log('\n🔄 Testing Product Comparison');
        console.log('─'.repeat(80));
        
        const scraper = new KaoKireiProductScraper();
        
        // Mock previous products
        const previousProducts = [
            {
                name: 'ビオレ ザクレンズオイルメイク落とし プラス 本体 １９０ｍｌ',
                category: 'メイク落とし・クレンジング',
                status: '製造終了予定品',
                regulation: '医薬部外品'
            },
            {
                name: 'めぐりズム 蒸気でホットアイマスク ポケモンスリープデザイン ネロリの香り S ５枚入',
                category: '蒸気温熱アイマスク・シート',
                status: '製造終了予定品',
                regulation: ''
            }
        ];
        
        // Mock current products (with one new product)
        const currentProducts = [
            ...previousProducts,
            {
                name: '新しい商品 テスト商品',
                category: 'テストカテゴリ',
                status: '製造終了品',
                regulation: '医薬部外品'
            }
        ];
        
        // Test comparison
        const changes = scraper.compareProducts(currentProducts, previousProducts);
        
        console.log(`📊 Change Detection Result:`);
        console.log(`   Has Changed: ${changes.hasChanged}`);
        console.log(`   Change Type: ${changes.changeType}`);
        console.log(`   Summary: ${changes.summary}`);
        console.log(`   Added Products: ${changes.addedProducts.length}`);
        console.log(`   Removed Products: ${changes.removedProducts.length}`);
        console.log(`   Modified Products: ${changes.modifiedProducts.length}`);
        
        if (changes.addedProducts.length > 0) {
            console.log('\n📦 Added Products:');
            changes.addedProducts.forEach(product => {
                console.log(`   • ${product.name}`);
            });
        }
        
        // Test notification message generation
        const message = scraper.generateNotificationMessage(changes, 'テストサイト');
        console.log('\n📧 Generated Notification Message:');
        console.log(message);

    } catch (error) {
        console.error('❌ Comparison test failed:', error);
    }
}

async function testIntegrationService() {
    try {
        console.log('\n🔧 Testing Integration Service');
        console.log('─'.repeat(80));
        
        // Database configuration
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'website_monitor',
            charset: 'utf8mb4'
        };
        
        const integrationService = new KaoKireiIntegrationService(dbConfig);
        
        // Test checking all Kao Kirei sites
        const result = await integrationService.checkAllKaoKireiSites();
        
        console.log(`📊 Integration Test Result:`);
        console.log(`   Success: ${result.success}`);
        console.log(`   Total Sites: ${result.totalSites}`);
        console.log(`   Total Changes: ${result.totalChanges}`);
        
        if (result.results && result.results.length > 0) {
            console.log('\n📋 Site Results:');
            result.results.forEach(site => {
                console.log(`   • ${site.siteName}: ${site.hasChanged ? 'CHANGED' : 'No changes'}`);
                if (site.error) {
                    console.log(`     Error: ${site.error}`);
                }
            });
        }

    } catch (error) {
        console.error('❌ Integration test failed:', error);
    }
}

async function runAllTests() {
    try {
        await testProductScraper();
        await testProductComparison();
        await testIntegrationService();
        
        console.log('\n✅ All tests completed!');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    testProductScraper,
    testProductComparison,
    testIntegrationService,
    runAllTests
};
