const fs = require('fs');
const path = require('path');

function updateLineCredentials() {
    console.log('🔧 Updating LINE Credentials\n');
    
    // New credentials from client
    const newChannelAccessToken = 'wC2ad1cBncKnmQ+oQwAZEwkQA/mktCaAccMdFYK1HeYhpKwVohZrfGvEOeS4l1By3sSlo2dpw8EpI4GyXoQpunqB35GfV2Uc86PEXm7/tqnV4woeC29Rl/iMuzaKQHusZ9pPhY/6Xi/zOs+8fFnNjQdB04t89/1O/w1cDnyilFU=';
    const newChannelSecret = '21c0e68ea4b687bcd6f13f60485d69ce';
    
    console.log('📋 New LINE Credentials:');
    console.log(`   Channel Access Token: ${newChannelAccessToken.substring(0, 20)}...`);
    console.log(`   Channel Secret: ${newChannelSecret}\n`);
    
    // Read current .env file
    const envPath = path.join(__dirname, '.env');
    
    try {
        let envContent = '';
        
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
            console.log('✅ Found existing .env file');
        } else {
            console.log('⚠️  No .env file found, will create new one');
        }
        
        // Update or add LINE credentials
        const lines = envContent.split('\n');
        let updated = false;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('LINE_CHANNEL_ACCESS_TOKEN=')) {
                lines[i] = `LINE_CHANNEL_ACCESS_TOKEN=${newChannelAccessToken}`;
                updated = true;
                console.log('✅ Updated LINE_CHANNEL_ACCESS_TOKEN');
            } else if (lines[i].startsWith('LINE_CHANNEL_SECRET=')) {
                lines[i] = `LINE_CHANNEL_SECRET=${newChannelSecret}`;
                updated = true;
                console.log('✅ Updated LINE_CHANNEL_SECRET');
            }
        }
        
        // If not found, add them
        if (!updated) {
            if (!envContent.includes('LINE_CHANNEL_ACCESS_TOKEN')) {
                lines.push(`LINE_CHANNEL_ACCESS_TOKEN=${newChannelAccessToken}`);
                console.log('✅ Added LINE_CHANNEL_ACCESS_TOKEN');
            }
            if (!envContent.includes('LINE_CHANNEL_SECRET')) {
                lines.push(`LINE_CHANNEL_SECRET=${newChannelSecret}`);
                console.log('✅ Added LINE_CHANNEL_SECRET');
            }
        }
        
        // Write updated .env file
        const newEnvContent = lines.join('\n');
        fs.writeFileSync(envPath, newEnvContent);
        
        console.log('\n✅ .env file updated successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Restart your server to use new credentials');
        console.log('2. Test LINE functionality');
        console.log('3. Users need to add the new bot as a friend');
        console.log('4. Get bot QR code from LINE Developers Console');
        
        console.log('\n🔧 To test LINE:');
        console.log('   node test-line-simple.js');
        
    } catch (error) {
        console.error('❌ Error updating .env file:', error.message);
    }
}

updateLineCredentials();
