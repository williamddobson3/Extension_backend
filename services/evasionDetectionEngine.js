const mysql = require('mysql2/promise');
const stringSimilarity = require('string-similarity');

/**
 * Evasion Detection Engine
 * Analyzes signals and determines risk scores for evasion attempts
 */
class EvasionDetectionEngine {
    constructor(dbConfig) {
        this.dbConfig = dbConfig;
        this.pool = mysql.createPool(dbConfig);
        
        // Scoring weights (configurable)
        this.weights = {
            // High confidence signals
            BANNED_FP_HASH: 140,
            BANNED_EMAIL: 130,
            BANNED_IP: 80,
            BANNED_SUBNET: 50,
            
            // Medium confidence signals
            DISPOSABLE_EMAIL: 120,
            CAPTCHA_FAIL: 90,
            NO_MX_RECORD: 70,
            TOR_IP: 100,
            VPN_IP: 80,
            HOSTING_IP: 60,
            
            // Behavioral signals
            NAME_SIMILARITY: 30,
            RAPID_REGISTRATION: 20,
            FORM_BOT_PATTERN: 40,
            PROOF_OF_WORK_MISSING: 60,
            
            // Rate limiting
            IP_RATE_LIMIT: 30,
            FP_RATE_LIMIT: 40,
            EMAIL_RATE_LIMIT: 25
        };
        
        // Thresholds
        this.thresholds = {
            IMMEDIATE_BLOCK: 150,
            STRONG_CHALLENGE: 100,
            MEDIUM_CHALLENGE: 60,
            LOW_RISK: 30
        };
    }

    /**
     * Analyze signals and calculate risk score
     * @param {Object} signals - Collected signals
     * @returns {Object} Risk analysis result
     */
    async analyzeSignals(signals) {
        try {
            console.log(`🔍 Analyzing signals for session: ${signals.session_id}`);

            const analysis = {
                session_id: signals.session_id,
                risk_score: 0,
                signal_breakdown: {},
                recommendations: [],
                action: 'allow',
                confidence: 0.5
            };

            // Check banned signals
            await this.checkBannedSignals(signals, analysis);
            
            // Check behavioral patterns
            await this.checkBehavioralPatterns(signals, analysis);
            
            // Check rate limiting
            await this.checkRateLimits(signals, analysis);
            
            // Check email reputation
            await this.checkEmailReputation(signals, analysis);
            
            // Check IP reputation
            await this.checkIpReputation(signals, analysis);
            
            // Check name similarity
            await this.checkNameSimilarity(signals, analysis);
            
            // Calculate final score and action
            this.calculateFinalScore(analysis);
            
            // Store analysis result
            await this.storeAnalysisResult(analysis);
            
            console.log(`📊 Risk score: ${analysis.risk_score}, Action: ${analysis.action}`);
            return analysis;

        } catch (error) {
            console.error('❌ Error analyzing signals:', error);
            throw error;
        }
    }

    /**
     * Check for banned signals
     * @param {Object} signals - Signals to check
     * @param {Object} analysis - Analysis object to update
     */
    async checkBannedSignals(signals, analysis) {
        try {
            // Check banned fingerprint
            const [bannedFp] = await this.pool.execute(`
                SELECT id, severity FROM banned_signals 
                WHERE signal_type = 'fp_hash' AND signal_value = ?
            `, [signals.fp_hash]);

            if (bannedFp.length > 0) {
                analysis.risk_score += this.weights.BANNED_FP_HASH;
                analysis.signal_breakdown.banned_fingerprint = {
                    score: this.weights.BANNED_FP_HASH,
                    severity: bannedFp[0].severity,
                    reason: 'Fingerprint matches banned user'
                };
            }

            // Check banned email
            const [bannedEmail] = await this.pool.execute(`
                SELECT id, severity FROM banned_signals 
                WHERE signal_type = 'email' AND signal_value = ?
            `, [signals.normalized_email]);

            if (bannedEmail.length > 0) {
                analysis.risk_score += this.weights.BANNED_EMAIL;
                analysis.signal_breakdown.banned_email = {
                    score: this.weights.BANNED_EMAIL,
                    severity: bannedEmail[0].severity,
                    reason: 'Email matches banned user'
                };
            }

            // Check banned IP
            const [bannedIp] = await this.pool.execute(`
                SELECT id, severity FROM banned_signals 
                WHERE signal_type = 'ip' AND signal_value = ?
            `, [signals.ip_address]);

            if (bannedIp.length > 0) {
                analysis.risk_score += this.weights.BANNED_IP;
                analysis.signal_breakdown.banned_ip = {
                    score: this.weights.BANNED_IP,
                    severity: bannedIp[0].severity,
                    reason: 'IP address is banned'
                };
            }

            // Check banned subnet
            const [bannedSubnet] = await this.pool.execute(`
                SELECT id, severity FROM banned_signals 
                WHERE signal_type = 'subnet' AND signal_value = ?
            `, [signals.ip_subnet]);

            if (bannedSubnet.length > 0) {
                analysis.risk_score += this.weights.BANNED_SUBNET;
                analysis.signal_breakdown.banned_subnet = {
                    score: this.weights.BANNED_SUBNET,
                    severity: bannedSubnet[0].severity,
                    reason: 'IP subnet is banned'
                };
            }

        } catch (error) {
            console.error('Error checking banned signals:', error);
        }
    }

