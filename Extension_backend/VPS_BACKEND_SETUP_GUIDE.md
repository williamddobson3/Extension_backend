# 🚀 VPS Backend Setup - Complete Guide

## 🎯 **The Solution**

Your backend should run on the **Ubuntu VPS server** (`49.212.153.246`), not on your local Windows machine.

---

## 📋 **Step-by-Step VPS Setup**

### **Step 1: Connect to Your VPS**

```bash
ssh ubuntu@49.212.153.246
```

### **Step 2: Install Node.js and npm**

```bash
# Update system
sudo apt update

# Install Node.js (version 18 or higher)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### **Step 3: Install MySQL**

```bash
# Install MySQL server
sudo apt install mysql-server

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure MySQL installation
sudo mysql_secure_installation
```

### **Step 4: Configure MySQL for Backend**

```bash
# Login to MySQL as root
sudo mysql -u root
```

**Run these commands in MySQL:**

```sql
-- Create database
CREATE DATABASE website_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user for the backend
CREATE USER 'backend_user'@'localhost' IDENTIFIED BY 'secure_password_123';

-- Grant all privileges to the user
GRANT ALL PRIVILEGES ON website_monitor.* TO 'backend_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### **Step 5: Upload Backend Code to VPS**

**Option A: Using SCP (from your local machine):**
```bash
# Upload the entire Extension_backend folder
scp -r "D:\work folder\jong\Extension_backend\Extension_backend" ubuntu@49.212.153.246:~/
```

**Option B: Using Git (if your code is in a repository):**
```bash
# On VPS
git clone <your-repository-url>
cd <repository-name>
```

### **Step 6: Setup Backend on VPS**

```bash
# Navigate to backend directory
cd ~/Extension_backend

# Install dependencies
npm install

# Create .env file
nano .env
```

**Add this content to `.env`:**
```env
# VPS Database Configuration
DB_HOST=localhost
DB_USER=backend_user
DB_PASSWORD=secure_password_123
DB_NAME=website_monitor
DB_PORT=3306

# Server Configuration
PORT=3003
NODE_ENV=production
JWT_SECRET=your-jwt-secret-key-change-this-in-production

# LINE Messaging API - Channel: 2008360670 (@568ultax)
LINE_CHANNEL_ID=2008360670
LINE_CHANNEL_ACCESS_TOKEN=zL0SuFvY6HCtZ378+T5cYBWNrYFFCS9mmJZpY7a8hQF0yHaw3R1NXBD6/u3OVyIrmF8wP9QiyCdEjtFtYj+qGCa7JZcNcpNDK/CnnohsbCEwH9Fww8LJY5fSWhc9eLzjPkasM1B9AOxRZwH98ChEuAdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=e90ae9dedd1152ed11f1783903387be2

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
```

### **Step 7: Create Database Schema**

```bash
# Upload database.sql to VPS (if not already there)
# Then run:
mysql -u backend_user -p website_monitor < database.sql
# Enter password: secure_password_123
```

### **Step 8: Start the Backend**

```bash
# Start the server
npm start
```

**Expected output:**
```
✅ Database connected successfully
🚀 Server running on port 3003
```

### **Step 9: Configure Firewall**

```bash
# Allow port 3003 for the backend
sudo ufw allow 3003

# Check firewall status
sudo ufw status
```

### **Step 10: Test the Backend**

```bash
# Test locally on VPS
curl http://localhost:3003

# Test from external (your local machine)
curl http://49.212.153.246:3003
```

---

## 🔧 **Production Setup (Optional)**

### **Using PM2 for Process Management**

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start backend with PM2
pm2 start server.js --name "website-monitor-backend"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### **Using Nginx as Reverse Proxy**

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/website-monitor
```

**Add this configuration:**
```nginx
server {
    listen 80;
    server_name 49.212.153.246;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/website-monitor /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 📱 **Update Extension Configuration**

Update your extension to connect to the VPS backend:

**In `extension/popup.js`, `Mac/popup.js`, `windows/popup.js`:**

```javascript
// Change this line:
const API_BASE_URL = 'http://localhost:3003';

// To this:
const API_BASE_URL = 'http://49.212.153.246:3003';
```

---

## 🔍 **Troubleshooting**

### **If backend won't start:**

1. **Check MySQL is running:**
   ```bash
   sudo systemctl status mysql
   ```

2. **Check database connection:**
   ```bash
   mysql -u backend_user -p website_monitor
   ```

3. **Check port 3003 is available:**
   ```bash
   sudo netstat -tlnp | grep 3003
   ```

4. **Check logs:**
   ```bash
   # If using PM2
   pm2 logs website-monitor-backend
   
   # If running directly
   npm start
   ```

### **If extension can't connect:**

1. **Check firewall:**
   ```bash
   sudo ufw status
   sudo ufw allow 3003
   ```

2. **Check if backend is accessible:**
   ```bash
   curl http://49.212.153.246:3003
   ```

---

## ✅ **Summary**

**Yes, you need to:**

1. ✅ **Create MySQL user with password** on VPS
2. ✅ **Upload backend code** to VPS
3. ✅ **Install Node.js and dependencies** on VPS
4. ✅ **Configure .env** for VPS database
5. ✅ **Run backend on VPS** (not locally)
6. ✅ **Update extension** to connect to VPS

**The backend should run on your VPS server, not on your local Windows machine!**

---

**Date:** 2025-10-26  
**Status:** 📋 **VPS Setup Required**

**Next Step:** Follow the VPS setup guide above to get your backend running on the server.
