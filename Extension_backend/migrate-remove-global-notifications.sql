-- =====================================================
-- MIGRATION: Remove Global Notifications for Kao Kirei
-- =====================================================
-- This script removes global notification functionality
-- and makes Kao Kirei sites behave like normal sites
-- =====================================================

USE website_monitor;

-- Step 1: Backup existing global notifications (optional)
CREATE TABLE IF NOT EXISTS `notifications_backup_global` LIKE `notifications`;
INSERT INTO `notifications_backup_global` 
SELECT * FROM `notifications` WHERE `is_global` = 1;

-- Step 2: Backup existing global sites (optional)
CREATE TABLE IF NOT EXISTS `monitored_sites_backup_global` LIKE `monitored_sites`;
INSERT INTO `monitored_sites_backup_global` 
SELECT * FROM `monitored_sites` WHERE `is_global_notification` = 1;

-- Step 3: Remove global notifications
DELETE FROM `notifications` WHERE `is_global` = 1;

-- Step 4: Remove global Kao Kirei sites
DELETE FROM `monitored_sites` 
WHERE `is_global_notification` = 1 
AND `scraping_method` = 'dom_parser';

-- Step 5: Remove system user (if exists and has no other data)
DELETE FROM `users` 
WHERE `id` = 0 
AND `username` = 'system_global';

-- Step 6: Remove default IP blocking rules that reference system user
DELETE FROM `ip_blocking_rules` 
WHERE `created_by` = 0;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check remaining global notifications (should be 0)
SELECT COUNT(*) as remaining_global_notifications 
FROM `notifications` 
WHERE `is_global` = 1;

-- Check remaining global sites (should be 0)
SELECT COUNT(*) as remaining_global_sites 
FROM `monitored_sites` 
WHERE `is_global_notification` = 1;

-- Check if system user still exists (should be 0)
SELECT COUNT(*) as system_user_exists 
FROM `users` 
WHERE `id` = 0;

-- Show all Kao Kirei sites (should show user-added sites only)
SELECT 
    ms.id,
    ms.user_id,
    u.username,
    ms.url,
    ms.name,
    ms.is_global_notification,
    ms.created_at
FROM `monitored_sites` ms
LEFT JOIN `users` u ON ms.user_id = u.id
WHERE ms.url LIKE '%kao-kirei.com%'
ORDER BY ms.created_at DESC;

-- =====================================================
-- NOTES
-- =====================================================
-- After running this migration:
-- 1. Users must manually add Kao Kirei sites
-- 2. Notifications will only be sent to users who added the site
-- 3. No more global notifications for Kao Kirei
-- 4. Backend code should be updated to remove global notification logic
-- =====================================================

