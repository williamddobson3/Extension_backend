-- ================================================================
-- Migration Script: Add User Blocking Functionality
-- This script adds/ensures blocking capability to existing databases
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ================================================================

USE website_monitor;

-- ================================================================
-- Step 1: Ensure is_active column exists in users table
-- ================================================================

-- Check and add is_active column if it doesn't exist
SET @db_name = DATABASE();
SET @table_name = 'users';
SET @column_name = 'is_active';

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = @db_name 
  AND table_name = @table_name 
  AND column_name = @column_name;

SET @sql = IF(@col_exists = 0,
    CONCAT('ALTER TABLE ', @table_name, ' ADD COLUMN ', @column_name, ' BOOLEAN DEFAULT TRUE COMMENT "FALSE = User is blocked by admin" AFTER is_admin'),
    'SELECT "is_active column already exists" AS info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ================================================================
-- Step 2: Ensure index on is_active exists
-- ================================================================

SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists
FROM information_schema.statistics
WHERE table_schema = @db_name
  AND table_name = @table_name
  AND index_name = 'idx_is_active';

SET @sql = IF(@index_exists = 0,
    CONCAT('ALTER TABLE ', @table_name, ' ADD INDEX idx_is_active (is_active)'),
    'SELECT "idx_is_active index already exists" AS info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ================================================================
-- Step 3: Set all existing users to active (if not already set)
-- ================================================================

UPDATE users 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- ================================================================
-- Step 4: Create admin_notifications table if it doesn't exist
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Step 5: Create/Update stored procedures for blocking
-- ================================================================

DROP PROCEDURE IF EXISTS sp_block_user;
DROP PROCEDURE IF EXISTS sp_unblock_user;
DROP PROCEDURE IF EXISTS sp_get_blocked_users;

DELIMITER //

-- Procedure to block a user
CREATE PROCEDURE sp_block_user(
    IN p_user_id INT,
    IN p_admin_id INT
)
BEGIN
    DECLARE v_is_admin BOOLEAN;
    DECLARE v_username VARCHAR(50);
    DECLARE v_error VARCHAR(255);
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'User not found';
    END IF;
    
    -- Check if target user is admin
    SELECT is_admin, username INTO v_is_admin, v_username
    FROM users WHERE id = p_user_id;
    
    IF v_is_admin THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot block admin users';
    END IF;
    
    -- Check if user is already blocked
    IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = FALSE) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'User is already blocked';
    END IF;
    
    -- Block the user
    UPDATE users SET is_active = FALSE WHERE id = p_user_id;
    
    -- Create admin notification
    INSERT INTO admin_notifications (admin_id, type, title, message, related_user_id)
    VALUES (
        p_admin_id,
        'user_blocked',
        'User Blocked',
        CONCAT('User "', v_username, '" (ID: ', p_user_id, ') has been blocked'),
        p_user_id
    );
    
    SELECT 
        TRUE as success,
        'User blocked successfully' AS message,
        p_user_id as user_id,
        v_username as username;
END //

-- Procedure to unblock a user  
CREATE PROCEDURE sp_unblock_user(
    IN p_user_id INT,
    IN p_admin_id INT
)
BEGIN
    DECLARE v_username VARCHAR(50);
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'User not found';
    END IF;
    
    SELECT username INTO v_username FROM users WHERE id = p_user_id;
    
    -- Check if user is already active
    IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active = TRUE) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'User is already active';
    END IF;
    
    -- Unblock the user
    UPDATE users SET is_active = TRUE WHERE id = p_user_id;
    
    -- Create admin notification
    INSERT INTO admin_notifications (admin_id, type, title, message, related_user_id)
    VALUES (
        p_admin_id,
        'user_blocked',
        'User Unblocked',
        CONCAT('User "', v_username, '" (ID: ', p_user_id, ') has been unblocked'),
        p_user_id
    );
    
    SELECT 
        TRUE as success,
        'User unblocked successfully' AS message,
        p_user_id as user_id,
        v_username as username;
END //

-- Procedure to get all blocked users
CREATE PROCEDURE sp_get_blocked_users()
BEGIN
    SELECT 
        u.id,
        u.username,
        u.email,
        u.created_at as registration_date,
        u.updated_at as blocked_at,
        COUNT(DISTINCT ms.id) as sites_count,
        COUNT(DISTINCT n.id) as notifications_count
    FROM users u
    LEFT JOIN monitored_sites ms ON u.id = ms.user_id
    LEFT JOIN notifications n ON u.id = n.user_id
    WHERE u.is_active = FALSE AND u.is_admin = FALSE
    GROUP BY u.id, u.username, u.email, u.created_at, u.updated_at
    ORDER BY u.updated_at DESC;
END //

DELIMITER ;

-- ================================================================
-- Step 6: Create/Update views
-- ================================================================

DROP VIEW IF EXISTS v_blocked_users;
DROP VIEW IF EXISTS v_user_activity;

CREATE VIEW v_user_activity AS
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

CREATE VIEW v_blocked_users AS
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
-- Step 7: Update triggers
-- ================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_user_after_insert;

DELIMITER //

CREATE TRIGGER tr_user_after_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    -- Create default notification preferences
    INSERT INTO user_notifications (user_id, email_enabled, line_enabled, line_user_id)
    VALUES (NEW.id, TRUE, FALSE, NEW.line_user_id)
    ON DUPLICATE KEY UPDATE user_id = user_id;
    
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
-- Step 8: Migration verification
-- ================================================================

SELECT 
    '✅ Migration completed successfully!' as Status,
    DATABASE() as DatabaseName,
    NOW() as MigrationDate;

-- Show blocking functionality status
SELECT 
    'Blocking Functionality Status' as Report,
    COUNT(*) as total_users,
    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
    SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as blocked_users,
    SUM(CASE WHEN is_admin = TRUE THEN 1 ELSE 0 END) as admin_users
FROM users;

-- ================================================================
-- Migration Complete!
-- ================================================================
-- The following features are now available:
-- 1. User blocking via is_active column
-- 2. Admin notifications for user actions
-- 3. Stored procedures: sp_block_user, sp_unblock_user, sp_get_blocked_users
-- 4. Views: v_user_activity, v_blocked_users
-- 5. Automatic triggers for new user registration
-- ================================================================

