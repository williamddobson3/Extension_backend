const mysql = require('mysql2/promise');
const { pool } = require('../config/database');

/**
 * IP Blocking Service
 * Handles IP-based blocking for user registration and login
 * Provides enhanced security by blocking malicious IP addresses
 */
class IPBlockingService {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        };
    }

    /**
     * Extract IP address from request
     * @param {Object} req - Express request object
     * @returns {string} IP address
     */
    extractIPAddress(req) {
        // Check for forwarded IP (behind proxy/load balancer)
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            // X-Forwarded-For can contain multiple IPs, take the first one
            return forwarded.split(',')[0].trim();
        }

        // Check for real IP header
        const realIP = req.headers['x-real-ip'];
        if (realIP) {
            return realIP.trim();
        }

        // Check for client IP header
        const clientIP = req.headers['x-client-ip'];
        if (clientIP) {
            return clientIP.trim();
        }

        // Fallback to connection remote address
        return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    }

    /**
     * Check if IP address is blocked
     * @param {string} ipAddress - IP address to check
     * @returns {Object} Blocking result
     */
    async checkIPBlocking(ipAddress) {
        try {
            console.log(`🔍 Checking IP blocking for: ${ipAddress}`);

            // Check direct IP blocking
            const [blockedIPs] = await pool.execute(`
                SELECT id, ip_address, block_reason, expires_at, blocked_by
                FROM blocked_ip_addresses 
                WHERE ip_address = ? 
                AND is_active = 1
                AND (expires_at IS NULL OR expires_at > NOW())
            `, [ipAddress]);

            if (blockedIPs.length > 0) {
                const blockedIP = blockedIPs[0];
                console.log(`🚫 IP ${ipAddress} is blocked: ${blockedIP.block_reason}`);
                
                return {
                    isBlocked: true,
                    reason: blockedIP.block_reason,
                    blockedBy: blockedIP.blocked_by,
                    expiresAt: blockedIP.expires_at,
                    blockType: 'direct'
                };
            }

            // Check IP reputation
            const reputationResult = await this.checkIPReputation(ipAddress);
            if (reputationResult.isBlocked) {
                console.log(`🚫 IP ${ipAddress} blocked by reputation: ${reputationResult.reason}`);
                
                return {
                    isBlocked: true,
                    reason: reputationResult.reason,
                    blockedBy: null,
                    expiresAt: null,
                    blockType: 'reputation'
                };
            }

            // Check blocking rules
            const rulesResult = await this.checkBlockingRules(ipAddress);
            if (rulesResult.isBlocked) {
                console.log(`🚫 IP ${ipAddress} blocked by rule: ${rulesResult.reason}`);
                
                return {
                    isBlocked: true,
                    reason: rulesResult.reason,
                    blockedBy: null,
                    expiresAt: null,
                    blockType: 'rule'
                };
            }

            console.log(`✅ IP ${ipAddress} is not blocked`);
            return {
                isBlocked: false,
                reason: null,
                blockedBy: null,
                expiresAt: null,
                blockType: null
            };

        } catch (error) {
            console.error(`❌ Error checking IP blocking for ${ipAddress}:`, error);
            // In case of error, allow access but log the error
            return {
                isBlocked: false,
                reason: null,
                blockedBy: null,
                expiresAt: null,
                blockType: null,
                error: error.message
            };
        }
    }

    /**
     * Check IP reputation
     * @param {string} ipAddress - IP address to check
     * @returns {Object} Reputation check result
     */
    async checkIPReputation(ipAddress) {
        try {
            const [reputation] = await pool.execute(`
                SELECT reputation_score, risk_level, is_tor, is_vpn, is_proxy, is_hosting
                FROM ip_reputation 
                WHERE ip_address = ?
            `, [ipAddress]);

            if (reputation.length === 0) {
                // No reputation data, allow by default
                return { isBlocked: false, reason: null };
            }

            const rep = reputation[0];

            // Check for high-risk indicators
            if (rep.risk_level === 'critical') {
                return {
                    isBlocked: true,
                    reason: `Critical risk IP address (score: ${rep.reputation_score})`
                };
            }

            if (rep.risk_level === 'high') {
                return {
                    isBlocked: true,
                    reason: `High risk IP address (score: ${rep.reputation_score})`
                };
            }

            if (rep.is_tor) {
                return {
                    isBlocked: true,
                    reason: 'Tor exit node detected'
                };
            }

            if (rep.is_vpn) {
                return {
                    isBlocked: true,
                    reason: 'VPN service detected'
                };
            }

            if (rep.is_proxy) {
                return {
                    isBlocked: true,
                    reason: 'Proxy service detected'
                };
            }

            if (rep.is_hosting) {
                return {
                    isBlocked: true,
                    reason: 'Hosting provider detected'
                };
            }

            return { isBlocked: false, reason: null };

        } catch (error) {
            console.error(`❌ Error checking IP reputation for ${ipAddress}:`, error);
            return { isBlocked: false, reason: null, error: error.message };
        }
    }

    /**
     * Check blocking rules
     * @param {string} ipAddress - IP address to check
     * @returns {Object} Rules check result
     */
    async checkBlockingRules(ipAddress) {
        try {
            // Get active blocking rules
            const [rules] = await pool.execute(`
                SELECT rule_name, rule_type, rule_value, action, priority
                FROM ip_blocking_rules 
                WHERE is_active = 1
                ORDER BY priority ASC
            `);

            for (const rule of rules) {
                const ruleResult = await this.evaluateRule(ipAddress, rule);
                if (ruleResult.isBlocked) {
                    return {
                        isBlocked: true,
                        reason: `Blocked by rule: ${rule.rule_name} (${rule.rule_type})`
                    };
                }
            }

            return { isBlocked: false, reason: null };

        } catch (error) {
            console.error(`❌ Error checking blocking rules for ${ipAddress}:`, error);
            return { isBlocked: false, reason: null, error: error.message };
        }
    }

    /**
     * Evaluate a specific blocking rule
     * @param {string} ipAddress - IP address to check
     * @param {Object} rule - Blocking rule
     * @returns {Object} Rule evaluation result
     */
    async evaluateRule(ipAddress, rule) {
        try {
            switch (rule.rule_type) {
                case 'tor':
                    if (rule.rule_value === 'true') {
                        const [reputation] = await pool.execute(`
                            SELECT is_tor FROM ip_reputation WHERE ip_address = ?
                        `, [ipAddress]);
                        
                        if (reputation.length > 0 && reputation[0].is_tor) {
                            return { isBlocked: true, reason: 'Tor exit node' };
                        }
                    }
                    break;

                case 'vpn':
                    if (rule.rule_value === 'true') {
                        const [reputation] = await pool.execute(`
                            SELECT is_vpn FROM ip_reputation WHERE ip_address = ?
                        `, [ipAddress]);
                        
                        if (reputation.length > 0 && reputation[0].is_vpn) {
                            return { isBlocked: true, reason: 'VPN service' };
                        }
                    }
                    break;

                case 'proxy':
                    if (rule.rule_value === 'true') {
                        const [reputation] = await pool.execute(`
                            SELECT is_proxy FROM ip_reputation WHERE ip_address = ?
                        `, [ipAddress]);
                        
                        if (reputation.length > 0 && reputation[0].is_proxy) {
                            return { isBlocked: true, reason: 'Proxy service' };
                        }
                    }
                    break;

                case 'hosting':
                    if (rule.rule_value === 'true') {
                        const [reputation] = await pool.execute(`
                            SELECT is_hosting FROM ip_reputation WHERE ip_address = ?
                        `, [ipAddress]);
                        
                        if (reputation.length > 0 && reputation[0].is_hosting) {
                            return { isBlocked: true, reason: 'Hosting provider' };
                        }
                    }
                    break;

                case 'risk_level':
                    const [reputation] = await pool.execute(`
                        SELECT risk_level FROM ip_reputation WHERE ip_address = ?
                    `, [ipAddress]);
                    
                    if (reputation.length > 0) {
                        const riskLevel = reputation[0].risk_level;
                        if (riskLevel === rule.rule_value || 
                            (rule.rule_value === 'high' && riskLevel === 'critical')) {
                            return { isBlocked: true, reason: `Risk level: ${riskLevel}` };
                        }
                    }
                    break;
            }

            return { isBlocked: false, reason: null };

        } catch (error) {
            console.error(`❌ Error evaluating rule ${rule.rule_name}:`, error);
            return { isBlocked: false, reason: null, error: error.message };
        }
    }

    /**
     * Log IP access attempt
     * @param {string} ipAddress - IP address
     * @param {number} userId - User ID (if available)
     * @param {string} action - Action type (registration, login, etc.)
     * @param {Object} req - Express request object
     * @param {boolean} isBlocked - Whether the attempt was blocked
     * @param {string} blockReason - Reason for blocking (if blocked)
     */
    async logIPAccess(ipAddress, userId, action, req, isBlocked = false, blockReason = null) {
        try {
            const userAgent = req.headers['user-agent'] || null;
            const country = null; // Could be populated with GeoIP service
            const city = null;    // Could be populated with GeoIP service
            const isp = null;    // Could be populated with IP lookup service

            await pool.execute(`
                INSERT INTO ip_access_logs 
                (ip_address, user_id, action, user_agent, country, city, isp, is_blocked, block_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [ipAddress, userId, action, userAgent, country, city, isp, isBlocked, blockReason]);

            console.log(`📝 IP access logged: ${ipAddress} - ${action} - ${isBlocked ? 'BLOCKED' : 'ALLOWED'}`);

        } catch (error) {
            console.error(`❌ Error logging IP access:`, error);
        }
    }

    /**
     * Block an IP address
     * @param {string} ipAddress - IP address to block
     * @param {string} reason - Reason for blocking
     * @param {number} blockedBy - Admin user ID who blocked the IP
     * @param {Date} expiresAt - Expiration date (optional)
     * @returns {Object} Blocking result
     */
    async blockIPAddress(ipAddress, reason, blockedBy, expiresAt = null) {
        try {
            console.log(`🚫 Blocking IP address: ${ipAddress}`);

            const [result] = await pool.execute(`
                INSERT INTO blocked_ip_addresses 
                (ip_address, block_reason, blocked_by, expires_at)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                block_reason = VALUES(block_reason),
                blocked_by = VALUES(blocked_by),
                expires_at = VALUES(expires_at),
                is_active = 1,
                updated_at = CURRENT_TIMESTAMP
            `, [ipAddress, reason, blockedBy, expiresAt]);

            console.log(`✅ IP address ${ipAddress} blocked successfully`);
            return {
                success: true,
                message: `IP address ${ipAddress} blocked successfully`,
                blockId: result.insertId
            };

        } catch (error) {
            console.error(`❌ Error blocking IP address ${ipAddress}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Unblock an IP address
     * @param {string} ipAddress - IP address to unblock
     * @param {number} unblockedBy - Admin user ID who unblocked the IP
     * @returns {Object} Unblocking result
     */
    async unblockIPAddress(ipAddress, unblockedBy) {
        try {
            console.log(`🔓 Unblocking IP address: ${ipAddress}`);

            const [result] = await pool.execute(`
                UPDATE blocked_ip_addresses 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE ip_address = ?
            `, [ipAddress]);

            if (result.affectedRows > 0) {
                console.log(`✅ IP address ${ipAddress} unblocked successfully`);
                return {
                    success: true,
                    message: `IP address ${ipAddress} unblocked successfully`
                };
            } else {
                return {
                    success: false,
                    message: `IP address ${ipAddress} not found or already unblocked`
                };
            }

        } catch (error) {
            console.error(`❌ Error unblocking IP address ${ipAddress}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get IP blocking statistics
     * @param {number} days - Number of days to look back
     * @returns {Object} Statistics
     */
    async getIPBlockingStatistics(days = 7) {
        try {
            const [stats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_attempts,
                    COUNT(CASE WHEN is_blocked = 1 THEN 1 END) as blocked_attempts,
                    COUNT(CASE WHEN action = 'registration' THEN 1 END) as registration_attempts,
                    COUNT(CASE WHEN action = 'login' THEN 1 END) as login_attempts,
                    COUNT(CASE WHEN action = 'blocked_registration' THEN 1 END) as blocked_registrations,
                    COUNT(CASE WHEN action = 'blocked_login' THEN 1 END) as blocked_logins,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    ROUND((COUNT(CASE WHEN is_blocked = 1 THEN 1 END) / COUNT(*)) * 100, 2) as block_rate
                FROM ip_access_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [days]);

            return stats[0];

        } catch (error) {
            console.error('❌ Error getting IP blocking statistics:', error);
            return null;
        }
    }

    /**
     * Get blocked IP addresses
     * @param {number} limit - Number of results to return
     * @param {number} offset - Offset for pagination
     * @returns {Object} Blocked IPs list
     */
    async getBlockedIPs(limit = 50, offset = 0) {
        try {
            const [blockedIPs] = await pool.execute(`
                SELECT 
                    bip.id,
                    bip.ip_address,
                    bip.ip_type,
                    bip.block_reason,
                    bip.blocked_at,
                    bip.expires_at,
                    bip.is_active,
                    u.username as blocked_by_user,
                    COUNT(ial.id) as access_attempts,
                    COUNT(CASE WHEN ial.is_blocked = 1 THEN 1 END) as blocked_attempts
                FROM blocked_ip_addresses bip
                LEFT JOIN users u ON bip.blocked_by = u.id
                LEFT JOIN ip_access_logs ial ON bip.ip_address = ial.ip_address
                WHERE bip.is_active = 1
                GROUP BY bip.id, bip.ip_address, bip.ip_type, bip.block_reason, bip.blocked_at, bip.expires_at, bip.is_active, u.username
                ORDER BY bip.blocked_at DESC
                LIMIT ? OFFSET ?
            `, [limit, offset]);

            return blockedIPs;

        } catch (error) {
            console.error('❌ Error getting blocked IPs:', error);
            return [];
        }
    }
}

module.exports = new IPBlockingService();
