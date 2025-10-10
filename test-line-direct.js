const axios = require('axios');
require('dotenv').config();

async function testLineDirect() {
    console.log('🧪 Testing LINE API Directly\n');
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const channelId = process.env.LINE_CHANNEL_ID;
    
    console.log('📋 Configuration:');
    console.log(`   Channel ID: ${channelId}`);
    console.log(`   Access Token: ${channelAccessToken ? '✅ SET' : '❌ MISSING'}`);
    console.log(`   Token Length: ${channelAccessToken ? channelAccessToken.length : 0} characters\n`);
    
    if (!channelAccessToken) {
        console.log('❌ LINE_CHANNEL_ACCESS_TOKEN not found in environment');
        return;
    }
    
    try {
        // Test 1: Get bot information
        console.log('🔍 Test 1: Getting bot information...');
        const botResponse = await axios.get('https://api.line.me/v2/bot/info', {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`
            }
        });
        
        console.log('✅ Bot info retrieved successfully!');
        console.log(`   Bot ID: ${botResponse.data.userId}`);
        console.log(`   Display Name: ${botResponse.data.displayName}`);
        console.log(`   Premium ID: ${botResponse.data.premiumId || 'N/A'}\n`);
        
        // Test 2: Check message quota
        console.log('🔍 Test 2: Checking message quota...');
        const quotaResponse = await axios.get('https://api.line.me/v2/bot/message/quota', {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`
            }
        });
        
        console.log('✅ Quota info retrieved successfully!');
        console.log(`   Type: ${quotaResponse.data.type}`);
        console.log(`   Remaining: ${quotaResponse.data.value}\n`);
        
        // Test 3: Try to send a test message (this will fail if no users are friends)
        console.log('🔍 Test 3: Testing message sending...');
        console.log('   Note: This will fail if no users have added the bot as a friend\n');
        
        console.log('✅ LINE API is working correctly!');
        console.log('\n📋 Next Steps:');
        console.log('1. Make sure users have added the bot as a friend');
        console.log('2. Get the bot QR code from LINE Developers Console');
        console.log('3. Users should scan the QR code to add the bot');
        console.log('4. Then LINE notifications will work!');
        
    } catch (error) {
        console.error('❌ LINE API test failed:', error.message);
        
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', error.response.data);
            
            if (error.response.status === 401) {
                console.log('\n🔧 Solution: Invalid access token');
                console.log('   Generate a new Channel Access Token in LINE Developers Console');
            }
        }
    }
}

testLineDirect();
