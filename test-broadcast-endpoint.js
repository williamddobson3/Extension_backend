const axios = require('axios');
require('dotenv').config();

async function testBroadcastEndpoint() {
    console.log('🧪 Testing Broadcast Endpoint\n');
    
    const baseUrl = 'http://localhost:3003';
    const endpoint = '/api/broadcast/test-channel';
    
    console.log('📋 Testing endpoint:');
    console.log(`   URL: ${baseUrl}${endpoint}`);
    console.log(`   Method: POST\n`);
    
    try {
        const response = await axios.post(`${baseUrl}${endpoint}`, {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Broadcast endpoint working!');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}\n`);
        
        console.log('🎉 Success! The broadcast endpoint is working correctly.');
        console.log('   You can now test it in the extension.');
        
    } catch (error) {
        console.error('❌ Broadcast endpoint failed:');
        console.error(`   Error: ${error.message}`);
        
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
            
            if (error.response.status === 404) {
                console.log('\n🔧 Solution: Endpoint not found');
                console.log('   1. Make sure server is running: npm start');
                console.log('   2. Check if broadcast route is registered');
                console.log('   3. Verify server.js has the broadcast route');
            } else if (error.response.status === 500) {
                console.log('\n🔧 Solution: Server error');
                console.log('   1. Check server logs for specific error');
                console.log('   2. Verify LINE credentials in .env file');
                console.log('   3. Make sure LINE channel access token is valid');
            }
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n🔧 Solution: Server not running');
            console.log('   1. Start the server: npm start');
            console.log('   2. Wait for server to fully start');
            console.log('   3. Then test the endpoint again');
        }
    }
}

testBroadcastEndpoint();
