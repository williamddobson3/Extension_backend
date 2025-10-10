const axios = require('axios');
require('dotenv').config();

async function broadcastToChannel() {
    console.log('📢 Broadcasting to LINE Channel\n');
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    
    if (!channelAccessToken) {
        console.log('❌ LINE_CHANNEL_ACCESS_TOKEN not found in .env file');
        return;
    }
    
    console.log('📋 Channel Credentials:');
    console.log(`   Access Token: ${channelAccessToken.substring(0, 20)}...`);
    console.log(`   Channel Secret: ${channelSecret}\n`);
    
    try {
        // Test 1: Get bot information
        console.log('🔍 Test 1: Getting bot information...');
        const botResponse = await axios.get('https://api.line.me/v2/bot/info', {
            headers: { 'Authorization': `Bearer ${channelAccessToken}` }
        });
        
        console.log('✅ Bot info retrieved successfully!');
        console.log(`   Bot ID: ${botResponse.data.userId}`);
        console.log(`   Display Name: ${botResponse.data.displayName}\n`);
        
        // Test 2: Broadcast to channel
        console.log('🔍 Test 2: Broadcasting to channel...');
        
        const broadcastMessage = {
            messages: [{
                type: 'text',
                text: `🔔 ウェブサイト監視システム - テスト通知

✅ システムが正常に動作しています
🕐 テスト時間: ${new Date().toLocaleString('ja-JP')}

この通知は、ウェブサイト監視システムのテストです。
システムが正常に動作していることを確認できました。`
            }]
        };
        
        // Use broadcast API to send to channel
        const response = await axios.post('https://api.line.me/v2/bot/message/broadcast', broadcastMessage, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`
            }
        });
        
        console.log('✅ Broadcast message sent successfully!');
        console.log('   Message sent to channel timeline');
        console.log('   Check your LINE channel for the test message\n');
        
        console.log('📋 Broadcast Details:');
        console.log(`   Response: ${JSON.stringify(response.data)}`);
        
    } catch (error) {
        console.error('❌ Broadcast failed:', error.message);
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
            
            if (error.response.status === 401) {
                console.log('\n🔧 Solution: Invalid access token');
                console.log('   Check if the channel access token is correct');
                console.log('   Generate a new token in LINE Developers Console if needed');
            } else if (error.response.status === 403) {
                console.log('\n🔧 Solution: Broadcast not allowed');
                console.log('   Check if your LINE bot has broadcast permissions');
                console.log('   Some bot types don\'t support broadcasting');
            }
        }
    }
}

broadcastToChannel();
