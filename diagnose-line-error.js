#!/usr/bin/env node

/**
 * LINE Error Diagnostic Tool
 * This script will help identify the exact issue with LINE messaging
 */

const axios = require('axios');
require('dotenv').config();

console.log('🔍 LINE Messaging Error Diagnostic Tool\n');
console.log('═'.repeat(60));
console.log('ANALYZING LINE CONFIGURATION');
console.log('═'.repeat(60) + '\n');

// Step 1: Check environment variables
console.log('📋 Step 1: Checking Environment Variables\n');

const envChannelId = process.env.LINE_CHANNEL_ID;
const envAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const envChannelSecret = process.env.LINE_CHANNEL_SECRET;

const config = require('./config');
const configChannelId = config.LINE_CHANNEL_ID;
const configAccessToken = config.LINE_CHANNEL_ACCESS_TOKEN;
const configChannelSecret = config.LINE_CHANNEL_SECRET;

console.log('From .env file:');
console.log(`   Channel ID: ${envChannelId || '❌ NOT SET'}`);
console.log(`   Access Token: ${envAccessToken ? '✅ SET (' + envAccessToken.substring(0, 20) + '...)' : '❌ NOT SET'}`);
console.log(`   Channel Secret: ${envChannelSecret || '❌ NOT SET'}`);

console.log('\nFrom config.js:');
console.log(`   Channel ID: ${configChannelId || '❌ NOT SET'}`);
console.log(`   Access Token: ${configAccessToken ? '✅ SET (' + configAccessToken.substring(0, 20) + '...)' : '❌ NOT SET'}`);
console.log(`   Channel Secret: ${configChannelSecret || '❌ NOT SET'}`);

// Check for mismatch
if (envChannelId !== configChannelId) {
    console.log('\n⚠️  WARNING: Channel ID mismatch detected!');
    console.log(`   .env uses: ${envChannelId}`);
    console.log(`   config.js uses: ${configChannelId}`);
    console.log('   This could cause authentication issues!\n');
}

console.log('\n' + '═'.repeat(60));
console.log('TESTING LINE API CONNECTION');
console.log('═'.repeat(60) + '\n');

