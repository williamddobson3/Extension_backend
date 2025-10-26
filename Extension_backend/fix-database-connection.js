const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🔧 DATABASE CONNECTION FIX');
console.log('═══════════════════════════════════════════════════════════════\n');

const envPath = path.join(__dirname, '.env');

// Check if .env exists
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('📝 Creating .env file with default settings...\n');
    
    const envContent = `# LINE Messaging API - Channel: 2008360670 (@568ultax)
LINE_CHANNEL_ID=2008360670
LINE_CHANNEL_ACCESS_TOKEN=zL0SuFvY6HCtZ378+T5cYBWNrYFFCS9mmJZpY7a8hQF0yHaw3R1NXBD6/u3OVyIrmF8wP9QiyCdEjtFtYj+qGCa7JZcNcpNDK/CnnohsbCEwH9Fww8LJY5fSWhc9eLzjPkasM1B9AOxRZwH98ChEuAdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=e90ae9dedd1152ed11f1783903387be2

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=website_monitor
DB_PORT=3306

# Server Configuration
PORT=3003
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key-change-this-in-production

# Email Configuration (Gmail API)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session Secret
SESSION_SECRET=your-session-secret-key-change-this-in-production
`;
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ .env file created successfully!');
    console.log('📍 Location: ' + envPath + '\n');
} else {
    console.log('✅ .env file found at: ' + envPath + '\n');
}

// Read and analyze .env file
const content = fs.readFileSync(envPath, 'utf8');

console.log('📋 Current Database Configuration:');
console.log('─────────────────────────────────────────────────────────────\n');

const dbHost = content.match(/DB_HOST=(.*)/);
const dbUser = content.match(/DB_USER=(.*)/);
const dbPassword = content.match(/DB_PASSWORD=(.*)/);
const dbName = content.match(/DB_NAME=(.*)/);
const dbPort = content.match(/DB_PORT=(.*)/);

if (dbHost) console.log('  DB_HOST: ' + dbHost[1].trim());
if (dbUser) console.log('  DB_USER: ' + dbUser[1].trim());
if (dbPassword) {
    const pwd = dbPassword[1].trim();
    if (pwd === '') {
        console.log('  DB_PASSWORD: (empty - no password)');
    } else {
        console.log('  DB_PASSWORD: ******** (set)');
    }
} else {
    console.log('  DB_PASSWORD: ❌ NOT FOUND');
}
if (dbName) console.log('  DB_NAME: ' + dbName[1].trim());
if (dbPort) console.log('  DB_PORT: ' + dbPort[1].trim());

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  🎯 SOLUTIONS');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Option 1: Empty Password (Most Common)');
console.log('─────────────────────────────────────────────────────────────');
console.log('If your MySQL root user has NO password, make sure .env has:');
console.log('  DB_PASSWORD=\n');

console.log('Option 2: Set Your Password');
console.log('─────────────────────────────────────────────────────────────');
console.log('If your MySQL root user HAS a password, update .env:');
console.log('  DB_PASSWORD=your_actual_password\n');

console.log('Option 3: Create Dedicated MySQL User (Recommended)');
console.log('─────────────────────────────────────────────────────────────');
console.log('Run these MySQL commands:\n');
console.log('  mysql -u root -p');
console.log('  CREATE USER \'extension_user\'@\'localhost\' IDENTIFIED BY \'secure_password\';');
console.log('  GRANT ALL PRIVILEGES ON website_monitor.* TO \'extension_user\'@\'localhost\';');
console.log('  FLUSH PRIVILEGES;');
console.log('  EXIT;\n');
console.log('Then update .env:');
console.log('  DB_USER=extension_user');
console.log('  DB_PASSWORD=secure_password\n');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  📝 NEXT STEPS');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('1. ✅ Check your MySQL root password');
console.log('2. ✅ Update DB_PASSWORD in .env file');
console.log('3. ✅ Create database: mysql -u root -p < databse/database.sql');
console.log('4. ✅ Restart server: npm start\n');

console.log('═══════════════════════════════════════════════════════════════\n');

