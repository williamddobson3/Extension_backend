const axios = require('axios');
const { pool } = require('./config/database');
require('dotenv').config();

async function fixLineTest() {
    console.log('🔧 Fixing LINE Test Issues\n');
    
    try {
        // Test database connection first
        console.log('📋 Step 1: Testing database connection...');
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        
        // Get users with LINE IDs
        console.log('\n📋 Step 2: Checking users with LINE configuration...');
        const [users] = await pool.execute(`
            SELECT u.id, u.username, u.email, u.line_user_id, un.line_enabled 
            FROM users u 
            LEFT JOIN user_notifications un ON u.id = un.user_id 
            WHERE u.line_user_id IS NOT NULL
        `);
        
        if (users.length === 0) {
            console.log('⚠️  No users have LINE User ID configured!');
            console.log('   Users need to add their LINE User ID in the extension settings.\n');
            return;
        }
        
        console.log(`✅ Found ${users.length} user(s) with LINE configured:\n`);
        
        for (const user of users) {
            console.log(`   User: ${user.username} (ID: ${user.id})`);
            console.log(`   Email: ${user.email}`);
            console.log(`   LINE User ID: ${user.line_user_id}`);
            console.log(`   LINE Notifications: ${user.line_enabled ? '✅ Enabled' : '❌ Disabled'}`);
            console.log('');
        }
        
        // Test LINE API
        console.log('📋 Step 3: Testing LINE API...');
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        
        if (!channelAccessToken) {
            console.log('❌ LINE_CHANNEL_ACCESS_TOKEN not found in .env file');
            return;
        }
        
        // Get bot info
        const botResponse = await axios.get('https://api.line.me/v2/bot/info', {
            headers: { 'Authorization': `Bearer ${channelAccessToken}` }
        });
        
        console.log('✅ LINE API working correctly!');
        console.log(`   Bot ID: ${botResponse.data.userId}`);
        console.log(`   Bot Name: ${botResponse.data.displayName}\n`);
        
        // Test sending message to first user
        console.log('📋 Step 4: Testing message sending...');
        const testUser = users[0];
        
        try {
            const testMessage = {
                to: testUser.line_user_id,
                messages: [{
                    type: 'text',
                    text: `🔧 LINE Test Message\n\n✅ This is a test from your Website Monitor system.\n\n🕐 Time: ${new Date().toLocaleString('ja-JP')}\n\nIf you received this, LINE notifications are working!`
                }]
            };
            
            const response = await axios.post('https://api.line.me/v2/bot/message/push', testMessage, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${channelAccessToken}`
                }
            });
            
            console.log('✅ Test message sent successfully!');
            console.log(`   Sent to: ${testUser.username} (${testUser.line_user_id})`);
            console.log('   Check your LINE app for the test message.\n');
            
        } catch (error) {
            console.log('❌ Test message failed:');
            console.log(`   Error: ${error.message}`);
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                console.log(`   API Error: ${errorData.message}`);
                
                if (errorData.message === "The user hasn't added the LINE Official Account as a friend.") {
                    console.log('\n🔧 SOLUTION: User needs to add the bot as a friend!');
                    console.log(`   Bot ID: ${botResponse.data.userId}`);
                    console.log('   Steps:');
                    console.log('   1. Go to LINE Developers Console');
                    console.log('   2. Get the bot QR code');
                    console.log('   3. User scans QR code in LINE app');
                    console.log('   4. Then LINE notifications will work!');
                } else if (errorData.message === "You can't send messages to yourself") {
                    console.log('\n🔧 SOLUTION: User has bot\'s LINE ID instead of their own!');
                    console.log('   The user needs to update their LINE User ID to their personal ID, not the bot\'s ID.');
                }
            }
        }
        
        console.log('\n📋 Summary:');
        console.log('✅ LINE API is working correctly');
        console.log('✅ Database connection is working');
        console.log('✅ Users have LINE IDs configured');
        console.log('\n🔧 Next Steps:');
        console.log('1. Users must add the LINE bot as a friend');
        console.log('2. Get bot QR code from LINE Developers Console');
        console.log('3. Users scan QR code in LINE app');
        console.log('4. Then LINE test will work!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n🔧 Database connection issue:');
            console.log('   Check your database credentials in .env file');
            console.log('   Make sure the database server is running');
        }
    }
}

fixLineTest();
