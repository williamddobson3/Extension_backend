const axios = require('axios');
require('dotenv').config();

async function testLineUserIdFormat() {
    console.log('🔍 Testing LINE User ID Format Issues\n');
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!channelAccessToken) {
        console.log('❌ LINE_CHANNEL_ACCESS_TOKEN not found in .env file');
        return;
    }
    
    console.log('📋 Testing different LINE User ID formats...\n');
    
    // Test cases with different LINE User ID formats
    const testCases = [
        {
            name: 'Valid LINE User ID',
            lineUserId: 'U3c488d5f250b6069ee39e85f2ddecff3',
            expected: 'Should work'
        },
        {
            name: 'Empty string',
            lineUserId: '',
            expected: 'Should fail - empty'
        },
        {
            name: 'Null value',
            lineUserId: null,
            expected: 'Should fail - null'
        },
        {
            name: 'Invalid format (no U)',
            lineUserId: '3c488d5f250b6069ee39e85f2ddecff3',
            expected: 'Should fail - no U prefix'
        },
        {
            name: 'Too short',
            lineUserId: 'U123',
            expected: 'Should fail - too short'
        },
        {
            name: 'With spaces',
            lineUserId: 'U3c488d5f250b6069ee39e85f2ddecff3 ',
            expected: 'Should fail - trailing space'
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`🧪 Testing: ${testCase.name}`);
        console.log(`   LINE User ID: "${testCase.lineUserId}"`);
        console.log(`   Expected: ${testCase.expected}`);
        
        try {
            const testMessage = {
                to: testCase.lineUserId,
                messages: [{
                    type: 'text',
                    text: `🔧 LINE Format Test\n\nTesting: ${testCase.name}\n\n🕐 Time: ${new Date().toLocaleString('ja-JP')}`
                }]
            };
            
            const response = await axios.post('https://api.line.me/v2/bot/message/push', testMessage, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${channelAccessToken}`
                }
            });
            
            console.log('   ✅ SUCCESS: Message sent successfully!');
            
        } catch (error) {
            console.log('   ❌ FAILED:', error.message);
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                console.log(`   📋 API Error: ${errorData.message}`);
                
                if (errorData.message.includes("invalid")) {
                    console.log('   🔧 ISSUE: Invalid LINE User ID format');
                } else if (errorData.message.includes("hasn't added")) {
                    console.log('   🔧 ISSUE: User needs to add bot as friend');
                }
            }
        }
        
        console.log('');
    }
    
    console.log('📋 Summary:');
    console.log('✅ Valid LINE User IDs should start with "U" and be 33 characters long');
    console.log('❌ Empty, null, or invalid format LINE User IDs will cause 400 errors');
    console.log('🔧 Check your database for invalid LINE User ID values');
}

testLineUserIdFormat();
