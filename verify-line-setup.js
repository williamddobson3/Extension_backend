const axios = require('axios');
require('dotenv').config();

async function verifyLineSetup() {
    console.log('🔍 LINE Messaging API Setup Verification\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const channelId = process.env.LINE_CHANNEL_ID;
    
    console.log('📋 Step 1: Checking Configuration');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`   Channel ID: ${channelId || '❌ NOT FOUND'}`);
    console.log(`   Access Token: ${channelAccessToken ? '✅ Found (' + channelAccessToken.substring(0, 20) + '...)' : '❌ NOT FOUND'}`);
    console.log(`   Channel Secret: ${channelSecret ? '✅ Found (' + channelSecret.substring(0, 10) + '...)' : '❌ NOT FOUND'}`);
    console.log('');
    
    if (!channelAccessToken) {
        console.log('❌ ERROR: LINE_CHANNEL_ACCESS_TOKEN not found in .env file\n');
        console.log('💡 Solution:');
        console.log('   1. Run: node update-line-credentials-new.js');
        console.log('   2. Or manually add to .env file');
        console.log('   3. Restart this script\n');
        return;
    }
    
    try {
        // Test 1: Get bot information
        console.log('📋 Step 2: Getting Bot Information');
        console.log('─────────────────────────────────────────────────────────────');
        const botResponse = await axios.get('https://api.line.me/v2/bot/info', {
            headers: { 'Authorization': `Bearer ${channelAccessToken}` }
        });
        
        console.log('✅ Bot info retrieved successfully!');
        console.log(`   Bot User ID: ${botResponse.data.userId}`);
        console.log(`   Display Name: ${botResponse.data.displayName}`);
        console.log(`   Basic ID: ${botResponse.data.basicId}`);
        console.log(`   Premium ID: ${botResponse.data.premiumId || 'N/A'}`);
        console.log(`   Picture URL: ${botResponse.data.pictureUrl || 'N/A'}`);
        console.log('');
        
        // Save bot info for reference
        const botBasicId = botResponse.data.basicId;
        const botDisplayName = botResponse.data.displayName;
        
        // Test 2: Get friend statistics
        console.log('📋 Step 3: Checking Friend Statistics');
        console.log('─────────────────────────────────────────────────────────────');
        try {
            const friendsResponse = await axios.get('https://api.line.me/v2/bot/insight/followers', {
                headers: { 'Authorization': `Bearer ${channelAccessToken}` },
                params: { date: new Date().toISOString().split('T')[0] }
            });
            
            console.log('✅ Friend statistics retrieved!');
            console.log(`   Followers: ${friendsResponse.data.followers || 0}`);
            console.log(`   Targeted Reaches: ${friendsResponse.data.targetedReaches || 0}`);
            console.log(`   Blocks: ${friendsResponse.data.blocks || 0}`);
            console.log('');
        } catch (friendError) {
            console.log('⚠️  Could not get friend statistics (may not be available yet)');
            console.log('   This is normal for new accounts\n');
        }
        
        // Test 3: Get quota information
        console.log('📋 Step 4: Checking Message Quota');
        console.log('─────────────────────────────────────────────────────────────');
        try {
            const quotaResponse = await axios.get('https://api.line.me/v2/bot/message/quota', {
                headers: { 'Authorization': `Bearer ${channelAccessToken}` }
            });
            
            console.log('✅ Quota info retrieved!');
            console.log(`   Type: ${quotaResponse.data.type}`);
            console.log(`   Value: ${quotaResponse.data.value}`);
            
            if (quotaResponse.data.type === 'none') {
                console.log('   📊 Unlimited messages (or quota not applicable)');
            }
            console.log('');
        } catch (quotaError) {
            console.log('⚠️  Could not get quota info');
            console.log('   This is normal for some account types\n');
        }
        
        // Test 4: Get consumption information
        console.log('📋 Step 5: Checking Message Usage');
        console.log('─────────────────────────────────────────────────────────────');
        try {
            const consumptionResponse = await axios.get('https://api.line.me/v2/bot/message/quota/consumption', {
                headers: { 'Authorization': `Bearer ${channelAccessToken}` }
            });
            
            console.log('✅ Usage info retrieved!');
            console.log(`   Total usage this month: ${consumptionResponse.data.totalUsage}`);
            console.log('');
        } catch (consumptionError) {
            console.log('⚠️  Could not get usage info');
            console.log('   This is normal for some account types\n');
        }
        
        // Test 5: Attempt to send a test broadcast
        console.log('📋 Step 6: Testing Broadcast API');
        console.log('─────────────────────────────────────────────────────────────');
        console.log('⚠️  About to send a TEST broadcast message...');
        console.log('   This will be sent to ALL friends of your official account\n');
        
        const broadcastMessage = {
            messages: [{
                type: 'text',
                text: `🧪 LINE API テスト

✅ 接続テスト成功！
🤖 Bot: ${botDisplayName}
🆔 Basic ID: ${botBasicId}
🕐 テスト時間: ${new Date().toLocaleString('ja-JP')}

このメッセージは、LINE Messaging APIの動作確認テストです。
正常に受信できている場合、システムは正しく動作しています。

📱 このBotを友だち追加すると、ウェブサイトの更新通知を受け取れます！`
            }]
        };
        
        try {
            const broadcastResponse = await axios.post(
                'https://api.line.me/v2/bot/message/broadcast',
                broadcastMessage,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${channelAccessToken}`
                    }
                }
            );
            
            console.log('✅ BROADCAST SENT SUCCESSFULLY!');
            console.log(`   Request ID: ${broadcastResponse.data.requestId || 'N/A'}`);
            console.log(`   Status: ${broadcastResponse.status}`);
            console.log('');
            
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('🎉 SUCCESS! Your LINE Messaging API is working correctly!\n');
            console.log('📱 CHECK YOUR LINE APP NOW:');
            console.log('   1. Open LINE app on your phone');
            console.log(`   2. Find chat with: ${botDisplayName} (${botBasicId})`);
            console.log('   3. You should see the test message above\n');
            console.log('⚠️  IMPORTANT:');
            console.log('   - Messages sent via API do NOT appear in manager.line.biz');
            console.log('   - They appear directly in users\' LINE chat');
            console.log('   - Check your LINE app to see the message!\n');
            console.log('📊 To see statistics:');
            console.log('   - Go to: https://developers.line.biz/console/');
            console.log(`   - Select channel: ${channelId}`);
            console.log('   - Click "Analytics" tab');
            console.log('   - Check "Message delivery" section\n');
            console.log('═══════════════════════════════════════════════════════════════\n');
            
        } catch (broadcastError) {
            console.log('❌ BROADCAST FAILED!');
            console.log(`   Error: ${broadcastError.message}\n`);
            
            if (broadcastError.response) {
                console.log('   Response Status:', broadcastError.response.status);
                console.log('   Response Data:', JSON.stringify(broadcastError.response.data, null, 2));
                console.log('');
                
                // Provide specific guidance
                if (broadcastError.response.status === 400) {
                    const errorMsg = broadcastError.response.data.message || '';
                    
                    if (errorMsg.includes('0 recipients') || errorMsg.includes('no recipients')) {
                        console.log('💡 PROBLEM: No friends added to your LINE Official Account\n');
                        console.log('📱 SOLUTION: Add your bot as a friend:');
                        console.log(`   1. Open LINE app`);
                        console.log(`   2. Search for: ${botBasicId}`);
                        console.log(`   3. Or go to: https://manager.line.biz/account/${botBasicId}/friends`);
                        console.log(`   4. Add as friend and try again\n`);
                    } else {
                        console.log('💡 PROBLEM: Invalid message format or request\n');
                        console.log('📝 Check:');
                        console.log('   - Message format is correct');
                        console.log('   - Message is not too long (max 5000 chars)');
                        console.log('   - Access token is valid\n');
                    }
                } else if (broadcastError.response.status === 401) {
                    console.log('💡 PROBLEM: Authentication failed\n');
                    console.log('🔑 SOLUTION:');
                    console.log('   1. Check your .env file');
                    console.log('   2. Verify LINE_CHANNEL_ACCESS_TOKEN is correct');
                    console.log('   3. Token should be the long-lived channel access token');
                    console.log('   4. Get it from: https://developers.line.biz/console/\n');
                } else if (broadcastError.response.status === 403) {
                    console.log('💡 PROBLEM: Broadcast API not enabled or permission denied\n');
                    console.log('🔧 SOLUTION:');
                    console.log('   1. Go to: https://developers.line.biz/console/');
                    console.log(`   2. Select channel: ${channelId}`);
                    console.log('   3. Check "Messaging API" settings');
                    console.log('   4. Ensure broadcast is enabled');
                    console.log('   5. Try using Multicast API instead (see docs)\n');
                }
            }
            
            console.log('═══════════════════════════════════════════════════════════════\n');
        }
        
    } catch (error) {
        console.log('❌ VERIFICATION FAILED!');
        console.log(`   Error: ${error.message}\n`);
        
        if (error.response) {
            console.log('   Response Status:', error.response.status);
            console.log('   Response Data:', JSON.stringify(error.response.data, null, 2));
            console.log('');
        }
        
        console.log('💡 Common issues:');
        console.log('   1. Invalid access token → Check .env file');
        console.log('   2. Token expired → Get new token from LINE Developers Console');
        console.log('   3. Wrong channel → Verify channel ID matches');
        console.log('   4. Network issue → Check internet connection\n');
        console.log('═══════════════════════════════════════════════════════════════\n');
    }
}

verifyLineSetup();

