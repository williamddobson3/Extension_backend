# 🔍 LINE Error Analysis & Fix Guide

## 📋 Issues Found

After analyzing your project, I found **3 critical issues** preventing LINE messages from being sent:

---

## ❌ Issue 1: Configuration Mismatch Between .env and config.js

### Problem
Your project has **TWO DIFFERENT LINE channel configurations**:

**In `.env` file:**
- Channel ID: `2007999524`
- Channel Secret: `21c0e68ea4b687bcd6f13f60485d69ce`
- Access Token: `wC2ad1cBncKnmQ+oQwAZEwkQA/mktCaAccMdFYK1HeYhpKwVohZrfGvEOeS4l1By3sSlo2dpw8EpI4GyXoQpunqB35GfV2Uc86PEXm7/tqnV4woeC29Rl/iMuzaKQHusZ9pPhY/6Xi/zOs+8fFnNjQdB04t89/1O/w1cDnyilFU=`

**In `config.js` file:**
- Channel ID: `2008063758`
- Channel Secret: `4fee6b1dafa8a2055c493481e53f7c1b`
- Access Token: `3ZR5PnTnCwRboI12SFPe9MPrkPsliNuUToFi091eyGslZ+W+Pg3sXE9Q+ZmfAosJ1qL0Kev9tXBIGYa7EJIJa2drgVjSOM7lv98K33R67QK6Hr43g6llGOx8ShJ2Afhotnh4QJDnN+b/MCKhMQB0bgdB04t89/1O/w1cDnyilFU=`

### Impact
- The `notificationService.js` reads from `process.env` (`.env` file)
- If users' LINE IDs are from Channel `2008063758` but server uses Channel `2007999524`, messages will fail
- This causes authentication errors or "user not found" errors

### Solution
✅ Run the fix script to synchronize both files:
```bash
node fix-line-configuration.js
```

---

## ❌ Issue 2: Invalid LINE Message Format (HTML tags)

### Problem
The LINE message in `notificationService.js` uses **HTML `<br/>` tags** which LINE doesn't support:

```javascript
text: `🔔 ウェブサイト更新が検出されました！<br/>
📊 サイト: ${siteName}<br/>
🌐 URL: ${siteUrl}<br/>`
```

LINE only supports **plain text with newline characters** (`\n`).

### Impact
- Messages may fail to send
- Messages display incorrectly with literal `<br/>` text
- LINE API may reject malformed messages

### Solution
✅ **ALREADY FIXED** in this update! Changed to use proper newlines:
```javascript
text: `🔔 ウェブサイト更新が検出されました！

📊 サイト: ${siteName}
🌐 URL: ${siteUrl}`
```

---

## ❌ Issue 3: LINE User ID Not Friends with Bot

### Problem
Users have LINE User ID stored in database (e.g., `U3c488d5f250b6069ee39e85f2ddecff3`), but they may not have added the bot as a friend.

### Common Error Messages
```
"The user hasn't added the LINE Official Account as a friend."
"You can't send messages to yourself"
"Invalid user ID"
```

### Impact
- LINE API rejects messages to users who haven't added the bot
- Even with correct credentials, messages fail

### Solution
1. Get your bot's add friend URL from LINE Developers Console
2. Share with users to add bot as friend
3. Users must add bot BEFORE they can receive messages

---

## 🔧 Step-by-Step Fix Guide

### Step 1: Diagnose Current Issues
Run the diagnostic tool to identify exact problems:
```bash
node diagnose-line-error.js
```

This will:
- ✅ Check both .env and config.js configurations
- ✅ Test LINE API connection
- ✅ Verify bot information
- ✅ Check message quota
- ✅ List users with LINE configured
- ✅ Attempt to send test message
- ✅ Provide specific error messages

### Step 2: Fix Configuration Mismatch
Run the configuration fix script:
```bash
node fix-line-configuration.js
```

This will:
- ✅ Identify the correct configuration
- ✅ Synchronize .env and config.js
- ✅ Ensure both files use same credentials

### Step 3: Restart Server
After fixing configuration, restart your server:
```bash
pm2 restart all
# or
npm start
# or restart your deployment
```

