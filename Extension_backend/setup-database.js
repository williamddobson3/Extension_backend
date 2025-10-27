#!/usr/bin/env node

/**
 * Complete Database Setup Script
 * 
 * This script sets up the entire database using the database.sql file.
 * It includes all tables, procedures, events, views, and initial data
 * needed for the Website Monitor System.
 * 
 * Usage:
 *   node setup-database.js
 * 
 * Prerequisites:
 *   - MySQL server running
 *   - Database credentials in .env file
 *   - database.sql file in the correct location
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'website_monitor',
    multipleStatements: true,
    charset: 'utf8mb4'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupDatabase() {
    let connection;
    
    try {
        log('🚀 Starting Website Monitor Database Setup...', 'cyan');
        log('================================================', 'cyan');
        
        // Step 1: Connect to MySQL server (without database)
        log('📡 Connecting to MySQL server...', 'blue');
        const serverConnection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            multipleStatements: true
        });
        
        // Step 2: Create database if it doesn't exist
        log('🗄️  Creating database...', 'blue');
        await serverConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await serverConnection.end();
        
        // Step 3: Connect to the specific database
        log('🔌 Connecting to database...', 'blue');
        connection = await mysql.createConnection(dbConfig);
        
        // Step 4: Read and execute database.sql
        log('📖 Reading database.sql file...', 'blue');
        const sqlFilePath = path.join(__dirname, '..', 'databse', 'database.sql');
        
        if (!fs.existsSync(sqlFilePath)) {
            throw new Error(`Database SQL file not found: ${sqlFilePath}`);
        }
        
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Step 5: Execute SQL statements
        log('⚡ Executing SQL statements...', 'blue');
        log('   This may take a few minutes...', 'yellow');
        
        const startTime = Date.now();
        await connection.execute(sqlContent);
        const endTime = Date.now();
        
        // Step 6: Verify setup
        log('🔍 Verifying database setup...', 'blue');
        
        // Check if all main tables exist
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `, [dbConfig.database]);
        
        const expectedTables = [
            'users', 'user_notifications', 'monitored_sites', 'site_checks',
            'change_history', 'scraped_content', 'product_data', 'notifications',
            'notification_guard_logs', 'blocked_ip_addresses', 'ip_access_logs',
            'ip_reputation', 'ip_blocking_rules', 'user_ip_history', 'evasion_signals',
            'evasion_scores', 'banned_identifiers', 'proof_of_work_challenges',
            'admin_evasion_logs', 'email_verification_tokens', 'browser_fingerprints',
            'blocked_emails', 'blocked_access_logs', 'user_sessions', 'line_follow_events',
            'line_message_logs', 'line_notification_queue', 'notification_templates',
            'notification_delivery_logs', 'system_settings', 'api_rate_limits',
            'system_audit_logs', 'error_logs'
        ];
        
        const existingTables = tables.map(row => row.TABLE_NAME);
        const missingTables = expectedTables.filter(table => !existingTables.includes(table));
        
        if (missingTables.length > 0) {
            log(`❌ Missing tables: ${missingTables.join(', ')}`, 'red');
            throw new Error('Some tables were not created successfully');
        }
        
        // Check system settings
        const [settings] = await connection.execute('SELECT COUNT(*) as count FROM system_settings');
        log(`✅ System settings: ${settings[0].count} entries`, 'green');
        
        // Check notification templates
        const [templates] = await connection.execute('SELECT COUNT(*) as count FROM notification_templates');
        log(`✅ Notification templates: ${templates[0].count} entries`, 'green');
        
        // Check IP blocking rules
        const [rules] = await connection.execute('SELECT COUNT(*) as count FROM ip_blocking_rules');
        log(`✅ IP blocking rules: ${rules[0].count} entries`, 'green');
        
        // Check views
        const [views] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.VIEWS 
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME
        `, [dbConfig.database]);
        
        log(`✅ Database views: ${views.length} created`, 'green');
        
        // Check procedures
        const [procedures] = await connection.execute(`
            SELECT ROUTINE_NAME 
            FROM information_schema.ROUTINES 
            WHERE ROUTINE_SCHEMA = ? 
            AND ROUTINE_TYPE = 'PROCEDURE'
            ORDER BY ROUTINE_NAME
        `, [dbConfig.database]);
        
        log(`✅ Stored procedures: ${procedures.length} created`, 'green');
        
        // Check events
        const [events] = await connection.execute(`
            SELECT EVENT_NAME 
            FROM information_schema.EVENTS 
            WHERE EVENT_SCHEMA = ?
            ORDER BY EVENT_NAME
        `, [dbConfig.database]);
        
        log(`✅ Scheduled events: ${events.length} created`, 'green');
        
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        log('', 'reset');
        log('🎉 Database setup completed successfully!', 'green');
        log('================================================', 'green');
        log(`⏱️  Setup time: ${duration} seconds`, 'cyan');
        log(`📊 Tables created: ${existingTables.length}`, 'cyan');
        log(`🔧 Procedures created: ${procedures.length}`, 'cyan');
        log(`📈 Views created: ${views.length}`, 'cyan');
        log(`⏰ Events created: ${events.length}`, 'cyan');
        log('', 'reset');
        log('🚀 Your Website Monitor System database is ready!', 'bright');
        log('   You can now start the backend server.', 'bright');
        
    } catch (error) {
        log('', 'reset');
        log('❌ Database setup failed!', 'red');
        log('================================================', 'red');
        log(`Error: ${error.message}`, 'red');
        log('', 'reset');
        log('Please check:', 'yellow');
        log('  - MySQL server is running', 'yellow');
        log('  - Database credentials in .env file are correct', 'yellow');
        log('  - database.sql file exists and is readable', 'yellow');
        log('  - You have sufficient privileges to create databases and tables', 'yellow');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the setup
if (require.main === module) {
    setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };