const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { checkIPBlockingForRegistration, checkIPBlockingForLogin } = require('../middleware/ipBlockingMiddleware');
const router = express.Router();

// LINE webhook signature verification
const verifyLineSignature = (req, res, next) => {
    const signature = req.headers['x-line-signature'];
    if (!signature) {
        return res.status(401).json({ error: 'No signature provided' });
    }

    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const body = JSON.stringify(req.body);
    const hash = crypto.createHmac('SHA256', channelSecret).update(body).digest('base64');

    if (signature !== hash) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
};

// LINE webhook endpoint
router.post('/webhook', verifyLineSignature, async (req, res) => {
    try {
        const events = req.body.events;
        
        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                await handleLineMessage(event);
            } else if (event.type === 'follow') {
                await handleLineFollow(event);
            } else if (event.type === 'unfollow') {
                await handleLineUnfollow(event);
            }
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('LINE webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Handle LINE follow event (user adds the official account)
async function handleLineFollow(event) {
    const { replyToken, source } = event;
    const lineUserId = source.userId;

    try {
        console.log(`New LINE follow event from user: ${lineUserId}`);
        
        // Send welcome message
        await replyToLine(replyToken, 
            '👋 Welcome to Website Monitor!\n\n' +
            'Your LINE User ID has been automatically registered: ' + lineUserId + '\n\n' +
            'You will now receive website update notifications here!\n' +
            'Thank you for using our service! 🎉'
        );

        // Log the follow event for potential user matching
        await pool.execute(`
            INSERT INTO line_follow_events (line_user_id, followed_at, status)
            VALUES (?, NOW(), 'active')
            ON DUPLICATE KEY UPDATE followed_at = NOW(), status = 'active'
        `, [lineUserId]);

        console.log(`LINE follow event logged for user: ${lineUserId}`);

    } catch (error) {
        console.error('Error handling LINE follow event:', error);
    }
}

// Handle LINE unfollow event (user blocks the official account)
async function handleLineUnfollow(event) {
    const { source } = event;
    const lineUserId = source.userId;

    try {
        console.log(`LINE unfollow event from user: ${lineUserId}`);
        
        // Update follow status
        await pool.execute(`
            UPDATE line_follow_events 
            SET status = 'inactive', unfollowed_at = NOW() 
            WHERE line_user_id = ?
        `, [lineUserId]);

        console.log(`LINE unfollow event logged for user: ${lineUserId}`);

    } catch (error) {
        console.error('Error handling LINE unfollow event:', error);
    }
}

// Handle incoming LINE messages
async function handleLineMessage(event) {
    const { replyToken, message, source } = event;
    const lineUserId = source.userId;
    const userMessage = message.text.toLowerCase();

    try {
        // Check if user exists
        const [users] = await pool.execute(
            'SELECT id, username FROM users WHERE line_user_id = ?',
            [lineUserId]
        );

        if (users.length === 0) {
            // User not found, send welcome message
            await replyToLine(replyToken, 
                '👋 Welcome to Website Monitor!\n\n' +
                'To get started, please:\n' +
                '1. Log in to your account at our website\n' +
                '2. Go to your profile settings\n' +
                '3. Add your LINE User ID: ' + lineUserId + '\n\n' +
                'After that, you\'ll receive website update notifications here!'
            );
            return;
        }

        const user = users[0];

        // Handle commands
        if (userMessage === 'help' || userMessage === 'h') {
            await replyToLine(replyToken,
                '🔧 Available Commands:\n\n' +
                '📊 status - Check your monitored sites\n' +
                '📝 help - Show this help message\n' +
                '🔔 test - Send a test notification\n' +
                '❌ stop - Disable LINE notifications\n' +
                '✅ start - Enable LINE notifications'
            );
        } else if (userMessage === 'status' || userMessage === 's') {
            await sendSiteStatus(replyToken, user.id);
        } else if (userMessage === 'test') {
            await sendTestNotification(replyToken, user.id);
        } else if (userMessage === 'stop') {
            await updateLineNotifications(user.id, false);
            await replyToLine(replyToken, '🔕 LINE notifications have been disabled.');
        } else if (userMessage === 'start') {
            await updateLineNotifications(user.id, true);
            await replyToLine(replyToken, '🔔 LINE notifications have been enabled.');
        } else {
            await replyToLine(replyToken,
                '🤔 I didn\'t understand that command.\n' +
                'Type "help" to see available commands.'
            );
        }

    } catch (error) {
        console.error('Error handling LINE message:', error);
        await replyToLine(replyToken, '❌ Sorry, something went wrong. Please try again later.');
    }
}

// Handle LINE follow event
async function handleLineFollow(event) {
    const lineUserId = event.source.userId;
    
    try {
        // Get user profile from LINE
        const profile = await getLineUserProfile(lineUserId);
        
        await replyToLine(event.replyToken,
            `👋 Hi ${profile.displayName}!\n\n` +
            'Welcome to Website Monitor!\n\n' +
            'To get started:\n' +
            '1. Log in to your account at our website\n' +
            '2. Go to your profile settings\n' +
            '3. Add your LINE User ID: ' + lineUserId + '\n\n' +
            'After that, you\'ll receive website update notifications here!\n\n' +
            'Type "help" to see available commands.'
        );
    } catch (error) {
        console.error('Error handling LINE follow:', error);
    }
}

// Handle LINE unfollow event
async function handleLineUnfollow(event) {
    const lineUserId = event.source.userId;
    
    try {
        // Disable LINE notifications for this user
        await pool.execute(
            'UPDATE user_notifications SET line_enabled = false WHERE line_user_id = ?',
            [lineUserId]
        );
        
        console.log(`User ${lineUserId} unfollowed, LINE notifications disabled`);
    } catch (error) {
        console.error('Error handling LINE unfollow:', error);
    }
}

// Reply to LINE message
async function replyToLine(replyToken, message) {
    try {
        const response = await axios.post(
            'https://api.line.me/v2/bot/message/reply',
            {
                replyToken: replyToken,
                messages: [{ type: 'text', text: message }]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                }
            }
        );
        
        return response.data;
    } catch (error) {
        console.error('Error replying to LINE:', error);
        throw error;
    }
}

// Get LINE user profile
async function getLineUserProfile(lineUserId) {
    try {
        const response = await axios.get(
            `https://api.line.me/v2/bot/profile/${lineUserId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
                }
            }
        );
        
        return response.data;
    } catch (error) {
        console.error('Error getting LINE user profile:', error);
        return { displayName: 'User' };
    }
}

// Send site status to user
async function sendSiteStatus(replyToken, userId) {
    try {
        const [sites] = await pool.execute(
            `SELECT name, url, last_check, is_active 
             FROM monitored_sites 
             WHERE user_id = ? AND is_active = true`,
            [userId]
        );

        if (sites.length === 0) {
            await replyToLine(replyToken, '📊 You don\'t have any monitored sites yet.');
            return;
        }

        let message = '📊 Your Monitored Sites:\n\n';
        for (const site of sites) {
            const lastCheck = site.last_check ? 
                new Date(site.last_check).toLocaleString() : 'Never';
            const status = site.is_active ? '✅' : '❌';
            
            message += `${status} ${site.name}\n`;
            message += `🌐 ${site.url}\n`;
            message += `🕒 Last check: ${lastCheck}\n\n`;
        }

        await replyToLine(replyToken, message);
    } catch (error) {
        console.error('Error sending site status:', error);
        await replyToLine(replyToken, '❌ Error getting site status. Please try again.');
    }
}

// Send test notification
async function sendTestNotification(replyToken, userId) {
    try {
        const [users] = await pool.execute(
            'SELECT username FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            await replyToLine(replyToken, '❌ User not found.');
            return;
        }

        const testMessage = `🔔 Test Notification\n\n` +
            `Hello ${users[0].username}!\n` +
            `This is a test message to verify your LINE notifications are working.\n\n` +
            `✅ If you received this, everything is set up correctly!`;

        await replyToLine(replyToken, testMessage);
    } catch (error) {
        console.error('Error sending test notification:', error);
        await replyToLine(replyToken, '❌ Error sending test notification. Please try again.');
    }
}

// Update LINE notification settings
async function updateLineNotifications(userId, enabled) {
    try {
        await pool.execute(
            'UPDATE user_notifications SET line_enabled = ? WHERE user_id = ?',
            [enabled, userId]
        );
    } catch (error) {
        console.error('Error updating LINE notifications:', error);
        throw error;
    }
}

// Get LINE login URL for user authentication
router.get('/login-url', (req, res) => {
    const channelId = process.env.LINE_CHANNEL_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/line/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    
    const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
        `response_type=code&` +
        `client_id=${channelId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}&` +
        `scope=profile%20openid`;

    res.json({
        success: true,
        loginUrl: loginUrl,
        state: state
    });
});

// Get LINE login URL for registration
router.get('/register-url', (req, res) => {
    const channelId = process.env.LINE_CHANNEL_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/line/callback?type=register`;
    const state = crypto.randomBytes(16).toString('hex');
    
    const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
        `response_type=code&` +
        `client_id=${channelId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}&` +
        `scope=profile%20openid`;

    res.json({
        success: true,
        loginUrl: loginUrl,
        state: state
    });
});

// Get LINE login URL for account linking
router.get('/link-url', (req, res) => {
    const channelId = process.env.LINE_CHANNEL_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/line/callback?type=link`;
    const state = crypto.randomBytes(16).toString('hex');
    
    const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
        `response_type=code&` +
        `client_id=${channelId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}&` +
        `scope=profile%20openid`;

    res.json({
        success: true,
        loginUrl: loginUrl,
        state: state
    });
});

// LINE OAuth callback
router.get('/callback', async (req, res) => {
    const { code, state, type } = req.query;
    
    if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
    }

    try {
        // Exchange code for access token
        const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: `${req.protocol}://${req.get('host')}/api/line/callback${type ? `?type=${type}` : ''}`,
            client_id: process.env.LINE_CHANNEL_ID,
            client_secret: process.env.LINE_CHANNEL_SECRET
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, id_token } = tokenResponse.data;

        // Get user profile
        const profileResponse = await axios.get('https://api.line.me/v2/profile', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        const profile = profileResponse.data;

        // Handle different authentication types
        if (type === 'register') {
            // Registration flow - return profile for frontend to complete registration
            res.json({
                success: true,
                message: 'LINE authentication successful for registration',
                profile: {
                    userId: profile.userId,
                    displayName: profile.displayName,
                    pictureUrl: profile.pictureUrl
                },
                type: 'register'
            });
        } else if (type === 'link') {
            // Account linking flow - return profile for frontend to link account
            res.json({
                success: true,
                message: 'LINE authentication successful for account linking',
                profile: {
                    userId: profile.userId,
                    displayName: profile.displayName,
                    pictureUrl: profile.pictureUrl
                },
                type: 'link'
            });
        } else {
            // Login flow - check if user exists and return auth token
            const [users] = await pool.execute(
                'SELECT id, username, email, is_admin, is_blocked FROM users WHERE line_user_id = ?',
                [profile.userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No account found with this LINE ID. Please register first.',
                    profile: {
                        userId: profile.userId,
                        displayName: profile.displayName,
                        pictureUrl: profile.pictureUrl
                    }
                });
            }

            const user = users[0];
            if (user.is_blocked) {
                return res.status(403).json({
                    success: false,
                    message: 'This account has been blocked'
                });
            }

            // Generate JWT token
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    username: user.username, 
                    email: user.email,
                    isAdmin: user.is_admin 
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                message: 'LINE login successful',
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isAdmin: user.is_admin,
                    lineUserId: profile.userId,
                    lineDisplayName: profile.displayName,
                    linePictureUrl: profile.pictureUrl
                }
            });
        }

    } catch (error) {
        console.error('LINE OAuth error:', error);
        res.status(500).json({ error: 'LINE authentication failed' });
    }
});

