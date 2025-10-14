# Enhanced Kao Kirei Notifications Guide

## Overview

This guide explains the enhanced notification system for Kao Kirei sites that sends detailed product information when products are added, removed, or changed on the two Kao Kirei sites.

## 🎯 **Enhanced Features**

### **Detailed Product Information**
- **Product Names**: Exact product names as they appear on the site
- **Categories**: Product categories (スキンケア, ヘアケア, etc.)
- **Status**: Product status (製造終了, etc.)
- **Regulation**: Product regulation type (化粧品, 医薬部外品, etc.)
- **Links**: Direct links to product pages

### **Change Types**
- **Added Products**: New products that appear on the site
- **Removed Products**: Products that are no longer listed
- **Modified Products**: Products that have been changed

### **Notification Formats**
- **Email**: HTML formatted with detailed product information
- **LINE**: Text format with product summaries
- **Both**: Include change summaries and specific product details

## 🏗️ **Implementation Components**

### 1. Enhanced Bulk Notification Service (`services/enhancedBulkNotificationService.js`)

#### **Key Methods**
```javascript
// Main method for Kao Kirei product notifications
async notifyKaoKireiProductChange(siteId, productChanges)

// Create detailed text notification
createKaoKireiProductNotification(site, productChanges)

// Create HTML email notification
createKaoKireiProductHtmlNotification(site, productChanges)
```

#### **Product Changes Data Structure**
```javascript
const productChanges = {
    addedProducts: [
        {
            name: 'ビオレ　ザクレンズオイルメイク落とし　プラス　本体　１９０ｍｌ',
            category: 'スキンケア',
            status: '製造終了',
            regulation: '化粧品',
            link: 'https://www.kao-kirei.com/ja/products/biore/'
        }
    ],
    removedProducts: [
        {
            name: '削除された商品名',
            category: 'スキンケア'
        }
    ],
    modifiedProducts: [
        {
            name: '変更された商品名',
            category: 'スキンケア',
            changes: '商品名が変更されました'
        }
    ],
    changeType: 'product_list_change',
    reason: 'New products added to the list'
};
```

### 2. Updated Integration Service (`services/kaoKireiIntegrationService.js`)

#### **Enhanced Notification Method**
```javascript
async sendProductChangeNotifications(siteId, changeResult, siteInfo) {
    // Prepare product changes data for enhanced notification
    const productChanges = {
        addedProducts: changeResult.addedProducts || [],
        removedProducts: changeResult.removedProducts || [],
        modifiedProducts: changeResult.modifiedProducts || [],
        changeType: changeResult.changeType,
        reason: changeResult.reason
    };

    // Use enhanced notification service
    const notificationResult = await enhancedBulkNotificationService.notifyKaoKireiProductChange(
        siteId, 
        productChanges
    );
}
```

### 3. Updated Test Route (`routes/kaoKireiTest.js`)

#### **Enhanced Test Notifications**
```javascript
// Send enhanced notifications for each change with product details
for (const change of results.changes) {
    const productChanges = {
        addedProducts: change.addedProducts || [],
        removedProducts: change.removedProducts || [],
        modifiedProducts: change.modifiedProducts || [],
        changeType: change.changeType,
        reason: change.changeDetails
    };

    const notificationResult = await enhancedBulkNotificationService.notifyKaoKireiProductChange(
        change.siteId,
        productChanges
    );
}
```

## 📧 **Notification Examples**

### **Email Notification (HTML)**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>花王キレイ商品情報更新通知</title>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏭 花王キレイ商品情報更新通知</h1>
            <p><strong>📊 サイト:</strong> 花王 家庭用品の製造終了品一覧</p>
            <p><strong>🌐 URL:</strong> https://www.kao-kirei.com/ja/expire-item/khg/?tw=khg</p>
            <p><strong>🕐 検出時刻:</strong> 2024-01-15 10:30:00</p>
        </div>
        
        <div class="product-section">
            <h2>📊 変更サマリー</h2>
            <p><strong>🆕 新商品追加:</strong> 2件</p>
            <p><strong>🗑️ 商品削除:</strong> 1件</p>
        </div>
        
        <div class="product-section">
            <h3>📦 新しく追加された商品:</h3>
            <ul>
                <li><strong>ビオレ　ザクレンズオイルメイク落とし　プラス　本体　１９０ｍｌ</strong>
                    <br/>カテゴリ: スキンケア
                    <br/>ステータス: 製造終了
                    <br/>規制: 化粧品
                    <br/><a href="https://www.kao-kirei.com/ja/products/biore/" target="_blank">商品ページ</a>
                </li>
            </ul>
        </div>
    </div>
</body>
</html>
```

### **LINE Notification (Text)**

```
🏭 花王キレイ商品情報更新通知

📊 サイト: 花王 家庭用品の製造終了品一覧
🌐 URL: https://www.kao-kirei.com/ja/expire-item/khg/?tw=khg
🕐 検出時刻: 2024-01-15 10:30:00

🆕 新商品追加: 2件
🗑️ 商品削除: 1件

📦 新しく追加された商品:
1. ビオレ　ザクレンズオイルメイク落とし　プラス　本体　１９０ｍｌ
   カテゴリ: スキンケア
   ステータス: 製造終了
   規制: 化粧品
   リンク: https://www.kao-kirei.com/ja/products/biore/

2. キュレル　泡洗顔料　本体　１５０ｍｌ
   カテゴリ: スキンケア
   ステータス: 製造終了
   規制: 化粧品
   リンク: https://www.kao-kirei.com/ja/products/curel/

