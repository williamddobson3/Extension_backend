const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

/**
 * Specialized scraper for Kao Kirei sites that only extracts product information
 * This prevents notifications for non-product changes like ads, scripts, etc.
 */
class KaoKireiProductScraper {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    /**
     * Extract only product information from Kao Kirei pages
     * @param {string} url - The URL to scrape
     * @returns {Object} Scraping result with product data
     */
    async scrapeProducts(url) {
        try {
            console.log(`🔍 Scraping products from: ${url}`);
            
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                timeout: 30000,
                maxRedirects: 5,
                validateStatus: (status) => status < 400
            });

            const $ = cheerio.load(response.data);
            
            // Extract only product information
            const products = this.extractProducts($);
            
            // Create a hash based only on product data
            const productHash = this.createProductHash(products);
            
            console.log(`✅ Extracted ${products.length} products`);
            
            return {
                success: true,
                products: products,
                productHash: productHash,
                productCount: products.length,
                statusCode: response.status,
                responseTime: response.headers['x-response-time'] || 0,
                method: 'kao_kirei_product_scraper'
            };

        } catch (error) {
            console.error(`❌ Error scraping products from ${url}:`, error.message);
            return {
                success: false,
                error: error.message,
                method: 'kao_kirei_product_scraper'
            };
        }
    }

    /**
     * Extract product information from the page
     * @param {Object} $ - Cheerio object
     * @returns {Array} Array of product objects
     */
    extractProducts($) {
        const products = [];
        
        // Find all product items using the specific Kao Kirei structure
        $('.kirei-relativeProductPack__list__item, .kirei-KireiStatusProductLinkPack__list__item').each((index, element) => {
            const $item = $(element);
            
            // Extract product name
            const productName = $item.find('.g-TileLinkVUnit__leadBlock__title .cmn-richtext span').text().trim();
            
            // Extract category
            const category = $item.find('.kirei-relativeProductPack__list__item__category .cmn-richtext span').text().trim();
            
            // Extract status (製造終了品, 製造終了予定品, etc.)
            const status = $item.find('.g-LabelTagUnit.is-endOfManufacture .cmn-richtext span').text().trim();
            
            // Extract regulation info (医薬部外品, etc.)
            const regulation = $item.find('.g-LabelTagUnit.is-quasi-drug .cmn-richtext span').text().trim();
            
            // Extract product link
            const productLink = $item.find('a.g-TileLinkVUnit').attr('href');
            
            // Only include products that have a name (filter out empty items)
            if (productName) {
                products.push({
                    name: productName,
                    category: category,
                    status: status,
                    regulation: regulation,
                    link: productLink,
                    index: index
                });
            }
        });

        return products;
    }

    /**
     * Create a hash based only on product data
     * @param {Array} products - Array of product objects
     * @returns {string} Hash of the product data
     */
    createProductHash(products) {
        // Create a normalized string of product data
        const productData = products.map(product => ({
            name: product.name,
            category: product.category,
            status: product.status,
            regulation: product.regulation
        })).sort((a, b) => a.name.localeCompare(b.name)); // Sort for consistent hashing
        
        const dataString = JSON.stringify(productData);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Compare product lists to detect changes
     * @param {Array} currentProducts - Current product list
     * @param {Array} previousProducts - Previous product list
     * @returns {Object} Change detection result
     */
    compareProducts(currentProducts, previousProducts) {
        const changes = {
            hasChanged: false,
            changeType: null,
            addedProducts: [],
            removedProducts: [],
            modifiedProducts: [],
            summary: 'No product changes detected'
        };

        if (!previousProducts || previousProducts.length === 0) {
            return {
                hasChanged: true,
                changeType: 'initial_scan',
                addedProducts: currentProducts,
                removedProducts: [],
                modifiedProducts: [],
                summary: `Initial scan found ${currentProducts.length} products`
            };
        }

        // Create maps for easier comparison
        const currentMap = new Map(currentProducts.map(p => [p.name, p]));
        const previousMap = new Map(previousProducts.map(p => [p.name, p]));

        // Find added products
        for (const product of currentProducts) {
            if (!previousMap.has(product.name)) {
                changes.addedProducts.push(product);
                changes.hasChanged = true;
            }
        }

        // Find removed products
        for (const product of previousProducts) {
            if (!currentMap.has(product.name)) {
                changes.removedProducts.push(product);
                changes.hasChanged = true;
            }
        }

        // Find modified products (same name but different details)
        for (const product of currentProducts) {
            if (previousMap.has(product.name)) {
                const previousProduct = previousMap.get(product.name);
                if (this.hasProductChanged(product, previousProduct)) {
                    changes.modifiedProducts.push({
                        name: product.name,
                        current: product,
                        previous: previousProduct
                    });
                    changes.hasChanged = true;
                }
            }
        }

        // Determine change type and summary
        if (changes.hasChanged) {
            if (changes.addedProducts.length > 0 && changes.removedProducts.length > 0) {
                changes.changeType = 'mixed';
                changes.summary = `${changes.addedProducts.length} products added, ${changes.removedProducts.length} products removed`;
            } else if (changes.addedProducts.length > 0) {
                changes.changeType = 'products_added';
                changes.summary = `${changes.addedProducts.length} products added`;
            } else if (changes.removedProducts.length > 0) {
                changes.changeType = 'products_removed';
                changes.summary = `${changes.removedProducts.length} products removed`;
            } else if (changes.modifiedProducts.length > 0) {
                changes.changeType = 'products_modified';
                changes.summary = `${changes.modifiedProducts.length} products modified`;
            }
        }

        return changes;
    }

    /**
     * Check if a product has changed
     * @param {Object} current - Current product
     * @param {Object} previous - Previous product
     * @returns {boolean} True if product has changed
     */
    hasProductChanged(current, previous) {
        return (
            current.category !== previous.category ||
            current.status !== previous.status ||
            current.regulation !== previous.regulation
        );
    }

    /**
     * Generate notification message for product changes
     * @param {Object} changes - Change detection result
     * @param {string} siteName - Name of the site
     * @returns {string} Notification message
     */
    generateNotificationMessage(changes, siteName) {
        if (!changes.hasChanged) {
            return null;
        }

        let message = `🔄 ${siteName} で商品の変更が検出されました。\n\n`;
        
        if (changes.addedProducts.length > 0) {
            message += `📦 新しく追加された商品 (${changes.addedProducts.length}件):\n`;
            changes.addedProducts.slice(0, 5).forEach(product => {
                message += `• ${product.name}\n`;
            });
            if (changes.addedProducts.length > 5) {
                message += `• 他 ${changes.addedProducts.length - 5} 件...\n`;
            }
            message += '\n';
        }

        if (changes.removedProducts.length > 0) {
            message += `🗑️ 削除された商品 (${changes.removedProducts.length}件):\n`;
            changes.removedProducts.slice(0, 5).forEach(product => {
                message += `• ${product.name}\n`;
            });
            if (changes.removedProducts.length > 5) {
                message += `• 他 ${changes.removedProducts.length - 5} 件...\n`;
            }
            message += '\n';
        }

        if (changes.modifiedProducts.length > 0) {
            message += `✏️ 変更された商品 (${changes.modifiedProducts.length}件):\n`;
            changes.modifiedProducts.slice(0, 3).forEach(change => {
                message += `• ${change.name}\n`;
            });
            if (changes.modifiedProducts.length > 3) {
                message += `• 他 ${changes.modifiedProducts.length - 3} 件...\n`;
            }
        }

        message += `\n詳細はサイトをご確認ください。`;
        
        return message;
    }
}

module.exports = KaoKireiProductScraper;
