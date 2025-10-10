# 🔒 Administrator User Blocking System

## 📋 Overview

The Website Monitor system includes **comprehensive user blocking functionality** that allows administrators to prevent users from accessing the system after registration. This is a security feature to manage user access and prevent unauthorized use.

---

## 🎯 Key Features

### ✅ What Administrators Can Do:

1. **Block Users** - Prevent users from logging in or accessing the system
2. **Unblock Users** - Restore access to previously blocked users
3. **View User Status** - See which users are active or blocked
4. **Delete Users** - Permanently remove users (optional)
5. **Automatic Notifications** - Get notified when new users register

### 🔐 Security Features:

- **Admin Protection** - Admin users cannot be blocked by other admins
- **Instant Effect** - Blocked users are immediately logged out
- **Data Preservation** - User data remains in database when blocked (not deleted)
- **Audit Trail** - All blocking actions are logged

---

## 🖥️ Admin Panel Usage

### Accessing the Admin Panel

1. **Login with admin credentials**
2. **Navigate to:** `http://your-server:3000/admin`
3. **Or from extension:** Click "Open Admin Panel"

### User Status Indicators

The admin panel shows user status with color-coded badges:

| Badge | Status | Description |
|-------|--------|-------------|
| 🟢 **アクティブ** (Active) | Green | User can access the system |
| 🔴 **ブロック済み** (Blocked) | Red | User is blocked by admin |
| 🔵 **管理者** (Admin) | Blue | Administrator (cannot be blocked) |

### Blocking a User

1. **Find the user** in the user list
2. **Click the 🚫 Ban icon** in the Actions column
3. **Confirm** the blocking action
4. **Result:** User status changes to "ブロック済み" (Blocked)

**What Happens:**
- User is immediately logged out
- User cannot login again
- User's active sessions are terminated
- User receives "Account is deactivated" error on login attempt

### Unblocking a User

1. **Find the blocked user** (shows red "ブロック済み" badge)
2. **Click the ✓ Check icon** in the Actions column
3. **Confirm** the unblocking action
4. **Result:** User status changes to "アクティブ" (Active)

**What Happens:**
- User can login again
- User regains full system access
- All user's data is still intact

---

## 🛠️ Technical Implementation

### Database Structure

#### Users Table - `is_active` Column

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,  -- FALSE = Blocked
    is_admin BOOLEAN DEFAULT FALSE,
    ...
);
```

**Values:**
- `is_active = TRUE` → User is **ACTIVE** (can access system)
- `is_active = FALSE` → User is **BLOCKED** (cannot access system)

### API Endpoints

#### 1. Toggle User Active Status (Block/Unblock)

```http
PUT /api/users/:id/toggle-active
Authorization: Bearer {admin_token}
```

**Request:**
```json
// No body required
```

**Response:**
```json
{
  "success": true,
  "message": "User activated successfully",
  "is_active": true
}
```

#### 2. Get All Users (With Status)

```http
GET /api/users
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "is_active": true,
      "is_admin": false,
      "site_count": 3,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 3. Delete User

```http
DELETE /api/users/:id
Authorization: Bearer {admin_token}
```

---

## 🔒 Authentication Flow

### How Blocking Works:

```
1. User attempts to login
   ↓
2. System checks credentials
   ↓
3. System checks is_active status
   ↓
4a. If is_active = TRUE → ✅ Login successful
4b. If is_active = FALSE → ❌ "Account is deactivated"
```

### Middleware Protection:

Every API request goes through authentication:

```javascript
// middleware/auth.js
authenticateToken(req, res, next) {
    // Verify JWT token
    // Check if user.is_active = TRUE
    // If FALSE → Return 401 "User not found or inactive"
}
```

**Protected Routes:**
- All `/api/sites/*` endpoints
- All `/api/notifications/*` endpoints
- Profile and settings endpoints
- Monitoring functionality

---

## 📊 Database Operations

### Using Stored Procedures

#### Block a User

```sql
CALL sp_block_user(
    @user_id := 5,        -- User to block
    @admin_id := 1        -- Admin performing action
);
```

#### Unblock a User

```sql
CALL sp_unblock_user(
    @user_id := 5,        -- User to unblock
    @admin_id := 1        -- Admin performing action
);
```

#### Get All Blocked Users

```sql
CALL sp_get_blocked_users();
```

### Using Views

#### View All Blocked Users

```sql
SELECT * FROM v_blocked_users;
```

**Returns:**
- User ID, username, email
- Registration date
- Last status change
- Number of monitored sites

#### View User Activity

```sql
SELECT * FROM v_user_activity 
WHERE is_active = FALSE;
```

---

## 🚀 Deployment & Migration

### For New Installations

```bash
# Run the main database setup
mysql -u root -p < database.sql
```

### For Existing Databases

```bash
# Run the migration script to add blocking functionality
mysql -u root -p website_monitor < database/add-blocking-functionality.sql
```

**The migration script will:**
- ✅ Add `is_active` column if missing
- ✅ Create indexes for performance
- ✅ Set all existing users to active
- ✅ Create admin_notifications table
- ✅ Create stored procedures
- ✅ Create views
- ✅ Set up triggers

---

## 🧪 Testing the Functionality

### Test Case 1: Block a User

```bash
# 1. Login as regular user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# Result: ✅ Login successful, receive token

# 2. Admin blocks the user (via admin panel or API)

# 3. Try to login again
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# Result: ❌ "Account is deactivated"
```

### Test Case 2: Token Invalidation

