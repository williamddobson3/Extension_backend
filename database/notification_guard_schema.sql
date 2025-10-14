-- Notification Guard System Database Schema
-- This schema adds tables to track and prevent unnecessary notifications

-- Create notification guard logs table
CREATE TABLE IF NOT EXISTS `notification_guard_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `site_id` int(11) NOT NULL,
    `should_send` tinyint(1) NOT NULL,
    `reason` varchar(500) NOT NULL,
    `has_changes` tinyint(1) NOT NULL,
    `is_first_check` tinyint(1) NOT NULL,
    `has_error` tinyint(1) NOT NULL,
    `is_duplicate` tinyint(1) NOT NULL,
    `change_reason` text DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `idx_guard_logs_site_id` (`site_id`),
    KEY `idx_guard_logs_should_send` (`should_send`),
    KEY `idx_guard_logs_created_at` (`created_at`),
    KEY `idx_guard_logs_has_changes` (`has_changes`),
    KEY `idx_guard_logs_is_duplicate` (`is_duplicate`),
    CONSTRAINT `notification_guard_logs_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `monitored_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notification suppression rules table
CREATE TABLE IF NOT EXISTS `notification_suppression_rules` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `site_id` int(11) DEFAULT NULL,
    `user_id` int(11) DEFAULT NULL,
    `rule_type` enum('no_changes','first_check','duplicate','error','maintenance') NOT NULL,
    `suppress_until` timestamp NULL DEFAULT NULL,
    `reason` varchar(500) NOT NULL,
    `is_active` tinyint(1) DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    KEY `idx_suppression_rules_site_id` (`site_id`),
    KEY `idx_suppression_rules_user_id` (`user_id`),
    KEY `idx_suppression_rules_rule_type` (`rule_type`),
    KEY `idx_suppression_rules_is_active` (`is_active`),
    KEY `idx_suppression_rules_suppress_until` (`suppress_until`),
    CONSTRAINT `notification_suppression_rules_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `monitored_sites` (`id`) ON DELETE CASCADE,
    CONSTRAINT `notification_suppression_rules_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notification quality metrics table
CREATE TABLE IF NOT EXISTS `notification_quality_metrics` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `site_id` int(11) NOT NULL,
    `date` date NOT NULL,
    `total_checks` int(11) DEFAULT 0,
    `changes_detected` int(11) DEFAULT 0,
    `notifications_sent` int(11) DEFAULT 0,
    `notifications_blocked` int(11) DEFAULT 0,
    `first_checks` int(11) DEFAULT 0,
    `duplicate_blocks` int(11) DEFAULT 0,
    `error_blocks` int(11) DEFAULT 0,
    `quality_score` decimal(5,2) DEFAULT 0.00,
    `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
    `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_site_date` (`site_id`, `date`),
    KEY `idx_quality_metrics_date` (`date`),
    KEY `idx_quality_metrics_quality_score` (`quality_score`),
    CONSTRAINT `notification_quality_metrics_ibfk_1` FOREIGN KEY (`site_id`) REFERENCES `monitored_sites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default suppression rules
INSERT INTO `notification_suppression_rules` (`site_id`, `rule_type`, `reason`, `is_active`) VALUES
(NULL, 'no_changes', 'No changes detected - suppress notifications', 1),
(NULL, 'first_check', 'First-time check - suppress notifications', 1),
(NULL, 'duplicate', 'Duplicate notification - suppress to prevent spam', 1),
(NULL, 'error', 'Error in change detection - suppress notifications', 1);

-- Create indexes for better performance
CREATE INDEX `idx_notifications_sent_at` ON `notifications` (`sent_at`);
CREATE INDEX `idx_notifications_site_id_sent_at` ON `notifications` (`site_id`, `sent_at`);
CREATE INDEX `idx_site_checks_changes_detected` ON `site_checks` (`changes_detected`);
CREATE INDEX `idx_site_checks_site_id_created_at` ON `site_checks` (`site_id`, `created_at`);

-- Create view for notification quality dashboard
CREATE OR REPLACE VIEW `notification_quality_dashboard` AS
SELECT 
    ms.id as site_id,
    ms.name as site_name,
    ms.url as site_url,
    COALESCE(nqm.total_checks, 0) as total_checks,
    COALESCE(nqm.changes_detected, 0) as changes_detected,
    COALESCE(nqm.notifications_sent, 0) as notifications_sent,
    COALESCE(nqm.notifications_blocked, 0) as notifications_blocked,
    COALESCE(nqm.quality_score, 0.00) as quality_score,
    CASE 
        WHEN COALESCE(nqm.total_checks, 0) = 0 THEN 0.00
        ELSE ROUND((COALESCE(nqm.changes_detected, 0) / COALESCE(nqm.total_checks, 1)) * 100, 2)
    END as change_detection_rate,
    CASE 
        WHEN COALESCE(nqm.changes_detected, 0) = 0 THEN 0.00
        ELSE ROUND((COALESCE(nqm.notifications_sent, 0) / COALESCE(nqm.changes_detected, 1)) * 100, 2)
    END as notification_accuracy_rate
FROM monitored_sites ms
LEFT JOIN notification_quality_metrics nqm ON ms.id = nqm.site_id 
    AND nqm.date = CURDATE()
WHERE ms.is_active = 1;

-- Create stored procedure for updating quality metrics
DELIMITER //
CREATE PROCEDURE UpdateNotificationQualityMetrics()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE site_id_var INT;
    DECLARE site_cursor CURSOR FOR SELECT id FROM monitored_sites WHERE is_active = 1;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN site_cursor;
    
    read_loop: LOOP
        FETCH site_cursor INTO site_id_var;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        INSERT INTO notification_quality_metrics (
            site_id, 
            date, 
            total_checks, 
            changes_detected, 
            notifications_sent, 
            notifications_blocked,
            first_checks,
            duplicate_blocks,
            error_blocks,
            quality_score
        )
        SELECT 
            site_id_var,
            CURDATE(),
            COALESCE((
                SELECT COUNT(*) 
                FROM site_checks sc 
                WHERE sc.site_id = site_id_var 
                AND DATE(sc.created_at) = CURDATE()
            ), 0),
            COALESCE((
                SELECT COUNT(*) 
                FROM site_checks sc 
                WHERE sc.site_id = site_id_var 
                AND DATE(sc.created_at) = CURDATE()
                AND sc.changes_detected = 1
            ), 0),
            COALESCE((
                SELECT COUNT(*) 
                FROM notifications n 
                WHERE n.site_id = site_id_var 
                AND DATE(n.sent_at) = CURDATE()
                AND n.status = 'sent'
            ), 0),
            COALESCE((
                SELECT COUNT(*) 
                FROM notification_guard_logs ngl 
                WHERE ngl.site_id = site_id_var 
                AND DATE(ngl.created_at) = CURDATE()
                AND ngl.should_send = 0
            ), 0),
            COALESCE((
                SELECT COUNT(*) 
                FROM notification_guard_logs ngl 
                WHERE ngl.site_id = site_id_var 
                AND DATE(ngl.created_at) = CURDATE()
                AND ngl.is_first_check = 1
            ), 0),
            COALESCE((
                SELECT COUNT(*) 
                FROM notification_guard_logs ngl 
                WHERE ngl.site_id = site_id_var 
                AND DATE(ngl.created_at) = CURDATE()
                AND ngl.is_duplicate = 1
            ), 0),
            COALESCE((
                SELECT COUNT(*) 
                FROM notification_guard_logs ngl 
                WHERE ngl.site_id = site_id_var 
                AND DATE(ngl.created_at) = CURDATE()
                AND ngl.has_error = 1
            ), 0),
            CASE 
                WHEN (
                    SELECT COUNT(*) 
                    FROM site_checks sc 
                    WHERE sc.site_id = site_id_var 
                    AND DATE(sc.created_at) = CURDATE()
                ) = 0 THEN 0.00
                ELSE ROUND((
                    SELECT COUNT(*) 
                    FROM site_checks sc 
                    WHERE sc.site_id = site_id_var 
                    AND DATE(sc.created_at) = CURDATE()
                    AND sc.changes_detected = 1
                ) / (
                    SELECT COUNT(*) 
                    FROM site_checks sc 
                    WHERE sc.site_id = site_id_var 
                    AND DATE(sc.created_at) = CURDATE()
                ) * 100, 2)
            END
        ON DUPLICATE KEY UPDATE
            total_checks = VALUES(total_checks),
            changes_detected = VALUES(changes_detected),
            notifications_sent = VALUES(notifications_sent),
            notifications_blocked = VALUES(notifications_blocked),
            first_checks = VALUES(first_checks),
            duplicate_blocks = VALUES(duplicate_blocks),
            error_blocks = VALUES(error_blocks),
            quality_score = VALUES(quality_score),
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
    
    CLOSE site_cursor;
END //
DELIMITER ;

-- Create event to update quality metrics daily
CREATE EVENT IF NOT EXISTS update_notification_quality_daily
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(CURDATE() + INTERVAL 1 DAY, '23:59:59')
DO
  CALL UpdateNotificationQualityMetrics();