// Register with LINE OAuth
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, lineUserId, lineDisplayName, linePictureUrl } = req.body;

        // Validate input
        if (!username || !email || !password || !lineUserId) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, password, and LINE user ID are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id, is_blocked FROM users WHERE username = ? OR email = ? OR line_user_id = ?',
            [username, email, lineUserId]
        );

        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            if (existingUser.is_blocked) {
                return res.status(403).json({
                    success: false,
                    message: 'This account has been blocked and cannot be re-registered'
                });
            }
            return res.status(409).json({
                success: false,
                message: 'Username, email, or LINE account already exists'
            });
        }

        // Hash password
        const bcrypt = require('bcryptjs');
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Check if user should be admin
        const normalizedEmail = String(email).trim().toLowerCase();
        const adminAllowlist = new Set(['km@sabosuku.com', 'haibanosirase@gmail.com']);
        const isAdmin = adminAllowlist.has(normalizedEmail);

        // Create user with LINE account linked
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, line_user_id, line_display_name, line_picture_url, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, passwordHash, lineUserId, lineDisplayName, linePictureUrl, isAdmin || false]
        );

        // Create notification preferences with LINE enabled
        await pool.execute(
            'INSERT INTO user_notifications (user_id, email_enabled, line_enabled, line_user_id) VALUES (?, true, true, ?)',
            [result.insertId, lineUserId]
        );

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { 
                userId: result.insertId, 
                username: username, 
                email: email,
                isAdmin: isAdmin 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Registration with LINE successful',
            token: token,
            user: {
                id: result.insertId,
                username: username,
                email: email,
                isAdmin: isAdmin,
                lineUserId: lineUserId,
                lineDisplayName: lineDisplayName,
                linePictureUrl: linePictureUrl
            }
        });

    } catch (error) {
        console.error('LINE registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Link LINE account to existing user
router.post('/link-account', async (req, res) => {
    try {
        const { userId, lineUserId, lineDisplayName, linePictureUrl } = req.body;

        if (!userId || !lineUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID and LINE user ID are required'
            });
        }

        // Check if LINE account is already linked to another user
        const [existingLineUsers] = await pool.execute(
            'SELECT id FROM users WHERE line_user_id = ? AND id != ?',
            [lineUserId, userId]
        );

        if (existingLineUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This LINE account is already linked to another user'
            });
        }

        // Update user with LINE account info
        await pool.execute(
            'UPDATE users SET line_user_id = ?, line_display_name = ?, line_picture_url = ? WHERE id = ?',
            [lineUserId, lineDisplayName, linePictureUrl, userId]
        );

        // Update notification preferences to enable LINE
        await pool.execute(
            'UPDATE user_notifications SET line_enabled = true, line_user_id = ? WHERE user_id = ?',
            [lineUserId, userId]
        );

        res.json({
            success: true,
            message: 'LINE account linked successfully',
            lineUserId: lineUserId,
            lineDisplayName: lineDisplayName,
            linePictureUrl: linePictureUrl
        });

    } catch (error) {
        console.error('LINE account linking error:', error);
        res.status(500).json({ error: 'Account linking failed' });
    }
});

