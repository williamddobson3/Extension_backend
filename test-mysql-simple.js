const mysql = require('mysql2/promise');

async function test() {
    console.log('Testing MySQL connection...\n');
    
    const password = 'cupideroskama200334';
    
    console.log('Config:');
    console.log('  Host: localhost');
    console.log('  User: root');
    console.log('  Password: ' + password);
    console.log('  Port: 3306\n');
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: password,
            port: 3306
        });
        
        console.log('✅ Connection successful!');
        
        // Test query
        const [result] = await connection.query('SELECT VERSION() as version');
        console.log('MySQL Version:', result[0].version);
        
        await connection.end();
        
    } catch (error) {
        console.log('❌ Connection failed!');
        console.log('Error Code:', error.code);
        console.log('Error Message:', error.message);
        console.log('\nPossible solutions:');
        console.log('1. Check if MySQL is running');
        console.log('2. Verify the password is correct');
        console.log('3. Check if root user has proper permissions');
        console.log('4. Try: ALTER USER \'root\'@\'localhost\' IDENTIFIED WITH mysql_native_password BY \'cupideroskama200334\';');
    }
}

test();

