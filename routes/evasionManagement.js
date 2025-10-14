const express = require('express');
const mysql = require('mysql2/promise');
const EvasionDetectionEngine = require('../services/evasionDetectionEngine');
const ProofOfWorkChallenge = require('../services/proofOfWorkChallenge');

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
const detectionEngine = new EvasionDetectionEngine(dbConfig);
const powChallenge = new ProofOfWorkChallenge(dbConfig);

// Middleware to check admin authentication
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Get evasion dashboard data
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        
        // Get evasion statistics
        const evasionStats = await detectionEngine.getEvasionStats(days);
        
        // Get challenge statistics
        const challengeStats = await powChallenge.getChallengeStats(days);
        
        // Get recent high-risk attempts
        const [recentAttempts] = await pool.execute(`
            SELECT 
                ea.*,
                es.normalized_email,
                es.normalized_name,
                es.ip_address,
                es.fp_hash
            FROM evasion_attempts ea
            LEFT JOIN evasion_signals es ON ea.session_id = es.session_id
            WHERE ea.risk_score >= 60
            ORDER BY ea.created_at DESC
            LIMIT 50
        `);

        // Get banned signals count
        const [bannedCount] = await pool.execute(`
            SELECT signal_type, COUNT(*) as count
            FROM banned_signals 
            WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY signal_type
        `, [days]);

        res.json({
            success: true,
            data: {
                evasion_stats: evasionStats,
                challenge_stats: challengeStats,
                recent_attempts: recentAttempts,
                banned_signals: bannedCount,
                period_days: days
            }
        });

    } catch (error) {
        console.error('Error getting evasion dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get detailed evasion attempt
router.get('/attempt/:sessionId', requireAdmin, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Get attempt details
        const [attempts] = await pool.execute(`
            SELECT * FROM evasion_attempts 
            WHERE session_id = ?
        `, [sessionId]);

        if (attempts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Attempt not found'
            });
        }

        // Get signals for this attempt
        const [signals] = await pool.execute(`
            SELECT * FROM evasion_signals 
            WHERE session_id = ?
        `, [sessionId]);

        // Get related attempts (same IP, fingerprint, etc.)
        const [relatedAttempts] = await pool.execute(`
            SELECT DISTINCT ea.*, es.normalized_email, es.ip_address
            FROM evasion_attempts ea
            JOIN evasion_signals es ON ea.session_id = es.session_id
            WHERE es.ip_address = (
                SELECT ip_address FROM evasion_signals WHERE session_id = ?
            ) OR es.fp_hash = (
                SELECT fp_hash FROM evasion_signals WHERE session_id = ?
            )
            AND ea.session_id != ?
            ORDER BY ea.created_at DESC
            LIMIT 10
        `, [sessionId, sessionId, sessionId]);

        res.json({
            success: true,
            data: {
                attempt: attempts[0],
                signals: signals[0],
                related_attempts: relatedAttempts
            }
        });

    } catch (error) {
        console.error('Error getting evasion attempt:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Ban a signal
router.post('/ban-signal', requireAdmin, async (req, res) => {
    try {
        const { signalType, signalValue, reason, severity } = req.body;
        
        if (!signalType || !signalValue) {
            return res.status(400).json({
                success: false,
                message: 'Signal type and value are required'
            });
        }

        await detectionEngine.banSignal(
            signalType, 
            signalValue, 
            req.user.id, 
            reason || 'Manually banned by admin',
            severity || 'medium'
        );

        res.json({
            success: true,
            message: 'Signal banned successfully'
        });

    } catch (error) {
        console.error('Error banning signal:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Unban a signal
router.post('/unban-signal', requireAdmin, async (req, res) => {
    try {
        const { signalId } = req.body;
        
        if (!signalId) {
            return res.status(400).json({
                success: false,
                message: 'Signal ID is required'
            });
        }

        await pool.execute(`
            DELETE FROM banned_signals WHERE id = ?
        `, [signalId]);

        res.json({
            success: true,
            message: 'Signal unbanned successfully'
        });

    } catch (error) {
        console.error('Error unbanning signal:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get banned signals list
router.get('/banned-signals', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const [bannedSignals] = await pool.execute(`
            SELECT 
                bs.*,
                u.username as banned_by_username
            FROM banned_signals bs
            LEFT JOIN users u ON bs.banned_by = u.id
            ORDER BY bs.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const [totalCount] = await pool.execute(`
            SELECT COUNT(*) as total FROM banned_signals
        `);

        res.json({
            success: true,
            data: {
                signals: bannedSignals,
                pagination: {
                    page,
                    limit,
                    total: totalCount[0].total,
                    pages: Math.ceil(totalCount[0].total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting banned signals:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Update evasion attempt decision
router.post('/update-decision', requireAdmin, async (req, res) => {
    try {
        const { sessionId, decision, notes } = req.body;
        
        if (!sessionId || !decision) {
            return res.status(400).json({
                success: false,
                message: 'Session ID and decision are required'
            });
        }

        const validDecisions = ['approve', 'reject', 'escalate'];
        if (!validDecisions.includes(decision)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid decision'
            });
        }

        await pool.execute(`
            UPDATE evasion_attempts 
            SET admin_reviewed = 1, admin_decision = ?, resolved_at = NOW()
            WHERE session_id = ?
        `, [decision, sessionId]);

        // If approved, allow the registration to proceed
        if (decision === 'approve') {
            // Update any rate limits
            await pool.execute(`
                UPDATE rate_limits 
                SET attempts = 0 
                WHERE identifier IN (
                    SELECT ip_address FROM evasion_signals WHERE session_id = ?
                ) OR identifier IN (
                    SELECT fp_hash FROM evasion_signals WHERE session_id = ?
                )
            `, [sessionId, sessionId]);
        }

        res.json({
            success: true,
            message: 'Decision updated successfully'
        });

    } catch (error) {
        console.error('Error updating decision:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get evasion clusters
router.get('/clusters', requireAdmin, async (req, res) => {
    try {
        const [clusters] = await pool.execute(`
            SELECT 
                cluster_id,
                signal_type,
                signal_value,
                cluster_size,
                risk_level,
                created_at,
                last_seen
            FROM evasion_clusters
            ORDER BY cluster_size DESC, last_seen DESC
            LIMIT 100
        `);

        res.json({
            success: true,
            data: clusters
        });

    } catch (error) {
        console.error('Error getting evasion clusters:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get rate limit status
router.get('/rate-limits', requireAdmin, async (req, res) => {
    try {
        const [rateLimits] = await pool.execute(`
            SELECT 
                identifier,
                identifier_type,
                action,
                attempts,
                window_start,
                blocked_until
            FROM rate_limits
            WHERE window_start > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ORDER BY attempts DESC, window_start DESC
            LIMIT 100
        `);

        res.json({
            success: true,
            data: rateLimits
        });

    } catch (error) {
        console.error('Error getting rate limits:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Clear rate limits
router.post('/clear-rate-limits', requireAdmin, async (req, res) => {
    try {
        const { identifier, identifierType } = req.body;
        
        let query = 'DELETE FROM rate_limits WHERE 1=1';
        const params = [];
        
        if (identifier) {
            query += ' AND identifier = ?';
            params.push(identifier);
        }
        
        if (identifierType) {
            query += ' AND identifier_type = ?';
            params.push(identifierType);
        }

        const [result] = await pool.execute(query, params);

        res.json({
            success: true,
            message: `Cleared ${result.affectedRows} rate limit entries`
        });

    } catch (error) {
        console.error('Error clearing rate limits:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Export evasion data
router.get('/export', requireAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const format = req.query.format || 'json';
        
        const [data] = await pool.execute(`
            SELECT 
                ea.session_id,
                ea.attempt_type,
                ea.risk_score,
                ea.action_taken,
                ea.created_at,
                es.normalized_email,
                es.normalized_name,
                es.ip_address,
                es.fp_hash,
                es.disposable_email,
                es.mx_record_exists
            FROM evasion_attempts ea
            LEFT JOIN evasion_signals es ON ea.session_id = es.session_id
            WHERE ea.created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY ea.created_at DESC
        `, [days]);

        if (format === 'csv') {
            // Convert to CSV format
            const csv = convertToCSV(data);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="evasion_data.csv"');
            res.send(csv);
        } else {
            res.json({
                success: true,
                data: data,
                exported_at: new Date().toISOString(),
                period_days: days
            });
        }

    } catch (error) {
        console.error('Error exporting evasion data:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

module.exports = router;
