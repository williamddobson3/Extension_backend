const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

// Broadcast message to LINE channel
router.post('/test-channel', async (req, res) => {
    try {
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        
        console.log('📢 Starting LINE broadcast test...');
        console.log('   Access Token:', channelAccessToken ? `${channelAccessToken.substring(0, 20)}...` : 'NOT FOUND');
        
        if (!channelAccessToken) {
            return res.status(500).json({
                success: false,
                error: 'LINE channel access token not configured'
            });
        }
        
        // Get custom message from request body if provided
        const customMessage = req.body && req.body.message;
        
        const broadcastMessage = {
            messages: [{
                type: 'text',
                text: customMessage || `🔔 ウェブサイト監視システム - テスト通知

✅ システムが正常に動作しています
🕐 テスト時間: ${new Date().toLocaleString('ja-JP')}

この通知は、ウェブサイト監視システムのテストです。
システムが正常に動作していることを確認できました。

📱 友だち追加: https://lin.ee/61Qp02m`
            }]
        };
        
        console.log('📤 Sending broadcast to LINE API...');
        console.log('   Message length:', broadcastMessage.messages[0].text.length);
        
        // Send broadcast to LINE channel
        const response = await axios.post('https://api.line.me/v2/bot/message/broadcast', broadcastMessage, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`
            }
        });
        
        console.log('✅ Channel broadcast sent successfully');
        console.log('   Response status:', response.status);
        console.log('   Response data:', JSON.stringify(response.data, null, 2));
        
        res.json({
            success: true,
            message: 'Channel broadcast sent successfully',
            response: response.data,
            debug: {
                messageLength: broadcastMessage.messages[0].text.length,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Channel broadcast failed:', error.message);
        
        let errorMessage = error.message;
        let errorDetails = {};
        
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
            errorMessage = error.response.data.message || error.message;
            errorDetails = {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            };
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: errorDetails
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
        
        console.log('📤 Sending custom broadcast...');
        
        // Send broadcast to LINE channel
        const response = await axios.post('https://api.line.me/v2/bot/message/broadcast', broadcastMessage, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`
            }
        });
        
        console.log('✅ Custom channel broadcast sent successfully');
        console.log('   Response:', JSON.stringify(response.data, null, 2));
        
        res.json({
            success: true,
            message: 'Custom broadcast sent successfully',
            response: response.data
        });
        
    } catch (error) {
        console.error('❌ Custom broadcast failed:', error.message);
        
        let errorMessage = error.message;
        let errorDetails = {};
        
        if (error.response) {
            console.error('   Response status:', error.response.status);
            console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
            errorMessage = error.response.data.message || error.message;
            errorDetails = {
                status: error.response.status,
                data: error.response.data
            };
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: errorDetails
        });
    }
});

// Get broadcast statistics
router.get('/stats', async (req, res) => {
    try {
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        
        if (!channelAccessToken) {
            return res.status(500).json({
                success: false,
                error: 'LINE channel access token not configured'
            });
        }
        
        // Get bot info
        const botInfo = await axios.get('https://api.line.me/v2/bot/info', {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`
            }
        });
        
        // Get quota info
        const quotaInfo = await axios.get('https://api.line.me/v2/bot/message/quota', {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`
            }
        });
        
        // Get consumption info
        const consumptionInfo = await axios.get('https://api.line.me/v2/bot/message/quota/consumption', {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`
            }
        });
        
        console.log('📊 LINE Bot Statistics:');
        console.log('   Bot Info:', JSON.stringify(botInfo.data, null, 2));
        console.log('   Quota:', JSON.stringify(quotaInfo.data, null, 2));
        console.log('   Consumption:', JSON.stringify(consumptionInfo.data, null, 2));
        
        res.json({
            success: true,
            bot: botInfo.data,
            quota: quotaInfo.data,
            consumption: consumptionInfo.data
        });
        
    } catch (error) {
        console.error('❌ Failed to get stats:', error.message);
        
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
