const crypto = require('crypto');
const dns = require('dns').promises;
const mysql = require('mysql2/promise');

/**
 * Evasion Signal Collector
 * Collects and normalizes signals during user registration to detect evasion attempts
 */
class EvasionSignalCollector {
    constructor(dbConfig) {
        this.dbConfig = dbConfig;
        this.pool = mysql.createPool(dbConfig);
        this.serverSecret = process.env.EVASION_SECRET || 'default-secret-change-in-production';
    }

    /**
     * Collect all signals during registration
     * @param {Object} registrationData - Registration form data
     * @param {Object} clientInfo - Client information (IP, User-Agent, etc.)
     * @param {string} sessionId - Session identifier
     * @returns {Object} Collected and normalized signals
     */
    async collectSignals(registrationData, clientInfo, sessionId) {
        try {
            console.log(`🔍 Collecting evasion signals for session: ${sessionId}`);

            const signals = {
                session_id: sessionId,
                normalized_email: this.normalizeEmail(registrationData.email),
                email_domain: this.extractDomain(registrationData.email),
                normalized_name: this.normalizeName(registrationData.name),
                ip_address: clientInfo.ip,
                ip_subnet: this.calculateSubnet(clientInfo.ip),
                fp_hash: await this.generateFingerprintHash(clientInfo),
                user_agent: clientInfo.userAgent,
                screen_resolution: clientInfo.screenResolution,
                timezone: clientInfo.timezone,
                language: clientInfo.language,
                form_completion_time: clientInfo.formCompletionTime,
                created_at: new Date()
            };

            // Perform DNS and reputation checks
            await this.performDnsChecks(signals);
            await this.checkDisposableEmail(signals);
            await this.checkIpReputation(signals);

            // Store signals in database
            await this.storeSignals(signals);

            console.log(`✅ Collected ${Object.keys(signals).length} signals for session ${sessionId}`);
            return signals;

        } catch (error) {
            console.error('❌ Error collecting evasion signals:', error);
            throw error;
        }
    }

    /**
     * Normalize email address for comparison
     * @param {string} email - Raw email address
     * @returns {string} Normalized email
     */
    normalizeEmail(email) {
        if (!email) return '';
        
        let normalized = email.trim().toLowerCase();
        
        // Remove dots from Gmail addresses (optional)
        if (normalized.includes('@gmail.com')) {
            const [local, domain] = normalized.split('@');
            normalized = local.replace(/\./g, '') + '@' + domain;
        }
        
        // Remove + tags (e.g., user+tag@gmail.com -> user@gmail.com)
        const [local, domain] = normalized.split('@');
        const cleanLocal = local.split('+')[0];
        
        return `${cleanLocal}@${domain}`;
    }

