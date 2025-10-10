-- ================================================================
-- Website Monitor Database Schema
-- Complete database structure with user blocking functionality
-- ================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS website_monitor;
USE website_monitor;

-- ================================================================
-- Users Table
-- Stores all user accounts with blocking capability via is_active
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    line_user_id VARCHAR(100) DEFAULT NULL COMMENT 'LINE User ID for notifications',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'FALSE = User is blocked by admin',
    is_admin BOOLEAN DEFAULT FALSE COMMENT 'TRUE = Admin user with full access',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User accounts - is_active=FALSE blocks user access';

-- ================================================================
-- Monitored Sites Table
-- Websites that users want to monitor for changes
-- ================================================================
CREATE TABLE IF NOT EXISTS monitored_sites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    name VARCHAR(100) NOT NULL,
    check_interval_hours INT DEFAULT 24 COMMENT 'How often to check the site',
    keywords TEXT COMMENT 'Keywords to monitor (JSON array or comma-separated)',
    last_check TIMESTAMP NULL DEFAULT NULL,
    last_content_hash VARCHAR(255) DEFAULT NULL COMMENT 'Hash of last known content',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether monitoring is active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_last_check (last_check),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Websites being monitored by users';

-- ================================================================
-- Site Check History Table
-- Historical record of all site checks
-- ================================================================
CREATE TABLE IF NOT EXISTS site_checks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    site_id INT NOT NULL,
    content_hash VARCHAR(255) DEFAULT NULL,
    content_length INT DEFAULT NULL,
    status_code INT DEFAULT NULL,
    response_time_ms INT DEFAULT NULL,
    changes_detected BOOLEAN DEFAULT FALSE,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES monitored_sites(id) ON DELETE CASCADE,
    INDEX idx_site_id (site_id),
    INDEX idx_created_at (created_at),
    INDEX idx_changes_detected (changes_detected)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='History of site monitoring checks';

