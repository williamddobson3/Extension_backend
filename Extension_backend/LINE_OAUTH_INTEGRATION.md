# 🔗 LINE OAuth Integration - Automatic User ID Capture

## 🎯 **Goal**

Implement automatic LINE user ID capture when users log in or register, so notifications can be sent directly to their personal LINE accounts.

---

## 🔄 **Current vs New Flow**

### **❌ Current Flow (Manual)**
1. User manually enters LINE ID during registration
2. User must know their LINE user ID
3. No verification that LINE ID is valid
4. No automatic linking

### **✅ New Flow (OAuth)**
1. User clicks "LINEでログイン" or "LINEで登録"
2. Redirected to LINE OAuth page
3. User authorizes the app
4. System automatically captures LINE user ID
5. User account is linked to their LINE account
6. Notifications sent directly to their LINE

---

## 🏗️ **Implementation Plan**

### **1. Backend Changes**

#### **A. Enhanced LINE OAuth Routes**
- ✅ **`/api/line/login-url`** - Generate LINE login URL
- ✅ **`/api/line/callback`** - Handle OAuth callback
- ✅ **`/api/line/link-account`** - Link LINE account to existing user
- ✅ **`/api/line/unlink-account`** - Unlink LINE account

#### **B. Enhanced Authentication Routes**
- ✅ **`/auth/register-with-line`** - Register with LINE OAuth
- ✅ **`/auth/login-with-line`** - Login with LINE OAuth
- ✅ **`/auth/link-line`** - Link LINE to existing account

#### **C. Enhanced Notification System**
- ✅ **Use stored LINE user IDs** for targeted notifications
- ✅ **Send to specific users** instead of broadcast
- ✅ **Individual LINE push messages** per user

### **2. Frontend Changes**

#### **A. Updated UI**
- ✅ **"LINEでログイン" button** on login form
- ✅ **"LINEで登録" button** on registration form
- ✅ **"LINEアカウントをリンク" button** in settings
- ✅ **Remove manual LINE ID input** from registration

#### **B. Enhanced JavaScript**
- ✅ **LINE OAuth flow handling**
- ✅ **Automatic account linking**
- ✅ **Error handling and user feedback**

### **3. Database Changes**

#### **A. Enhanced User Table**
- ✅ **`line_user_id`** - Store LINE user ID
- ✅ **`line_display_name`** - Store LINE display name
- ✅ **`line_picture_url`** - Store LINE profile picture
- ✅ **`line_linked_at`** - When LINE was linked

#### **B. Enhanced Notifications Table**
- ✅ **`line_user_id`** - Target specific LINE user
- ✅ **`notification_type`** - 'email', 'line', 'both'

---

## 🔧 **Technical Implementation**

### **1. LINE OAuth Flow**

```javascript
// 1. User clicks "LINEでログイン"
const lineLoginUrl = await fetch('/api/line/login-url');
window.location.href = lineLoginUrl;

// 2. User authorizes on LINE
// 3. LINE redirects to callback with code
// 4. Backend exchanges code for user info
// 5. Backend creates/updates user account
// 6. User is logged in with LINE account linked
```

### **2. Notification System**

```javascript
// Send to specific LINE users
const lineUserIds = ['U1234567890', 'U0987654321'];
await sendLineNotifications(lineUserIds, message);

// Instead of broadcast to all
await sendLineBroadcast(message);
```

### **3. Account Linking**

```javascript
// Link LINE to existing account
await fetch('/auth/link-line', {
    method: 'POST',
    body: JSON.stringify({ lineCode: 'oauth_code' })
});

// Unlink LINE from account
await fetch('/auth/unlink-line', {
    method: 'POST'
});
```

---

## 📱 **User Experience**

### **Registration Flow**
1. User clicks "LINEで登録"
2. Redirected to LINE authorization
3. User authorizes the app
4. Account created with LINE linked
5. User logged in automatically

### **Login Flow**
1. User clicks "LINEでログイン"
2. Redirected to LINE authorization
3. User authorizes the app
4. User logged in with existing account

### **Account Management**
1. User can link LINE to existing account
2. User can unlink LINE from account
3. User can see LINE account status
4. User can update LINE settings

---

## 🎯 **Benefits**

- ✅ **Automatic LINE ID capture** - No manual input needed
- ✅ **Verified LINE accounts** - OAuth ensures valid accounts
- ✅ **Better user experience** - One-click login/registration
- ✅ **Targeted notifications** - Send to specific users
- ✅ **Account security** - OAuth is more secure
- ✅ **Real-time linking** - Instant account connection

---

## 📋 **Implementation Steps**

1. **Backend OAuth Routes** - Create LINE OAuth endpoints
2. **Enhanced Auth Routes** - Update registration/login
3. **Database Updates** - Add LINE account fields
4. **Frontend UI** - Add LINE OAuth buttons
5. **JavaScript Integration** - Handle OAuth flow
6. **Notification System** - Use stored LINE IDs
7. **Testing** - Test complete flow

---

**Date:** 2025-10-26  
**Status:** 🚧 **In Progress**

**This will provide seamless LINE integration with automatic user ID capture!**
