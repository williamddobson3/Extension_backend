const express = require('express');
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
                text: `🔔 ウェブサイト監視システム - テスト通知

✅ システムが正常に動作しています
🕐 テスト時間: ${new Date().toLocaleString('ja-JP')}

この通知は、ウェブサイト監視システムのテストです。
システムが正常に動作していることを確認できました。`
            }]
        };
        
        // Send broadcast to LINE channel
        const response = await axios.post('https://api.line.me/v2/bot/message/broadcast', broadcastMessage, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`
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

// Broadcast custom message to LINE channel
router.post('/broadcast', async (req, res) => {
    try {
        const { message } = req.body;
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        
        if (!channelAccessToken) {
            return res.status(500).json({
                success: false,
                error: 'LINE channel access token not configured'
            });
        }
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }
        
        const broadcastMessage = {
            messages: [{
                type: 'text',
                text: message
            }]
        };
        
        // Send broadcast to LINE channel
        const response = await axios.post('https://api.line.me/v2/bot/message/broadcast', broadcastMessage, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`
            }
        });
        
        console.log('✅ Custom channel broadcast sent successfully');
        
        res.json({
            success: true,
            message: 'Custom broadcast sent successfully',
            response: response.data
        });
        
    } catch (error) {
        console.error('❌ Custom broadcast failed:', error.message);
        
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

module.exports = router;
