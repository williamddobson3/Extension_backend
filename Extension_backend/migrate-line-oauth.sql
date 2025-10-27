-- =====================================================
-- LINE OAuth Integration Database Migration
-- =====================================================
-- This script adds LINE OAuth fields to the users table
-- to support automatic LINE user ID capture and account linking
-- =====================================================

USE website_monitor;

-- Add LINE OAuth fields to users table
ALTER TABLE `users` 
ADD COLUMN `line_display_name` VARCHAR(255) DEFAULT NULL AFTER `line_user_id`,
ADD COLUMN `line_picture_url` VARCHAR(500) DEFAULT NULL AFTER `line_display_name`,
ADD COLUMN `line_linked_at` TIMESTAMP NULL DEFAULT NULL AFTER `line_picture_url`;

-- Add indexes for better performance
CREATE INDEX `idx_users_line_user_id` ON `users` (`line_user_id`);
CREATE INDEX `idx_users_line_linked_at` ON `users` (`line_linked_at`);

-- Update existing users to set line_linked_at if they have line_user_id
UPDATE `users` 
SET `line_linked_at` = `created_at` 
WHERE `line_user_id` IS NOT NULL AND `line_linked_at` IS NULL;

-- Add comments to document the new fields
ALTER TABLE `users` 
MODIFY COLUMN `line_user_id` VARCHAR(100) DEFAULT NULL COMMENT 'LINE user ID from OAuth',
MODIFY COLUMN `line_display_name` VARCHAR(255) DEFAULT NULL COMMENT 'LINE display name from OAuth',
MODIFY COLUMN `line_picture_url` VARCHAR(500) DEFAULT NULL COMMENT 'LINE profile picture URL from OAuth',
MODIFY COLUMN `line_linked_at` TIMESTAMP NULL DEFAULT NULL COMMENT 'When LINE account was linked';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check the updated table structure
DESCRIBE `users`;

-- Check if indexes were created
SHOW INDEX FROM `users` WHERE Key_name LIKE '%line%';

-- Check existing LINE users
SELECT 
    id, 
    username, 
    email, 
    line_user_id, 
    line_display_name, 
    line_picture_url, 
    line_linked_at,
    created_at
FROM `users` 
WHERE `line_user_id` IS NOT NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The users table now supports:
-- - line_user_id: LINE user ID from OAuth
-- - line_display_name: LINE display name from OAuth  
-- - line_picture_url: LINE profile picture URL from OAuth
-- - line_linked_at: When LINE account was linked
-- 
-- This enables automatic LINE user ID capture during
-- registration and login, and targeted notifications
-- to specific LINE users.
-- =====================================================
