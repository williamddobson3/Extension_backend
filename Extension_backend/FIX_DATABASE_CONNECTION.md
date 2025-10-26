# 🔧 Fix Database Connection Error

## ❌ **Error:**
```
Database connection failed: Access denied for user 'root'@'localhost'
```

---

## 🎯 **Solution: Update .env File**

### **Step 1: Check Current .env File**

The `.env` file should be located at:
```
D:\work folder\jong\Extension_backend\Extension_backend\.env
```

### **Step 2: Update Database Credentials**

Open `.env` file and update the database section:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=website_monitor
DB_PORT=3306
```

**Replace `YOUR_MYSQL_PASSWORD_HERE` with your actual MySQL root password!**

---

## 🔍 **Common Solutions**

### **Solution 1: Empty Password (Most Common)**

If your MySQL root user has **no password**:

```env
DB_PASSWORD=
```

### **Solution 2: Set Password**

If you have a password, use it:

```env
DB_PASSWORD=your_actual_password
```

### **Solution 3: Create New MySQL User (Recommended)**

Instead of using root, create a dedicated user:

```sql
-- Login to MySQL as root
mysql -u root -p

-- Create new user
CREATE USER 'extension_user'@'localhost' IDENTIFIED BY 'secure_password_here';

-- Grant permissions
GRANT ALL PRIVILEGES ON website_monitor.* TO 'extension_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

Then update `.env`:
```env
DB_USER=extension_user
DB_PASSWORD=secure_password_here
```

---

## 🚀 **Quick Fix Script**

Create a file `fix-database-connection.js`:

```javascript
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Database Connection\n');

const envPath = path.join(__dirname, '.env');

// Check if .env exists
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('📝 Creating .env file...\n');
    
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
    console.log('✅ .env file created with default settings');
    console.log('⚠️  Please update DB_PASSWORD if your MySQL root user has a password\n');
} else {
    console.log('✅ .env file found');
    const content = fs.readFileSync(envPath, 'utf8');
    
    // Check if DB_PASSWORD is set
    const passwordMatch = content.match(/DB_PASSWORD=(.*)/);
    if (passwordMatch) {
        const password = passwordMatch[1].trim();
        if (password === '') {
            console.log('ℹ️  DB_PASSWORD is empty (no password)');
        } else {
            console.log('ℹ️  DB_PASSWORD is set');
        }
    } else {
        console.log('⚠️  DB_PASSWORD not found in .env file');
    }
}

console.log('\n📋 Next Steps:');
console.log('1. Check your MySQL root password');
console.log('2. Update DB_PASSWORD in .env file');
console.log('3. Restart the server: npm start');
console.log('4. If still failing, create a dedicated MySQL user\n');

