const axios = require('axios');
require('dotenv').config();

async function testNewLineCredentials() {
    console.log('🧪 Testing New LINE Credentials\n');
    
    // Your new credentials
    const channelAccessToken = 'wC2ad1cBncKnmQ+oQwAZEwkQA/mktCaAccMdFYK1HeYhpKwVohZrfGvEOeS4l1By3sSlo2dpw8EpI4GyXoQpunqB35GfV2Uc86PEXm7/tqnV4woeC29Rl/iMuzaKQHusZ9pPhY/6Xi/zOs+8fFnNjQdB04t89/1O/w1cDnyilFU=';
    const channelSecret = '21c0e68ea4b687bcd6f13f60485d69ce';
    
    console.log('📋 Testing LINE API with new credentials...\n');
    
    try {
        // Test 1: Get bot information
        console.log('🔍 Test 1: Getting bot information...');
        const botResponse = await axios.get('https://api.line.me/v2/bot/info', {
            headers: { 'Authorization': `Bearer ${channelAccessToken}` }
        });
        
        console.log('✅ Bot info retrieved successfully!');
        console.log(`   Bot ID: ${botResponse.data.userId}`);
        console.log(`   Display Name: ${botResponse.data.displayName}`);
        console.log(`   Premium ID: ${botResponse.data.premiumId || 'N/A'}\n`);
        
        // Test 2: Check message quota
        console.log('🔍 Test 2: Checking message quota...');
        const quotaResponse = await axios.get('https://api.line.me/v2/bot/message/quota', {
            headers: { 'Authorization': `Bearer ${channelAccessToken}` }
        });
        
        console.log('✅ Quota info retrieved successfully!');
        console.log(`   Type: ${quotaResponse.data.type}`);
        console.log(`   Remaining: ${quotaResponse.data.value}\n`);
        
        // Test 3: Test message sending (this will fail if no users are friends)
        console.log('🔍 Test 3: Testing message sending...');
        console.log('   Note: This will fail if no users have added the bot as a friend\n');
        
        // Try to send a test message to a dummy LINE User ID
        const testLineUserId = 'U3c488d5f250b6069ee39e85f2ddecff3'; // Example LINE User ID
        
        const testMessage = {
            to: testLineUserId,
            messages: [{
                type: 'text',
                text: `🔧 LINE Credential Test\n\n✅ New credentials are working!\n\n🕐 Time: ${new Date().toLocaleString('ja-JP')}\n\nIf you received this, the new LINE bot is working!`
            }]
        };
        
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
                const errorData = error.response.data;
                console.log(`   API Error: ${errorData.message}`);
                
                if (errorData.message.includes("The user hasn't added the LINE Official Account as a friend")) {
                    console.log('\n🔧 SOLUTION: User needs to add the bot as a friend!');
                    console.log('   1. Go to LINE Developers Console');
                    console.log('   2. Get the bot QR code');
                    console.log('   3. User scans QR code in LINE app');
                    console.log('   4. Then LINE notifications will work!');
                } else if (errorData.message.includes("invalid")) {
                    console.log('\n🔧 SOLUTION: Invalid LINE User ID format!');
                    console.log('   LINE User ID must start with "U" and be valid');
                }
            }
        }
        
        console.log('\n📋 Summary:');
        console.log('✅ New LINE credentials are working correctly!');
        console.log('✅ Bot information retrieved successfully');
        console.log('✅ Message quota is available');
        console.log('\n🔧 Next Steps:');
        console.log('1. Update your .env file with the new credentials');
        console.log('2. Users need to add the new bot as a friend');
        console.log('3. Get the bot QR code from LINE Developers Console');
        console.log('4. Users scan QR code to add the bot');
        console.log('5. Then LINE test will work!');
        
    } catch (error) {
        console.error('❌ LINE API test failed:', error.message);
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
            
            if (error.response.status === 401) {
                console.log('\n🔧 Solution: Invalid access token');
                console.log('   Check if the channel access token is correct');
                console.log('   Generate a new token in LINE Developers Console if needed');
            }
        }
    }
}

testNewLineCredentials();
