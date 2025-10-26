const axios = require('axios');
require('dotenv').config();

async function testLineBroadcast() {
    console.log('🧪 LINE Broadcast Test\n');
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const channelId = process.env.LINE_CHANNEL_ID;
    
    console.log('📋 Configuration:');
    console.log(`   Channel ID: ${channelId}`);
    console.log(`   Access Token: ${channelAccessToken ? `${channelAccessToken.substring(0, 20)}...` : 'NOT FOUND'}`);
    console.log(`   Channel Secret: ${channelSecret ? `${channelSecret.substring(0, 10)}...` : 'NOT FOUND'}`);
    console.log('');
    
    if (!channelAccessToken) {
        console.log('❌ LINE_CHANNEL_ACCESS_TOKEN not found in .env file');
        return;
    }
    
    try {
        // Test 1: Get bot information
        console.log('🔍 Test 1: Getting bot information...');
        const botResponse = await axios.get('https://api.line.me/v2/bot/info', {
            headers: { 'Authorization': `Bearer ${channelAccessToken}` }
        });
        
        console.log('✅ Bot info retrieved successfully!');
        console.log(`   Bot ID: ${botResponse.data.userId}`);
        console.log(`   Display Name: ${botResponse.data.displayName}`);
        console.log(`   Basic ID: ${botResponse.data.basicId}`);
        console.log(`   Premium ID: ${botResponse.data.premiumId || 'N/A'}`);
        console.log('');
        
        // Test 2: Get quota information
        console.log('🔍 Test 2: Getting quota information...');
        try {
            const quotaResponse = await axios.get('https://api.line.me/v2/bot/message/quota', {
                headers: { 'Authorization': `Bearer ${channelAccessToken}` }
            });
            
            console.log('✅ Quota info retrieved successfully!');
            console.log(`   Type: ${quotaResponse.data.type}`);
            console.log(`   Value: ${quotaResponse.data.value}`);
            console.log('');
        } catch (quotaError) {
            console.log('⚠️  Could not get quota info (may not be available for this plan)');
            console.log('');
        }
        
        // Test 3: Get consumption information
        console.log('🔍 Test 3: Getting consumption information...');
        try {
            const consumptionResponse = await axios.get('https://api.line.me/v2/bot/message/quota/consumption', {
                headers: { 'Authorization': `Bearer ${channelAccessToken}` }
            });
            
            console.log('✅ Consumption info retrieved successfully!');
            console.log(`   Total usage: ${consumptionResponse.data.totalUsage}`);
            console.log('');
        } catch (consumptionError) {
            console.log('⚠️  Could not get consumption info (may not be available for this plan)');
            console.log('');
        }
        
        // Test 4: Try to broadcast
        console.log('🔍 Test 4: Attempting to broadcast message...');
        
        const broadcastMessage = {
            messages: [{
                type: 'text',
                text: `🧪 テストブロードキャスト

✅ システムテスト実行中
🕐 テスト時間: ${new Date().toLocaleString('ja-JP')}

このメッセージは、LINE公式アカウントからのブロードキャストテストです。
友だち全員に送信されています。

📱 友だち追加: https://lin.ee/61Qp02m`
            }]
        };
        
        const broadcastResponse = await axios.post('https://api.line.me/v2/bot/message/broadcast', broadcastMessage, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`
            }
        });
        
        console.log('✅ Broadcast message sent successfully!');
        console.log(`   Request ID: ${broadcastResponse.data.requestId || 'N/A'}`);
        console.log(`   Status: ${broadcastResponse.status}`);
        console.log('');
        
        console.log('📱 Check your LINE app now!');
        console.log('   The message should appear in your LINE Official Account chat.');
        console.log('');
        
        console.log('✅ All tests passed!');
        console.log('');
        console.log('📋 Summary:');
        console.log('   ✅ Bot information: OK');
        console.log('   ✅ Broadcast API: OK');
        console.log('   ✅ Message sent: OK');
        console.log('');
        console.log('🎯 Next Steps:');
        console.log('   1. Check your LINE app for the test message');
        console.log('   2. Make sure you are a friend of the official account');
        console.log('   3. Check that notifications are enabled for the account');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Error details:', JSON.stringify(error.response.data, null, 2));
            
            // Provide specific guidance based on error
            if (error.response.status === 400) {
                console.log('');
                console.log('💡 Possible causes:');
                console.log('   - Invalid message format');
                console.log('   - Message too long (max 5000 characters)');
                console.log('   - Invalid channel access token');
            } else if (error.response.status === 401) {
                console.log('');
                console.log('💡 Authentication failed:');
                console.log('   - Check your LINE_CHANNEL_ACCESS_TOKEN in .env');
                console.log('   - Make sure the token is valid and not expired');
            } else if (error.response.status === 403) {
                console.log('');
                console.log('💡 Permission denied:');
                console.log('   - Broadcast API may not be enabled for your channel');
                console.log('   - Check LINE Developers Console settings');
                console.log('   - Verify your channel plan supports broadcast');
            } else if (error.response.status === 429) {
                console.log('');
                console.log('💡 Rate limit exceeded:');
                console.log('   - You have sent too many messages');
                console.log('   - Wait a few minutes and try again');
            }
        }
    }
}

testLineBroadcast();

