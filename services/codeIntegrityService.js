/**
 * Code Integrity Service
 * 拡張機能のコード改変を検出し、不正なアクセスを防ぐ
 * コストをかけない対策
 */

class CodeIntegrityService {
    constructor() {
        this.expectedChecksums = new Map();
        this.integrityChecks = [];
    }

    /**
     * フロントエンドコードの整合性を検証
     */
    async verifyCodeIntegrity(userId, userIP) {
        try {
            // 1. 基本的なJavaScript関数の存在チェック
            const basicChecks = this.performBasicIntegrityChecks();
            
            // 2. 重要な関数の改変検出
            const functionChecks = this.checkCriticalFunctions();
            
            // 3. 予期しないコードの検出
            const anomalyChecks = this.detectCodeAnomalies();
            
            const results = {
                basicChecks,
                functionChecks,
                anomalyChecks,
                timestamp: new Date().toISOString()
            };

            // 不正が検出された場合
            if (this.hasIntegrityViolations(results)) {
                await this.logIntegrityViolation(userId, userIP, results);
                return {
                    isValid: false,
                    violations: results,
                    action: 'block_access'
                };
            }

            return {
                isValid: true,
                results: results
            };

        } catch (error) {
            console.error('Code integrity check error:', error);
            // エラーの場合は安全のためブロック
            return {
                isValid: false,
                error: error.message,
                action: 'block_access'
            };
        }
    }

    /**
     * 基本的な整合性チェック
     */
    performBasicIntegrityChecks() {
        const checks = {
            hasAuthToken: typeof authToken !== 'undefined',
            hasCurrentUser: typeof currentUser !== 'undefined',
            hasAPIBaseURL: typeof API_BASE_URL !== 'undefined',
            hasRequiredFunctions: this.checkRequiredFunctions()
        };

        return {
            passed: Object.values(checks).every(check => check === true),
            details: checks
        };
    }

    /**
     * 必要な関数の存在チェック
     */
    checkRequiredFunctions() {
        const requiredFunctions = [
            'handleLogin',
            'handleRegister', 
            'handleLogout',
            'loadSites',
            'showNotification',
            'verifyUserBlockingStatus'
        ];

        return requiredFunctions.every(funcName => 
            typeof window[funcName] === 'function' || 
            typeof eval(funcName) === 'function'
        );
    }

    /**
     * 重要な関数の改変検出
     */
    checkCriticalFunctions() {
        const criticalFunctions = {
            'fetch': typeof fetch === 'function',
            'JSON.stringify': typeof JSON.stringify === 'function',
            'JSON.parse': typeof JSON.parse === 'function',
            'console.log': typeof console.log === 'function'
        };

        return {
            passed: Object.values(criticalFunctions).every(check => check === true),
            details: criticalFunctions
        };
    }

    /**
     * コード異常の検出
     */
    detectCodeAnomalies() {
        const anomalies = [];

        // 1. 予期しないグローバル変数の検出
        const unexpectedGlobals = this.detectUnexpectedGlobals();
        if (unexpectedGlobals.length > 0) {
            anomalies.push({
                type: 'unexpected_globals',
                details: unexpectedGlobals
            });
        }

        // 2. 改変された関数の検出
        const modifiedFunctions = this.detectModifiedFunctions();
        if (modifiedFunctions.length > 0) {
            anomalies.push({
                type: 'modified_functions',
                details: modifiedFunctions
            });
        }

        return {
            hasAnomalies: anomalies.length > 0,
            anomalies: anomalies
        };
    }

    /**
     * 予期しないグローバル変数の検出
     */
    detectUnexpectedGlobals() {
        const expectedGlobals = [
            'authToken', 'currentUser', 'API_BASE_URL',
            'loadingEl', 'loginFormEl', 'dashboardEl'
        ];

        const unexpected = [];
        for (const prop in window) {
            if (prop.startsWith('_') || prop.includes('hack') || prop.includes('bypass')) {
                unexpected.push(prop);
            }
        }

        return unexpected;
    }

    /**
     * 改変された関数の検出
     */
    detectModifiedFunctions() {
        const modified = [];

        // 重要な関数が改変されていないかチェック
        if (typeof handleLogin === 'function') {
            const loginSource = handleLogin.toString();
            if (loginSource.includes('bypass') || loginSource.includes('hack')) {
                modified.push('handleLogin');
            }
        }

        return modified;
    }

    /**
     * 整合性違反の検出
     */
    hasIntegrityViolations(results) {
        return !results.basicChecks.passed || 
               !results.functionChecks.passed || 
               results.anomalyChecks.hasAnomalies;
    }

    /**
     * 整合性違反のログ記録
     */
    async logIntegrityViolation(userId, userIP, results) {
        try {
            const pool = require('../database/db');
            await pool.execute(`
                INSERT INTO integrity_violations 
                (user_id, ip_address, violation_type, details, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `, [
                userId,
                userIP,
                'code_modification',
                JSON.stringify(results)
            ]);

            console.log(`🚨 Code integrity violation detected for user ${userId}`);
        } catch (error) {
            console.error('Error logging integrity violation:', error);
        }
    }

    /**
     * フロントエンド用の整合性チェックAPI
     */
    async performClientSideIntegrityCheck() {
        const checks = {
            // 基本的な環境チェック
            hasChromeAPI: typeof chrome !== 'undefined',
            hasStorageAPI: typeof chrome?.storage !== 'undefined',
            hasRuntimeAPI: typeof chrome?.runtime !== 'undefined',
            
            // 重要な関数の存在チェック
            hasRequiredFunctions: this.checkRequiredFunctions(),
            
            // 予期しない改変の検出
            hasUnexpectedModifications: this.detectCodeAnomalies().hasAnomalies
        };

        return {
            isValid: Object.values(checks).every(check => 
                typeof check === 'boolean' ? check : check.passed
            ),
            checks: checks,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new CodeIntegrityService();
