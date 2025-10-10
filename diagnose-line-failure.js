const fs = require('fs');
const path = require('path');

function diagnoseLineFailure() {
    console.log('🔍 Diagnosing LINE Test Failure\n');
    
    // Step 1: Check .env file
    console.log('📋 Step 1: Checking .env file...');
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        console.log('✅ .env file exists');
        
        // Check LINE credentials
        const hasAccessToken = envContent.includes('LINE_CHANNEL_ACCESS_TOKEN=');
        const hasChannelSecret = envContent.includes('LINE_CHANNEL_SECRET=');
        
        console.log(`   LINE_CHANNEL_ACCESS_TOKEN: ${hasAccessToken ? '✅ Set' : '❌ Missing'}`);
        console.log(`   LINE_CHANNEL_SECRET: ${hasChannelSecret ? '✅ Set' : '❌ Missing'}`);
        
        if (hasAccessToken) {
            const tokenMatch = envContent.match(/LINE_CHANNEL_ACCESS_TOKEN=(.+)/);
            if (tokenMatch) {
                const token = tokenMatch[1].trim();
                console.log(`   Token length: ${token.length} characters`);
                console.log(`   Token starts with: ${token.substring(0, 10)}...`);
            }
        }
    } else {
        console.log('❌ .env file not found!');
        console.log('   Create .env file with LINE credentials');
    }
    
    console.log('\n📋 Step 2: Common LINE Test Failure Causes\n');
    
    console.log('1️⃣  Server Not Restarted:');
    console.log('   → New credentials not loaded');
    console.log('   → Fix: Restart server (npm start)\n');
    
    console.log('2️⃣  Invalid LINE User IDs in Database:');
    console.log('   → Users have wrong LINE User ID format');
    console.log('   → Fix: Run node fix-invalid-line-ids.js\n');
    
    console.log('3️⃣  Users Haven\'t Added Bot as Friend:');
    console.log('   → LINE API rejects messages to non-friends');
    console.log('   → Fix: Get bot QR code, users scan it\n');
    
    console.log('4️⃣  Database Connection Issues:');
    console.log('   → Can\'t read user data from database');
    console.log('   → Fix: Check database credentials\n');
    
    console.log('5️⃣  LINE API Credentials Wrong:');
    console.log('   → Invalid or expired access token');
    console.log('   → Fix: Generate new token in LINE Console\n');
    
    console.log('📋 Step 3: Diagnostic Commands\n');
    
    console.log('🔧 Run these commands to diagnose:');
    console.log('   node fix-invalid-line-ids.js    # Check database LINE User IDs');
    console.log('   node test-line-simple.js        # Test LINE API connection');
    console.log('   npm start                      # Restart server\n');
    
    console.log('📋 Step 4: Check Server Logs\n');
    
    console.log('Look for these error messages in your server logs:');
    console.log('   ❌ "LINE user ID must start with \'U\'" → Invalid LINE User IDs');
    console.log('   ❌ "The user hasn\'t added the LINE Official Account as a friend" → User needs to add bot');
    console.log('   ❌ "Database connection failed" → Database issues');
    console.log('   ❌ "LINE channel access token not configured" → Missing credentials\n');
    
    console.log('📋 Step 5: Quick Fixes\n');
    
    console.log('🚀 Try these in order:');
    console.log('1. Restart server: npm start');
    console.log('2. Fix invalid LINE User IDs: node fix-invalid-line-ids.js');
    console.log('3. Test LINE API: node test-line-simple.js');
    console.log('4. Check if users added bot as friend');
    console.log('5. Test in extension: Click "LINEテスト"');
    
    console.log('\n📋 Step 6: Manual Database Check\n');
    
    console.log('If you have database access, run these SQL queries:');
    console.log('   SELECT id, username, line_user_id FROM users WHERE line_user_id IS NOT NULL;');
    console.log('   SELECT id, username, line_user_id FROM users WHERE line_user_id NOT LIKE \'U%\';');
    
    console.log('\n🎯 Most Likely Causes:');
    console.log('   1. Server not restarted with new credentials');
    console.log('   2. Users have invalid LINE User IDs');
    console.log('   3. Users haven\'t added bot as friend');
    
    console.log('\n🔧 Quick Solution:');
    console.log('   1. Restart server');
    console.log('   2. Run: node fix-invalid-line-ids.js');
    console.log('   3. Test in extension');
}

diagnoseLineFailure();
