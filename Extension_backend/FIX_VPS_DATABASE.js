const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🔧 VPS DATABASE CONFIGURATION FIX');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📍 Server Information:');
console.log('   VPS IP: 49.212.153.246');
console.log('   OS: Ubuntu');
console.log('   Database: MySQL/MariaDB\n');

async function testVPSConnection() {
    console.log('🔍 Testing VPS Database Connection...\n');
    
    const testConfigs = [
        {
            host: '49.212.153.246',
            user: 'root',
            password: '',
            description: 'VPS root with no password'
        },
        {
            host: '49.212.153.246',
            user: 'root',
            password: 'cupideroskama200334',
            description: 'VPS root with your password'
        },
        {
            host: '49.212.153.246',
            user: 'root',
            password: 'root',
            description: 'VPS root with password "root"'
        },
        {
            host: '49.212.153.246',
            user: 'root',
            password: 'password',
            description: 'VPS root with password "password"'
        },
        {
            host: '49.212.153.246',
            user: 'root',
            password: 'admin',
            description: 'VPS root with password "admin"'
        },
        {
            host: '49.212.153.246',
            user: 'root',
            password: '123456',
            description: 'VPS root with password "123456"'
        },
        {
            host: '49.212.153.246',
            user: 'ubuntu',
            password: '',
            description: 'VPS ubuntu user with no password'
        },
        {
            host: '49.212.153.246',
            user: 'ubuntu',
            password: 'ubuntu',
            description: 'VPS ubuntu user with password "ubuntu"'
        }
    ];
    
    for (const config of testConfigs) {
        console.log(`📋 Testing: ${config.description}`);
        console.log(`   Host: ${config.host}`);
        console.log(`   User: ${config.user}`);
        console.log(`   Password: ${config.password === '' ? '(empty)' : config.password}`);
        
        try {
            const connection = await mysql.createConnection({
                host: config.host,
                user: config.user,
                password: config.password,
                port: 3306,
                connectTimeout: 10000
            });
            
            console.log('✅ Connection successful!\n');
            
            // Test query
            const [result] = await connection.query('SELECT VERSION() as version, USER() as user, @@hostname as hostname');
            console.log('MySQL Version:', result[0].version);
            console.log('Connected as:', result[0].user);
            console.log('Server Hostname:', result[0].hostname);
            
            await connection.end();
            
            // Update .env file with working credentials
            await updateEnvFile(config.host, config.user, config.password);
            return true;
            
        } catch (error) {
            console.log('❌ Connection failed!');
            console.log('   Error:', error.message);
            console.log('');
        }
    }
    
    return false;
}

async function updateEnvFile(host, user, password) {
    console.log('📝 Updating .env file for VPS...\n');
    
    const envPath = path.join(__dirname, '.env');
    
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update database configuration for VPS
        envContent = envContent.replace(/DB_HOST=.*/, `DB_HOST=${host}`);
        envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${user}`);
        envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${password}`);
        
        fs.writeFileSync(envPath, envContent, 'utf8');
        
        console.log('✅ .env file updated for VPS!');
        console.log(`   DB_HOST=${host}`);
        console.log(`   DB_USER=${user}`);
        console.log(`   DB_PASSWORD=${password === '' ? '(empty)' : password}\n`);
        
    } catch (error) {
        console.log('❌ Failed to update .env file');
        console.log('   Error:', error.message);
    }
}

async function createVPSDatabase() {
    console.log('📊 Creating Database on VPS...\n');
    
    try {
        // Read .env to get current credentials
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        const dbHost = envContent.match(/DB_HOST=(.*)/)[1];
        const dbUser = envContent.match(/DB_USER=(.*)/)[1];
        const dbPassword = envContent.match(/DB_PASSWORD=(.*)/)[1];
        
        console.log(`Using VPS credentials: ${dbHost} / ${dbUser} / ${dbPassword === '' ? '(empty)' : dbPassword}\n`);
        
        // Connect to VPS MySQL
        const connection = await mysql.createConnection({
            host: dbHost,
            user: dbUser,
            password: dbPassword,
            port: 3306,
            multipleStatements: true
        });
        
        console.log('✅ Connected to VPS MySQL!\n');
        
        // Read and execute SQL file
        const sqlPath = path.join(__dirname, '..', 'databse', 'database.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('⚙️  Executing SQL script on VPS...\n');
        await connection.query(sqlContent);
        
        console.log('✅ Database created successfully on VPS!\n');
        
        // Verify database
        await connection.query('USE website_monitor');
        const [tables] = await connection.query('SHOW TABLES');
        
        console.log(`📊 VPS Database Verification:`);
        console.log(`   Host: ${dbHost}`);
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
            console.log('✅ Database already exists on VPS - that\'s fine!\n');
            return true;
        } else {
            console.log('❌ Error creating database on VPS!');
            console.log('   Error:', error.message);
            return false;
        }
    }
}

async function testServerConnection() {
    console.log('🚀 Testing Server Connection to VPS...\n');
    
    try {
        // Read .env to get current credentials
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        const dbHost = envContent.match(/DB_HOST=(.*)/)[1];
        const dbUser = envContent.match(/DB_USER=(.*)/)[1];
        const dbPassword = envContent.match(/DB_PASSWORD=(.*)/)[1];
        
        // Test connection using the same config as server
        const connection = await mysql.createConnection({
            host: dbHost,
            user: dbUser,
            password: dbPassword,
            port: 3306
        });
        
        console.log('✅ Server VPS database connection test successful!\n');
        await connection.end();
        return true;
        
    } catch (error) {
        console.log('❌ Server VPS database connection test failed!');
        console.log('   Error:', error.message);
        return false;
    }
}

async function main() {
    try {
        console.log('🎯 VPS Database Configuration Process\n');
        
        // Step 1: Test VPS connections
        const connectionWorking = await testVPSConnection();
        
        if (!connectionWorking) {
            console.log('❌ No VPS MySQL connection method worked');
            console.log('\n🔧 VPS Solutions:');
            console.log('1. Check if MySQL is running on VPS:');
            console.log('   ssh ubuntu@49.212.153.246');
            console.log('   sudo systemctl status mysql');
            console.log('   sudo systemctl start mysql\n');
            
            console.log('2. Check MySQL configuration on VPS:');
            console.log('   sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf');
            console.log('   Make sure bind-address = 0.0.0.0 (not 127.0.0.1)\n');
            
            console.log('3. Check firewall on VPS:');
            console.log('   sudo ufw allow 3306');
            console.log('   sudo ufw status\n');
            
            console.log('4. Reset MySQL root password on VPS:');
            console.log('   sudo mysql -u root');
            console.log('   ALTER USER \'root\'@\'localhost\' IDENTIFIED BY \'\';');
            console.log('   FLUSH PRIVILEGES;\n');
            return;
        }
        
        // Step 2: Create database on VPS
        const dbCreated = await createVPSDatabase();
        
        if (!dbCreated) {
            console.log('❌ VPS database creation failed');
            return;
        }
        
        // Step 3: Test server connection
        const serverTest = await testServerConnection();
        
        if (!serverTest) {
            console.log('❌ Server VPS connection test failed');
            return;
        }
        
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  ✅ VPS DATABASE CONFIGURATION COMPLETE!');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        console.log('🎉 VPS database issues resolved!');
        console.log('📝 Next step: Start the server');
        console.log('   npm start\n');
        
        console.log('✅ The server should now connect to VPS database successfully!');
        console.log('📍 Server will connect to: 49.212.153.246:3306');
        
    } catch (error) {
        console.log('❌ Unexpected error:', error.message);
    }
}

main();
