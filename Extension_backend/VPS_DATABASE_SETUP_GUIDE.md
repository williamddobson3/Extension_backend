# 🔧 VPS Database Setup - Complete Guide

## 🎯 **The Issue**

Your backend is running on **Ubuntu VPS** at `49.212.153.246`, but the MySQL database is not accessible due to:

1. **Network connectivity issues** (ETIMEDOUT)
2. **MySQL not configured for remote access**
3. **Firewall blocking port 3306**
4. **MySQL bind-address configuration**

---

## 🚀 **Solution: Configure VPS MySQL for Remote Access**

### **Step 1: Connect to Your VPS**

```bash
ssh ubuntu@49.212.153.246
```

### **Step 2: Check MySQL Status**

```bash
# Check if MySQL is running
sudo systemctl status mysql

# If not running, start it
sudo systemctl start mysql

# Enable auto-start on boot
sudo systemctl enable mysql
```

### **Step 3: Configure MySQL for Remote Access**

```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

**Find this line:**
```ini
bind-address = 127.0.0.1
```

**Change it to:**
```ini
bind-address = 0.0.0.0
```

**Save and exit** (Ctrl+X, Y, Enter)

### **Step 4: Restart MySQL**

```bash
sudo systemctl restart mysql
```

### **Step 5: Configure MySQL Users**

```bash
# Login to MySQL
sudo mysql -u root
```

**Run these commands in MySQL:**

```sql
-- Create user for remote access
CREATE USER 'extension_user'@'%' IDENTIFIED BY 'secure_password_123';

-- Grant all privileges
GRANT ALL PRIVILEGES ON *.* TO 'extension_user'@'%' WITH GRANT OPTION;

-- Also allow root remote access (optional)
CREATE USER 'root'@'%' IDENTIFIED BY 'cupideroskama200334';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- Apply changes
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### **Step 6: Configure Firewall**

```bash
# Allow MySQL port
sudo ufw allow 3306

# Check firewall status
sudo ufw status

# If UFW is not active, enable it
sudo ufw enable
```

### **Step 7: Test Remote Connection**

From your local machine, test the connection:

```bash
# Test connection (replace with your VPS IP)
mysql -h 49.212.153.246 -u extension_user -p
# Enter password: secure_password_123
```

---

## 📝 **Update Your .env File**

Once VPS MySQL is configured, update your `.env` file:

```env
# VPS Database Configuration
DB_HOST=49.212.153.246
DB_USER=extension_user
DB_PASSWORD=secure_password_123
DB_NAME=website_monitor
DB_PORT=3306
```

---

## 🔍 **Alternative: Local Development Setup**

If you want to develop locally instead of using VPS:

### **Option 1: Use Local MySQL**

```env
# Local Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=website_monitor
DB_PORT=3306
```

### **Option 2: Use Docker MySQL**

```bash
# Run MySQL in Docker
docker run --name mysql-dev -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=website_monitor -p 3306:3306 -d mysql:8.0
```

Then update `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=website_monitor
DB_PORT=3306
```

---

## 🎯 **Recommended Approach**

### **For Development:**
Use **local MySQL** (easier to set up and debug)

### **For Production:**
Use **VPS MySQL** (follow the VPS setup guide above)

---

## ✅ **Quick Test Commands**

### **Test VPS Connection:**
```bash
# From your local machine
telnet 49.212.153.246 3306
```

### **Test MySQL Connection:**
```bash
# From your local machine
mysql -h 49.212.153.246 -u extension_user -p
```

### **Start Your Backend:**
```bash
cd "D:\work folder\jong\Extension_backend\Extension_backend"
npm start
```

---

## 🆘 **Troubleshooting**

### **If still getting ETIMEDOUT:**

1. **Check VPS firewall:**
   ```bash
   sudo ufw status
   sudo ufw allow 3306
   ```

2. **Check MySQL is listening on all interfaces:**
   ```bash
   sudo netstat -tlnp | grep 3306
   ```

3. **Check VPS provider firewall:**
   - Some VPS providers have additional firewall rules
   - Check your VPS control panel for port 3306

4. **Test from VPS itself:**
   ```bash
   mysql -h localhost -u extension_user -p
   ```

---

## 📋 **Summary**

**The issue:** VPS MySQL is not configured for remote access

**The solution:** 
1. Configure MySQL bind-address to 0.0.0.0
2. Create remote MySQL users
3. Open firewall port 3306
4. Update .env with VPS credentials

**Alternative:** Use local MySQL for development

---

**Date:** 2025-10-26  
**Status:** ⚠️ **VPS MySQL Configuration Required**

**Next Step:** Follow the VPS setup guide above, or switch to local MySQL for development.
