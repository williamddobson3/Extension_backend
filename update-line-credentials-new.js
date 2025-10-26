const fs = require('fs');
const path = require('path');

function updateLineCredentials() {
    console.log('🔧 Updating LINE Messaging API Credentials\n');
    
    const envPath = path.join(__dirname, '.env');
    
    // New LINE credentials
    const newCredentials = {
        LINE_CHANNEL_ID: '2008360670',
        LINE_CHANNEL_ACCESS_TOKEN: 'zL0SuFvY6HCtZ378+T5cYBWNrYFFCS9mmJZpY7a8hQF0yHaw3R1NXBD6/u3OVyIrmF8wP9QiyCdEjtFtYj+qGCa7JZcNcpNDK/CnnohsbCEwH9Fww8LJY5fSWhc9eLzjPkasM1B9AOxRZwH98ChEuAdB04t89/1O/w1cDnyilFU=',
        LINE_CHANNEL_SECRET: 'e90ae9dedd1152ed11f1783903387be2'
    };
    
    console.log('📋 New Credentials:');
    console.log(`   Channel ID: ${newCredentials.LINE_CHANNEL_ID}`);
    console.log(`   Access Token: ${newCredentials.LINE_CHANNEL_ACCESS_TOKEN.substring(0, 20)}...`);
    console.log(`   Channel Secret: ${newCredentials.LINE_CHANNEL_SECRET.substring(0, 10)}...`);
    console.log('');
    
    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
        console.log('⚠️  .env file not found. Creating new .env file...');
        
        const envContent = `# LINE Messaging API
LINE_CHANNEL_ID=${newCredentials.LINE_CHANNEL_ID}
LINE_CHANNEL_ACCESS_TOKEN=${newCredentials.LINE_CHANNEL_ACCESS_TOKEN}
LINE_CHANNEL_SECRET=${newCredentials.LINE_CHANNEL_SECRET}

# Add your other environment variables below:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=
# DB_NAME=extension_db
# DB_PORT=3306
# PORT=3003
# NODE_ENV=development
# JWT_SECRET=your-secret-key
`;
        
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Created new .env file with LINE credentials');
        console.log('⚠️  Please add your other environment variables (database, email, etc.)');
        return;
    }
    
    // Read existing .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📄 Found existing .env file');
    
    // Update or add LINE credentials
    let updated = false;
    
    Object.keys(newCredentials).forEach(key => {
        const value = newCredentials[key];
        const regex = new RegExp(`^${key}=.*$`, 'm');
        
        if (regex.test(envContent)) {
            // Update existing value
            envContent = envContent.replace(regex, `${key}=${value}`);
            console.log(`✅ Updated ${key}`);
            updated = true;
        } else {
            // Add new value
            envContent += `\n${key}=${value}`;
            console.log(`✅ Added ${key}`);
            updated = true;
        }
    });
    
    if (updated) {
        // Backup old .env file
        const backupPath = path.join(__dirname, '.env.backup');
        fs.copyFileSync(envPath, backupPath);
        console.log(`\n💾 Backed up old .env to .env.backup`);
        
        // Write updated .env file
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Updated .env file with new LINE credentials');
    } else {
        console.log('ℹ️  No changes needed');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Restart your server: npm start');
    console.log('2. Test the new credentials: node test-line-broadcast.js');
    console.log('3. Check LINE app for broadcast messages');
    console.log('');
    console.log('📱 Make sure to add friends to your LINE Official Account:');
    console.log('   Channel ID: @' + newCredentials.LINE_CHANNEL_ID);
    console.log('   Or use the QR code: friend.png');
}

updateLineCredentials();

