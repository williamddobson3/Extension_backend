#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { pool } = require('../config/database');
const bulkNotificationService = require('./bulkNotificationService');
const KaoKireiIntegrationService = require('./kaoKireiIntegrationService');

console.log('🌐 Enhanced Website Scraper & Change Detector');
console.log('==============================================\n');

class EnhancedWebsiteScraper {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.browser = null;
        this.scrapingMethods = {
            'axios': this.scrapeWithAxios.bind(this),
            'puppeteer': this.scrapeWithPuppeteer.bind(this),
            'fallback': this.scrapeWithFallback.bind(this)
        };
        
        // Initialize Kao Kirei integration service
        this.kaoKireiService = new KaoKireiIntegrationService({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'website_monitor',
            charset: 'utf8mb4'
        });
    }

    // Initialize Puppeteer browser
    async initBrowser() {
        if (this.browser) return this.browser;

        try {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });
            console.log('✅ Puppeteer browser initialized');
            return this.browser;
        } catch (error) {
            console.error('❌ Failed to initialize Puppeteer browser:', error.message);
            return null;
        }
    }

    // Close browser
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('🔒 Browser closed');
        }
    }

    // Scrape with Axios (fastest, good for static sites)
    async scrapeWithAxios(url) {
        try {
            const startTime = Date.now();
            
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

            const responseTime = Date.now() - startTime;

            return {
                success: true,
                content: response.data,
                statusCode: response.status,
                responseTime,
                method: 'axios',
                headers: response.headers
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'axios',
                statusCode: error.response?.status || 0
            };
        }
    }

    // Scrape with Puppeteer (good for dynamic content)
    async scrapeWithPuppeteer(url) {
        try {
            const browser = await this.initBrowser();
            if (!browser) {
                throw new Error('Browser not available');
            }

            const startTime = Date.now();
            const page = await browser.newPage();
            
            await page.setUserAgent(this.userAgent);
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Navigate to the page
            await page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // Get page content
            const content = await page.content();
            const responseTime = Date.now() - startTime;

            await page.close();

            return {
                success: true,
                content: content,
                statusCode: 200,
                responseTime,
                method: 'puppeteer'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'puppeteer',
                statusCode: 0
            };
        }
    }

    // Fallback scraping method
    async scrapeWithFallback(url) {
        try {
        const startTime = Date.now();
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': this.userAgent
            },
                timeout: 15000,
                maxRedirects: 3,
                validateStatus: () => true
        });

        const responseTime = Date.now() - startTime;

        return {
            success: true,
            content: response.data,
            statusCode: response.status,
                responseTime,
                method: 'fallback'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                method: 'fallback',
                statusCode: 0
            };
        }
    }

    // Smart scraping method selection
    async smartScrape(url) {
        // Try Axios first (fastest)
        let result = await this.scrapeWithAxios(url);
        if (result.success) {
            return result;
        }

        // Try Puppeteer if Axios fails
        result = await this.scrapeWithPuppeteer(url);
        if (result.success) {
            return result;
        }

        // Try fallback method
        result = await this.scrapeWithFallback(url);
        return result;
    }

    // Extract text content from HTML
    extractTextContent(html, method) {
        try {
            const $ = cheerio.load(html);
            
            // Remove script and style elements
            $('script, style, noscript').remove();
            
            // Get text content
            const text = $('body').text();
            
            // Clean up the text
            return text
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim();
        } catch (error) {
            console.error('Error extracting text content:', error);
            return html; // Fallback to raw HTML
        }
    }

    // Generate content hash
    generateHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    // Check for keywords
    checkKeywords(text, keywords) {
        if (!keywords) {
            return { found: false, keywords: [], total: 0 };
        }

        const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
        const foundKeywords = keywordList.filter(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );

        return {
            found: foundKeywords.length > 0,
            keywords: foundKeywords,
            total: keywordList.length
        };
    }

    // Save scraping result to database
    async saveScrapingResult(siteId, contentHash, contentLength, statusCode, responseTime, keywordsResult, scrapingMethod) {
        try {
            const [result] = await pool.execute(`
                INSERT INTO site_checks (
                    site_id, 
                    content_hash, 
                    text_content, 
                    content_length, 
                    status_code, 
                    response_time_ms, 
                    scraping_method, 
                    keywords_found, 
                    keywords_list, 
                    changes_detected, 
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                siteId,
                contentHash,
                '', // text_content will be stored separately
                contentLength,
                statusCode,
                responseTime,
                scrapingMethod,
                keywordsResult.found ? 1 : 0,
                keywordsResult.keywords.join(','),
                false
            ]);

            return result.insertId;
        } catch (error) {
            console.error('Error saving scraping result:', error);
            throw error;
        }
    }

    // Detect changes by comparing with previous data
    async detectChanges(siteId) {
        try {
            const [checks] = await pool.execute(`
                SELECT 
                    sc.*,
                    ms.url,
                    ms.name as site_name,
                    ms.keywords
                FROM site_checks sc
                JOIN monitored_sites ms ON sc.site_id = ms.id
                WHERE sc.site_id = ?
                ORDER BY sc.created_at DESC
                LIMIT 2
            `, [siteId]);

            if (checks.length < 2) {
                return {
                    hasChanged: false,
                    reason: 'Not enough historical data for comparison',
                    isFirstCheck: checks.length === 1
                };
            }

            const current = checks[0];
            const previous = checks[1];

            const changes = {
                hasChanged: false,
                changeTypes: [],
                changeDetails: [],
                severity: 'low',
                summary: 'No changes detected'
            };

            // Content hash comparison
            if (current.content_hash !== previous.content_hash) {
                changes.hasChanged = true;
                changes.changeTypes.push('content');
                changes.changeDetails.push({
                    type: 'content',
                    description: 'Website content has changed',
                    severity: 'high'
                });
            }

            // Status code comparison
            if (current.status_code !== previous.status_code) {
                changes.hasChanged = true;
                changes.changeTypes.push('status');
                changes.changeDetails.push({
                    type: 'status',
                    description: `HTTP status changed from ${previous.status_code} to ${current.status_code}`,
                    severity: 'medium'
                });
            }

            // Keywords comparison
            if (current.keywords_found !== previous.keywords_found) {
                changes.hasChanged = true;
                changes.changeTypes.push('keywords');
                const direction = current.keywords_found ? 'appeared' : 'disappeared';
                changes.changeDetails.push({
                    type: 'keywords',
                    description: `Keywords ${direction}`,
                    severity: 'medium'
                });
            }

            if (changes.hasChanged) {
                changes.severity = this.determineSeverity(changes.changeDetails);
                changes.summary = this.generateChangeSummary(changes);
            }

            return changes;

        } catch (error) {
            console.error('Error detecting changes:', error);
            throw error;
        }
    }

    // Determine overall severity
    determineSeverity(changeDetails) {
        const severities = changeDetails.map(c => c.severity);
        if (severities.includes('high')) return 'high';
        if (severities.includes('medium')) return 'medium';
        return 'low';
    }

    // Generate change summary
    generateChangeSummary(changes) {
        const types = changes.changeTypes.join(', ');
        return `Changes detected: ${types}`;
    }

    // Main scraping and change detection function
    async scrapeAndDetectChanges(siteId, url, keywords = null) {
        try {
            console.log(`\n🌐 Processing site ID: ${siteId}`);
            console.log(`   URL: ${url}`);
            console.log(`   Keywords: ${keywords || 'None'}`);

            // Check if this is a Kao Kirei site that needs special handling
            const [sites] = await pool.execute(`
                SELECT scraping_method, is_global_notification 
                FROM monitored_sites 
                WHERE id = ? AND scraping_method = 'dom_parser'
            `, [siteId]);

            if (sites.length > 0) {
                console.log(`   🎯 Using Kao Kirei product scraper for specialized detection`);
                return await this.kaoKireiService.checkKaoKireiSite(siteId);
            }

            // Use regular scraping for other sites
            const scrapeResult = await this.smartScrape(url);
            
            if (!scrapeResult.success) {
                console.log(`   ❌ Scraping failed: ${scrapeResult.error}`);
                
                await this.saveScrapingResult(siteId, null, 0, scrapeResult.statusCode, 0, { found: false, keywords: [], total: 0 }, 'failed');
                
                return {
                    success: false,
                    error: scrapeResult.error,
                    method: scrapeResult.method
                };
            }

            // Extract and process content
            const textContent = this.extractTextContent(scrapeResult.content, scrapeResult.method);
            const contentHash = this.generateHash(textContent);
            const contentLength = textContent.length;
            const keywordsResult = this.checkKeywords(textContent, keywords);

            console.log(`   📊 Content length: ${contentLength} characters`);
            console.log(`   🔑 Keywords: ${keywordsResult.found ? `Found ${keywordsResult.keywords.length}/${keywordsResult.total}` : 'None found'}`);
            console.log(`   ⏱️ Response time: ${scrapeResult.responseTime}ms`);
            console.log(`   📝 Method: ${scrapeResult.method}`);

            // Save result to database
            await this.saveScrapingResult(
                siteId, 
                contentHash, 
                contentLength, 
                scrapeResult.statusCode, 
                scrapeResult.responseTime, 
                keywordsResult, 
                scrapeResult.method
            );

            // Detect changes
            const changeResult = await this.detectChanges(siteId);
            
            if (changeResult.hasChanged) {
                console.log(`   🔔 CHANGES DETECTED: ${changeResult.summary}`);
                console.log(`   📊 Change Type: ${changeResult.changeTypes.join(', ')}`);
                
                // Update the changes_detected flag
                await pool.execute(`
                    UPDATE site_checks 
                    SET changes_detected = true, reason = ?, change_type = ?
                    WHERE site_id = ? AND id = (
                        SELECT id FROM (
                            SELECT id FROM site_checks 
                            WHERE site_id = ? 
                            ORDER BY created_at DESC 
                            LIMIT 1
                        ) AS latest_check
                    )
                `, [changeResult.summary, changeResult.changeTypes.join(','), siteId, siteId]);
                
                // Send notifications
                try {
                    const notificationResult = await bulkNotificationService.notifySiteChange(siteId, changeResult);
                    if (notificationResult.success) {
                        console.log(`   📧 Notifications sent: ${notificationResult.successCount}/${notificationResult.totalUsers} users`);
                    } else {
                        console.log(`   ❌ Notification failed: ${notificationResult.reason}`);
                    }
                } catch (notificationError) {
                    console.log(`   ❌ Notification error: ${notificationError.message}`);
                }
            } else {
                console.log(`   ✅ No changes detected`);
            }

            return {
                success: true,
                checkId: await this.getLatestCheckId(siteId),
                changesDetected: changeResult.hasChanged,
                changeSummary: changeResult.summary
            };

        } catch (error) {
            console.error('Error in scrapeAndDetectChanges:', error);
            throw error;
        }
    }

    // Get latest check ID for a site
    async getLatestCheckId(siteId) {
        try {
            const [checks] = await pool.execute(`
                SELECT id FROM site_checks 
                WHERE site_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [siteId]);
            
            return checks.length > 0 ? checks[0].id : null;
        } catch (error) {
            console.error('Error getting latest check ID:', error);
            return null;
        }
    }

    // Scrape all active sites
    async scrapeAllSites() {
        try {
            console.log('🚀 Starting comprehensive site scraping...\n');

            const [sites] = await pool.execute(`
                SELECT id, url, name, keywords, check_interval_hours, is_active
                FROM monitored_sites 
                WHERE is_active = 1
                ORDER BY last_check ASC, id ASC
            `);

            if (sites.length === 0) {
                console.log('❌ No active sites found');
                return;
            }

            console.log(`📊 Found ${sites.length} active sites to check\n`);

            let successCount = 0;
            let errorCount = 0;
            let changeCount = 0;
        
        for (const site of sites) {
            try {
                    console.log(`\n${'='.repeat(80)}`);
                    console.log(`🌐 Site: ${site.name}`);
                    console.log(`🔗 URL: ${site.url}`);
                    console.log(`⏰ Last check: ${site.last_check || 'Never'}`);
                    console.log(`🔄 Interval: ${site.check_interval_hours} hours`);
                    console.log(`${'='.repeat(80)}`);

                    const result = await this.scrapeAndDetectChanges(site.id, site.url, site.keywords);
                    
                    if (result.success) {
                        successCount++;
                        if (result.changesDetected) {
                            changeCount++;
                        }
                        console.log(`✅ Site processed successfully`);
                    } else {
                        errorCount++;
                        console.log(`❌ Site processing failed: ${result.error}`);
                    }

            } catch (error) {
                    errorCount++;
                    console.error(`❌ Error processing site ${site.name}:`, error.message);
                }
            }

            console.log(`\n${'='.repeat(80)}`);
            console.log('📊 SCRAPING SUMMARY');
            console.log(`${'='.repeat(80)}`);
            console.log(`✅ Successful: ${successCount}`);
            console.log(`❌ Failed: ${errorCount}`);
            console.log(`🔄 Changes detected: ${changeCount}`);
            console.log(`📊 Total sites: ${sites.length}`);

        } catch (error) {
            console.error('❌ Error in scrapeAllSites:', error);
        } finally {
            await this.closeBrowser();
        }
    }
}

// Export the class
module.exports = EnhancedWebsiteScraper;

// Run if this file is executed directly
if (require.main === module) {
    const scraper = new EnhancedWebsiteScraper();
    scraper.scrapeAllSites().then(() => {
        console.log('\n🎉 Scraping completed!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Scraping failed:', error);
        process.exit(1);
    });
}