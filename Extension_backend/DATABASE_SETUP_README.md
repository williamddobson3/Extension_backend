# Website Monitor System - Database Setup Guide

## 📋 Overview

This guide explains how to set up the complete database for the Website Monitor System using the single `database.sql` file. The database includes all necessary tables, procedures, events, views, and initial data for both the backend and extension functionality.

## 🗄️ Database Features

### Core Tables
- **User Management**: Users, notifications preferences, sessions
- **Website Monitoring**: Monitored sites, site checks, change history
- **Security**: IP blocking, anti-evasion, audit logs
- **LINE Integration**: Follow events, message logs, notification queue
- **System Configuration**: Settings, templates, rate limiting

### Advanced Features
- **Stored Procedures**: Enhanced IP blocking, notification sending
- **Scheduled Events**: Automatic cleanup and maintenance
- **Analytics Views**: User statistics, system health dashboard
- **Notification Templates**: Email and LINE message templates
- **Rate Limiting**: API protection and abuse prevention

## 🚀 Quick Setup

### Prerequisites
1. **MySQL Server** (5.7+ or 8.0+)
2. **Node.js** (14+)
3. **Database credentials** in `.env` file

### Step 1: Configure Environment
Create or update your `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=website_monitor

# LINE Messaging API
LINE_CHANNEL_ID=2008360670
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
LINE_REDIRECT_URI=http://localhost:3003/api/line/oauth/callback

# Server Configuration
PORT=3003
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key-change-this-in-production
```

### Step 2: Install Dependencies
```bash
cd Extension_backend/Extension_backend
npm install
```

### Step 3: Run Database Setup
```bash
node setup-database.js
```

This will:
- Create the `website_monitor` database
- Create all necessary tables (30+ tables)
- Insert initial system settings
- Create notification templates
- Set up IP blocking rules
- Create stored procedures and views
- Schedule maintenance events

## 📊 Database Schema

### Core User Management
```sql
users                    -- User accounts with blocking functionality
user_notifications       -- Email/LINE notification preferences
user_sessions           -- Active user sessions
```

### Website Monitoring
```sql
monitored_sites         -- Websites being monitored
site_checks            -- Individual check results
change_history         -- Change detection history
scraped_content        -- Raw content storage
product_data           -- Product-specific data (Kao Kirei)
```

### Security & Anti-Evasion
```sql
blocked_ip_addresses    -- Blocked IP addresses
ip_access_logs         -- IP access tracking
ip_reputation          -- IP risk assessment
ip_blocking_rules      -- Dynamic blocking rules
evasion_signals        -- Evasion detection signals
banned_identifiers     -- Banned email/name patterns
```

### LINE Integration
```sql
line_follow_events      -- LINE friend add/remove events
line_message_logs      -- LINE message history
line_notification_queue -- Pending LINE notifications
```

### System Management
```sql
system_settings        -- System configuration
notification_templates -- Email/LINE message templates
api_rate_limits        -- API rate limiting
system_audit_logs      -- System audit trail
error_logs            -- Error tracking
```

## 🔧 Advanced Configuration

### System Settings
The database includes configurable system settings:

```sql
-- View all settings
SELECT * FROM system_settings;

-- Update settings
UPDATE system_settings 
SET setting_value = 'new_value' 
WHERE setting_key = 'max_sites_per_user';
```

### Notification Templates
Customize email and LINE message templates:

```sql
-- View templates
SELECT * FROM notification_templates;

-- Update template
UPDATE notification_templates 
SET body_template = 'Your custom template' 
WHERE name = 'website_change_detected' AND type = 'email';
```

### IP Blocking Rules
Configure automatic IP blocking:

```sql
-- View blocking rules
SELECT * FROM ip_blocking_rules;

-- Add custom rule
INSERT INTO ip_blocking_rules (rule_name, rule_type, rule_value, action, priority, is_active, created_by)
VALUES ('Block Specific Country', 'country', 'XX', 'block', 100, TRUE, 1);
```

## 📈 Analytics & Monitoring

### User Statistics View
```sql
SELECT * FROM user_statistics;
-- Shows comprehensive user statistics including site counts, notifications, etc.
```

### System Health Dashboard
```sql
SELECT * FROM system_health_dashboard;
-- Shows system-wide metrics and health status
```

### IP Blocking Statistics
```sql
SELECT * FROM ip_blocking_dashboard;
-- Shows IP blocking statistics and blocked IPs
```

## 🛠️ Maintenance

### Automatic Cleanup
The database includes scheduled events for automatic maintenance:

- **Hourly**: Clean up old notification queue entries
- **Daily**: Clean up old audit logs and error logs
- **Hourly**: Clean up old API rate limit records

### Manual Cleanup
```sql
-- Clean up old notifications (older than 30 days)
DELETE FROM notifications 
WHERE sent_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Clean up old site checks (older than 90 days)
DELETE FROM site_checks 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

## 🔍 Troubleshooting

### Common Issues

1. **"Access denied" error**
   - Check MySQL credentials in `.env`
   - Ensure MySQL server is running
   - Verify user has CREATE DATABASE privileges

2. **"Table already exists" warnings**
   - These are normal if running setup multiple times
   - The script uses `CREATE TABLE IF NOT EXISTS`

3. **"Cannot connect to MySQL"**
   - Check if MySQL service is running
   - Verify host and port settings
   - Check firewall settings

### Verification Commands
```sql
-- Check if all tables exist
SELECT COUNT(*) as table_count 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'website_monitor';

-- Check system settings
SELECT COUNT(*) as settings_count FROM system_settings;

-- Check notification templates
SELECT COUNT(*) as templates_count FROM notification_templates;
```

## 📝 File Structure

```
Extension_backend/
├── databse/
│   └── database.sql          # Complete database schema
├── Extension_backend/
│   ├── setup-database.js     # Database setup script
│   ├── DATABASE_SETUP_README.md
│   └── .env                  # Environment configuration
```

## ✅ Success Indicators

After successful setup, you should see:
- ✅ Database `website_monitor` created
- ✅ 30+ tables created
- ✅ System settings: 15+ entries
- ✅ Notification templates: 6+ entries
- ✅ IP blocking rules: 6+ entries
- ✅ Stored procedures: 2+ created
- ✅ Views: 4+ created
- ✅ Events: 5+ scheduled

## 🚀 Next Steps

After database setup:
1. Start the backend server: `npm start`
2. Test the API endpoints
3. Load the extension in your browser
4. Create a test user account
5. Test LINE integration

## 📞 Support

If you encounter issues:
1. Check the error logs in the console output
2. Verify all prerequisites are met
3. Check MySQL server logs
4. Ensure sufficient disk space and memory

---

**Note**: This database setup is designed to be run once and includes all necessary components for the complete Website Monitor System. The `database.sql` file is self-contained and includes everything needed for both backend and extension functionality.
