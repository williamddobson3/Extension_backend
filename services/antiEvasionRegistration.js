const EvasionSignalCollector = require('./evasionSignalCollector');
const EvasionDetectionEngine = require('./evasionDetectionEngine');
const ProofOfWorkChallenge = require('./proofOfWorkChallenge');
const mysql = require('mysql2/promise');

/**
 * Anti-Evasion Registration Service
 * Enhanced registration flow with comprehensive evasion detection
 */
class AntiEvasionRegistration {
    constructor(dbConfig) {
        this.dbConfig = dbConfig;
        this.pool = mysql.createPool(dbConfig);
        this.signalCollector = new EvasionSignalCollector(dbConfig);
        this.detectionEngine = new EvasionDetectionEngine(dbConfig);
        this.powChallenge = new ProofOfWorkChallenge(dbConfig);
    }

    /**
     * Process registration with anti-evasion checks
     * @param {Object} registrationData - Registration form data
     * @param {Object} clientInfo - Client information
     * @param {string} sessionId - Session identifier
     * @returns {Object} Registration result
     */
    async processRegistration(registrationData, clientInfo, sessionId) {
        try {
            console.log(`🔐 Processing anti-evasion registration for session: ${sessionId}`);

            // Step 1: Collect signals
            const signals = await this.signalCollector.collectSignals(
                registrationData, 
                clientInfo, 
                sessionId
            );

            // Step 2: Analyze signals for evasion
            const analysis = await this.detectionEngine.analyzeSignals(signals);

            // Step 3: Determine action based on risk score
            const result = await this.handleRegistrationDecision(
                registrationData, 
                analysis, 
                sessionId
            );

            // Step 4: Update rate limits
            await this.updateRateLimits(signals, sessionId);

            console.log(`✅ Registration processed: ${result.action} (score: ${analysis.risk_score})`);
            return result;

        } catch (error) {
            console.error('❌ Error processing anti-evasion registration:', error);
            return {
                success: false,
                action: 'error',
                message: 'Registration processing failed',
                error: error.message
            };
        }
    }

    /**
     * Handle registration decision based on risk analysis
     * @param {Object} registrationData - Registration data
     * @param {Object} analysis - Risk analysis
     * @param {string} sessionId - Session ID
     * @returns {Object} Registration result
     */
    async handleRegistrationDecision(registrationData, analysis, sessionId) {
        try {
            switch (analysis.action) {
                case 'block':
                    return await this.handleBlock(analysis, sessionId);
                
                case 'challenge_strong':
                    return await this.handleStrongChallenge(analysis, sessionId);
                
                case 'challenge_medium':
                    return await this.handleMediumChallenge(analysis, sessionId);
                
                case 'monitor':
                    return await this.handleMonitor(registrationData, analysis, sessionId);
                
                case 'allow':
                default:
                    return await this.handleAllow(registrationData, analysis, sessionId);
            }

        } catch (error) {
            console.error('Error handling registration decision:', error);
            return {
                success: false,
                action: 'error',
                message: 'Decision handling failed'
            };
        }
    }

    /**
     * Handle immediate block
     * @param {Object} analysis - Risk analysis
     * @param {string} sessionId - Session ID
     * @returns {Object} Block result
     */
    async handleBlock(analysis, sessionId) {
        console.log(`🚫 Blocking registration for session: ${sessionId}`);
        
        // Store attempt as blocked
        await this.pool.execute(`
            UPDATE evasion_attempts 
            SET action_taken = 'blocked', resolved_at = NOW()
            WHERE session_id = ?
        `, [sessionId]);

        return {
            success: false,
            action: 'blocked',
            message: 'Registration blocked due to high risk signals',
            risk_score: analysis.risk_score,
            signals: analysis.signal_breakdown,
            appeal_available: true
        };
    }

    /**
     * Handle strong challenge (OAuth or high-difficulty PoW)
     * @param {Object} analysis - Risk analysis
     * @param {string} sessionId - Session ID
     * @returns {Object} Challenge result
     */
    async handleStrongChallenge(analysis, sessionId) {
        console.log(`🔒 Strong challenge required for session: ${sessionId}`);
        
        // Generate high-difficulty PoW challenge
        const difficulty = this.powChallenge.getDifficultyForRiskScore(analysis.risk_score);
        const challenge = await this.powChallenge.generateChallenge(sessionId, difficulty);
        
        // Store attempt as challenged
        await this.pool.execute(`
            UPDATE evasion_attempts 
            SET action_taken = 'challenged', challenge_type = 'proof_of_work_high'
            WHERE session_id = ?
        `, [sessionId]);

        return {
            success: false,
            action: 'challenge_required',
            challenge_type: 'proof_of_work',
            challenge: challenge,
            message: 'High-difficulty proof-of-work challenge required',
            risk_score: analysis.risk_score,
            difficulty: difficulty
        };
    }

    /**
     * Handle medium challenge (CAPTCHA + email verification)
     * @param {Object} analysis - Risk analysis
     * @param {string} sessionId - Session ID
     * @returns {Object} Challenge result
     */
    async handleMediumChallenge(analysis, sessionId) {
        console.log(`🔐 Medium challenge required for session: ${sessionId}`);
        
        // Store attempt as challenged
        await this.pool.execute(`
            UPDATE evasion_attempts 
            SET action_taken = 'challenged', challenge_type = 'captcha_email'
            WHERE session_id = ?
        `, [sessionId]);

        return {
            success: false,
            action: 'challenge_required',
            challenge_type: 'captcha_email',
            message: 'CAPTCHA and email verification required',
            risk_score: analysis.risk_score,
            requires_captcha: true,
            requires_email_verification: true
        };
    }

    /**
     * Handle monitor mode (allow but track)
     * @param {Object} registrationData - Registration data
     * @param {Object} analysis - Risk analysis
     * @param {string} sessionId - Session ID
     * @returns {Object} Monitor result
     */
    async handleMonitor(registrationData, analysis, sessionId) {
        console.log(`👁️ Monitoring registration for session: ${sessionId}`);
        
        // Allow registration but mark for monitoring
        const userId = await this.createUserAccount(registrationData);
        
        // Store attempt as allowed but monitored
        await this.pool.execute(`
            UPDATE evasion_attempts 
            SET action_taken = 'allowed', user_id = ?
            WHERE session_id = ?
        `, [userId, sessionId]);

        // Mark user for monitoring
        await this.pool.execute(`
            UPDATE users 
            SET is_monitored = 1 
            WHERE id = ?
        `, [userId]);

        return {
            success: true,
            action: 'monitored',
            user_id: userId,
            message: 'Registration allowed but account will be monitored',
            risk_score: analysis.risk_score,
            monitoring_enabled: true
        };
    }

    /**
     * Handle normal allow
     * @param {Object} registrationData - Registration data
     * @param {Object} analysis - Risk analysis
     * @param {string} sessionId - Session ID
     * @returns {Object} Allow result
     */
    async handleAllow(registrationData, analysis, sessionId) {
        console.log(`✅ Allowing registration for session: ${sessionId}`);
        
        // Create user account
        const userId = await this.createUserAccount(registrationData);
        
        // Store attempt as allowed
        await this.pool.execute(`
            UPDATE evasion_attempts 
            SET action_taken = 'allowed', user_id = ?
            WHERE session_id = ?
        `, [userId, sessionId]);

        return {
            success: true,
            action: 'allowed',
            user_id: userId,
            message: 'Registration successful',
            risk_score: analysis.risk_score
        };
    }

    /**
     * Create user account
     * @param {Object} registrationData - Registration data
     * @returns {number} User ID
     */
    async createUserAccount(registrationData) {
        try {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(registrationData.password, 10);
            
            const [result] = await this.pool.execute(`
                INSERT INTO users (username, email, password_hash, is_active, created_at)
                VALUES (?, ?, ?, 1, NOW())
            `, [registrationData.username, registrationData.email, hashedPassword]);

            return result.insertId;

        } catch (error) {
            console.error('Error creating user account:', error);
            throw error;
        }
    }

    /**
     * Update rate limits
     * @param {Object} signals - Collected signals
     * @param {string} sessionId - Session ID
     */
    async updateRateLimits(signals, sessionId) {
        try {
            // Update IP rate limit
            await this.detectionEngine.updateRateLimit(
                signals.ip_address, 
                'ip', 
                'registration'
            );

            // Update fingerprint rate limit
            await this.detectionEngine.updateRateLimit(
                signals.fp_hash, 
                'fp_hash', 
                'registration'
            );

            // Update email rate limit
            await this.detectionEngine.updateRateLimit(
                signals.normalized_email, 
                'email', 
                'registration'
            );

        } catch (error) {
            console.error('Error updating rate limits:', error);
        }
    }

    /**
     * Verify proof-of-work challenge
     * @param {string} sessionId - Session ID
     * @param {string} solution - Client solution
     * @returns {Object} Verification result
     */
    async verifyProofOfWork(sessionId, solution) {
        try {
            const verification = await this.powChallenge.verifySolution(sessionId, solution);
            
            if (verification.valid) {
                // Get the original registration data and proceed
                const [attempts] = await this.pool.execute(`
                    SELECT * FROM evasion_attempts 
                    WHERE session_id = ? AND action_taken = 'challenged'
                `, [sessionId]);

                if (attempts.length > 0) {
                    // Re-process registration with challenge completed
                    return await this.handleRegistrationDecision(
                        {}, // Would need to retrieve original data
                        { action: 'allow', risk_score: 0 },
                        sessionId
                    );
                }
            }

            return {
                success: verification.valid,
                message: verification.valid 
                    ? 'Challenge completed successfully' 
                    : verification.reason
            };

        } catch (error) {
            console.error('Error verifying proof-of-work:', error);
            return {
                success: false,
                message: 'Challenge verification failed'
            };
        }
    }

    /**
     * Get registration status
     * @param {string} sessionId - Session ID
     * @returns {Object} Registration status
     */
    async getRegistrationStatus(sessionId) {
        try {
            const [attempts] = await this.pool.execute(`
                SELECT * FROM evasion_attempts 
                WHERE session_id = ?
            `, [sessionId]);

            if (attempts.length === 0) {
                return {
                    status: 'not_found',
                    message: 'No registration attempt found'
                };
            }

            const attempt = attempts[0];
            
            if (attempt.action_taken === 'challenged') {
                const challengeStatus = await this.powChallenge.getChallengeStatus(sessionId);
                return {
                    status: 'challenge_required',
                    challenge_type: attempt.challenge_type,
                    challenge_status: challengeStatus,
                    risk_score: attempt.risk_score
                };
            }

            return {
                status: attempt.action_taken,
                risk_score: attempt.risk_score,
                user_id: attempt.user_id,
                created_at: attempt.created_at
            };

        } catch (error) {
            console.error('Error getting registration status:', error);
            return {
                status: 'error',
                message: 'Failed to get registration status'
            };
        }
    }

    /**
     * Clean up old data
     * @param {number} daysOld - Days old to clean up
     */
    async cleanupOldData(daysOld = 30) {
        try {
            console.log(`🧹 Cleaning up evasion data older than ${daysOld} days`);
            
            // Clean up old signals
            await this.signalCollector.cleanupOldSignals(daysOld);
            
            // Clean up expired challenges
            await this.powChallenge.cleanupExpiredChallenges(24);
            
            // Clean up old rate limits
            await this.pool.execute(`
                DELETE FROM rate_limits 
                WHERE window_start < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [daysOld]);

            console.log('✅ Evasion data cleanup completed');

        } catch (error) {
            console.error('Error cleaning up old data:', error);
        }
    }
}

module.exports = AntiEvasionRegistration;
