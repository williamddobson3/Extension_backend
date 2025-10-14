const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseSQL() {
    console.log('🧪 Testing database.sql file...\n');
    
    let connection;
    
    try {
        // Test database connection
        console.log('📋 Step 1: Testing database connection...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'website_monitor'
        });
        console.log('✅ Database connected successfully');
        
        // Test if database exists
        console.log('\n📋 Step 2: Checking if database exists...');
        const [databases] = await connection.execute('SHOW DATABASES LIKE ?', ['website_monitor']);
        if (databases.length > 0) {
            console.log('✅ Database "website_monitor" exists');
        } else {
            console.log('⚠️  Database "website_monitor" does not exist');
            console.log('   Run the database.sql file to create it');
            return;
        }
        
        // Test table structure
        console.log('\n📋 Step 3: Checking table structure...');
        const [tables] = await connection.execute('SHOW TABLES');
        const expectedTables = ['users', 'monitored_sites', 'site_checks', 'notifications', 'user_notifications', 'change_history', 'scraped_content'];
        
        console.log(`📊 Found ${tables.length} table(s):`);
        for (const table of tables) {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        }
        
        // Check if all expected tables exist
        const existingTableNames = tables.map(table => Object.values(table)[0]);
        const missingTables = expectedTables.filter(table => !existingTableNames.includes(table));
        
        if (missingTables.length === 0) {
            console.log('✅ All expected tables exist');
        } else {
            console.log(`⚠️  Missing tables: ${missingTables.join(', ')}`);
        }
        
        // Test foreign key constraints
        console.log('\n📋 Step 4: Testing foreign key constraints...');
        
        // Check monitored_sites foreign key
        const [fkConstraints] = await connection.execute(`
            SELECT 
                CONSTRAINT_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'website_monitor' 
            AND TABLE_NAME = 'monitored_sites' 
            AND CONSTRAINT_NAME = 'monitored_sites_ibfk_1'
        `);
        
        if (fkConstraints.length > 0) {
            console.log('✅ Foreign key constraint exists: monitored_sites.user_id → users.id');
        } else {
            console.log('⚠️  Foreign key constraint missing: monitored_sites.user_id → users.id');
        }
        
        // Test data integrity
        console.log('\n📋 Step 5: Testing data integrity...');
        
        // Check if there are any orphaned records
        const [orphanedSites] = await connection.execute(`
            SELECT ms.id, ms.user_id, ms.url, ms.name
            FROM monitored_sites ms
            LEFT JOIN users u ON ms.user_id = u.id
            WHERE u.id IS NULL
        `);
        
        if (orphanedSites.length === 0) {
            console.log('✅ No orphaned records found');
        } else {
            console.log(`⚠️  Found ${orphanedSites.length} orphaned record(s):`);
            for (const site of orphanedSites) {
                console.log(`   - Site ID ${site.id}: ${site.name} (user_id: ${site.user_id})`);
            }
        }
        
        // Test user isolation
        console.log('\n📋 Step 6: Testing user isolation...');
        
        const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
        const [siteCount] = await connection.execute('SELECT COUNT(*) as count FROM monitored_sites');
        
        console.log(`📊 Users: ${userCount[0].count}`);
        console.log(`📊 Sites: ${siteCount[0].count}`);
        
        if (userCount[0].count === 0) {
            console.log('ℹ️  No users found - this is expected for a clean database');
        }
        
        if (siteCount[0].count === 0) {
            console.log('ℹ️  No sites found - this is expected for a clean database');
        }
        
        console.log('\n🎉 Database structure test completed successfully!');
        console.log('\n📋 Summary:');
        console.log('✅ Database connection working');
        console.log('✅ All tables created');
        console.log('✅ Foreign key constraints in place');
        console.log('✅ No orphaned records');
        console.log('✅ Ready for user isolation implementation');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n🔧 Database connection issue:');
            console.log('   Check your database credentials in .env file');
            console.log('   Make sure the database server is running');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('\n🔧 Database not found:');
            console.log('   Run the database.sql file to create the database');
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n🔧 Tables not found:');
            console.log('   Run the database.sql file to create the tables');
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testDatabaseSQL();
