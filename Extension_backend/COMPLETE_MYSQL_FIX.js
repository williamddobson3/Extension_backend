const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🔧 COMPLETE MYSQL FIX - BACKEND PERFECT SOLUTION');
console.log('═══════════════════════════════════════════════════════════════\n');

async function checkMySQLService() {
    console.log('🔍 Step 1: Checking MySQL Service Status...\n');
    
    try {
        // Check if MySQL service is running
        const { stdout } = await execAsync('sc query mysql');
        console.log('✅ MySQL service found');
        
        if (stdout.includes('RUNNING')) {
            console.log('✅ MySQL service is RUNNING\n');
            return true;
        } else {
            console.log('❌ MySQL service is NOT running');
            console.log('   Status:', stdout.split('\n').find(line => line.includes('STATE')));
            console.log('');
            return false;
        }
    } catch (error) {
        console.log('❌ MySQL service not found or error checking status');
        console.log('   Error:', error.message);
        console.log('');
        return false;
    }
}

async function startMySQLService() {
    console.log('🚀 Step 2: Starting MySQL Service...\n');
    
    try {
        await execAsync('net start mysql');
        console.log('✅ MySQL service started successfully\n');
        return true;
    } catch (error) {
        console.log('❌ Failed to start MySQL service');
        console.log('   Error:', error.message);
        console.log('');
        return false;
    }
}

async function testConnectionWithDifferentUsers() {
    console.log('🔍 Step 3: Testing Different MySQL Users...\n');
    
    const testConfigs = [
        { user: 'root', password: '', description: 'root with no password' },
        { user: 'root', password: 'root', description: 'root with password "root"' },
        { user: 'root', password: 'password', description: 'root with password "password"' },
        { user: 'root', password: 'admin', description: 'root with password "admin"' },
        { user: 'root', password: '123456', description: 'root with password "123456"' },
        { user: 'root', password: 'cupideroskama200334', description: 'root with your password' },
        { user: 'admin', password: '', description: 'admin with no password' },
        { user: 'admin', password: 'admin', description: 'admin with password "admin"' },
    ];
    
    for (const config of testConfigs) {
        console.log(`📋 Testing: ${config.description}`);
        console.log(`   User: ${config.user}, Password: ${config.password === '' ? '(empty)' : config.password}`);
        
        try {
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: config.user,
                password: config.password,
                port: 3306,
                connectTimeout: 5000
            });
            
            console.log('✅ Connection successful!\n');
            
            // Test query
            const [result] = await connection.query('SELECT VERSION() as version, USER() as user');
            console.log('MySQL Version:', result[0].version);
            console.log('Connected as:', result[0].user);
            
            await connection.end();
            
            // Update .env file with working credentials
            await updateEnvFile(config.user, config.password);
            return true;
            
        } catch (error) {
            console.log('❌ Connection failed!');
            console.log('   Error:', error.message);
            console.log('');
        }
    }
    
    return false;
}

async function updateEnvFile(user, password) {
    console.log('📝 Step 4: Updating .env file...\n');
    
    const fs = require('fs');
    const path = require('path');
    
    const envPath = path.join(__dirname, '.env');
    
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update user and password
        envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${user}`);
        envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${password}`);
        
        fs.writeFileSync(envPath, envContent, 'utf8');
        
        console.log('✅ .env file updated successfully!');
        console.log(`   DB_USER=${user}`);
        console.log(`   DB_PASSWORD=${password === '' ? '(empty)' : password}\n`);
        
    } catch (error) {
        console.log('❌ Failed to update .env file');
        console.log('   Error:', error.message);
    }
}

