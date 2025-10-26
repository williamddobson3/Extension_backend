const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🏠 LOCAL DEVELOPMENT SETUP');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('🎯 Setting up for LOCAL development (easier than VPS)\n');

function updateEnvForLocal() {
    console.log('📝 Updating .env for local development...\n');
    
    const envPath = path.join(__dirname, '.env');
    
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update for local development
        envContent = envContent.replace(/DB_HOST=.*/, 'DB_HOST=localhost');
        envContent = envContent.replace(/DB_USER=.*/, 'DB_USER=root');
        envContent = envContent.replace(/DB_PASSWORD=.*/, 'DB_PASSWORD=');
        envContent = envContent.replace(/DB_NAME=.*/, 'DB_NAME=website_monitor');
        envContent = envContent.replace(/DB_PORT=.*/, 'DB_PORT=3306');
        
        fs.writeFileSync(envPath, envContent, 'utf8');
        
        console.log('✅ .env updated for local development!');
        console.log('   DB_HOST=localhost');
        console.log('   DB_USER=root');
        console.log('   DB_PASSWORD=(empty)');
        console.log('   DB_NAME=website_monitor');
        console.log('   DB_PORT=3306\n');
        
    } catch (error) {
        console.log('❌ Failed to update .env file');
        console.log('   Error:', error.message);
    }
}

function showNextSteps() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  📋 NEXT STEPS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('1. ✅ Make sure MySQL is running on your local machine');
    console.log('   - Check Windows Services for MySQL');
    console.log('   - Or install XAMPP/WAMP if you don\'t have MySQL\n');
    
    console.log('2. ✅ Create the database:');
    console.log('   node create-database.js\n');
    
    console.log('3. ✅ Start the server:');
    console.log('   npm start\n');
    
    console.log('4. ✅ Test the server:');
    console.log('   Open browser: http://localhost:3003\n');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🎯 ALTERNATIVE: VPS SETUP');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('If you want to use VPS MySQL instead:');
    console.log('1. Follow: VPS_DATABASE_SETUP_GUIDE.md');
    console.log('2. Configure VPS MySQL for remote access');
    console.log('3. Update .env with VPS credentials\n');
    
    console.log('✅ Local development is easier and faster for testing!');
}

function main() {
    updateEnvForLocal();
    showNextSteps();
}

main();
