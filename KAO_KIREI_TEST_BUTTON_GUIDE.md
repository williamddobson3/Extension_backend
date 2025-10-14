# Kao Kirei Test Button Implementation Guide

## Overview

This guide explains the implementation of the Kao Kirei test button feature that allows users to test the scraping functionality for the two Kao Kirei sites and send notifications to all users when changes are detected.

## 🎯 **Feature Description**

The Kao Kirei test button provides:
- **One-click testing** of both Kao Kirei sites (`khg` and `kbb`)
- **Real-time scraping** using the specialized product-only change detection
- **Global notifications** to all users when changes are detected
- **Detailed results** showing what changes were found
- **Performance metrics** including processing time and notification counts

## 🏗️ **Implementation Components**

### 1. Frontend (Extension Popup)

#### HTML Changes (`extension/popup.html`)
```html
<!-- Added to the test-buttons section -->
<button id="testKaoKireiBtn" class="btn btn-secondary">
    <i class="fas fa-flask"></i> 花王キレイテスト
</button>
```

#### JavaScript Changes (`extension/popup.js`)
```javascript
// Added to setupNotificationSettings function
const testKaoKireiBtn = document.getElementById('testKaoKireiBtn');
testKaoKireiBtn.addEventListener('click', testKaoKireiScraping);

// New function for Kao Kirei testing
async function testKaoKireiScraping() {
    // Shows loading state, calls API, displays results
}
```

### 2. Backend API (`routes/kaoKireiTest.js`)

#### Main Test Endpoint
```javascript
POST /api/kao-kirei/test-scraping
```
- Tests both Kao Kirei sites
- Uses specialized product-only change detection
- Sends notifications to all users if changes detected
- Returns detailed results

#### Status Endpoint
```javascript
GET /api/kao-kirei/status
```
- Shows current status of Kao Kirei sites
- Displays recent changes
- Provides monitoring information

#### Manual Check Endpoint
```javascript
POST /api/kao-kirei/check/:siteId
```
- Manually triggers check for specific site
- Useful for individual site testing

### 3. Server Integration (`server.js`)

```javascript
// Added route import
const kaoKireiTestRoutes = require('./routes/kaoKireiTest');

// Added route registration
app.use('/api/kao-kirei', kaoKireiTestRoutes);
```

## 🔧 **How It Works**

### 1. User Clicks Test Button
- Button shows loading state with spinner
- API call is made to `/api/kao-kirei/test-scraping`

### 2. Backend Processing
```javascript
// Get Kao Kirei sites from database
const sites = await pool.execute(`
    SELECT id, url, name, scraping_method, is_global_notification
    FROM monitored_sites 
    WHERE scraping_method = 'dom_parser' 
    AND is_global_notification = 1
    AND is_active = 1
`);

// Test each site using KaoKireiIntegrationService
for (const site of sites) {
    const result = await kaoKireiService.processSite(site);
    // Process results and detect changes
}
```

### 3. Change Detection
- Uses specialized product-only change detection
- Compares current vs previous product lists
- Detects additions, removals, and modifications
- Generates detailed change information

### 4. Notification Sending
```javascript
// If changes detected, send notifications to all users
if (results.changesDetected > 0) {
    const users = await pool.execute(`
        SELECT id, username, email, line_user_id, email_enabled, line_enabled
        FROM users 
        WHERE is_active = 1 AND is_blocked = 0
    `);
    
    // Send notifications for each change
    for (const change of results.changes) {
        await bulkNotificationService.notifySiteChange(change.siteId, changeData);
    }
}
```

### 5. Results Display
- Shows comprehensive test results
- Displays number of sites tested
- Shows changes detected and notifications sent
- Lists specific changes found
- Shows processing time

## 📊 **API Response Format**

### Test Scraping Response
```json
{
    "success": true,
    "message": "Kao Kirei scraping test completed successfully",
    "results": {
        "totalSites": 2,
        "changesDetected": 1,
        "notificationsSent": 5,
        "processingTime": 2500,
        "changes": [
            {
                "siteId": 1,
                "siteName": "花王 家庭用品の製造終了品一覧",
                "siteUrl": "https://www.kao-kirei.com/ja/expire-item/khg/?tw=khg",
                "changeType": "Product changes detected",
                "changeDetails": "New products added to the list",
                "timestamp": "2024-01-15T10:30:00.000Z"
            }
        ],
        "errors": []
    }
}
```

