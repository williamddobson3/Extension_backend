#!/usr/bin/env node

/**
 * LINE Configuration Fix Script
 * This script will fix the LINE channel configuration mismatch
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 LINE Configuration Fix Tool\n');
console.log('═'.repeat(60));
console.log('FIXING LINE CONFIGURATION MISMATCH');
console.log('═'.repeat(60) + '\n');

const envPath = path.join(__dirname, '.env');
const configPath = path.join(__dirname, 'config.js');

// Read current configurations
const envChannelId = process.env.LINE_CHANNEL_ID;
const envAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const envChannelSecret = process.env.LINE_CHANNEL_SECRET;

const config = require('./config');
const configChannelId = config.LINE_CHANNEL_ID;
const configAccessToken = config.LINE_CHANNEL_ACCESS_TOKEN;
const configChannelSecret = config.LINE_CHANNEL_SECRET;

console.log('Current Configuration:\n');
console.log('From .env:');
console.log(`   Channel ID: ${envChannelId}`);
console.log(`   Access Token: ${envAccessToken?.substring(0, 30)}...`);
console.log(`   Channel Secret: ${envChannelSecret}`);

console.log('\nFrom config.js:');
console.log(`   Channel ID: ${configChannelId}`);
console.log(`   Access Token: ${configAccessToken?.substring(0, 30)}...`);
console.log(`   Channel Secret: ${configChannelSecret}`);

console.log('\n' + '─'.repeat(60) + '\n');

// Determine which configuration to use as the source of truth
let useConfig = 'env'; // default to .env

if (!envChannelId || !envAccessToken || !envChannelSecret) {
    if (configChannelId && configAccessToken && configChannelSecret) {
        useConfig = 'config';
        console.log('⚠️  .env is incomplete, using config.js as source of truth\n');
    } else {
        console.log('❌ Both .env and config.js are incomplete!');
        console.log('Please manually set your LINE credentials.\n');
        process.exit(1);
    }
} else {
    console.log('✅ .env has complete configuration, using it as source of truth\n');
}

const correctChannelId = useConfig === 'env' ? envChannelId : configChannelId;
const correctAccessToken = useConfig === 'env' ? envAccessToken : configAccessToken;
const correctChannelSecret = useConfig === 'env' ? envChannelSecret : configChannelSecret;

console.log(`Selected Configuration (from ${useConfig}):`);
console.log(`   Channel ID: ${correctChannelId}`);
console.log(`   Access Token: ${correctAccessToken?.substring(0, 30)}...`);
console.log(`   Channel Secret: ${correctChannelSecret}\n`);

// Fix .env file if needed
if (useConfig === 'config' || envChannelId !== correctChannelId || envAccessToken !== correctAccessToken || envChannelSecret !== correctChannelSecret) {
    console.log('📝 Updating .env file...\n');
    
    try {
        let envContent = '';
        
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Update or add LINE configuration
        const lineConfigs = [
            { key: 'LINE_CHANNEL_ID', value: correctChannelId },
            { key: 'LINE_CHANNEL_ACCESS_TOKEN', value: correctAccessToken },
            { key: 'LINE_CHANNEL_SECRET', value: correctChannelSecret }
        ];

        for (const { key, value } of lineConfigs) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
                console.log(`   ✅ Updated ${key}`);
            } else {
                // Add if not exists
                if (!envContent.includes('# LINE Messaging API')) {
                    envContent += '\n# LINE Messaging API\n';
                }
                envContent += `${key}=${value}\n`;
                console.log(`   ✅ Added ${key}`);
            }
        }

        fs.writeFileSync(envPath, envContent);
        console.log('\n✅ .env file updated successfully!\n');
    } catch (error) {
        console.error('❌ Failed to update .env:', error.message);
    }
}

// Fix config.js file if needed
if (useConfig === 'env' || configChannelId !== correctChannelId || configAccessToken !== correctAccessToken || configChannelSecret !== correctChannelSecret) {
    console.log('📝 Updating config.js file...\n');
    
    try {
        let configContent = fs.readFileSync(configPath, 'utf8');

        // Update LINE configuration in config.js
        configContent = configContent.replace(
            /LINE_CHANNEL_ID:\s*['"].*?['"]/,
            `LINE_CHANNEL_ID: '${correctChannelId}'`
        );
        configContent = configContent.replace(
            /LINE_CHANNEL_ACCESS_TOKEN:\s*['"].*?['"]/,
            `LINE_CHANNEL_ACCESS_TOKEN: '${correctAccessToken}'`
        );
        configContent = configContent.replace(
            /LINE_CHANNEL_SECRET:\s*['"].*?['"]/,
            `LINE_CHANNEL_SECRET: '${correctChannelSecret}'`
        );

        fs.writeFileSync(configPath, configContent);
        console.log('✅ config.js updated successfully!\n');
    } catch (error) {
        console.error('❌ Failed to update config.js:', error.message);
    }
}

console.log('═'.repeat(60));
console.log('CONFIGURATION SYNC COMPLETE');
console.log('═'.repeat(60) + '\n');

console.log('✅ Both .env and config.js now use the same LINE credentials:');
console.log(`   Channel ID: ${correctChannelId}`);
console.log(`   Access Token: ${correctAccessToken?.substring(0, 30)}...`);
console.log(`   Channel Secret: ${correctChannelSecret}\n`);

console.log('📝 Next Steps:\n');
console.log('1. Restart your server to load the new configuration');
console.log('2. Run: node diagnose-line-error.js (to test the configuration)');
console.log('3. Ensure users have added your bot as a friend in LINE');
console.log('4. Make sure LINE User IDs in database are correct\n');

console.log('💡 To get your bot\'s add friend link:');
console.log('   Visit: https://developers.line.biz/console/');
console.log(`   Channel ID: ${correctChannelId}\n`);

console.log('✅ Configuration fix complete!\n');

