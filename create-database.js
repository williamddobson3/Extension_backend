require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  📊 CREATING DATABASE');
console.log('═══════════════════════════════════════════════════════════════\n');

async function createDatabase() {
    try {
        console.log('📋 Configuration:');
        console.log('─────────────────────────────────────────────────────────────');
        console.log(`  Host: ${process.env.DB_HOST}`);
        console.log(`  User: ${process.env.DB_USER}`);
        console.log(`  Password: ********`);
        console.log(`  Database: ${process.env.DB_NAME}\n`);

        // Read SQL file
        const sqlPath = path.join(__dirname, '..', 'databse', 'database.sql');
        console.log('📄 Reading SQL file...');
        console.log(`   Path: ${sqlPath}\n`);
        
        if (!fs.existsSync(sqlPath)) {
            console.log('❌ SQL file not found!');
            console.log(`   Expected: ${sqlPath}\n`);
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        console.log(`✅ SQL file loaded (${sqlContent.length} bytes)\n`);

        // Connect to MySQL
        console.log('🔌 Connecting to MySQL...\n');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('✅ Connected to MySQL!\n');

        // Execute SQL
        console.log('⚙️  Executing SQL script...\n');
        await connection.query(sqlContent);
        
        console.log('✅ Database created successfully!\n');

        // Verify database
        await connection.query(`USE ${process.env.DB_NAME}`);
        const [tables] = await connection.query('SHOW TABLES');
        
        console.log('📊 Database Verification:');
        console.log('─────────────────────────────────────────────────────────────');
        console.log(`  Database: ${process.env.DB_NAME}`);
        console.log(`  Tables created: ${tables.length}\n`);
        
        if (tables.length > 0) {
            console.log('  Tables:');
            tables.forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`   ✓ ${tableName}`);
            });
        }

        await connection.end();

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  ✅ DATABASE SETUP COMPLETE!');
        console.log('═══════════════════════════════════════════════════════════════\n');

        console.log('📝 Next Steps:');
        console.log('  1. Start the server: npm start');
        console.log('  2. The server should now connect successfully!\n');

    } catch (error) {
        console.log('❌ Error creating database!\n');
        console.log('Error:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n❌ Access Denied!');
            console.log('   Your MySQL password might be incorrect.');
            console.log('   Please check DB_PASSWORD in .env file\n');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n❌ Connection Refused!');
            console.log('   MySQL server is not running.');
            console.log('   Please start MySQL and try again\n');
        }
        
        process.exit(1);
    }
}

createDatabase();