    /**
     * Check behavioral patterns
     * @param {Object} signals - Signals to check
     * @param {Object} analysis - Analysis object to update
     */
    async checkBehavioralPatterns(signals, analysis) {
        try {
            // Check form completion time (too fast = bot)
            if (signals.form_completion_time && signals.form_completion_time < 5) {
                analysis.risk_score += this.weights.FORM_BOT_PATTERN;
                analysis.signal_breakdown.rapid_form_completion = {
                    score: this.weights.FORM_BOT_PATTERN,
                    reason: 'Form completed too quickly (possible bot)'
                };
            }

            // Check for rapid registrations from same IP
            const [rapidRegs] = await this.pool.execute(`
                SELECT COUNT(*) as count FROM evasion_signals 
                WHERE ip_address = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
            `, [signals.ip_address]);

            if (rapidRegs[0].count > 3) {
                analysis.risk_score += this.weights.RAPID_REGISTRATION;
                analysis.signal_breakdown.rapid_registrations = {
                    score: this.weights.RAPID_REGISTRATION,
                    count: rapidRegs[0].count,
                    reason: 'Multiple registrations from same IP'
                };
            }

        } catch (error) {
            console.error('Error checking behavioral patterns:', error);
        }
    }

    /**
     * Check rate limits
     * @param {Object} signals - Signals to check
     * @param {Object} analysis - Analysis object to update
     */
    async checkRateLimits(signals, analysis) {
        try {
            // Check IP rate limit
            const [ipRate] = await this.pool.execute(`
                SELECT attempts FROM rate_limits 
                WHERE identifier = ? AND identifier_type = 'ip' 
                AND action = 'registration' AND window_start > DATE_SUB(NOW(), INTERVAL 1 HOUR)
            `, [signals.ip_address]);

            if (ipRate.length > 0 && ipRate[0].attempts > 5) {
                analysis.risk_score += this.weights.IP_RATE_LIMIT;
                analysis.signal_breakdown.ip_rate_limit = {
                    score: this.weights.IP_RATE_LIMIT,
                    attempts: ipRate[0].attempts,
                    reason: 'IP rate limit exceeded'
                };
            }

            // Check fingerprint rate limit
            const [fpRate] = await this.pool.execute(`
                SELECT attempts FROM rate_limits 
                WHERE identifier = ? AND identifier_type = 'fp_hash' 
                AND action = 'registration' AND window_start > DATE_SUB(NOW(), INTERVAL 1 HOUR)
            `, [signals.fp_hash]);

            if (fpRate.length > 0 && fpRate[0].attempts > 3) {
                analysis.risk_score += this.weights.FP_RATE_LIMIT;
                analysis.signal_breakdown.fp_rate_limit = {
                    score: this.weights.FP_RATE_LIMIT,
                    attempts: fpRate[0].attempts,
                    reason: 'Fingerprint rate limit exceeded'
                };
            }

        } catch (error) {
            console.error('Error checking rate limits:', error);
        }
    }

    /**
     * Check email reputation
     * @param {Object} signals - Signals to check
     * @param {Object} analysis - Analysis object to update
     */
    async checkEmailReputation(signals, analysis) {
        try {
            // Check disposable email
            if (signals.disposable_email) {
                analysis.risk_score += this.weights.DISPOSABLE_EMAIL;
                analysis.signal_breakdown.disposable_email = {
                    score: this.weights.DISPOSABLE_EMAIL,
                    reason: 'Disposable email domain detected'
                };
            }

            // Check MX record
            if (signals.mx_record_exists === false) {
                analysis.risk_score += this.weights.NO_MX_RECORD;
                analysis.signal_breakdown.no_mx_record = {
                    score: this.weights.NO_MX_RECORD,
                    reason: 'No MX record found for email domain'
                };
            }

        } catch (error) {
            console.error('Error checking email reputation:', error);
        }
    }

    /**
     * Check IP reputation
     * @param {Object} signals - Signals to check
     * @param {Object} analysis - Analysis object to update
     */
    async checkIpReputation(signals, analysis) {
        try {
            if (signals.ip_reputation === 'tor') {
                analysis.risk_score += this.weights.TOR_IP;
                analysis.signal_breakdown.tor_ip = {
                    score: this.weights.TOR_IP,
                    reason: 'Tor exit node detected'
                };
            }

            if (signals.ip_reputation === 'vpn') {
                analysis.risk_score += this.weights.VPN_IP;
                analysis.signal_breakdown.vpn_ip = {
                    score: this.weights.VPN_IP,
                    reason: 'VPN IP detected'
                };
            }

            if (signals.ip_reputation === 'hosting') {
                analysis.risk_score += this.weights.HOSTING_IP;
                analysis.signal_breakdown.hosting_ip = {
                    score: this.weights.HOSTING_IP,
                    reason: 'Hosting provider IP detected'
                };
            }

        } catch (error) {
            console.error('Error checking IP reputation:', error);
        }
    }

