# 🚀 Admin User Blocking - Quick Start Guide

## ⚡ 5-Minute Setup

### For New Installations

```bash
# 1. Create database
mysql -u root -p < database.sql

# 2. Start server
npm start

# 3. Access admin panel
http://your-server:3000/admin
```

### For Existing Installations

```bash
# 1. Run migration
mysql -u root -p website_monitor < database/add-blocking-functionality.sql

# 2. Restart server
pm2 restart all
# or
npm start

# 3. Access admin panel
http://your-server:3000/admin
```

---

## 🎯 How to Use

### Block a User

1. Open admin panel: `http://your-server:3000/admin`
2. Find user in list
3. Click **🚫 Ban icon**
4. Confirm action
5. ✅ User is blocked (shows red "ブロック済み" badge)

**Result:** User cannot login or access system

### Unblock a User

1. Find blocked user (red badge)
2. Click **✓ Check icon**
3. Confirm action
4. ✅ User is unblocked (shows green "アクティブ" badge)

**Result:** User can login and access system again

---

## 📊 Admin Panel Features

### User Status Indicators

| Badge | Color | Meaning |
|-------|-------|---------|
| アクティブ | 🟢 Green | User is active |
| ブロック済み | 🔴 Red | User is blocked |
| 管理者 | 🔵 Blue | Administrator |

### Actions Available

- **🚫 Block** - Prevent user access
- **✓ Unblock** - Restore user access
- **🗑️ Delete** - Permanently remove user

---

## 🔒 What Blocking Does

### When User is Blocked:

✅ **Immediate Effects:**
- User is logged out instantly
- Cannot login (gets "Account is deactivated")
- All API access denied
- Active sessions terminated

✅ **Data Preserved:**
- User account remains in database
- Monitored sites preserved
- Notification history kept
- Can be unblocked anytime

❌ **Blocked Actions:**
- Login
- View sites
- Receive notifications
- Access any system feature

---

## 🛡️ Security Features

1. **Admin Protection**
   - Admin users cannot be blocked
   - Prevents system lockout

2. **Instant Effect**
   - Blocking takes effect immediately
   - No grace period

3. **Audit Trail**
   - All actions logged in admin_notifications
   - Can track who blocked whom

---

## 🧪 Testing

### Quick Test

```bash
# Run the comprehensive test suite
node test-user-blocking.js
```

**Tests:**
- ✅ User blocking
- ✅ User unblocking  
- ✅ Login prevention
- ✅ Token invalidation
- ✅ Database integrity

### Manual Test

1. **Create test user** (via registration)
2. **Login as test user** → Should work ✅
3. **Admin blocks test user**
4. **Try login again** → Should fail ❌ ("Account is deactivated")
5. **Admin unblocks test user**
6. **Login again** → Should work ✅

---

## 📝 Database Quick Reference

### Check User Status

```sql
-- View all users with status
SELECT id, username, email, is_active, is_admin 
FROM users;

-- View only blocked users
SELECT * FROM v_blocked_users;
```

### Manual Operations

```sql
-- Block a user
UPDATE users SET is_active = FALSE WHERE id = 5;

-- Unblock a user
UPDATE users SET is_active = TRUE WHERE id = 5;

-- Using stored procedure
CALL sp_block_user(5, 1);    -- Block user 5 (admin 1 performing action)
CALL sp_unblock_user(5, 1);  -- Unblock user 5
```

---

## ⚠️ Important Notes

### Admin Users
- **Cannot be blocked** by other admins
- Always have `is_admin = TRUE`
- Default admin: username=`admin`, password=`admin123` (CHANGE THIS!)

### Blocked Users
- Status: `is_active = FALSE`
- Cannot login or access system
- Data is NOT deleted (preserved)
- Can be unblocked anytime

### Deletion vs Blocking
- **Block** = Temporary restriction (reversible)
- **Delete** = Permanent removal (irreversible)

---

## 🔧 Troubleshooting

### Blocked user can still login?

```bash
# Check database
mysql -u root -p website_monitor
SELECT is_active FROM users WHERE username = 'problematic_user';

# If is_active = TRUE, block again
UPDATE users SET is_active = FALSE WHERE username = 'problematic_user';

# Restart server
pm2 restart all
```

### Cannot access admin panel?

```bash
# Check if you're admin
SELECT username, is_admin FROM users WHERE username = 'your_username';

# If is_admin = FALSE, make yourself admin
UPDATE users SET is_admin = TRUE WHERE username = 'your_username';
```

### Migration failed?

```bash
# Re-run migration (safe to run multiple times)
mysql -u root -p website_monitor < database/add-blocking-functionality.sql

# Check column exists
DESCRIBE users;
# Should show 'is_active' column
```

---

## 📚 Additional Resources

- **Full Documentation:** `ADMIN_USER_BLOCKING_GUIDE.md`
- **Database Schema:** `database.sql`
- **Migration Script:** `database/add-blocking-functionality.sql`
- **Test Suite:** `test-user-blocking.js`

---

## ✅ Checklist

**Setup:**
- [ ] Database migration run
- [ ] Server restarted
- [ ] Admin panel accessible
- [ ] Test blocking/unblocking works

**Production Ready:**
- [ ] Changed default admin password
- [ ] Tested blocking functionality
- [ ] Documented admin procedures
- [ ] Set up monitoring/logging

---

## 📞 Quick Support

**Common Commands:**

```bash
# Test blocking system
node test-user-blocking.js

# Check blocked users
mysql -u root -p website_monitor -e "SELECT * FROM v_blocked_users;"

# View admin panel logs
pm2 logs | grep -i block

# Restart server
pm2 restart all
```

---

**🎉 You're ready to manage users!**

The blocking system is fully functional and production-ready.