    /**
     * Normalize name for comparison
     * @param {string} name - Raw name
     * @returns {string} Normalized name
     */
    normalizeName(name) {
        if (!name) return '';
        
        return name
            .trim()
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    /**
     * Extract domain from email
     * @param {string} email - Email address
     * @returns {string} Domain part
     */
    extractDomain(email) {
        if (!email || !email.includes('@')) return '';
        return email.split('@')[1].toLowerCase();
    }

    /**
     * Calculate IP subnet
     * @param {string} ip - IP address
     * @returns {string} Subnet (e.g., 192.168.1.0/24)
     */
    calculateSubnet(ip) {
        if (!ip) return '';
        
        // IPv4 /24 subnet
        if (ip.includes('.')) {
            const parts = ip.split('.');
            return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
        }
        
        // IPv6 /64 subnet
        if (ip.includes(':')) {
            const parts = ip.split(':');
            return `${parts.slice(0, 4).join(':')}::/64`;
        }
        
        return ip;
    }

    /**
     * Generate fingerprint hash from client information
     * @param {Object} clientInfo - Client information
     * @returns {string} Fingerprint hash
     */
    async generateFingerprintHash(clientInfo) {
        const fingerprintData = {
            userAgent: clientInfo.userAgent || '',
            screenResolution: clientInfo.screenResolution || '',
            timezone: clientInfo.timezone || '',
            language: clientInfo.language || '',
            platform: clientInfo.platform || '',
            cookieEnabled: clientInfo.cookieEnabled || false,
            doNotTrack: clientInfo.doNotTrack || false
        };

        const fingerprintString = JSON.stringify(fingerprintData);
        return crypto.createHmac('sha256', this.serverSecret).update(fingerprintString).digest('hex');
    }

    /**
     * Perform DNS checks (MX, SPF)
     * @param {Object} signals - Signals object to update
     */
    async performDnsChecks(signals) {
        try {
            const domain = signals.email_domain;
            
            // Check MX record
            try {
                const mxRecords = await dns.resolveMx(domain);
                signals.mx_record_exists = mxRecords && mxRecords.length > 0;
            } catch (error) {
                signals.mx_record_exists = false;
            }

            // Check SPF record (simplified)
            try {
                const txtRecords = await dns.resolveTxt(domain);
                signals.spf_record_exists = txtRecords.some(record => 
                    record.some(txt => txt.includes('v=spf1'))
                );
            } catch (error) {
                signals.spf_record_exists = false;
            }

        } catch (error) {
            console.error('Error performing DNS checks:', error);
            signals.mx_record_exists = false;
            signals.spf_record_exists = false;
        }
    }

    /**
     * Check if email domain is disposable
     * @param {Object} signals - Signals object to update
     */
    async checkDisposableEmail(signals) {
        try {
            const [domains] = await this.pool.execute(`
                SELECT domain FROM disposable_email_domains 
                WHERE domain = ?
            `, [signals.email_domain]);

            signals.disposable_email = domains.length > 0;

        } catch (error) {
            console.error('Error checking disposable email:', error);
            signals.disposable_email = false;
        }
    }

    /**
     * Check IP reputation
     * @param {Object} signals - Signals object to update
     */
    async checkIpReputation(signals) {
        try {
            // Check IP reputation
            const [ipRep] = await this.pool.execute(`
                SELECT reputation_type, confidence 
                FROM ip_reputation 
                WHERE ip_address = ? OR ip_subnet = ?
                ORDER BY confidence DESC
                LIMIT 1
            `, [signals.ip_address, signals.ip_subnet]);

            if (ipRep.length > 0) {
                signals.ip_reputation = ipRep[0].reputation_type;
                signals.ip_confidence = ipRep[0].confidence;
            } else {
                signals.ip_reputation = 'unknown';
                signals.ip_confidence = 0.5;
            }

        } catch (error) {
            console.error('Error checking IP reputation:', error);
            signals.ip_reputation = 'unknown';
            signals.ip_confidence = 0.5;
        }
    }

    /**
     * Store signals in database
     * @param {Object} signals - Signals to store
     */
    async storeSignals(signals) {
        try {
            await this.pool.execute(`
                INSERT INTO evasion_signals (
                    session_id, normalized_email, email_domain, normalized_name,
                    ip_address, ip_subnet, fp_hash, user_agent, screen_resolution,
                    timezone, language, mx_record_exists, spf_record_exists,
                    disposable_email, form_completion_time, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                signals.session_id,
                signals.normalized_email,
                signals.email_domain,
                signals.normalized_name,
                signals.ip_address,
                signals.ip_subnet,
                signals.fp_hash,
                signals.user_agent,
                signals.screen_resolution,
                signals.timezone,
                signals.language,
                signals.mx_record_exists,
                signals.spf_record_exists,
                signals.disposable_email,
                signals.form_completion_time,
                signals.created_at
            ]);

        } catch (error) {
            console.error('Error storing signals:', error);
            throw error;
        }
    }

    /**
     * Get ASN information for IP (simplified)
     * @param {string} ip - IP address
     * @returns {string} ASN information
     */
    async getAsnInfo(ip) {
        // This would typically use a free ASN database
        // For now, return a placeholder
        return 'AS12345';
    }

    /**
     * Load disposable email domains from external sources
     */
    async loadDisposableDomains() {
        try {
            console.log('🔄 Loading disposable email domains...');
            
            // Common disposable email domains
            const commonDomains = [
                '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
                'mailinator.com', 'throwaway.email', 'temp-mail.org',
                'getnada.com', 'maildrop.cc', 'yopmail.com'
            ];

            for (const domain of commonDomains) {
                try {
                    await this.pool.execute(`
                        INSERT IGNORE INTO disposable_email_domains (domain, source, confidence)
                        VALUES (?, 'manual', 1.00)
                    `, [domain]);
                } catch (error) {
                    // Ignore duplicate entries
                }
            }

            console.log(`✅ Loaded ${commonDomains.length} disposable domains`);

        } catch (error) {
            console.error('Error loading disposable domains:', error);
        }
    }

    /**
     * Load IP reputation data
     */
    async loadIpReputation() {
        try {
            console.log('🔄 Loading IP reputation data...');
            
            // This would typically load from free sources like:
            // - Tor exit node lists
            // - VPN detection lists
            // - Hosting provider ASN lists
            
            // For now, add some example data
            const exampleData = [
                { ip: '127.0.0.1', type: 'clean', confidence: 1.0 },
                { ip: '192.168.1.0/24', type: 'clean', confidence: 0.9 }
            ];

            for (const data of exampleData) {
                try {
                    await this.pool.execute(`
                        INSERT IGNORE INTO ip_reputation (ip_address, ip_subnet, reputation_type, confidence, source)
                        VALUES (?, ?, ?, ?, 'manual')
                    `, [data.ip, data.ip, data.type, data.confidence]);
                } catch (error) {
                    // Ignore duplicate entries
                }
            }

            console.log(`✅ Loaded IP reputation data`);

        } catch (error) {
            console.error('Error loading IP reputation:', error);
        }
    }

    /**
     * Clean up old signals (privacy compliance)
     * @param {number} daysOld - Days old to clean up
     */
    async cleanupOldSignals(daysOld = 30) {
        try {
            const [result] = await this.pool.execute(`
                DELETE FROM evasion_signals 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [daysOld]);

            console.log(`🧹 Cleaned up ${result.affectedRows} old signals`);

        } catch (error) {
            console.error('Error cleaning up old signals:', error);
        }
    }
}

module.exports = EvasionSignalCollector;
