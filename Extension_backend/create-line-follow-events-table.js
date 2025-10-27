const mysql = require('mysql2/promise');
require('dotenv').config();

async function createLineFollowEventsTable() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database successfully');

        // Create line_follow_events table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS line_follow_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                line_user_id VARCHAR(100) NOT NULL,
                followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                unfollowed_at TIMESTAMP NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_line_user_id (line_user_id),
                INDEX idx_line_user_id (line_user_id),
                INDEX idx_status (status),
                INDEX idx_followed_at (followed_at)
            )
        `);

        console.log('line_follow_events table created successfully');
        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

createLineFollowEventsTable();