    /**
     * Check name similarity with banned users
     * @param {Object} signals - Signals to check
     * @param {Object} analysis - Analysis object to update
     */
    async checkNameSimilarity(signals, analysis) {
        try {
            const [bannedNames] = await this.pool.execute(`
                SELECT signal_value FROM banned_signals 
                WHERE signal_type = 'name' AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            for (const bannedName of bannedNames) {
                const similarity = stringSimilarity.compareTwoStrings(
                    signals.normalized_name, 
                    bannedName.signal_value
                );

                if (similarity > 0.85) {
                    analysis.risk_score += this.weights.NAME_SIMILARITY;
                    analysis.signal_breakdown.name_similarity = {
                        score: this.weights.NAME_SIMILARITY,
                        similarity: similarity,
                        banned_name: bannedName.signal_value,
                        reason: 'Name similar to banned user'
                    };
                    break; // Only count the highest similarity
                }
            }

        } catch (error) {
            console.error('Error checking name similarity:', error);
        }
    }

    /**
     * Calculate final score and determine action
     * @param {Object} analysis - Analysis object to update
     */
    calculateFinalScore(analysis) {
        // Determine action based on risk score
        if (analysis.risk_score >= this.thresholds.IMMEDIATE_BLOCK) {
            analysis.action = 'block';
            analysis.confidence = 0.95;
            analysis.recommendations.push('Immediate block - high risk signals detected');
        } else if (analysis.risk_score >= this.thresholds.STRONG_CHALLENGE) {
            analysis.action = 'challenge_strong';
            analysis.confidence = 0.85;
            analysis.recommendations.push('Strong challenge required - OAuth or Proof-of-Work');
        } else if (analysis.risk_score >= this.thresholds.MEDIUM_CHALLENGE) {
            analysis.action = 'challenge_medium';
            analysis.confidence = 0.75;
            analysis.recommendations.push('Medium challenge - CAPTCHA and email verification');
        } else if (analysis.risk_score >= this.thresholds.LOW_RISK) {
            analysis.action = 'monitor';
            analysis.confidence = 0.65;
            analysis.recommendations.push('Monitor - low risk but worth watching');
        } else {
            analysis.action = 'allow';
            analysis.confidence = 0.5;
            analysis.recommendations.push('Allow - no significant risk signals');
        }
    }

    /**
     * Store analysis result
     * @param {Object} analysis - Analysis result to store
     */
    async storeAnalysisResult(analysis) {
        try {
            await this.pool.execute(`
                INSERT INTO evasion_attempts (
                    session_id, attempt_type, risk_score, action_taken,
                    signal_breakdown, created_at
                ) VALUES (?, 'registration', ?, ?, ?, NOW())
            `, [
                analysis.session_id,
                analysis.risk_score,
                analysis.action,
                JSON.stringify(analysis.signal_breakdown)
            ]);

        } catch (error) {
            console.error('Error storing analysis result:', error);
        }
    }

    /**
     * Update rate limits
     * @param {string} identifier - Identifier (IP, fingerprint, etc.)
     * @param {string} type - Type of identifier
     * @param {string} action - Action being rate limited
     */
    async updateRateLimit(identifier, type, action) {
        try {
            await this.pool.execute(`
                INSERT INTO rate_limits (identifier, identifier_type, action, attempts, window_start)
                VALUES (?, ?, ?, 1, NOW())
                ON DUPLICATE KEY UPDATE 
                attempts = attempts + 1,
                window_start = CASE 
                    WHEN window_start < DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN NOW()
                    ELSE window_start
                END
            `, [identifier, type, action]);

        } catch (error) {
            console.error('Error updating rate limit:', error);
        }
    }

    /**
     * Add signal to banned list
     * @param {string} signalType - Type of signal
     * @param {string} signalValue - Value of signal
     * @param {number} bannedBy - Admin user ID
     * @param {string} reason - Reason for banning
     * @param {string} severity - Severity level
     */
    async banSignal(signalType, signalValue, bannedBy, reason, severity = 'medium') {
        try {
            await this.pool.execute(`
                INSERT INTO banned_signals (signal_type, signal_value, banned_by, reason, severity)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                banned_by = VALUES(banned_by),
                reason = VALUES(reason),
                severity = VALUES(severity),
                created_at = NOW()
            `, [signalType, signalValue, bannedBy, reason, severity]);

            console.log(`🚫 Banned signal: ${signalType} = ${signalValue}`);

        } catch (error) {
            console.error('Error banning signal:', error);
        }
    }

    /**
     * Get evasion statistics
     * @param {number} days - Number of days to look back
     * @returns {Object} Statistics
     */
    async getEvasionStats(days = 7) {
        try {
            const [stats] = await this.pool.execute(`
                SELECT 
                    action_taken,
                    COUNT(*) as count,
                    AVG(risk_score) as avg_risk_score
                FROM evasion_attempts 
                WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY action_taken
            `, [days]);

            return stats;

        } catch (error) {
            console.error('Error getting evasion stats:', error);
            return [];
        }
    }
}

module.exports = EvasionDetectionEngine;
