# 🚀 VPS Backend - Quick Start Guide

## ✅ **Yes, you need to create a MySQL account with password on your VPS!**

---

## 🎯 **The Answer to Your Questions:**

### **Q: How to run backend in Ubuntu VPS server?**
**A:** Upload your backend code to VPS and run it there (not locally)

### **Q: Do I have to create new MySQL account with password?**
**A:** Yes! Create a MySQL user with password on your VPS

---

## 📋 **Quick Setup Steps:**

### **1. Connect to Your VPS**
```bash
ssh ubuntu@49.212.153.246
```

### **2. Upload Backend Code**
From your local machine:
```bash
scp -r "D:\work folder\jong\Extension_backend\Extension_backend" ubuntu@49.212.153.246:~/
```

### **3. Install Dependencies on VPS**
```bash
# On VPS
cd ~/Extension_backend

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
```

### **4. Create MySQL User with Password**
```bash
# On VPS
sudo mysql -u root
```

**Run these commands in MySQL:**
```sql
CREATE DATABASE website_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'backend_user'@'localhost' IDENTIFIED BY 'secure_password_123';
GRANT ALL PRIVILEGES ON website_monitor.* TO 'backend_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### **5. Setup Backend on VPS**
```bash
# On VPS
cd ~/Extension_backend
npm install

# Create .env file
nano .env
```

**Add this to `.env`:**
```env
DB_HOST=localhost
DB_USER=backend_user
DB_PASSWORD=secure_password_123
DB_NAME=website_monitor
DB_PORT=3003

# LINE API credentials
LINE_CHANNEL_ID=2008360670
LINE_CHANNEL_ACCESS_TOKEN=zL0SuFvY6HCtZ378+T5cYBWNrYFFCS9mmJZpY7a8hQF0yHaw3R1NXBD6/u3OVyIrmF8wP9QiyCdEjtFtYj+qGCa7JZcNcpNDK/CnnohsbCEwH9Fww8LJY5fSWhc9eLzjPkasM1B9AOxRZwH98ChEuAdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=e90ae9dedd1152ed11f1783903387be2
```

### **6. Create Database Schema**
```bash
# Upload database.sql to VPS, then:
mysql -u backend_user -psecure_password_123 website_monitor < database.sql
```

### **7. Start Backend on VPS**
```bash
# Install PM2 for process management
sudo npm install -g pm2

# Start backend
pm2 start server.js --name "website-monitor-backend"
pm2 save
pm2 startup
```

### **8. Configure Firewall**
```bash
sudo ufw allow 3003
sudo ufw --force enable
```

### **9. Test Backend**
```bash
curl http://localhost:3003
curl http://49.212.153.246:3003
```

---

## 📱 **Update Extension**

Change your extension to connect to VPS:

**In `extension/popup.js`, `Mac/popup.js`, `windows/popup.js`:**
```javascript
// Change from:
const API_BASE_URL = 'http://localhost:3003';

// To:
const API_BASE_URL = 'http://49.212.153.246:3003';
```

---

## 🎯 **Summary**

**✅ YES - You need to:**
1. **Create MySQL user with password** on VPS
2. **Upload backend code** to VPS  
3. **Run backend on VPS** (not locally)
4. **Update extension** to connect to VPS

**The backend should run on your VPS server at `49.212.153.246:3003`!**

---

## 📚 **Files Created for You:**

- **`VPS_BACKEND_SETUP_GUIDE.md`** - Complete detailed guide
- **`vps-setup.sh`** - Automated setup script
- **`VPS_QUICK_START.md`** - This quick guide

---

**Date:** 2025-10-26  
**Status:** 🚀 **Ready for VPS Setup**

**Next Step:** Follow the quick setup steps above to get your backend running on VPS!
