# 🚀 Quick Fix for LINE Errors

## ⚡ Run These Commands Now

On your **Sakura Ubuntu server**, run these commands in order:

### 1. Diagnose the Problem
```bash
cd ~/Extension_backend  # or your project directory
node diagnose-line-error.js
```

### 2. Fix Configuration
```bash
node fix-line-configuration.js
```

### 3. Restart Your Server
```bash
# If using PM2:
pm2 restart all

# If using systemd:
sudo systemctl restart your-service-name

# If running manually:
# Stop the server (Ctrl+C) and restart:
npm start
```

### 4. Test LINE Messaging
```bash
node verify-line-user-id.js
```

---

## 🔍 What These Scripts Do

### diagnose-line-error.js
- Checks your LINE configuration
- Tests API connection
- Shows exact error messages
- Lists users with LINE configured

### fix-line-configuration.js
- Fixes mismatch between .env and config.js
- Synchronizes LINE credentials
- Ensures consistent configuration

### verify-line-user-id.js
- Sends test message to users
- Verifies LINE User IDs are correct
- Confirms message delivery

---

## ⚠️ Issues Found & Fixed

### 1. Configuration Mismatch ✅ FIXED
- Two different LINE channels in .env and config.js
- Now synchronized by fix script

### 2. Invalid Message Format ✅ FIXED
- Was using HTML `<br/>` tags (LINE doesn't support)
- Changed to proper newlines

### 3. User Not Friend with Bot ⚠️ ACTION NEEDED
- Users must add your LINE bot as friend
- Get bot QR code from [LINE Developers Console](https://developers.line.biz/console/)

---

## 📋 Common Error Solutions

### "Invalid channel access token"
→ Your access token is wrong or expired
→ Generate new token in LINE Developers Console

### "User hasn't added bot as friend"
→ User must add bot in LINE app first
→ Share bot's QR code with users

### "Invalid user ID"
→ LINE User ID must start with "U"
→ Get from webhook when user messages bot

---

## 🎯 Expected Results

After running the scripts, you should see:

✅ Configuration synchronized  
✅ LINE API connection successful  
✅ Test message delivered  
✅ No errors in logs  

---

## 📞 Still Having Issues?

Check detailed guide: `LINE_ERROR_ANALYSIS_AND_FIX.md`

Or check server logs:
```bash
pm2 logs --lines 50
# or
tail -f /var/log/your-app/error.log
```

