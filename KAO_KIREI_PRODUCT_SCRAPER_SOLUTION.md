# Kao Kirei Product-Only Change Detection Solution

## Problem Statement
The current scraping system detects any changes on web pages, including advertisements, scripts, and other non-product content. For Kao Kirei sites, users only want notifications when actual products (商品) are added or removed, not when other parts of the page change.

## Solution Overview
Created a specialized product-only change detection system that:
1. **Extracts only product information** from Kao Kirei pages
2. **Compares product lists** instead of entire page content
3. **Sends notifications only for product changes** (additions, removals, modifications)
4. **Maintains global notification system** for all users

## Key Components

### 1. KaoKireiProductScraper (`services/kaoKireiProductScraper.js`)
**Purpose**: Specialized scraper that extracts only product information from Kao Kirei pages.

**Key Features**:
- Extracts product name, category, status, regulation, and link
- Creates hash based only on product data (not entire page)
- Compares product lists to detect additions, removals, and modifications
- Generates detailed notification messages

**Product Extraction Logic**:
```javascript
// Extracts products using specific Kao Kirei CSS selectors
$('.kirei-relativeProductPack__list__item, .kirei-KireiStatusProductLinkPack__list__item').each((index, element) => {
    const productName = $item.find('.g-TileLinkVUnit__leadBlock__title .cmn-richtext span').text().trim();
    const category = $item.find('.kirei-relativeProductPack__list__item__category .cmn-richtext span').text().trim();
    const status = $item.find('.g-LabelTagUnit.is-endOfManufacture .cmn-richtext span').text().trim();
    // ... more extraction logic
});
```

### 2. KaoKireiChangeDetector (`services/kaoKireiChangeDetector.js`)
**Purpose**: Specialized change detector that only detects changes in product information.

**Key Features**:
- Compares current vs previous product lists
- Detects added, removed, and modified products
- Stores product-specific data in database
- Handles global vs user-specific notifications

**Change Detection Logic**:
```javascript
// Compares product lists to detect changes
const changes = {
    hasChanged: false,
    changeType: null,
    addedProducts: [],
    removedProducts: [],
    modifiedProducts: []
};

// Find added products
for (const product of currentProducts) {
    if (!previousMap.has(product.name)) {
        changes.addedProducts.push(product);
        changes.hasChanged = true;
    }
}
```

### 3. KaoKireiIntegrationService (`services/kaoKireiIntegrationService.js`)
**Purpose**: Integration service that connects the specialized scraper with the existing notification system.

**Key Features**:
- Checks if site is a Kao Kirei site (scraping_method = 'dom_parser')
- Uses specialized scraper for Kao Kirei sites
- Falls back to regular scraper for other sites
- Handles both global and user-specific notifications

### 4. Enhanced Database Schema
**New Table**: `product_data`
```sql
CREATE TABLE `product_data` (
  `id` int(11) NOT NULL,
  `site_id` int(11) NOT NULL,
  `site_check_id` int(11) NOT NULL,
  `product_name` varchar(500) NOT NULL,
  `product_category` varchar(200) DEFAULT NULL,
  `product_status` varchar(100) DEFAULT NULL,
  `product_regulation` varchar(100) DEFAULT NULL,
  `product_link` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Enhanced Fields**:
- `monitored_sites.scraping_method`: 'api' or 'dom_parser'
- `monitored_sites.is_global_notification`: Boolean for global notifications
- `notifications.is_global`: Boolean for global notifications

### 5. Enhanced Website Scraper (`services/enhancedWebsiteScraper.js`)
**Purpose**: Main scraper that automatically detects Kao Kirei sites and uses the appropriate scraper.

**Key Features**:
- Automatically detects Kao Kirei sites by checking `scraping_method = 'dom_parser'`
- Uses specialized product scraper for Kao Kirei sites
- Uses regular scraper for other sites
- Maintains backward compatibility

## How It Works

### 1. Site Detection
```javascript
// Check if this is a Kao Kirei site
const [sites] = await pool.execute(`
    SELECT scraping_method, is_global_notification 
    FROM monitored_sites 
    WHERE id = ? AND scraping_method = 'dom_parser'
`, [siteId]);

if (sites.length > 0) {
    // Use specialized Kao Kirei scraper
    return await this.kaoKireiService.checkKaoKireiSite(siteId);
}
```

### 2. Product Extraction
The scraper extracts only product information using specific CSS selectors:
- Product name: `.g-TileLinkVUnit__leadBlock__title .cmn-richtext span`
- Category: `.kirei-relativeProductPack__list__item__category .cmn-richtext span`
- Status: `.g-LabelTagUnit.is-endOfManufacture .cmn-richtext span`
- Regulation: `.g-LabelTagUnit.is-quasi-drug .cmn-richtext span`

### 3. Change Detection
Instead of comparing entire page content, the system:
1. Extracts current product list
2. Compares with previous product list
3. Detects additions, removals, and modifications
4. Only triggers notifications for actual product changes

### 4. Notification System
- **Global Notifications**: Kao Kirei sites send notifications to ALL users
- **User-Specific Notifications**: Other sites send notifications only to the user who registered them
- **Product-Specific Messages**: Detailed messages showing which products were added/removed/modified

## Benefits

### 1. Reduced False Positives
- **Before**: Notifications for any page change (ads, scripts, etc.)
- **After**: Notifications only for product changes

### 2. Better User Experience
- Users only get relevant notifications
- Detailed information about what products changed
- Clear distinction between added, removed, and modified products

### 3. Maintained Functionality
- Global notifications for Kao Kirei sites
- User-specific notifications for other sites
- Backward compatibility with existing system

## Usage Examples

### 1. Testing the System
```bash
# Run the test script
node test-kao-kirei-product-scraper.js
```

### 2. Using the Enhanced Scraper
```javascript
const EnhancedWebsiteScraper = require('./services/enhancedWebsiteScraper');
const scraper = new EnhancedWebsiteScraper();

// Automatically detects Kao Kirei sites and uses appropriate scraper
await scraper.scrapeAllSites();
```

### 3. Manual Product Change Detection
```javascript
const KaoKireiIntegrationService = require('./services/kaoKireiIntegrationService');
const service = new KaoKireiIntegrationService(dbConfig);

// Check specific Kao Kirei site
const result = await service.checkKaoKireiSite(siteId);
```

## Configuration

### 1. Database Setup
The system automatically uses the enhanced database schema with:
- Product data table for storing product information
- Enhanced monitoring sites table with scraping method
- Global notification support

### 2. Site Configuration
Kao Kirei sites are automatically configured with:
- `scraping_method = 'dom_parser'`
- `is_global_notification = 1`
- Specialized product extraction

### 3. Notification Settings
- Global notifications for Kao Kirei sites
- User-specific notifications for other sites
- Detailed product change messages

## Monitoring and Logging

The system provides comprehensive logging:
- Product extraction details
- Change detection results
- Notification delivery status
- Error handling and recovery

## Future Enhancements

1. **Product Image Tracking**: Monitor product image changes
2. **Price Monitoring**: Track product price changes
3. **Category Analysis**: Analyze product category trends
4. **Advanced Filtering**: Filter notifications by product type or category

## Conclusion

This solution successfully addresses the user's concern about receiving notifications for non-product changes on Kao Kirei sites. The specialized product-only change detection system ensures that users only receive notifications when actual products are added, removed, or modified, significantly improving the user experience while maintaining the global notification system for these important sites.
