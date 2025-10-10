const fs = require('fs');
const path = require('path');

function fixBroadcastEndpoint() {
    console.log('🔧 Fixing Broadcast Endpoint\n');
    
    // Check if broadcast route file exists
    const broadcastRoutePath = path.join(__dirname, 'routes', 'broadcast.js');
    
    if (!fs.existsSync(broadcastRoutePath)) {
        console.log('❌ Broadcast route file not found!');
        console.log('   Creating broadcast route file...');
        
        // Create the broadcast route file
        const broadcastRouteContent = `const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

// Broadcast message to LINE channel
router.post('/test-channel', async (req, res) => {
    try {
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        
        if (!channelAccessToken) {
            return res.status(500).json({
                success: false,
                error: 'LINE channel access token not configured'
            });
        }
        
        const broadcastMessage = {
            messages: [{
                type: 'text',
                text: \`🔔 ウェブサイト監視システム - テスト通知

✅ システムが正常に動作しています
🕐 テスト時間: \${new Date().toLocaleString('ja-JP')}

この通知は、ウェブサイト監視システムのテストです。
システムが正常に動作していることを確認できました。\`
            }]
        };
        
        // Send broadcast to LINE channel
        const response = await axios.post('https://api.line.me/v2/bot/message/broadcast', broadcastMessage, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${channelAccessToken}\`
            }
        });
        
        console.log('✅ Channel broadcast sent successfully');
        
        res.json({
            success: true,
            message: 'Channel broadcast sent successfully',
            response: response.data
        });
        
    } catch (error) {
        console.error('❌ Channel broadcast failed:', error.message);
        
        let errorMessage = error.message;
        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || error.message;
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

module.exports = router;`;
        
        fs.writeFileSync(broadcastRoutePath, broadcastRouteContent);
        console.log('✅ Broadcast route file created!');
    } else {
        console.log('✅ Broadcast route file exists');
    }
    
    // Check if server.js has the broadcast route
    const serverPath = path.join(__dirname, 'server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (!serverContent.includes('broadcastRoutes')) {
        console.log('❌ Broadcast route not registered in server.js');
        console.log('   Adding broadcast route to server.js...');
        
        // Add broadcast route import
        const updatedContent = serverContent.replace(
            'const usersRoutes = require(\'./routes/users\');',
            'const usersRoutes = require(\'./routes/users\');\nconst broadcastRoutes = require(\'./routes/broadcast\');'
        );
        
        // Add broadcast route registration
        const finalContent = updatedContent.replace(
            'app.use(\'/api/users\', usersRoutes);',
            'app.use(\'/api/users\', usersRoutes);\napp.use(\'/api/broadcast\', broadcastRoutes);'
        );
        
        fs.writeFileSync(serverPath, finalContent);
        console.log('✅ Broadcast route added to server.js!');
    } else {
        console.log('✅ Broadcast route is registered in server.js');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Restart your server: npm start');
    console.log('2. Test the endpoint: node test-broadcast-endpoint.js');
    console.log('3. Test in extension: Click "LINEテスト" button');
    
    console.log('\n🎯 Expected Result:');
    console.log('   ✅ Endpoint will be found');
    console.log('   ✅ Broadcast will work');
    console.log('   ✅ Message will appear in LINE channel');
}

fixBroadcastEndpoint();
