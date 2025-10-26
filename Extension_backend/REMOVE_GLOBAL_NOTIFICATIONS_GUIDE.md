# 🔧 Remove Global Notifications - Make Kao Kirei Sites Normal

## 📋 **What Changed**

Kao Kirei sites are now treated as **normal sites** instead of global notification sites.

### **Before:**
- ❌ Kao Kirei sites automatically created for all users
- ❌ Notifications sent to everyone regardless of whether they added the site
- ❌ Special `is_global_notification` flag set to 1

### **After:**
- ✅ Users must manually add Kao Kirei sites
- ✅ Notifications only sent to users who added the site
- ✅ Treated like any other monitored site

---

## 🗄️ **Database Changes**

### **1. Removed Default Data**
- ❌ Removed system_global user (ID: 0)
- ❌ Removed default Kao Kirei sites (IDs: 1, 2)
- ❌ Removed default global notifications

### **2. Keep Schema** 
- ✅ Keep `is_global_notification` column (for backward compatibility)
- ✅ Keep `is_global` column in notifications table
- ✅ But don't use them for Kao Kirei sites

---

## 🔧 **Backend Changes Required**

### **Files to Update:**

1. **`routes/kaoKireiTest.js`**
   - Remove `is_global_notification = 1` filter
   - Query user's own Kao Kirei sites only

2. **`services/enhancedBulkNotificationService.js`**
   - Remove global notification logic
   - Send notifications only to site owner

3. **`services/kaoKireiIntegrationService.js`**
   - Remove global notification checks
   - Treat as normal sites

4. **`services/kaoKireiChangeDetector.js`**
   - Remove `is_global_notification` checks
   - Process as normal site changes

5. **`services/enhancedWebsiteScraper.js`**
   - Remove global notification handling
   - Standard notification flow

---

## 📱 **Extension Changes Required**

### **All Extensions (extension/, Mac/, windows/):**

1. **Remove Kao Kirei Test Button** (if exists)
   - Users add sites manually now

2. **Allow Manual Addition**
   - Users can add Kao Kirei URLs like any other site
   - No special treatment needed

3. **Normal Notification Flow**
   - Notifications sent only to users who added the site

---

## 🚀 **Migration Steps**

### **For Existing Databases:**

```sql
-- Step 1: Remove global Kao Kirei sites
DELETE FROM monitored_sites 
WHERE is_global_notification = 1 
AND scraping_method = 'dom_parser';

-- Step 2: Remove system user (optional)
DELETE FROM users WHERE id = 0;

-- Step 3: Clean up global notifications
DELETE FROM notifications WHERE is_global = 1;
```

### **For New Installations:**
- Use updated `database.sql` (already updated)
- No default Kao Kirei sites created

---

## ✅ **Summary**

**Kao Kirei sites are now normal sites:**
- Users add them manually
- Notifications only to users who added them
- No special global notification logic
- Same behavior as any other monitored site

**URLs users can add:**
- `https://www.kao-kirei.com/ja/expire-item/khg/?tw=khg`
- `https://www.kao-kirei.com/ja/expire-item/kbb/?tw=kbb`

