const { pool } = require('./config/database');

/**
 * Setup blocking verification tables
 * ブロック検証に必要なテーブルを作成
 */

async function setupBlockingTables() {
    try {
        console.log('🔧 Setting up blocking verification tables...');

        // 1. Blocked emails table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS blocked_emails (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                reason TEXT,
                blocked_by INT,
                is_active BOOLEAN DEFAULT TRUE,
                blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                unblocked_at TIMESTAMP NULL,
                INDEX idx_email (email),
                INDEX idx_is_active (is_active),
                FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // 2. Blocked access logs table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS blocked_access_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                ip_address VARCHAR(45),
                email VARCHAR(255),
                block_reason TEXT,
                block_type VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_ip_address (ip_address),
                INDEX idx_created_at (created_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 3. User sessions table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                session_token VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                INDEX idx_user_id (user_id),
                INDEX idx_session_token (session_token),
                INDEX idx_expires_at (expires_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 4. Integrity violations table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS integrity_violations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                ip_address VARCHAR(45),
                violation_type VARCHAR(50),
                details JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_ip_address (ip_address),
                INDEX idx_created_at (created_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Blocking verification tables created successfully');
        
        // Test the tables
        const [blockedEmails] = await pool.execute('SELECT COUNT(*) as count FROM blocked_emails');
        const [blockedAccessLogs] = await pool.execute('SELECT COUNT(*) as count FROM blocked_access_logs');
        const [userSessions] = await pool.execute('SELECT COUNT(*) as count FROM user_sessions');
        const [integrityViolations] = await pool.execute('SELECT COUNT(*) as count FROM integrity_violations');

        console.log('📊 Table status:');
        console.log(`  - blocked_emails: ${blockedEmails[0].count} records`);
        console.log(`  - blocked_access_logs: ${blockedAccessLogs[0].count} records`);
        console.log(`  - user_sessions: ${userSessions[0].count} records`);
        console.log(`  - integrity_violations: ${integrityViolations[0].count} records`);

    } catch (error) {
        console.error('❌ Error setting up blocking tables:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    setupBlockingTables()
        .then(() => {
            console.log('🎉 Setup completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupBlockingTables };
