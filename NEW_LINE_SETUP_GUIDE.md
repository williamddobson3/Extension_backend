# 🎯 New LINE Messaging API Setup Guide

## 📋 Your New LINE Credentials

```
Channel ID:       2008360670
Channel Secret:   e90ae9dedd1152ed11f1783903387be2
Access Token:     zL0SuFvY6HCtZ378+T5cYBWNrYFFCS9mmJZpY7a8hQF0yHaw3R1NXBD6/u3OVyIrmF8wP9QiyCdEjtFtYj+qGCa7JZcNcpNDK/CnnohsbCEwH9Fww8LJY5fSWhc9eLzjPkasM1B9AOxRZwH98ChEuAdB04t89/1O/w1cDnyilFU=
```

---

## 🚀 Quick Setup (3 Steps)

### **Step 1: Update .env File**

Run the automatic update script:

```bash
cd Extension_backend
node update-line-credentials-new.js
```

This will:
- ✅ Backup your old .env file to `.env.backup`
- ✅ Update LINE credentials in .env
- ✅ Keep all your other settings intact

**OR manually update your `.env` file:**

```env
LINE_CHANNEL_ID=2008360670
LINE_CHANNEL_ACCESS_TOKEN=zL0SuFvY6HCtZ378+T5cYBWNrYFFCS9mmJZpY7a8hQF0yHaw3R1NXBD6/u3OVyIrmF8wP9QiyCdEjtFtYj+qGCa7JZcNcpNDK/CnnohsbCEwH9Fww8LJY5fSWhc9eLzjPkasM1B9AOxRZwH98ChEuAdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=e90ae9dedd1152ed11f1783903387be2
```

---

### **Step 2: Restart Server**

```bash
npm start
```

Wait for the server to start:
```
🚀 Server running on 0.0.0.0:3003
📊 Environment: development
```

---

### **Step 3: Test Broadcast**

```bash
node test-line-broadcast.js
```

**Expected Output:**
```
🧪 LINE Broadcast Test

📋 Configuration:
   Channel ID: 2008360670
   Access Token: zL0SuFvY6HCtZ378+T5c...
   Channel Secret: e90ae9dedd...

🔍 Test 1: Getting bot information...
✅ Bot info retrieved successfully!
   Bot ID: U...
   Display Name: [Your Bot Name]
   Basic ID: @...

🔍 Test 4: Attempting to broadcast message...
✅ Broadcast message sent successfully!

📱 Check your LINE app now!
```

---

## 📱 LINE Official Account Setup

### **Get Your LINE Official Account Information**

1. **Go to LINE Developers Console:**
   - https://developers.line.biz/console/
   - Login with your LINE account

2. **Find Your Channel:**
   - Channel ID: `2008360670`
   - Click on your channel

3. **Get Your Basic ID:**
   - Go to "Messaging API" tab
   - Find "Basic ID" (starts with @)
   - Example: `@123abcde`

4. **Get Your Friend Request Link:**
   - Go to "Messaging API" tab
   - Find "Add friend" link
   - Example: `https://lin.ee/XXXXXX`

5. **Get Your QR Code:**
   - Go to "Messaging API" tab
   - Download QR code
   - Save as `friend.png` in Extension_backend folder

---

## 🔧 LINE Developers Console Configuration

### **1. Enable Messaging API**

1. Go to your channel settings
2. Click "Messaging API" tab
3. Make sure it's enabled

### **2. Configure Webhook (Optional)**

If you want to receive messages from users:

```
Webhook URL: http://your-domain.com/api/line/webhook
```

**Enable:**
- ✅ Use webhook
- ✅ Webhook redelivery

### **3. Configure Bot Settings**

**Response Settings:**
- ❌ Disable "Auto-reply messages" (we handle this in code)
- ❌ Disable "Greeting messages" (optional)
- ✅ Enable "Webhooks" (if using webhook)

**Channel Settings:**
- ✅ Allow bot to join groups (optional)
- ✅ Allow bot to join multi-person chats (optional)

---

## 📊 Verify Setup

### **Check Bot Information**

```bash
curl -H "Authorization: Bearer zL0SuFvY6HCtZ378+T5cYBWNrYFFCS9mmJZpY7a8hQF0yHaw3R1NXBD6/u3OVyIrmF8wP9QiyCdEjtFtYj+qGCa7JZcNcpNDK/CnnohsbCEwH9Fww8LJY5fSWhc9eLzjPkasM1B9AOxRZwH98ChEuAdB04t89/1O/w1cDnyilFU=" \
  https://api.line.me/v2/bot/info
```

**Expected Response:**
```json
{
  "userId": "U...",
  "basicId": "@...",
  "displayName": "Your Bot Name"
}
```

### **Check Quota**

```bash
curl -H "Authorization: Bearer zL0SuFvY6HCtZ378+T5cYBWNrYFFCS9mmJZpY7a8hQF0yHaw3R1NXBD6/u3OVyIrmF8wP9QiyCdEjtFtYj+qGCa7JZcNcpNDK/CnnohsbCEwH9Fww8LJY5fSWhc9eLzjPkasM1B9AOxRZwH98ChEuAdB04t89/1O/w1cDnyilFU=" \
  https://api.line.me/v2/bot/message/quota
```

---

## 🎯 Testing Broadcast

### **Method 1: Test Script**

```bash
node test-line-broadcast.js
```

### **Method 2: Extension UI**

1. Open your Chrome Extension
2. Go to "通知設定" (Notification Settings) tab
3. Click "LINEテスト" button
4. Check your LINE app for the message

### **Method 3: API Endpoint**

```bash
curl -X POST http://localhost:3003/api/broadcast/test-channel \
  -H "Content-Type: application/json"
```

---

## 👥 Add Friends to Your Official Account

### **Important: You need at least 1 friend to send broadcasts!**

### **Method 1: QR Code**
1. Save your QR code as `friend.png`
2. Share with users
3. Users scan with LINE app

### **Method 2: Friend Request Link**
1. Get your link from LINE Developers Console
2. Example: `https://lin.ee/XXXXXX`
3. Share with users
4. Users click to add friend

### **Method 3: Search by ID**
1. Get your Basic ID (starts with @)
2. Users search in LINE app
3. Example: `@123abcde`

---

## 🔍 Troubleshooting

### **Problem: "The request body has 0 recipients"**

**Cause:** No friends added to your LINE Official Account

**Solution:**
1. Add your LINE Official Account as a friend
2. Use QR code or friend request link
3. Verify in LINE Developers Console → "Analytics" → "Friends"

---

### **Problem: "Invalid channel access token"**

**Cause:** Token is incorrect or expired

**Solution:**
1. Check your `.env` file
2. Verify token in LINE Developers Console
3. Copy the exact token (no extra spaces)
4. Restart server

---

### **Problem: "403 Forbidden"**

**Cause:** Broadcast API not enabled for your channel

**Solution:**
1. Check your channel plan in LINE Developers Console
2. Make sure "Messaging API" is enabled
3. Try using Multicast API instead (see below)

---

## 🔄 Alternative: Multicast API

If broadcast doesn't work, use Multicast API to send to specific users:

### **Add Multicast Endpoint**

See `LINE_BROADCAST_TROUBLESHOOTING.md` for full implementation.

### **Quick Test:**

```javascript
// Send to specific users
POST http://localhost:3003/api/broadcast/multicast
{
  "message": "Test message"
}
```

---

## 📊 Monitor Usage

### **Check Statistics**

```bash
# Via API
curl http://localhost:3003/api/broadcast/stats

# Via Extension UI
Click "LINE統計" button in Extension
```

### **Statistics Include:**
- Bot information
- Message quota
- Monthly usage
- Remaining messages

---

## ✅ Checklist

Before testing, make sure:

- [ ] `.env` file updated with new credentials
- [ ] Server restarted
- [ ] Test script passes (`node test-line-broadcast.js`)
- [ ] At least 1 friend added to LINE Official Account
- [ ] Messaging API enabled in LINE Developers Console
- [ ] Broadcast API enabled (or use Multicast alternative)

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ Test script completes successfully
2. ✅ Broadcast message appears in LINE app
3. ✅ No errors in server logs
4. ✅ Statistics show message sent

---

## 📞 Support

If you encounter issues:

1. **Check server logs** for detailed error messages
2. **Run test script** to diagnose: `node test-line-broadcast.js`
3. **Check LINE Developers Console** for account status
4. **Review troubleshooting guide**: `LINE_BROADCAST_TROUBLESHOOTING.md`

---

## 🔗 Useful Links

- **LINE Developers Console:** https://developers.line.biz/console/
- **LINE Messaging API Docs:** https://developers.line.biz/en/docs/messaging-api/
- **LINE Bot Designer:** https://developers.line.biz/en/services/bot-designer/

---

## 📝 Summary

Your new LINE Messaging API credentials have been configured:

```
✅ Channel ID: 2008360670
✅ Access Token: Updated
✅ Channel Secret: Updated
```

**Next Steps:**
1. Run: `node update-line-credentials-new.js`
2. Restart server: `npm start`
3. Test: `node test-line-broadcast.js`
4. Add friends to your LINE Official Account
5. Test broadcast from Extension

🎯 **Your LINE broadcast system is ready to use!**

