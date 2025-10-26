const mysql = require('mysql2/promise');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🔧 MYSQL CONNECTION FIX - COMPLETE SOLUTION');
console.log('═══════════════════════════════════════════════════════════════\n');

async function testConnection(password, description) {
    console.log(`📋 Testing: ${description}`);
    console.log(`   Password: ${password === '' ? '(empty)' : password}\n`);
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: password,
            port: 3306
        });
        
        console.log('✅ Connection successful!\n');
        
        // Test query
        const [result] = await connection.query('SELECT VERSION() as version');
        console.log('MySQL Version:', result[0].version);
        
        await connection.end();
        return true;
        
    } catch (error) {
        console.log('❌ Connection failed!');
        console.log('   Error:', error.message);
        console.log('');
        return false;
    }
}

async function main() {
    console.log('🎯 Testing different password configurations...\n');
    
    // Test 1: Empty password
    const emptyPassword = await testConnection('', 'Empty password (no password)');
    if (emptyPassword) {
        console.log('✅ SOLUTION: Use empty password in .env');
        console.log('   Update .env: DB_PASSWORD=\n');
        return;
    }
    
    // Test 2: Your provided password
    const yourPassword = await testConnection('cupideroskama200334', 'Your provided password');
    if (yourPassword) {
        console.log('✅ SOLUTION: Your password works!');
        console.log('   Current .env is correct\n');
        return;
    }
    
    // Test 3: Common passwords
    const commonPasswords = ['', 'root', 'password', 'admin', '123456'];
    
    for (const pwd of commonPasswords) {
        if (pwd === 'cupideroskama200334') continue; // Already tested
        
        const success = await testConnection(pwd, `Common password: "${pwd}"`);
        if (success) {
            console.log('✅ SOLUTION: Found working password!');
            console.log(`   Update .env: DB_PASSWORD=${pwd}\n`);
            return;
        }
    }
    
    console.log('❌ No password worked. Possible solutions:\n');
    console.log('1. 🔑 Reset MySQL root password:');
    console.log('   - Stop MySQL service');
    console.log('   - Run: mysqld --skip-grant-tables');
    console.log('   - In another terminal: mysql -u root');
    console.log('   - Run: ALTER USER \'root\'@\'localhost\' IDENTIFIED BY \'cupideroskama200334\';');
    console.log('   - Restart MySQL service\n');
    
    console.log('2. 🔧 Fix authentication plugin:');
    console.log('   - Login to MySQL: mysql -u root -p');
    console.log('   - Run: ALTER USER \'root\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'cupideroskama200334\';');
    console.log('   - Run: FLUSH PRIVILEGES;\n');
    
    console.log('3. 👤 Create new user (recommended):');
    console.log('   - Login to MySQL: mysql -u root -p');
    console.log('   - Run: CREATE USER \'extension_user\'@\'localhost\' IDENTIFIED BY \'cupideroskama200334\';');
    console.log('   - Run: GRANT ALL PRIVILEGES ON *.* TO \'extension_user\'@\'localhost\';');
    console.log('   - Run: FLUSH PRIVILEGES;');
    console.log('   - Update .env: DB_USER=extension_user\n');
    
    console.log('4. 🔍 Check if MySQL is running:');
    console.log('   - Open Services (services.msc)');
    console.log('   - Find MySQL service and make sure it\'s running\n');
}

main().catch(console.error);