🗑️ 削除された商品:
1. 旧商品名
   カテゴリ: スキンケア

この通知は、花王キレイ商品監視システムによって自動的に送信されました。
最新の商品情報をご確認ください。
```

## 🔧 **How It Works**

### **1. Product Change Detection**
1. **Scraping detects changes** in product lists
2. **Change detector identifies** added, removed, and modified products
3. **Product details are extracted** including name, category, status, regulation, and links

### **2. Enhanced Notification Creation**
1. **Product changes are formatted** into detailed notification messages
2. **HTML emails** include formatted product information with links
3. **LINE notifications** include product summaries and details
4. **Both formats** show change summaries and specific product information

### **3. Global Notification Sending**
1. **All active users** receive notifications for Kao Kirei sites
2. **User preferences** are respected (email/LINE settings)
3. **Detailed product information** is included in all notifications
4. **Success tracking** monitors notification delivery

## 📊 **Notification Data Flow**

```
Product Change Detection
         ↓
Enhanced Notification Service
         ↓
Product Details Formatting
         ↓
HTML Email + Text LINE
         ↓
All Active Users
         ↓
Success Tracking
```

## 🧪 **Testing**

### **Manual Testing**
```bash
# Run the enhanced notification test
node test-enhanced-kao-kirei-notifications.js
```

### **Test Scenarios**
1. **Added Products Only**: Tests notification for new products
2. **Removed Products Only**: Tests notification for deleted products
3. **Mixed Changes**: Tests notification for multiple change types
4. **Empty Changes**: Tests notification handling for no changes

### **Expected Results**
- ✅ **Detailed product information** in notifications
- ✅ **HTML formatted emails** with product details
- ✅ **Text LINE notifications** with product summaries
- ✅ **Change summaries** showing counts and types
- ✅ **Product-specific information** including links and categories

## 📈 **Performance Metrics**

### **Notification Content**
- **Product Details**: Name, category, status, regulation, link
- **Change Summary**: Count of added/removed/modified products
- **Timestamps**: When changes were detected
- **Site Information**: Site name and URL

### **User Experience**
- **Rich Information**: Users get detailed product information
- **Actionable Links**: Direct links to product pages
- **Clear Formatting**: Easy to read HTML and text formats
- **Comprehensive Details**: All relevant product information included

## 🔒 **Security & Privacy**

### **Data Handling**
- **Product Information**: Only publicly available data
- **User Privacy**: Respects user notification preferences
- **Secure Transmission**: Uses existing secure notification channels
- **Data Minimization**: Only necessary product information included

### **Access Control**
- **Global Notifications**: Only for Kao Kirei sites
- **User Preferences**: Respects email/LINE settings
- **Authentication**: Requires valid user authentication
- **Rate Limiting**: Uses existing notification rate limits

## 🚀 **Deployment**

### **Files Updated**
- ✅ `services/enhancedBulkNotificationService.js` - Enhanced notification service
- ✅ `services/kaoKireiIntegrationService.js` - Updated to use enhanced service
- ✅ `routes/kaoKireiTest.js` - Updated test route
- ✅ `test-enhanced-kao-kirei-notifications.js` - Test script

### **Backward Compatibility**
- ✅ **Legacy Support**: Regular sites still use original notification system
- ✅ **Automatic Detection**: Kao Kirei sites automatically use enhanced system
- ✅ **Fallback**: Falls back to regular notifications if enhanced fails

## 📋 **Maintenance**

### **Regular Tasks**
- **Monitor notification delivery** for Kao Kirei sites
- **Check product information accuracy** in notifications
- **Verify HTML email formatting** across different email clients
- **Test LINE notification formatting** for readability

### **Updates**
- **Product selectors**: Update if Kao Kirei site structure changes
- **Notification templates**: Improve formatting and information
- **Error handling**: Enhance error handling and user feedback
- **Performance**: Optimize notification generation and sending

## 🎉 **Benefits**

### **For Users**
- **Detailed Information**: Get specific product details in notifications
- **Actionable Links**: Direct access to product pages
- **Rich Formatting**: Easy to read HTML emails and text notifications
- **Comprehensive Updates**: Know exactly what products changed

### **For System**
- **Enhanced User Experience**: More valuable notifications
- **Better Engagement**: Users more likely to act on detailed information
- **Reduced Support**: Fewer questions about what changed
- **Improved Monitoring**: Better tracking of product changes

## 📊 **Success Metrics**

### **Expected Improvements**
- **User Engagement**: Higher click-through rates on notifications
- **User Satisfaction**: More detailed and useful notifications
- **Support Reduction**: Fewer questions about product changes
- **System Value**: More valuable monitoring system

### **Monitoring**
- **Notification Delivery**: Track success rates
- **User Feedback**: Monitor user satisfaction
- **Product Accuracy**: Verify product information correctness
- **Performance**: Monitor notification generation speed

## 🎯 **Conclusion**

The enhanced Kao Kirei notification system provides:

- **✅ Detailed Product Information** - Users get specific product details
- **✅ Rich Notification Formats** - HTML emails and formatted text
- **✅ Comprehensive Change Details** - Know exactly what changed
- **✅ Actionable Information** - Direct links to product pages
- **✅ Enhanced User Experience** - More valuable and useful notifications

The system successfully addresses the requirement to send detailed product information when products are added, removed, or changed on the Kao Kirei sites, providing users with comprehensive and actionable notifications.
