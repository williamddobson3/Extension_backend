const axios = require('axios');
require('dotenv').config();

async function testLineSimple() {
    console.log('🧪 Simple LINE Test (No Database Required)\n');
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const channelId = process.env.LINE_CHANNEL_ID;
    
    console.log('📋 Current Configuration:');
    console.log(`   Channel ID: ${channelId}`);
    console.log(`   Access Token: ${channelAccessToken ? '✅ SET' : '❌ MISSING'}\n`);
    
    if (!channelAccessToken) {
        console.log('❌ LINE_CHANNEL_ACCESS_TOKEN not found in .env file');
        return;
    }
    
    try {
        // Test LINE API connection
        console.log('🔍 Testing LINE API connection...');
        const botResponse = await axios.get('https://api.line.me/v2/bot/info', {
            headers: { 'Authorization': `Bearer ${channelAccessToken}` }
        });
        
        console.log('✅ LINE API connection successful!');
        console.log(`   Bot ID: ${botResponse.data.userId}`);
        console.log(`   Bot Name: ${botResponse.data.displayName}`);
        console.log(`   Premium ID: ${botResponse.data.premiumId || 'N/A'}\n`);
        
        // Check quota
        const quotaResponse = await axios.get('https://api.line.me/v2/bot/message/quota', {
            headers: { 'Authorization': `Bearer ${channelAccessToken}` }
        });
        
        console.log('✅ Message quota check successful!');
        console.log(`   Type: ${quotaResponse.data.type}`);
        console.log(`   Remaining: ${quotaResponse.data.value}\n`);
        
        console.log('🎉 LINE API is working perfectly!');
        console.log('\n📋 Why LINE test fails in extension:');
        console.log('1. Users need to add the LINE bot as a friend');
        console.log('2. Get bot QR code from LINE Developers Console');
        console.log('3. Users scan QR code in LINE app');
        console.log('4. Then LINE notifications will work!');
        console.log('\n🔧 To fix the extension LINE test:');
        console.log('1. Go to https://developers.line.biz/console/');
        console.log(`2. Select your bot (Channel ID: ${channelId})`);
        console.log('3. Go to "Messaging API" tab');
        console.log('4. Get the QR code for users to scan');
        console.log('5. Users add the bot as a friend');
        console.log('6. Then LINE test will work!');
        
    } catch (error) {
        console.error('❌ LINE API test failed:', error.message);
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
            
            if (error.response.status === 401) {
                console.log('\n🔧 Solution: Invalid access token');
                console.log('   Generate a new Channel Access Token in LINE Developers Console');
            }
        }
    }
}

testLineSimple();