// Unlink LINE account from user
router.post('/unlink-account', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Remove LINE account info from user
        await pool.execute(
            'UPDATE users SET line_user_id = NULL, line_display_name = NULL, line_picture_url = NULL WHERE id = ?',
            [userId]
        );

        // Disable LINE notifications
        await pool.execute(
            'UPDATE user_notifications SET line_enabled = false, line_user_id = NULL WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'LINE account unlinked successfully'
        });

    } catch (error) {
        console.error('LINE account unlinking error:', error);
        res.status(500).json({ error: 'Account unlinking failed' });
    }
});

// LINE OAuth Login/Registration
router.post('/oauth/login', checkIPBlockingForLogin, async (req, res) => {
    try {
        const { code, state } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code is required'
            });
        }

        // Exchange code for access token
        const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.LINE_REDIRECT_URI,
            client_id: process.env.LINE_CHANNEL_ID,
            client_secret: process.env.LINE_CHANNEL_SECRET
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token } = tokenResponse.data;

        // Get user profile from LINE
        const profileResponse = await axios.get('https://api.line.me/v2/profile', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        const { userId: lineUserId, displayName, pictureUrl } = profileResponse.data;

        // Check if user exists with this LINE ID
        const [existingUsers] = await pool.execute(
            'SELECT id, username, email, is_active, is_admin, is_blocked FROM users WHERE line_user_id = ?',
            [lineUserId]
        );

        if (existingUsers.length > 0) {
            const user = existingUsers[0];
            
            if (user.is_blocked) {
                return res.status(403).json({
                    success: false,
                    message: 'This account has been blocked'
                });
            }

            if (!user.is_active) {
                return res.status(403).json({
                    success: false,
                    message: 'This account is inactive'
                });
            }

            // Update user profile if needed
            await pool.execute(
                'UPDATE users SET line_user_id = ? WHERE id = ?',
                [lineUserId, user.id]
            );

            // Update notification preferences
            await pool.execute(
                'UPDATE user_notifications SET line_enabled = true, line_user_id = ? WHERE user_id = ?',
                [lineUserId, user.id]
            );

            // Log IP address
            const ipAddress = req.clientIP || req.ip || req.connection?.remoteAddress || '127.0.0.1';
            await pool.execute(`
                INSERT INTO user_ip_history (user_id, ip_address, action, user_agent, created_at)
                VALUES (?, ?, 'login', ?, NOW())
            `, [user.id, ipAddress, req.headers['user-agent'] || null]);

            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    line_user_id: lineUserId,
                    displayName,
                    pictureUrl
                }
            });
        } else {
            // User doesn't exist, need to register
            return res.status(404).json({
                success: false,
                message: 'User not found. Please register first.',
                requiresRegistration: true,
                lineUserId,
                displayName,
                pictureUrl
            });
        }

    } catch (error) {
        console.error('LINE OAuth login error:', error);
        res.status(500).json({
            success: false,
            message: 'LINE login failed'
        });
    }
});

