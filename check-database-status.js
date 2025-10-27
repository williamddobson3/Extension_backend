const mysql = require('mysql2/promise');

async function checkDatabaseStatus() {
    let connection;
    
    try {
        console.log('🔍 Checking database status...');
        
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'website_monitor',
            port: 3306,
            charset: 'utf8mb4'
        });
        
        console.log('✅ Database connection successful!');
        
        // Check all tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`\n📋 Found ${tables.length} tables:`);
        tables.forEach((table, index) => {
            console.log(`  ${index + 1}. ${Object.values(table)[0]}`);
        });
        
        // Check if notification_templates exists
        const [templatesExists] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'website_monitor' 
            AND table_name = 'notification_templates'
        `);
        
        if (templatesExists[0].count > 0) {
            console.log('\n✅ notification_templates table exists');
            
            // Check template count
            const [templates] = await connection.execute('SELECT COUNT(*) as count FROM notification_templates');
            console.log(`   - ${templates[0].count} templates found`);
        } else {
            console.log('\n❌ notification_templates table does not exist');
        }
        
        // Check if system_settings exists
        const [settingsExists] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'website_monitor' 
            AND table_name = 'system_settings'
        `);
        
        if (settingsExists[0].count > 0) {
            console.log('✅ system_settings table exists');
            
            // Check settings count
            const [settings] = await connection.execute('SELECT COUNT(*) as count FROM system_settings');
            console.log(`   - ${settings[0].count} settings found`);
        } else {
            console.log('❌ system_settings table does not exist');
        }
        
        // Check if ip_blocking_rules exists
        const [rulesExists] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'website_monitor' 
            AND table_name = 'ip_blocking_rules'
        `);
        
        if (rulesExists[0].count > 0) {
            console.log('✅ ip_blocking_rules table exists');
            
            // Check rules count
            const [rules] = await connection.execute('SELECT COUNT(*) as count FROM ip_blocking_rules');
            console.log(`   - ${rules[0].count} rules found`);
        } else {
            console.log('❌ ip_blocking_rules table does not exist');
        }
        
        console.log('\n📊 Database status check completed!');
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkDatabaseStatus();
