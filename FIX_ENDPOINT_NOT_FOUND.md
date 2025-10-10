# 🔧 Fix "Endpoint not found" Error

## 🎯 **Problem: "Endpoint not found"**
The broadcast endpoint `/api/broadcast/test-channel` is not being found.

## ✅ **Solution: Server Restart Required**

The most common cause is that **the server hasn't been restarted** after adding the new broadcast route.

## 🚀 **Step-by-Step Fix:**

### **Step 1: Stop Current Server**
```bash
# Press Ctrl+C to stop the current server
# Or kill the process if it's running
```

### **Step 2: Restart Server**
```bash
npm start
# or
node server.js
```

### **Step 3: Wait for Server to Start**
Look for this message:
```
🚀 Server running on 0.0.0.0:3003
📊 Environment: development
🔗 Health check: http://0.0.0.0:3003/health
```

### **Step 4: Test Broadcast Endpoint**
```bash
node test-broadcast-endpoint.js
```

### **Step 5: Test in Extension**
1. Open extension
2. Click "LINEテスト" button
3. Should work without "Endpoint not found" error

## 🔍 **Why This Happens:**

1. **Server Not Restarted** - New routes not loaded
2. **Route Not Registered** - Missing from server.js (already fixed)
3. **File Not Found** - Broadcast route file missing (already fixed)
4. **Port Conflict** - Server running on different port

## 📋 **Verification Steps:**

### **Check Server is Running:**
```bash
# Test health endpoint
curl http://localhost:3003/health
# Should return: {"success":true,"message":"Server is running"}
```

### **Check Broadcast Endpoint:**
```bash
# Test broadcast endpoint
curl -X POST http://localhost:3003/api/broadcast/test-channel
# Should return broadcast result or error details
```

### **Check Server Logs:**
Look for these messages when server starts:
```
🚀 Server running on 0.0.0.0:3003
📊 Environment: development
🔗 Health check: http://0.0.0.0:3003/health
```

## 🔧 **If Still Not Working:**

### **Check Route Registration:**
Make sure `server.js` has:
```javascript
const broadcastRoutes = require('./routes/broadcast');
app.use('/api/broadcast', broadcastRoutes);
```

### **Check File Exists:**
Make sure `routes/broadcast.js` exists and is properly formatted.

### **Check Port:**
Make sure server is running on port 3003 (or check your .env file for PORT).

## 🎯 **Expected Results:**

After restarting server:
- ✅ **Health endpoint works**: `http://localhost:3003/health`
- ✅ **Broadcast endpoint found**: `http://localhost:3003/api/broadcast/test-channel`
- ✅ **Extension works**: Click "LINEテスト" button
- ✅ **LINE channel receives**: Test message appears

## 🚀 **Quick Commands:**

```bash
# 1. Stop server (Ctrl+C)
# 2. Restart server
npm start

# 3. Test endpoint
node test-broadcast-endpoint.js

# 4. Test in extension
# Click "LINEテスト" button
```

## 📋 **Summary:**

The "Endpoint not found" error is almost always caused by **server not being restarted** after adding new routes. 

**Solution**: Restart the server and the broadcast endpoint will work!
