const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const AntiEvasionRegistration = require('../services/antiEvasionRegistration');
const EvasionSignalCollector = require('../services/evasionSignalCollector');

const router = express.Router();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'website_monitor',
    charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);
const antiEvasionRegistration = new AntiEvasionRegistration(dbConfig);
const signalCollector = new EvasionSignalCollector(dbConfig);

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Enhanced registration with anti-evasion protection
 */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, captcha_token } = req.body;
        
        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required'
            });
        }

        // Generate session ID for tracking
        const sessionId = require('crypto').randomUUID();
        
        // Collect client information for evasion detection
        const clientInfo = {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            screenResolution: req.headers['x-screen-resolution'],
            timezone: req.headers['x-timezone'],
            language: req.get('Accept-Language'),
            platform: req.headers['x-platform'],
            cookieEnabled: req.headers['x-cookie-enabled'] === 'true',
            doNotTrack: req.get('DNT') === '1',
            formCompletionTime: parseInt(req.headers['x-form-time']) || 0
        };

        console.log(`🔐 Processing registration with anti-evasion protection`);
        console.log(`   Session: ${sessionId}`);
        console.log(`   Email: ${email}`);
        console.log(`   IP: ${clientInfo.ip}`);

        // Process registration with anti-evasion checks
        const result = await antiEvasionRegistration.processRegistration(
            { username, email, password },
            clientInfo,
            sessionId
        );

        // Handle different registration outcomes
        if (result.success) {
            // Registration successful
            res.json({
                success: true,
                message: result.message,
                user_id: result.user_id,
                action: result.action,
                monitoring_enabled: result.monitoring_enabled || false
            });
        } else {
            // Registration blocked or requires challenge
            res.status(403).json({
                success: false,
                message: result.message,
                action: result.action,
                challenge: result.challenge,
                challenge_type: result.challenge_type,
                risk_score: result.risk_score,
                signals: result.signals,
                appeal_available: result.appeal_available || false,
                session_id: sessionId
            });
        }

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed due to server error'
        });
    }
});

/**
 * Verify proof-of-work challenge
 */
router.post('/verify-challenge', async (req, res) => {
    try {
        const { session_id, solution } = req.body;
        
        if (!session_id || !solution) {
            return res.status(400).json({
                success: false,
                message: 'Session ID and solution are required'
            });
        }

        console.log(`🔍 Verifying PoW challenge for session: ${session_id}`);

        const result = await antiEvasionRegistration.verifyProofOfWork(session_id, solution);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                user_id: result.user_id,
                action: result.action
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('❌ Challenge verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Challenge verification failed'
        });
    }
});

/**
 * Get registration status
 */
router.get('/registration-status/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const status = await antiEvasionRegistration.getRegistrationStatus(sessionId);
        
        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('❌ Error getting registration status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get registration status'
        });
    }
});

/**
 * Enhanced login with evasion detection
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Collect client information for login evasion detection
        const sessionId = require('crypto').randomUUID();
        const clientInfo = {
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            screenResolution: req.headers['x-screen-resolution'],
            timezone: req.headers['x-timezone'],
            language: req.get('Accept-Language'),
            platform: req.headers['x-platform'],
            cookieEnabled: req.headers['x-cookie-enabled'] === 'true',
            doNotTrack: req.get('DNT') === '1'
        };

        // Check for banned signals before attempting login
        const signals = await signalCollector.collectSignals(
            { email, name: '' }, // Minimal data for login
            clientInfo,
            sessionId
        );

        // Check if user exists and is not blocked
        const [users] = await pool.execute(`
            SELECT id, username, email, password_hash, is_active, is_blocked, is_admin
            FROM users 
            WHERE email = ?
        `, [email]);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Check if user is blocked
        if (user.is_blocked) {
            return res.status(403).json({
                success: false,
                message: 'Account is blocked',
                blocked: true
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is not active'
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                email: user.email,
                is_admin: user.is_admin 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log successful login
        console.log(`✅ User ${user.username} logged in successfully`);

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                is_admin: user.is_admin
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed due to server error'
        });
    }
});

/**
 * Appeal blocked registration
 */
router.post('/appeal', async (req, res) => {
    try {
        const { session_id, reason, contact_info } = req.body;
        
        if (!session_id || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Session ID and reason are required'
            });
        }

        // Store appeal in database
        await pool.execute(`
            INSERT INTO evasion_appeals (session_id, reason, contact_info, created_at)
            VALUES (?, ?, ?, NOW())
        `, [session_id, reason, contact_info]);

        console.log(`📝 Appeal submitted for session: ${session_id}`);

        res.json({
            success: true,
            message: 'Appeal submitted successfully. Admin will review your case.'
        });

    } catch (error) {
        console.error('❌ Appeal submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Appeal submission failed'
        });
    }
});

/**
 * Get client-side challenge data
 */
router.get('/challenge-data/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Get challenge status
        const status = await antiEvasionRegistration.getRegistrationStatus(sessionId);
        
        if (status.status === 'challenge_required' && status.challenge_type === 'proof_of_work') {
            // Return challenge data for client-side computation
            res.json({
                success: true,
                challenge_required: true,
                challenge_type: 'proof_of_work',
                challenge_data: status.challenge_status
            });
        } else {
            res.json({
                success: true,
                challenge_required: false,
                status: status.status
            });
        }

    } catch (error) {
        console.error('❌ Error getting challenge data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get challenge data'
        });
    }
});

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
};

/**
 * Get user profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT id, username, email, is_active, is_admin, is_blocked, created_at
            FROM users 
            WHERE id = ?
        `, [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                is_active: user.is_active,
                is_admin: user.is_admin,
                is_blocked: user.is_blocked,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('❌ Error getting user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
});

module.exports = router;