### Status Response
```json
{
    "success": true,
    "data": {
        "sites": [
            {
                "id": 1,
                "url": "https://www.kao-kirei.com/ja/expire-item/khg/?tw=khg",
                "name": "花王 家庭用品の製造終了品一覧",
                "last_check": "2024-01-15T10:30:00.000Z",
                "last_status_code": 200,
                "last_response_time_ms": 1200,
                "is_active": 1,
                "is_global_notification": 1
            }
        ],
        "recentChanges": [
            {
                "site_id": 1,
                "created_at": "2024-01-15T10:30:00.000Z",
                "changes_detected": 1,
                "reason": "Product list changed",
                "site_name": "花王 家庭用品の製造終了品一覧",
                "url": "https://www.kao-kirei.com/ja/expire-item/khg/?tw=khg"
            }
        ]
    }
}
```

## 🎨 **User Interface**

### Button Appearance
- **Icon**: Flask icon (`fas fa-flask`) to represent testing
- **Color**: Secondary button style (`btn btn-secondary`)
- **Text**: "花王キレイテスト" (Kao Kirei Test)

### Loading State
- **Spinner**: Rotating spinner icon
- **Text**: "テスト中..." (Testing...)
- **Disabled**: Button becomes disabled during testing

### Results Display
- **Success**: Green notification with detailed results
- **Error**: Red notification with error message
- **Info**: Blue notification for status updates

## 🧪 **Testing**

### Manual Testing
1. Open the extension popup
2. Navigate to the "通知設定" (Notifications) tab
3. Click the "花王キレイテスト" button
4. Observe the loading state and results

### Automated Testing
```bash
# Run the test script
node test-kao-kirei-button.js
```

### Test Scenarios
1. **No Changes**: Should show "No changes detected" message
2. **Changes Detected**: Should show detailed change information
3. **API Error**: Should show error message
4. **Network Error**: Should show network error message

## 🔒 **Security Considerations**

### Authentication
- Requires valid JWT token
- Token must be provided in Authorization header
- Invalid tokens return 401 Unauthorized

### Rate Limiting
- No specific rate limiting for test endpoint
- Relies on general API rate limiting
- Test should not be called excessively

### Data Privacy
- Only processes publicly available Kao Kirei data
- No sensitive user data is exposed
- Results are logged for debugging purposes

## 📈 **Performance Metrics**

### Expected Performance
- **Processing Time**: 2-5 seconds for both sites
- **Memory Usage**: Minimal impact
- **Network**: 2-3 HTTP requests per test
- **Database**: 5-10 queries per test

### Optimization
- Uses specialized product-only scraping
- Efficient database queries with indexes
- Minimal data transfer
- Cached results where possible

## 🐛 **Troubleshooting**

### Common Issues

#### 1. Button Not Appearing
- **Cause**: HTML not updated or JavaScript error
- **Solution**: Check browser console for errors
- **Fix**: Ensure popup.html and popup.js are updated

#### 2. API Endpoint Not Found
- **Cause**: Route not registered in server.js
- **Solution**: Check server.js for route registration
- **Fix**: Add `app.use('/api/kao-kirei', kaoKireiTestRoutes);`

#### 3. Authentication Errors
- **Cause**: Invalid or missing JWT token
- **Solution**: Check token generation and validation
- **Fix**: Ensure user is logged in before testing

#### 4. No Sites Found
- **Cause**: Kao Kirei sites not in database
- **Solution**: Check database for sites with `scraping_method = 'dom_parser'`
- **Fix**: Run database setup script

### Debug Mode
```javascript
// Enable debug logging
console.log('🧪 Kao Kirei Test Results:', results);
console.log('📊 Changes Detected:', changes);
console.log('📧 Notifications Sent:', notificationsSent);
```

## 🚀 **Deployment**

### 1. Update Extension Files
```bash
# Copy updated files to extension directory
cp extension/popup.html dist/extension/
cp extension/popup.js dist/extension/
```

### 2. Update Backend
```bash
# Ensure new route is available
npm install  # if new dependencies added
node server.js  # restart server
```

### 3. Test Deployment
```bash
# Run test script
node test-kao-kirei-button.js

# Check extension functionality
# Open extension popup and test button
```

## 📋 **Maintenance**

### Regular Tasks
- Monitor test results for accuracy
- Check for false positives/negatives
- Update scraping logic if Kao Kirei site structure changes
- Review notification delivery rates

### Updates
- Update scraping selectors if site structure changes
- Adjust change detection sensitivity
- Improve error handling and user feedback
- Add more detailed logging

## 🎉 **Conclusion**

The Kao Kirei test button provides a powerful tool for:
- **Testing scraping functionality** in real-time
- **Verifying change detection** works correctly
- **Sending notifications** to all users when changes occur
- **Monitoring system performance** and accuracy

The implementation is robust, user-friendly, and provides comprehensive feedback to users about the scraping and notification system.