// LINE OAuth Registration
router.post('/oauth/register', checkIPBlockingForRegistration, async (req, res) => {
    try {
        const { code, username, email, password } = req.body;

        if (!code || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code, username, email, and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Validate username format
        const userIdRegex = /^[a-zA-Z0-9_]+$/;
        if (!userIdRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'User ID must contain only letters, numbers, and underscores'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Exchange code for access token
        const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.LINE_REDIRECT_URI,
            client_id: process.env.LINE_CHANNEL_ID,
            client_secret: process.env.LINE_CHANNEL_SECRET
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token } = tokenResponse.data;

        // Get user profile from LINE
        const profileResponse = await axios.get('https://api.line.me/v2/profile', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        const { userId: lineUserId, displayName, pictureUrl } = profileResponse.data;

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id, is_blocked FROM users WHERE username = ? OR email = ? OR line_user_id = ?',
            [username, email, lineUserId]
        );

        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            if (existingUser.is_blocked) {
                return res.status(403).json({
                    success: false,
                    message: 'This account has been blocked and cannot be re-registered'
                });
            }
            return res.status(409).json({
                success: false,
                message: 'User ID, email, or LINE account already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Normalize email and check if user should be admin
        const normalizedEmail = String(email).trim().toLowerCase();
        const adminAllowlist = new Set(['km@sabosuku.com', 'haibanosirase@gmail.com']);
        const isAdmin = adminAllowlist.has(normalizedEmail);

        // Create user with LINE ID
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, line_user_id, is_admin) VALUES (?, ?, ?, ?, ?)',
            [username, email, passwordHash, lineUserId, isAdmin || false]
        );

        // Create notification preferences with LINE enabled
        await pool.execute(
            'INSERT INTO user_notifications (user_id, email_enabled, line_enabled, line_user_id) VALUES (?, true, true, ?)',
            [result.insertId, lineUserId]
        );

        // Log IP address for the new user
        const ipAddress = req.clientIP || req.ip || req.connection?.remoteAddress || '127.0.0.1';
        await pool.execute(`
            INSERT INTO user_ip_history (user_id, ip_address, action, user_agent, created_at)
            VALUES (?, ?, 'registration', ?, NOW())
        `, [result.insertId, ipAddress, req.headers['user-agent'] || null]);

        const token = jwt.sign(
            { userId: result.insertId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully with LINE',
            token,
            user: {
                id: result.insertId,
                username,
                email,
                line_user_id: lineUserId,
                displayName,
                pictureUrl
            }
        });

    } catch (error) {
        console.error('LINE OAuth registration error:', error);
        res.status(500).json({
            success: false,
            message: 'LINE registration failed'
        });
    }
});

// Get LINE OAuth URL
router.get('/oauth/url', (req, res) => {
    try {
        const state = crypto.randomBytes(16).toString('hex');
        const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
            `response_type=code&` +
            `client_id=${process.env.LINE_CHANNEL_ID}&` +
            `redirect_uri=${encodeURIComponent(process.env.LINE_REDIRECT_URI)}&` +
            `state=${state}&` +
            `scope=profile%20openid`;

        res.json({
            success: true,
            authUrl: lineAuthUrl,
            state
        });
    } catch (error) {
        console.error('Error generating LINE OAuth URL:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate LINE OAuth URL'
        });
    }
});

