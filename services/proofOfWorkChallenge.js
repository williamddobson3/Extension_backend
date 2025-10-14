const crypto = require('crypto');
const mysql = require('mysql2/promise');

/**
 * Proof-of-Work Challenge System
 * Implements client-side computation challenges to deter automated attacks
 */
class ProofOfWorkChallenge {
    constructor(dbConfig) {
        this.dbConfig = dbConfig;
        this.pool = mysql.createPool(dbConfig);
    }

    /**
     * Generate a proof-of-work challenge
     * @param {string} sessionId - Session identifier
     * @param {number} difficulty - Difficulty level (1-10)
     * @param {string} challengeType - Type of challenge
     * @returns {Object} Challenge details
     */
    async generateChallenge(sessionId, difficulty = 3, challengeType = 'sha256') {
        try {
            console.log(`🔧 Generating PoW challenge for session: ${sessionId}`);

            // Generate random data
            const data = crypto.randomBytes(32).toString('hex');
            const timestamp = Date.now();
            const nonce = crypto.randomBytes(16).toString('hex');
            
            // Create target hash based on difficulty
            const targetPrefix = '0'.repeat(difficulty);
            const targetHash = this.calculateTargetHash(data, timestamp, difficulty);
            
            // Store challenge in database
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            
            await this.pool.execute(`
                INSERT INTO proof_of_work_challenges (
                    session_id, challenge_type, difficulty, target_hash, 
                    nonce, expires_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [sessionId, challengeType, difficulty, targetHash, nonce, expiresAt]);

            const challenge = {
                session_id: sessionId,
                data: data,
                timestamp: timestamp,
                nonce: nonce,
                difficulty: difficulty,
                target_prefix: targetPrefix,
                challenge_type: challengeType,
                expires_at: expiresAt.toISOString()
            };

            console.log(`✅ Generated PoW challenge with difficulty ${difficulty}`);
            return challenge;

        } catch (error) {
            console.error('❌ Error generating PoW challenge:', error);
            throw error;
        }
    }

    /**
     * Verify proof-of-work solution
     * @param {string} sessionId - Session identifier
     * @param {string} solution - Client-provided solution
     * @returns {Object} Verification result
     */
    async verifySolution(sessionId, solution) {
        try {
            console.log(`🔍 Verifying PoW solution for session: ${sessionId}`);

            // Get challenge from database
            const [challenges] = await this.pool.execute(`
                SELECT * FROM proof_of_work_challenges 
                WHERE session_id = ? AND completed = 0 
                AND expires_at > NOW()
                ORDER BY created_at DESC 
                LIMIT 1
            `, [sessionId]);

            if (challenges.length === 0) {
                return {
                    valid: false,
                    reason: 'No valid challenge found or expired'
                };
            }

            const challenge = challenges[0];

            // Verify solution
            const isValid = this.verifyProofOfWork(
                challenge.target_hash,
                solution,
                challenge.difficulty
            );

            if (isValid) {
                // Mark challenge as completed
                await this.pool.execute(`
                    UPDATE proof_of_work_challenges 
                    SET completed = 1, solution_hash = ?, attempts = attempts + 1
                    WHERE id = ?
                `, [solution, challenge.id]);

                console.log(`✅ PoW solution verified for session: ${sessionId}`);
                return {
                    valid: true,
                    difficulty: challenge.difficulty,
                    attempts: challenge.attempts + 1
                };
            } else {
                // Increment attempts
                await this.pool.execute(`
                    UPDATE proof_of_work_challenges 
                    SET attempts = attempts + 1
                    WHERE id = ?
                `, [challenge.id]);

                console.log(`❌ Invalid PoW solution for session: ${sessionId}`);
                return {
                    valid: false,
                    reason: 'Invalid solution',
                    attempts: challenge.attempts + 1
                };
            }

        } catch (error) {
            console.error('❌ Error verifying PoW solution:', error);
            return {
                valid: false,
                reason: 'Verification error'
            };
        }
    }

    /**
     * Calculate target hash for challenge
     * @param {string} data - Challenge data
     * @param {number} timestamp - Timestamp
     * @param {number} difficulty - Difficulty level
     * @returns {string} Target hash
     */
    calculateTargetHash(data, timestamp, difficulty) {
        const targetPrefix = '0'.repeat(difficulty);
        let nonce = 0;
        
        while (true) {
            const hash = crypto.createHash('sha256')
                .update(data + timestamp + nonce)
                .digest('hex');
            
            if (hash.startsWith(targetPrefix)) {
                return hash;
            }
            
            nonce++;
            
            // Prevent infinite loop
            if (nonce > 1000000) {
                throw new Error('Could not generate target hash');
            }
        }
    }

    /**
     * Verify proof-of-work solution
     * @param {string} targetHash - Target hash from challenge
     * @param {string} solution - Client solution
     * @param {number} difficulty - Difficulty level
     * @returns {boolean} Whether solution is valid
     */
    verifyProofOfWork(targetHash, solution, difficulty) {
        try {
            // Parse solution
            const solutionData = JSON.parse(solution);
            const { data, timestamp, nonce, hash } = solutionData;

            // Verify hash
            const calculatedHash = crypto.createHash('sha256')
                .update(data + timestamp + nonce)
                .digest('hex');

            if (calculatedHash !== hash) {
                return false;
            }

            // Verify difficulty
            const targetPrefix = '0'.repeat(difficulty);
            if (!hash.startsWith(targetPrefix)) {
                return false;
            }

            // Verify timestamp (within 10 minutes)
            const now = Date.now();
            const solutionTime = parseInt(timestamp);
            if (Math.abs(now - solutionTime) > 10 * 60 * 1000) {
                return false;
            }

            return true;

        } catch (error) {
            console.error('Error verifying PoW:', error);
            return false;
        }
    }

    /**
     * Get challenge difficulty based on risk score
     * @param {number} riskScore - Risk score
     * @returns {number} Difficulty level
     */
    getDifficultyForRiskScore(riskScore) {
        if (riskScore >= 150) {
            return 6; // Very high difficulty
        } else if (riskScore >= 100) {
            return 5; // High difficulty
        } else if (riskScore >= 60) {
            return 4; // Medium difficulty
        } else if (riskScore >= 30) {
            return 3; // Low difficulty
        } else {
            return 2; // Very low difficulty
        }
    }

    /**
     * Check if challenge is required for session
     * @param {string} sessionId - Session identifier
     * @returns {boolean} Whether challenge is required
     */
    async isChallengeRequired(sessionId) {
        try {
            const [challenges] = await this.pool.execute(`
                SELECT COUNT(*) as count FROM proof_of_work_challenges 
                WHERE session_id = ? AND completed = 0 
                AND expires_at > NOW()
            `, [sessionId]);

            return challenges[0].count > 0;

        } catch (error) {
            console.error('Error checking challenge requirement:', error);
            return false;
        }
    }

    /**
     * Get challenge status for session
     * @param {string} sessionId - Session identifier
     * @returns {Object} Challenge status
     */
    async getChallengeStatus(sessionId) {
        try {
            const [challenges] = await this.pool.execute(`
                SELECT * FROM proof_of_work_challenges 
                WHERE session_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [sessionId]);

            if (challenges.length === 0) {
                return {
                    has_challenge: false,
                    status: 'none'
                };
            }

            const challenge = challenges[0];
            const now = new Date();

            if (challenge.completed) {
                return {
                    has_challenge: true,
                    status: 'completed',
                    difficulty: challenge.difficulty,
                    attempts: challenge.attempts
                };
            } else if (challenge.expires_at < now) {
                return {
                    has_challenge: true,
                    status: 'expired',
                    difficulty: challenge.difficulty,
                    attempts: challenge.attempts
                };
            } else {
                return {
                    has_challenge: true,
                    status: 'pending',
                    difficulty: challenge.difficulty,
                    attempts: challenge.attempts,
                    expires_at: challenge.expires_at
                };
            }

        } catch (error) {
            console.error('Error getting challenge status:', error);
            return {
                has_challenge: false,
                status: 'error'
            };
        }
    }

    /**
     * Clean up expired challenges
     * @param {number} hoursOld - Hours old to clean up
     */
    async cleanupExpiredChallenges(hoursOld = 24) {
        try {
            const [result] = await this.pool.execute(`
                DELETE FROM proof_of_work_challenges 
                WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
            `, [hoursOld]);

            console.log(`🧹 Cleaned up ${result.affectedRows} expired PoW challenges`);

        } catch (error) {
            console.error('Error cleaning up expired challenges:', error);
        }
    }

    /**
     * Get challenge statistics
     * @param {number} days - Number of days to look back
     * @returns {Object} Statistics
     */
    async getChallengeStats(days = 7) {
        try {
            const [stats] = await this.pool.execute(`
                SELECT 
                    difficulty,
                    COUNT(*) as total_challenges,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_challenges,
                    AVG(attempts) as avg_attempts
                FROM proof_of_work_challenges 
                WHERE created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY difficulty
                ORDER BY difficulty
            `, [days]);

            return stats;

        } catch (error) {
            console.error('Error getting challenge stats:', error);
            return [];
        }
    }
}

module.exports = ProofOfWorkChallenge;
