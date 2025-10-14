-- IP Blocking System Database Schema
-- This schema adds IP-based blocking functionality for enhanced security

-- Create blocked IP addresses table
CREATE TABLE IF NOT EXISTS `blocked_ip_addresses` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `ip_address` varchar(45) NOT NULL,
    `ip_type` enum('single','range','subnet') DEFAULT 'single',
    `subnet_mask` varchar(45) DEFAULT NULL,
    `block_reason` varchar(500) NOT NULL,
    `blocked_by` int(11) NOT NULL,
    `blocked_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `expires_at` timestamp NULL DEFAULT NULL,
    `is_active` tinyint(1) DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_ip_address` (`ip_address`),
    KEY `idx_blocked_ip_addresses_ip` (`ip_address`),
    KEY `idx_blocked_ip_addresses_type` (`ip_type`),
    KEY `idx_blocked_ip_addresses_active` (`is_active`),
    KEY `idx_blocked_ip_addresses_expires` (`expires_at`),
    KEY `idx_blocked_ip_addresses_blocked_by` (`blocked_by`),
    CONSTRAINT `blocked_ip_addresses_ibfk_1` FOREIGN KEY (`blocked_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create IP access logs table
CREATE TABLE IF NOT EXISTS `ip_access_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `ip_address` varchar(45) NOT NULL,
    `user_id` int(11) DEFAULT NULL,
    `action` enum('registration','login','blocked_registration','blocked_login') NOT NULL,
    `user_agent` text DEFAULT NULL,
    `country` varchar(100) DEFAULT NULL,
    `city` varchar(100) DEFAULT NULL,
    `isp` varchar(200) DEFAULT NULL,
    `is_blocked` tinyint(1) DEFAULT 0,
    `block_reason` varchar(500) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `idx_ip_access_logs_ip` (`ip_address`),
    KEY `idx_ip_access_logs_user_id` (`user_id`),
    KEY `idx_ip_access_logs_action` (`action`),
    KEY `idx_ip_access_logs_is_blocked` (`is_blocked`),
    KEY `idx_ip_access_logs_created_at` (`created_at`),
    CONSTRAINT `ip_access_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create IP reputation table
CREATE TABLE IF NOT EXISTS `ip_reputation` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `ip_address` varchar(45) NOT NULL,
    `reputation_score` int(11) DEFAULT 0,
    `risk_level` enum('low','medium','high','critical') DEFAULT 'low',
    `is_tor` tinyint(1) DEFAULT 0,
    `is_vpn` tinyint(1) DEFAULT 0,
    `is_proxy` tinyint(1) DEFAULT 0,
    `is_hosting` tinyint(1) DEFAULT 0,
    `country` varchar(100) DEFAULT NULL,
    `isp` varchar(200) DEFAULT NULL,
    `last_seen` timestamp NOT NULL DEFAULT current_timestamp(),
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_ip_reputation` (`ip_address`),
    KEY `idx_ip_reputation_score` (`reputation_score`),
    KEY `idx_ip_reputation_risk` (`risk_level`),
    KEY `idx_ip_reputation_tor` (`is_tor`),
    KEY `idx_ip_reputation_vpn` (`is_vpn`),
    KEY `idx_ip_reputation_proxy` (`is_proxy`),
    KEY `idx_ip_reputation_hosting` (`is_hosting`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create IP blocking rules table
CREATE TABLE IF NOT EXISTS `ip_blocking_rules` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `rule_name` varchar(100) NOT NULL,
    `rule_type` enum('country','isp','risk_level','tor','vpn','proxy','hosting') NOT NULL,
    `rule_value` varchar(200) NOT NULL,
    `action` enum('block','allow','challenge') NOT NULL,
    `priority` int(11) DEFAULT 100,
    `is_active` tinyint(1) DEFAULT 1,
    `created_by` int(11) NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `idx_ip_blocking_rules_type` (`rule_type`),
    KEY `idx_ip_blocking_rules_action` (`action`),
    KEY `idx_ip_blocking_rules_priority` (`priority`),
    KEY `idx_ip_blocking_rules_active` (`is_active`),
    CONSTRAINT `ip_blocking_rules_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user IP history table
CREATE TABLE IF NOT EXISTS `user_ip_history` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `ip_address` varchar(45) NOT NULL,
    `action` enum('registration','login','logout') NOT NULL,
    `user_agent` text DEFAULT NULL,
    `country` varchar(100) DEFAULT NULL,
    `city` varchar(100) DEFAULT NULL,
    `isp` varchar(200) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `idx_user_ip_history_user_id` (`user_id`),
    KEY `idx_user_ip_history_ip` (`ip_address`),
    KEY `idx_user_ip_history_action` (`action`),
    KEY `idx_user_ip_history_created_at` (`created_at`),
    CONSTRAINT `user_ip_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default IP blocking rules
INSERT INTO `ip_blocking_rules` (`rule_name`, `rule_type`, `rule_value`, `action`, `priority`, `created_by`) VALUES
('Block Tor Exit Nodes', 'tor', 'true', 'block', 1, 1),
('Block VPN Services', 'vpn', 'true', 'block', 2, 1),
('Block Proxy Services', 'proxy', 'true', 'block', 3, 1),
('Block High Risk IPs', 'risk_level', 'high', 'block', 4, 1),
('Block Critical Risk IPs', 'risk_level', 'critical', 'block', 5, 1),
('Block Hosting Providers', 'hosting', 'true', 'block', 6, 1);

-- Create indexes for better performance
CREATE INDEX `idx_blocked_ip_addresses_ip_type_active` ON `blocked_ip_addresses` (`ip_address`, `ip_type`, `is_active`);
CREATE INDEX `idx_ip_access_logs_ip_action_created` ON `ip_access_logs` (`ip_address`, `action`, `created_at`);
CREATE INDEX `idx_user_ip_history_user_ip_created` ON `user_ip_history` (`user_id`, `ip_address`, `created_at`);

-- Create view for IP blocking dashboard
CREATE OR REPLACE VIEW `ip_blocking_dashboard` AS
SELECT 
    bip.ip_address,
    bip.ip_type,
    bip.block_reason,
    u.username as blocked_by_user,
    bip.blocked_at,
    bip.expires_at,
    bip.is_active,
    COUNT(ial.id) as access_attempts,
    COUNT(CASE WHEN ial.is_blocked = 1 THEN 1 END) as blocked_attempts,
    MAX(ial.created_at) as last_attempt
FROM blocked_ip_addresses bip
LEFT JOIN users u ON bip.blocked_by = u.id
LEFT JOIN ip_access_logs ial ON bip.ip_address = ial.ip_address
WHERE bip.is_active = 1
GROUP BY bip.id, bip.ip_address, bip.ip_type, bip.block_reason, u.username, bip.blocked_at, bip.expires_at, bip.is_active;

-- Create view for IP access statistics
CREATE OR REPLACE VIEW `ip_access_statistics` AS
SELECT 
    DATE(ial.created_at) as date,
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN ial.action = 'registration' THEN 1 END) as registration_attempts,
    COUNT(CASE WHEN ial.action = 'login' THEN 1 END) as login_attempts,
    COUNT(CASE WHEN ial.is_blocked = 1 THEN 1 END) as blocked_attempts,
    COUNT(DISTINCT ial.ip_address) as unique_ips,
    ROUND((COUNT(CASE WHEN ial.is_blocked = 1 THEN 1 END) / COUNT(*)) * 100, 2) as block_rate
FROM ip_access_logs ial
GROUP BY DATE(ial.created_at)
ORDER BY date DESC;

-- Create stored procedure for checking IP blocking
DELIMITER //
CREATE PROCEDURE CheckIPBlocking(IN ip_address VARCHAR(45))
BEGIN
    DECLARE is_blocked TINYINT(1) DEFAULT 0;
    DECLARE block_reason VARCHAR(500) DEFAULT NULL;
    DECLARE expires_at TIMESTAMP DEFAULT NULL;
    
    -- Check if IP is directly blocked
    SELECT 
        CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END,
        MAX(bip.block_reason),
        MAX(bip.expires_at)
    INTO is_blocked, block_reason, expires_at
    FROM blocked_ip_addresses bip
    WHERE bip.ip_address = ip_address 
    AND bip.is_active = 1
    AND (bip.expires_at IS NULL OR bip.expires_at > NOW());
    
    -- Check if IP is in a blocked range (for future implementation)
    -- This would require additional logic for IP range checking
    
    SELECT 
        is_blocked as is_blocked,
        block_reason as block_reason,
        expires_at as expires_at;
END //
DELIMITER ;

-- Create stored procedure for logging IP access
DELIMITER //
CREATE PROCEDURE LogIPAccess(
    IN ip_address VARCHAR(45),
    IN user_id INT,
    IN action ENUM('registration','login','blocked_registration','blocked_login'),
    IN user_agent TEXT,
    IN country VARCHAR(100),
    IN city VARCHAR(100),
    IN isp VARCHAR(200),
    IN is_blocked TINYINT(1),
    IN block_reason VARCHAR(500)
)
BEGIN
    INSERT INTO ip_access_logs (
        ip_address, user_id, action, user_agent, country, city, isp, is_blocked, block_reason
    ) VALUES (
        ip_address, user_id, action, user_agent, country, city, isp, is_blocked, block_reason
    );
    
    -- Also log to user IP history if user_id is provided
    IF user_id IS NOT NULL THEN
        INSERT INTO user_ip_history (
            user_id, ip_address, action, user_agent, country, city, isp
        ) VALUES (
            user_id, ip_address, action, user_agent, country, city, isp
        );
    END IF;
END //
DELIMITER ;

-- Create event to clean up expired IP blocks
CREATE EVENT IF NOT EXISTS cleanup_expired_ip_blocks
ON SCHEDULE EVERY 1 HOUR
DO
  UPDATE blocked_ip_addresses 
  SET is_active = 0 
  WHERE expires_at IS NOT NULL 
  AND expires_at < NOW() 
  AND is_active = 1;