// Auto-link LINE User ID to existing user account
router.post('/auto-link', async (req, res) => {
    try {
        const { lineUserId, userId } = req.body;

        if (!lineUserId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'LINE User ID and User ID are required'
            });
        }

        // Validate LINE User ID format (should start with 'U')
        if (!lineUserId.startsWith('U') || lineUserId.length < 20) {
            return res.status(400).json({
                success: false,
                message: 'Invalid LINE User ID format'
            });
        }

        // Check if LINE User ID is already linked to another user
        const [existingUsers] = await pool.execute(
            'SELECT id, username FROM users WHERE line_user_id = ? AND id != ?',
            [lineUserId, userId]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This LINE User ID is already linked to another account'
            });
        }

        // Update user with LINE User ID
        await pool.execute(
            'UPDATE users SET line_user_id = ? WHERE id = ?',
            [lineUserId, userId]
        );

        // Update notification preferences
        await pool.execute(
            'UPDATE user_notifications SET line_enabled = true, line_user_id = ? WHERE user_id = ?',
            [lineUserId, userId]
        );

        // Log the auto-link event
        await pool.execute(`
            INSERT INTO line_follow_events (line_user_id, followed_at, status)
            VALUES (?, NOW(), 'active')
            ON DUPLICATE KEY UPDATE followed_at = NOW(), status = 'active'
        `, [lineUserId]);

        res.json({
            success: true,
            message: 'LINE User ID linked successfully',
            lineUserId
        });

    } catch (error) {
        console.error('Error auto-linking LINE User ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to link LINE User ID'
        });
    }
});