async function createDatabase() {
    console.log('📊 Step 5: Creating Database...\n');
    
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Read .env to get current credentials
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        const dbUser = envContent.match(/DB_USER=(.*)/)[1];
        const dbPassword = envContent.match(/DB_PASSWORD=(.*)/)[1];
        
        console.log(`Using credentials: ${dbUser} / ${dbPassword === '' ? '(empty)' : dbPassword}\n`);
        
        // Connect to MySQL
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: dbUser,
            password: dbPassword,
            port: 3306,
            multipleStatements: true
        });
        
        console.log('✅ Connected to MySQL!\n');
        
        // Read and execute SQL file
        const sqlPath = path.join(__dirname, '..', 'databse', 'database.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('⚙️  Executing SQL script...\n');
        await connection.query(sqlContent);
        
        console.log('✅ Database created successfully!\n');
        
        // Verify database
        await connection.query('USE website_monitor');
        const [tables] = await connection.query('SHOW TABLES');
        
        console.log(`📊 Database Verification:`);
        console.log(`   Database: website_monitor`);
        console.log(`   Tables created: ${tables.length}\n`);
        
        if (tables.length > 0) {
            console.log('   Tables:');
            tables.forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`   ✓ ${tableName}`);
            });
        }
        
        await connection.end();
        return true;
        
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('✅ Database already exists - that\'s fine!\n');
            return true;
        } else {
            console.log('❌ Error creating database!');
            console.log('   Error:', error.message);
            return false;
        }
    }
}

async function testServerConnection() {
    console.log('🚀 Step 6: Testing Server Connection...\n');
    
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Read .env to get current credentials
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        const dbUser = envContent.match(/DB_USER=(.*)/)[1];
        const dbPassword = envContent.match(/DB_PASSWORD=(.*)/)[1];
        
        // Test connection using the same config as server
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: dbUser,
            password: dbPassword,
            port: 3306
        });
        
        console.log('✅ Server database connection test successful!\n');
        await connection.end();
        return true;
        
    } catch (error) {
        console.log('❌ Server database connection test failed!');
        console.log('   Error:', error.message);
        return false;
    }
}

async function main() {
    try {
        // Step 1: Check MySQL service
        const serviceRunning = await checkMySQLService();
        
        if (!serviceRunning) {
            console.log('🔄 Attempting to start MySQL service...\n');
            const started = await startMySQLService();
            if (!started) {
                console.log('❌ Cannot proceed without MySQL service running');
                console.log('   Please start MySQL manually and try again\n');
                return;
            }
        }
        
        // Step 2: Test connections
        const connectionWorking = await testConnectionWithDifferentUsers();
        
        if (!connectionWorking) {
            console.log('❌ No MySQL connection method worked');
            console.log('\n🔧 Manual Solutions:');
            console.log('1. Reset MySQL root password:');
            console.log('   - Stop MySQL: net stop mysql');
            console.log('   - Start with skip-grant: mysqld --skip-grant-tables');
            console.log('   - In another terminal: mysql -u root');
            console.log('   - Run: ALTER USER \'root\'@\'localhost\' IDENTIFIED BY \'\';');
            console.log('   - Restart MySQL: net start mysql\n');
            
            console.log('2. Create new user:');
            console.log('   - Login: mysql -u root -p');
            console.log('   - Run: CREATE USER \'extension_user\'@\'localhost\' IDENTIFIED BY \'\';');
            console.log('   - Run: GRANT ALL PRIVILEGES ON *.* TO \'extension_user\'@\'localhost\';');
            console.log('   - Run: FLUSH PRIVILEGES;\n');
            return;
        }
        
        // Step 3: Create database
        const dbCreated = await createDatabase();
        
        if (!dbCreated) {
            console.log('❌ Database creation failed');
            return;
        }
        
        // Step 4: Test server connection
        const serverTest = await testServerConnection();
        
        if (!serverTest) {
            console.log('❌ Server connection test failed');
            return;
        }
        
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  ✅ MYSQL BACKEND FIX COMPLETE!');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        console.log('🎉 All issues resolved!');
        console.log('📝 Next step: Start the server');
        console.log('   npm start\n');
        
        console.log('✅ The server should now start without database errors!');
        
    } catch (error) {
        console.log('❌ Unexpected error:', error.message);
    }
}

main();
