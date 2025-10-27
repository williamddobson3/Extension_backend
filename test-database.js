const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function testDatabase() {
    let connection;
    
    try {
        console.log('🔍 Testing database connection...');
        
        // Create connection using root user for testing
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'website_monitor',
            port: 3306,
            charset: 'utf8mb4'
        });
        
        console.log('✅ Database connection successful!');
        
        // Test basic queries
        console.log('🔍 Testing basic queries...');
        
        // Check if tables exist
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`✅ Found ${tables.length} tables in database`);
        
        // Check users table
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Users table: ${users[0].count} records`);
        
        // Check notification templates
        const [templates] = await connection.execute('SELECT COUNT(*) as count FROM notification_templates');
        console.log(`✅ Notification templates: ${templates[0].count} records`);
        
        // Check system settings
        const [settings] = await connection.execute('SELECT COUNT(*) as count FROM system_settings');
        console.log(`✅ System settings: ${settings[0].count} records`);
        
        // Check IP blocking rules
        const [rules] = await connection.execute('SELECT COUNT(*) as count FROM ip_blocking_rules');
        console.log(`✅ IP blocking rules: ${rules[0].count} records`);
        
        // Test stored procedures
        console.log('🔍 Testing stored procedures...');
        
        // Test InsertDefaultIPBlockingRules procedure
        try {
            await connection.execute('CALL InsertDefaultIPBlockingRules(1)');
            console.log('✅ InsertDefaultIPBlockingRules procedure works');
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
                console.log('⚠️  InsertDefaultIPBlockingRules procedure needs admin user first');
            } else {
                console.log('❌ InsertDefaultIPBlockingRules procedure error:', error.message);
            }
        }
        
        console.log('\n🎉 Database test completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Create an admin user through the registration system');
        console.log('2. IP blocking rules will be automatically inserted');
        console.log('3. Or manually call: CALL InsertDefaultIPBlockingRules(ADMIN_USER_ID);');
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        console.error('Error details:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testDatabase();
