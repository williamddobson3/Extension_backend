require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🔍 TESTING DATABASE CONNECTION');
console.log('═══════════════════════════════════════════════════════════════\n');

async function testConnection() {
    console.log('📋 Configuration:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Host: ${process.env.DB_HOST}`);
    console.log(`  User: ${process.env.DB_USER}`);
    console.log(`  Password: ${process.env.DB_PASSWORD === '' ? '(empty)' : '********'}`);
    console.log(`  Database: ${process.env.DB_NAME}`);
    console.log(`  Port: ${process.env.DB_PORT}\n`);

    try {
        console.log('🔌 Attempting to connect...\n');
        
        // First try to connect without database
        const connectionWithoutDB = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        });

        console.log('✅ MySQL connection successful!\n');

        // Check if database exists
        const [databases] = await connectionWithoutDB.query(
            'SHOW DATABASES LIKE ?',
            [process.env.DB_NAME]
        );

        if (databases.length === 0) {
            console.log(`⚠️  Database '${process.env.DB_NAME}' does not exist`);
            console.log(`📝 You need to create it by running:`);
            console.log(`   mysql -u root -p < ..\\..\\databse\\database.sql\n`);
        } else {
            console.log(`✅ Database '${process.env.DB_NAME}' exists\n`);
            
            // Try to connect to the database
            await connectionWithoutDB.query(`USE ${process.env.DB_NAME}`);
            
            // Check tables
            const [tables] = await connectionWithoutDB.query('SHOW TABLES');
            console.log(`📊 Tables found: ${tables.length}`);
            if (tables.length > 0) {
                console.log('   Tables:');
                tables.forEach(table => {
                    const tableName = Object.values(table)[0];
                    console.log(`   - ${tableName}`);
                });
            } else {
                console.log('⚠️  No tables found. Database might be empty.');
            }
        }

        await connectionWithoutDB.end();

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  ✅ CONNECTION TEST COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.log('❌ Connection failed!\n');
        console.log('Error:', error.message);
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  🎯 SOLUTIONS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('❌ Access Denied Error');
            console.log('─────────────────────────────────────────────────────────────');
            console.log('Your MySQL password is incorrect.\n');
            console.log('Solution 1: If root has NO password');
            console.log('  Make sure .env has: DB_PASSWORD=\n');
            console.log('Solution 2: If root HAS a password');
            console.log('  Update .env with: DB_PASSWORD=your_actual_password\n');
            console.log('Solution 3: Reset MySQL root password');
            console.log('  Follow MySQL password reset guide\n');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('❌ Connection Refused');
            console.log('─────────────────────────────────────────────────────────────');
            console.log('MySQL server is not running.\n');
            console.log('Solution:');
            console.log('  Start MySQL server and try again\n');
        } else {
            console.log('❌ Unknown Error');
            console.log('─────────────────────────────────────────────────────────────');
            console.log('Error Code:', error.code);
            console.log('Error Message:', error.message);
        }

        console.log('═══════════════════════════════════════════════════════════════\n');
        process.exit(1);
    }
}

testConnection();