// Get LINE User ID from follow events (for manual linking)
router.get('/follow-events', async (req, res) => {
    try {
        const [events] = await pool.execute(`
            SELECT line_user_id, followed_at, status 
            FROM line_follow_events 
            WHERE status = 'active' 
            ORDER BY followed_at DESC 
            LIMIT 100
        `);

        res.json({
            success: true,
            events
        });

    } catch (error) {
        console.error('Error getting LINE follow events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get LINE follow events'
        });
    }
});

// Auto-detect LINE official user ID for registration
router.post('/auto-detect-official-userid', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Get recent LINE follow events (last 5 minutes)
        const [events] = await pool.execute(`
            SELECT line_user_id, followed_at, status 
            FROM line_follow_events 
            WHERE status = 'active' 
            AND followed_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            ORDER BY followed_at DESC 
            LIMIT 10
        `);

        if (events.length === 0) {
            return res.json({
                success: false,
                message: 'No recent LINE follow events found. Please add the LINE official account as a friend first.',
                events: []
            });
        }

        // Check if any of these user IDs are already linked to other users
        const availableEvents = [];
        for (const event of events) {
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE line_official_user_id = ? AND id != ?',
                [event.line_user_id, userId]
            );
            
            if (existingUsers.length === 0) {
                availableEvents.push(event);
            }
        }

        res.json({
            success: true,
            message: 'Available LINE official user IDs found',
            events: availableEvents
        });

    } catch (error) {
        console.error('Error auto-detecting LINE official user ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to auto-detect LINE official user ID'
        });
    }
});

// Link LINE official user ID to user account
router.post('/link-official-userid', async (req, res) => {
    try {
        const { userId, lineOfficialUserId } = req.body;

        if (!userId || !lineOfficialUserId) {
            return res.status(400).json({
                success: false,
                message: 'User ID and LINE official user ID are required'
            });
        }

        // Validate LINE official user ID format (should start with 'U')
        if (!lineOfficialUserId.startsWith('U') || lineOfficialUserId.length < 20) {
            return res.status(400).json({
                success: false,
                message: 'Invalid LINE official user ID format'
            });
        }

        // Check if LINE official user ID is already linked to another user
        const [existingUsers] = await pool.execute(
            'SELECT id, username FROM users WHERE line_official_user_id = ? AND id != ?',
            [lineOfficialUserId, userId]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This LINE official user ID is already linked to another account'
            });
        }

        // Update user with LINE official user ID
        await pool.execute(
            'UPDATE users SET line_official_user_id = ? WHERE id = ?',
            [lineOfficialUserId, userId]
        );

        // Update notification preferences
        await pool.execute(
            'UPDATE user_notifications SET line_enabled = true, line_official_user_id = ? WHERE user_id = ?',
            [lineOfficialUserId, userId]
        );

        res.json({
            success: true,
            message: 'LINE official user ID linked successfully',
            lineOfficialUserId
        });

    } catch (error) {
        console.error('Error linking LINE official user ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to link LINE official user ID'
        });
    }
});

// LINE OAuth Callback (for redirect handling)
router.get('/oauth/callback', (req, res) => {
    try {
        const { code, state, error } = req.query;
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: `OAuth error: ${error}`
            });
        }

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Authorization code not provided'
            });
        }

        // Return the code to the frontend for processing
        res.json({
            success: true,
            code,
            state
        });
    } catch (error) {
        console.error('LINE OAuth callback error:', error);
        res.status(500).json({
            success: false,
            message: 'OAuth callback failed'
        });
    }
});

module.exports = router;