async function testLineAPI() {
    const testConfigs = [
        {
            name: '.env configuration',
            channelId: envChannelId,
            accessToken: envAccessToken,
            channelSecret: envChannelSecret
        },
        {
            name: 'config.js configuration',
            channelId: configChannelId,
            accessToken: configAccessToken,
            channelSecret: configChannelSecret
        }
    ];

    for (const testConfig of testConfigs) {
        console.log(`\n📱 Testing: ${testConfig.name}`);
        console.log('─'.repeat(60));
        
        if (!testConfig.accessToken) {
            console.log('❌ Access token not configured - skipping\n');
            continue;
        }

        try {
            // Test 1: Get bot info
            console.log('Test 1: Getting bot information...');
            const botInfoResponse = await axios.get(
                'https://api.line.me/v2/bot/info',
                {
                    headers: {
                        'Authorization': `Bearer ${testConfig.accessToken}`
                    }
                }
            );

            console.log('✅ Bot info retrieved successfully!');
            console.log(`   Bot ID: ${botInfoResponse.data.userId}`);
            console.log(`   Display Name: ${botInfoResponse.data.displayName || 'N/A'}`);
            console.log(`   Premium ID: ${botInfoResponse.data.premiumId || 'N/A'}`);

            // Test 2: Get quota info
            console.log('\nTest 2: Checking message quota...');
            const quotaResponse = await axios.get(
                'https://api.line.me/v2/bot/message/quota',
                {
                    headers: {
                        'Authorization': `Bearer ${testConfig.accessToken}`
                    }
                }
            );

            console.log('✅ Quota info retrieved successfully!');
            console.log(`   Type: ${quotaResponse.data.type}`);
            if (quotaResponse.data.value) {
                console.log(`   Remaining: ${quotaResponse.data.value}`);
            }

            console.log(`\n✅ ${testConfig.name} is WORKING correctly!`);

        } catch (error) {
            console.log(`❌ ${testConfig.name} FAILED!`);
            
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Error: ${error.response.data?.message || error.message}`);
                
                if (error.response.status === 401) {
                    console.log('   Issue: Invalid or expired access token');
                } else if (error.response.status === 403) {
                    console.log('   Issue: Forbidden - check channel permissions');
                }
            } else {
                console.log(`   Error: ${error.message}`);
            }
        }
    }

    // Step 3: Check database LINE user IDs
    console.log('\n' + '═'.repeat(60));
    console.log('CHECKING DATABASE USER CONFIGURATION');
    console.log('═'.repeat(60) + '\n');

    try {
        const { pool } = require('./config/database');
        
        const [users] = await pool.execute(`
            SELECT u.id, u.username, u.email, u.line_user_id,
                   un.line_enabled
            FROM users u
            LEFT JOIN user_notifications un ON u.id = un.user_id
            WHERE u.line_user_id IS NOT NULL
        `);

        if (users.length === 0) {
            console.log('⚠️  No users have LINE User ID configured!');
            console.log('   Users need to add their LINE User ID to receive notifications.\n');
        } else {
            console.log(`Found ${users.length} user(s) with LINE configured:\n`);
            
            for (const user of users) {
                console.log(`User ID ${user.id} (${user.username}):`);
                console.log(`   Email: ${user.email}`);
                console.log(`   LINE User ID: ${user.line_user_id}`);
                console.log(`   LINE Notifications: ${user.line_enabled ? '✅ Enabled' : '❌ Disabled'}`);
                console.log('');
            }
        }

        // Test sending to first user with LINE ID
        if (users.length > 0 && users[0].line_enabled) {
            const testUser = users[0];
            console.log('═'.repeat(60));
            console.log('TESTING MESSAGE DELIVERY');
            console.log('═'.repeat(60) + '\n');
            
            console.log(`Testing message to user: ${testUser.username} (ID: ${testUser.id})`);
            console.log(`LINE User ID: ${testUser.line_user_id}\n`);

            const testMessage = {
                to: testUser.line_user_id,
                messages: [
                    {
                        type: 'text',
                        text: `🔧 LINE Diagnostic Test\n\n✅ This is a test message from your Website Monitor system.\n\n🕐 Time: ${new Date().toLocaleString('ja-JP')}\n\nIf you received this, LINE notifications are working correctly!`
                    }
                ]
            };

            // Try with .env config first
            if (envAccessToken) {
                console.log('Attempting to send with .env configuration...');
                try {
                    const response = await axios.post(
                        'https://api.line.me/v2/bot/message/push',
                        testMessage,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${envAccessToken}`
                            }
                        }
                    );

                    console.log('✅ Message sent successfully with .env config!');
                    console.log(`   Check your LINE app for the test message.\n`);
                } catch (error) {
                    console.log('❌ Failed with .env config:');
                    if (error.response) {
                        console.log(`   Status: ${error.response.status}`);
                        console.log(`   Error: ${error.response.data?.message || error.message}`);
                        
                        if (error.response.data?.message === "The user hasn't added the LINE Official Account as a friend.") {
                            console.log('\n   🔧 SOLUTION: User needs to add the bot as a friend in LINE app!');
                            console.log(`   Bot ID to add: ${botInfoResponse?.data?.userId || 'Check LINE Developers Console'}`);
                        }
                    } else {
                        console.log(`   Error: ${error.message}`);
                    }
                    console.log('');
                }
            }

            // Try with config.js if different
            if (configAccessToken && configAccessToken !== envAccessToken) {
                console.log('Attempting to send with config.js configuration...');
                try {
                    const response = await axios.post(
                        'https://api.line.me/v2/bot/message/push',
                        testMessage,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${configAccessToken}`
                            }
                        }
                    );

                    console.log('✅ Message sent successfully with config.js!');
                    console.log(`   Check your LINE app for the test message.\n`);
                } catch (error) {
                    console.log('❌ Failed with config.js:');
                    if (error.response) {
                        console.log(`   Status: ${error.response.status}`);
                        console.log(`   Error: ${error.response.data?.message || error.message}`);
                    } else {
                        console.log(`   Error: ${error.message}`);
                    }
                    console.log('');
                }
            }
        }

        await pool.end();

    } catch (error) {
        console.error('Database check failed:', error.message);
    }

    // Final recommendations
    console.log('\n' + '═'.repeat(60));
    console.log('DIAGNOSTIC SUMMARY & RECOMMENDATIONS');
    console.log('═'.repeat(60) + '\n');

    console.log('Common Issues & Solutions:\n');
    console.log('1️⃣  Configuration Mismatch:');
    console.log('   • Ensure .env and config.js use the same LINE credentials');
    console.log('   • Server should use the .env file configuration\n');

    console.log('2️⃣  User Not Friends with Bot:');
    console.log('   • Users must add the LINE bot as a friend');
    console.log('   • Get the bot\'s QR code from LINE Developers Console\n');

    console.log('3️⃣  Invalid LINE User ID:');
    console.log('   • LINE User ID must start with "U"');
    console.log('   • Get it from webhook when user messages the bot\n');

    console.log('4️⃣  Expired Access Token:');
    console.log('   • Generate a new Channel Access Token in LINE Developers Console');
    console.log('   • Update both .env and config.js\n');

    console.log('5️⃣  Wrong Channel:');
    console.log('   • User\'s LINE ID must be from the same channel as the bot');
    console.log('   • Cannot send messages across different channels\n');

    console.log('═'.repeat(60));
    console.log('Diagnostic complete! Check the results above.\n');
}

testLineAPI().catch(error => {
    console.error('Diagnostic failed:', error);
    process.exit(1);
});