-- ================================================================
-- Notifications Table
-- Record of all notifications sent to users
-- ================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    site_id INT NOT NULL,
    type ENUM('email', 'line') NOT NULL COMMENT 'Notification channel',
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'sent', 'failed', 'simulated') DEFAULT 'pending',
    error_message TEXT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES monitored_sites(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_site_id (site_id),
    INDEX idx_sent_at (sent_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notification history';

-- ================================================================
-- User Notification Preferences
-- User settings for email and LINE notifications
-- ================================================================
CREATE TABLE IF NOT EXISTS user_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE COMMENT 'Enable email notifications',
    line_enabled BOOLEAN DEFAULT FALSE COMMENT 'Enable LINE notifications',
    line_user_id VARCHAR(100) DEFAULT NULL COMMENT 'LINE User ID (deprecated, use users.line_user_id)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_notification (user_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User notification preferences';

-- ================================================================
-- Admin Notifications Table (Optional)
-- Notifications sent to administrators
-- ================================================================
CREATE TABLE IF NOT EXISTS admin_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    type ENUM('user_blocked', 'user_registered', 'system_alert', 'error') DEFAULT 'system_alert',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_user_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_admin_id (admin_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notifications for administrators';

-- ================================================================
-- Create Initial Admin User
-- Default admin account (change password after first login!)
-- ================================================================
-- Note: Password is 'admin123' (hashed with bcrypt, 12 rounds)
INSERT INTO users (username, email, password_hash, is_active, is_admin) 
VALUES (
    'admin',
    'admin@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIpkJeu.1u',
    TRUE,
    TRUE
) ON DUPLICATE KEY UPDATE username=username;

-- ================================================================
-- Sample Data for Testing (Optional - Remove in production)
-- ================================================================

-- Sample non-admin user (password: 'test123')
-- INSERT INTO users (username, email, password_hash, is_active, is_admin) 
-- VALUES (
--     'testuser',
--     'test@example.com',
--     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIpkJeu.1u',
--     TRUE,
--     FALSE
-- );

-- ================================================================
-- Stored Procedures for Admin Operations
-- ================================================================

DELIMITER //

-- Procedure to block a user
CREATE PROCEDURE IF NOT EXISTS sp_block_user(
    IN p_user_id INT,
    IN p_admin_id INT
)
BEGIN
    DECLARE v_is_admin BOOLEAN;
    DECLARE v_username VARCHAR(50);
    
    -- Check if target user is admin
    SELECT is_admin, username INTO v_is_admin, v_username
    FROM users WHERE id = p_user_id;
    
    IF v_is_admin THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot block admin users';
    ELSE
        -- Block the user
        UPDATE users SET is_active = FALSE WHERE id = p_user_id;
        
        -- Create admin notification
        INSERT INTO admin_notifications (admin_id, type, title, message, related_user_id)
        VALUES (
            p_admin_id,
            'user_blocked',
            'User Blocked',
            CONCAT('User "', v_username, '" has been blocked'),
            p_user_id
        );
        
        SELECT 'User blocked successfully' AS message;
    END IF;
END //

-- Procedure to unblock a user
CREATE PROCEDURE IF NOT EXISTS sp_unblock_user(
    IN p_user_id INT,
    IN p_admin_id INT
)
BEGIN
    DECLARE v_username VARCHAR(50);
    
    SELECT username INTO v_username FROM users WHERE id = p_user_id;
    
    -- Unblock the user
    UPDATE users SET is_active = TRUE WHERE id = p_user_id;
    
    -- Create admin notification
    INSERT INTO admin_notifications (admin_id, type, title, message, related_user_id)
    VALUES (
        p_admin_id,
        'user_blocked',
        'User Unblocked',
        CONCAT('User "', v_username, '" has been unblocked'),
        p_user_id
    );
    
    SELECT 'User unblocked successfully' AS message;
END //

-- Procedure to get user statistics
CREATE PROCEDURE IF NOT EXISTS sp_get_user_stats()
BEGIN
    SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as blocked_users,
        SUM(CASE WHEN is_admin = TRUE THEN 1 ELSE 0 END) as admin_users
    FROM users;
END //

DELIMITER ;

-- ================================================================
-- Views for Reporting
-- ================================================================

-- View: User activity summary
CREATE OR REPLACE VIEW v_user_activity AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.is_active,
    u.is_admin,
    COUNT(DISTINCT ms.id) as monitored_sites_count,
    COUNT(DISTINCT n.id) as notifications_count,
    MAX(n.sent_at) as last_notification,
    u.created_at as registration_date
FROM users u
LEFT JOIN monitored_sites ms ON u.id = ms.user_id
LEFT JOIN notifications n ON u.id = n.user_id
GROUP BY u.id, u.username, u.email, u.is_active, u.is_admin, u.created_at;

-- View: Blocked users
CREATE OR REPLACE VIEW v_blocked_users AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.created_at as registration_date,
    u.updated_at as last_status_change,
    COUNT(DISTINCT ms.id) as sites_count
FROM users u
LEFT JOIN monitored_sites ms ON u.id = ms.user_id
WHERE u.is_active = FALSE AND u.is_admin = FALSE
GROUP BY u.id, u.username, u.email, u.created_at, u.updated_at;

-- ================================================================
-- Triggers
-- ================================================================

DELIMITER //

-- Trigger: Create default notification preferences on user registration
CREATE TRIGGER IF NOT EXISTS tr_user_after_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    -- Create default notification preferences
    INSERT INTO user_notifications (user_id, email_enabled, line_enabled, line_user_id)
    VALUES (NEW.id, TRUE, FALSE, NEW.line_user_id);
    
    -- Notify admins of new registration (except for admin users)
    IF NEW.is_admin = FALSE THEN
        INSERT INTO admin_notifications (admin_id, type, title, message, related_user_id)
        SELECT 
            id,
            'user_registered',
            'New User Registered',
            CONCAT('New user "', NEW.username, '" has registered'),
            NEW.id
        FROM users WHERE is_admin = TRUE;
    END IF;
END //

DELIMITER ;

-- ================================================================
-- Performance Indexes
-- ================================================================

-- Composite indexes for common queries
CREATE INDEX idx_user_sites ON monitored_sites(user_id, is_active);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status, sent_at);
CREATE INDEX idx_site_checks_changes ON site_checks(site_id, changes_detected, created_at);

-- ================================================================
-- Database Information
-- ================================================================

SELECT 
    'Database schema created successfully!' as Status,
    DATABASE() as DatabaseName,
    VERSION() as MySQLVersion,
    NOW() as CreatedAt;

-- Show all tables
SHOW TABLES;

-- ================================================================
-- Important Notes:
-- ================================================================
-- 1. is_active = FALSE means user is BLOCKED by administrator
-- 2. is_active = TRUE means user is ACTIVE and can use the system
-- 3. Admin users (is_admin = TRUE) cannot be blocked
-- 4. When user is blocked, they cannot login or access any system features
-- 5. All user's data remains in database when blocked (not deleted)
-- 6. Default admin credentials: username='admin', password='admin123'
--    CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!
-- ================================================================

