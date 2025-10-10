const axios = require('axios');
require('dotenv').config();

async function checkLineIdsSimple() {
    console.log('🔍 Simple LINE User ID Check\n');
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!channelAccessToken) {
        console.log('❌ LINE_CHANNEL_ACCESS_TOKEN not found');
        return;
    }
    
    console.log('📋 Common LINE User ID Issues:\n');
    
    // Common invalid LINE User ID examples
    const invalidExamples = [
        { name: 'Empty string', value: '', issue: 'No LINE User ID set' },
        { name: 'Null value', value: null, issue: 'No LINE User ID set' },
        { name: 'No U prefix', value: '3c488d5f250b6069ee39e85f2ddecff3', issue: 'Missing "U" prefix' },
        { name: 'Too short', value: 'U123', issue: 'Too short (need 30+ chars)' },
        { name: 'With spaces', value: ' U3c488d5f250b6069ee39e85f2ddecff3 ', issue: 'Has leading/trailing spaces' },
        { name: 'Wrong format', value: 'user123', issue: 'Not a valid LINE User ID format' }
    ];
    
    console.log('❌ These LINE User ID formats will cause errors:\n');
    
    for (const example of invalidExamples) {
        console.log(`   "${example.value}" → ${example.issue}`);
    }
    
    console.log('\n✅ Valid LINE User ID format:');
    console.log('   - Starts with "U"');
    console.log('   - 33 characters long');
    console.log('   - Example: "U3c488d5f250b6069ee39e85f2ddecff3"');
    console.log('   - No spaces or special characters\n');
    
    console.log('🔧 How to fix the error:\n');
    console.log('1. Check your database for users with invalid LINE User IDs');
    console.log('2. Update invalid LINE User IDs to correct format');
    console.log('3. Or clear invalid LINE User IDs (set to NULL)');
    console.log('4. Users need to re-enter their correct LINE User ID\n');
    
    console.log('📱 How users can get their LINE User ID:');
    console.log('1. Open LINE app on phone');
    console.log('2. Go to Settings → Profile → ID');
    console.log('3. Copy the LINE User ID (starts with "U")');
    console.log('4. Enter it in the extension settings\n');
    
    console.log('🤖 How users can add the LINE bot as friend:');
    console.log('1. Get bot QR code from LINE Developers Console');
    console.log('2. User scans QR code in LINE app');
    console.log('3. Add the bot as a friend');
    console.log('4. Then LINE notifications will work!\n');
    
    console.log('🚀 Quick fix commands:');
    console.log('   node fix-invalid-line-ids.js  # Auto-fix invalid LINE User IDs');
    console.log('   node test-line-simple.js      # Test LINE API connection');
}

checkLineIdsSimple();
