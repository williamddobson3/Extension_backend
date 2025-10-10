const { pool } = require('./config/database');
require('dotenv').config();

async function debugLineUserIds() {
    console.log('🔍 Debugging LINE User IDs\n');
    
    try {
        // Test database connection
        console.log('📋 Step 1: Testing database connection...');
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        
        // Get all users with LINE IDs
        console.log('\n📋 Step 2: Checking LINE User IDs in database...');
        const [users] = await pool.execute(`
            SELECT u.id, u.username, u.email, u.line_user_id, 
                   LENGTH(u.line_user_id) as line_id_length,
                   un.line_enabled 
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
            console.log(`   LINE User ID: "${user.line_user_id}"`);
            console.log(`   LINE ID Length: ${user.line_id_length} characters`);
            console.log(`   Starts with 'U': ${user.line_user_id.startsWith('U') ? '✅' : '❌'}`);
            console.log(`   LINE Notifications: ${user.line_enabled ? '✅ Enabled' : '❌ Disabled'}`);
            
            // Check for common issues
            if (!user.line_user_id.startsWith('U')) {
                console.log('   ⚠️  WARNING: LINE User ID should start with "U"');
            }
            if (user.line_user_id.length < 30) {
                console.log('   ⚠️  WARNING: LINE User ID seems too short');
            }
            if (user.line_user_id.includes(' ')) {
                console.log('   ⚠️  WARNING: LINE User ID contains spaces');
            }
            console.log('');
        }
        
        // Test LINE API with first user
        console.log('📋 Step 3: Testing LINE API with first user...');
        const testUser = users[0];
        
        if (!testUser.line_user_id.startsWith('U')) {
            console.log('❌ Invalid LINE User ID format!');
            console.log('   LINE User ID must start with "U"');
            console.log('   Current value:', testUser.line_user_id);
            return;
        }
        
        const axios = require('axios');
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        
        const testMessage = {
            to: testUser.line_user_id,
            messages: [{
                type: 'text',
                text: `🔧 LINE Debug Test\n\n✅ This is a test message.\n\n🕐 Time: ${new Date().toLocaleString('ja-JP')}`
            }]
        };
        
        console.log('   Sending test message to:', testUser.line_user_id);
        
        try {
            const response = await axios.post('https://api.line.me/v2/bot/message/push', testMessage, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${channelAccessToken}`
                }
            });
            
            console.log('✅ Test message sent successfully!');
            console.log('   Check your LINE app for the test message.\n');
            
        } catch (error) {
            console.log('❌ Test message failed:');
            console.log(`   Error: ${error.message}`);
            
            if (error.response && error.response.data) {
                console.log(`   API Error: ${error.response.data.message}`);
                
                if (error.response.data.message.includes("The user hasn't added the LINE Official Account as a friend")) {
                    console.log('\n🔧 SOLUTION: User needs to add the bot as a friend!');
                    console.log('   1. Go to LINE Developers Console');
                    console.log('   2. Get the bot QR code');
                    console.log('   3. User scans QR code in LINE app');
                    console.log('   4. Then LINE notifications will work!');
                } else if (error.response.data.message.includes("invalid")) {
                    console.log('\n🔧 SOLUTION: Invalid LINE User ID format!');
                    console.log('   LINE User ID must start with "U" and be valid');
                    console.log('   Current value:', testUser.line_user_id);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n🔧 Database connection issue:');
            console.log('   Check your database credentials in .env file');
            console.log('   Make sure the database server is running');
        }
    }
}

debugLineUserIds();
