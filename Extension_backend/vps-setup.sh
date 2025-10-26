#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 VPS BACKEND SETUP SCRIPT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📍 Setting up backend on Ubuntu VPS...${NC}"
echo ""

# Step 1: Update system
echo -e "${YELLOW}📦 Step 1: Updating system...${NC}"
sudo apt update
echo ""

# Step 2: Install Node.js
echo -e "${YELLOW}📦 Step 2: Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
echo ""

# Step 3: Install MySQL
echo -e "${YELLOW}📦 Step 3: Installing MySQL...${NC}"
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
echo ""

# Step 4: Configure MySQL
echo -e "${YELLOW}📦 Step 4: Configuring MySQL...${NC}"
echo "Creating database and user..."

# Create MySQL setup script
cat > mysql_setup.sql << EOF
CREATE DATABASE IF NOT EXISTS website_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'backend_user'@'localhost' IDENTIFIED BY 'secure_password_123';
GRANT ALL PRIVILEGES ON website_monitor.* TO 'backend_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Execute MySQL setup
sudo mysql < mysql_setup.sql
rm mysql_setup.sql
echo ""

# Step 5: Install dependencies
echo -e "${YELLOW}📦 Step 5: Installing Node.js dependencies...${NC}"
npm install
echo ""

# Step 6: Create .env file
echo -e "${YELLOW}📦 Step 6: Creating .env file...${NC}"
cat > .env << EOF
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
EOF
echo ""

# Step 7: Setup database schema
echo -e "${YELLOW}📦 Step 7: Setting up database schema...${NC}"
if [ -f "../databse/database.sql" ]; then
    mysql -u backend_user -psecure_password_123 website_monitor < ../databse/database.sql
    echo -e "${GREEN}✅ Database schema created successfully!${NC}"
else
    echo -e "${RED}⚠️  Database SQL file not found. Please upload database.sql manually.${NC}"
fi
echo ""

# Step 8: Configure firewall
echo -e "${YELLOW}📦 Step 8: Configuring firewall...${NC}"
sudo ufw allow 3003
sudo ufw --force enable
echo ""

# Step 9: Install PM2
echo -e "${YELLOW}📦 Step 9: Installing PM2 for process management...${NC}"
sudo npm install -g pm2
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}  ✅ VPS SETUP COMPLETE!${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Start the backend:"
echo "   pm2 start server.js --name 'website-monitor-backend'"
echo ""
echo "2. Save PM2 configuration:"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "3. Test the backend:"
echo "   curl http://localhost:3003"
echo ""
echo "4. Update your extension to connect to:"
echo "   http://49.212.153.246:3003"
echo ""
echo -e "${GREEN}🎉 Your backend is ready to run on VPS!${NC}"