### Step 4: Verify LINE User IDs
Check which users have LINE configured:
```bash
node verify-line-user-id.js
```

### Step 5: Ensure Users Are Friends with Bot

**Get your bot's information:**
1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Select your channel (ID: 2007999524 or 2008063758)
3. Go to "Messaging API" tab
4. Find the QR code or bot's Basic ID

**Share with users:**
- Have users scan the QR code
- Or search for bot by Basic ID
- Users must add bot as friend

---

## 🧪 Testing After Fix

### Test 1: Configuration Check
```bash
node diagnose-line-error.js
```
Expected: ✅ All configurations match, API connection successful

### Test 2: Send Test Message
```bash
node test-line-delivery.js
```
Expected: ✅ Message delivered to LINE

### Test 3: End-to-End Test
```bash
node test-line-notifications.js
```
Expected: ✅ Japanese message sent successfully

---

## 📊 Deployment Notes (Sakura Ubuntu Server)

### Check Configuration on Server
```bash
# SSH into your Sakura server
ssh your-username@your-server

# Navigate to project directory
cd /path/to/Extension_backend

# Check environment variables
cat .env | grep LINE

# Check if correct credentials loaded
node -e "require('dotenv').config(); console.log(process.env.LINE_CHANNEL_ID)"
```

### Update Server Configuration
```bash
# On your Sakura server
node fix-line-configuration.js

# Restart the application
pm2 restart all
# or
systemctl restart your-app-name
```

### Check Logs
```bash
# Check application logs
pm2 logs
# or
tail -f /var/log/your-app/error.log

# Look for LINE-related errors
grep "LINE" /var/log/your-app/error.log
```

---

## 🔍 Common Errors & Solutions

### Error: "Invalid channel access token"
**Cause:** Access token is wrong or expired  
**Solution:** 
1. Go to LINE Developers Console
2. Generate new Channel Access Token
3. Update in .env and config.js
4. Restart server

### Error: "The user hasn't added the LINE Official Account as a friend"
**Cause:** User hasn't added bot as friend  
**Solution:** 
1. User must add bot in LINE app
2. Send any message to bot (triggers webhook)
3. Then notifications will work

### Error: "You can't send messages to yourself"
**Cause:** Bot's own User ID is in database  
**Solution:** 
1. Get correct user's LINE User ID (not bot's ID)
2. Update database with correct User ID

### Error: "Invalid user ID"
**Cause:** LINE User ID format is wrong  
**Solution:** 
1. LINE User ID must start with "U"
2. Must be 33 characters long
3. Get from webhook when user messages bot

---

## 📝 Files Modified

1. ✅ `services/notificationService.js` - Fixed HTML tags to newlines
2. ✅ `diagnose-line-error.js` - NEW: Diagnostic tool
3. ✅ `fix-line-configuration.js` - NEW: Configuration fix tool

---

## ✅ Checklist

Before deploying, ensure:

- [ ] Run `node diagnose-line-error.js` - all tests pass
- [ ] Run `node fix-line-configuration.js` - config synchronized
- [ ] .env and config.js have same LINE credentials
- [ ] Determined which channel to use (2007999524 or 2008063758)
- [ ] Users have added bot as friend in LINE
- [ ] LINE User IDs in database are correct (start with "U")
- [ ] Server has been restarted with new configuration
- [ ] Test message successfully delivered

---

## 🎯 Next Steps

1. **Run diagnostics:**
   ```bash
   node diagnose-line-error.js
   ```

2. **Fix configuration:**
   ```bash
   node fix-line-configuration.js
   ```

3. **Restart server:**
   ```bash
   pm2 restart all
   ```

4. **Test on server:**
   ```bash
   node verify-line-user-id.js
   ```

5. **Monitor logs:**
   ```bash
   pm2 logs --lines 100
   ```

---

## 📞 Support

If issues persist after following this guide:

1. Check the diagnostic output for specific error messages
2. Verify LINE Developers Console shows channel as active
3. Confirm webhook URL is accessible (if using webhooks)
4. Check server firewall allows outbound HTTPS to api.line.me

---

**Good luck! Your LINE messaging should work after applying these fixes.** 🚀