```bash
# 1. User is logged in with valid token
curl -X GET http://localhost:3000/api/sites \
  -H "Authorization: Bearer {token}"

# Result: ✅ Returns user's sites

# 2. Admin blocks the user

# 3. Same request with same token
curl -X GET http://localhost:3000/api/sites \
  -H "Authorization: Bearer {token}"

# Result: ❌ 401 "User not found or inactive"
```

### Test Case 3: Unblock User

```bash
# 1. Blocked user tries to login
# Result: ❌ "Account is deactivated"

# 2. Admin unblocks the user

# 3. User tries to login again
# Result: ✅ Login successful
```

---

## 📝 Admin Notifications

The system automatically notifies admins of important events:

### Notification Types:

| Type | When Triggered | Example |
|------|---------------|---------|
| `user_registered` | New user signs up | "New user 'john' has registered" |
| `user_blocked` | Admin blocks a user | "User 'john' has been blocked" |
| `user_blocked` | Admin unblocks a user | "User 'john' has been unblocked" |
| `system_alert` | System issues | Various system messages |

### Viewing Notifications:

```sql
-- Get unread notifications for admin
SELECT * FROM admin_notifications 
WHERE admin_id = 1 AND is_read = FALSE
ORDER BY created_at DESC;

-- Mark as read
UPDATE admin_notifications 
SET is_read = TRUE 
WHERE id = 123;
```

---

## 🔍 Common Scenarios

### Scenario 1: Suspicious User Activity

**Problem:** User is performing suspicious actions  
**Solution:**
1. Go to admin panel
2. Find the user in list
3. Click block button (🚫)
4. User immediately loses access
5. Investigate user's data
6. Unblock if false alarm, delete if confirmed abuse

### Scenario 2: Temporary Account Suspension

**Problem:** Need to temporarily restrict a user  
**Solution:**
1. Block user (preserves all data)
2. User receives "Account is deactivated" message
3. When ready, unblock user
4. User can login again immediately

### Scenario 3: Bulk User Management

**Problem:** Need to block multiple users  
**Solution:**

Using SQL:
```sql
-- Block multiple users by email domain
UPDATE users 
SET is_active = FALSE 
WHERE email LIKE '%@spam-domain.com' 
AND is_admin = FALSE;

-- Block users with no activity
UPDATE users u
LEFT JOIN monitored_sites ms ON u.id = ms.user_id
SET u.is_active = FALSE
WHERE ms.id IS NULL 
AND u.created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
AND u.is_admin = FALSE;
```

---

## ⚠️ Important Notes

### Security Considerations:

1. **Admin users cannot be blocked**
   - System prevents admins from blocking other admins
   - Prevents lockout scenarios

2. **Data is NOT deleted when blocking**
   - User's sites, notifications, and history remain
   - Can be recovered if user is unblocked
   - Use DELETE for permanent removal

3. **Immediate effect**
   - Blocking takes effect instantly
   - User's current sessions are invalidated
   - No grace period

### Best Practices:

1. **Document blocking reasons**
   - Keep notes of why users were blocked
   - Use admin_notifications for audit trail

2. **Review blocked users periodically**
   - Check v_blocked_users view monthly
   - Clean up or delete old blocked accounts

3. **Communicate with users**
   - Email users before blocking (optional)
   - Provide contact for appeals

---

## 📊 Monitoring & Reports

### Get Blocking Statistics

```sql
-- Summary of user status
SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
    SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as blocked_users,
    SUM(CASE WHEN is_admin = TRUE THEN 1 ELSE 0 END) as admin_users,
    ROUND(SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as blocked_percentage
FROM users;
```

### Recent Blocking Activity

```sql
-- Users blocked in last 7 days
SELECT 
    u.username,
    u.email,
    u.updated_at as blocked_at,
    TIMESTAMPDIFF(DAY, u.created_at, u.updated_at) as days_before_block
FROM users u
WHERE u.is_active = FALSE 
  AND u.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY u.updated_at DESC;
```

---

## 🆘 Troubleshooting

### Issue: Cannot block a user

**Possible causes:**
- User is an admin (admins cannot be blocked)
- Insufficient permissions
- Database connection issue

**Solution:**
```sql
-- Check if user is admin
SELECT id, username, is_admin FROM users WHERE id = 123;

-- If not admin, try direct SQL
UPDATE users SET is_active = FALSE WHERE id = 123 AND is_admin = FALSE;
```

### Issue: Blocked user can still login

**Possible causes:**
- Old token still cached
- Middleware not checking is_active
- Database not updated

**Solution:**
1. Check database value: `SELECT is_active FROM users WHERE id = 123;`
2. Verify middleware is running
3. Clear user's token cache
4. Restart server

### Issue: Cannot unblock a user

**Possible causes:**
- Database write permissions
- User already active

**Solution:**
```sql
-- Check current status
SELECT id, username, is_active FROM users WHERE id = 123;

-- Force update
UPDATE users SET is_active = TRUE WHERE id = 123;
```

---

## 📚 Summary

### What You've Learned:

- ✅ How the blocking system works
- ✅ How to block/unblock users via admin panel
- ✅ Database structure and API endpoints
- ✅ Using stored procedures and views
- ✅ Testing and troubleshooting

### Quick Reference:

**Block User:** Admin Panel → Click 🚫 icon → Confirm  
**Unblock User:** Admin Panel → Click ✓ icon → Confirm  
**View Blocked Users:** `SELECT * FROM v_blocked_users;`  
**Blocked User Login:** Returns "Account is deactivated"  

---

## 📞 Support

For questions or issues with the blocking functionality:

1. Check this documentation
2. Review database/add-blocking-functionality.sql
3. Check admin panel console for errors
4. Review server logs for authentication failures

---

**System is ready for production use!** 🚀

