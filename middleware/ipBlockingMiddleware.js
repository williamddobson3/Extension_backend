const ipBlockingService = require('../services/ipBlockingService');

/**
 * IP Blocking Middleware
 * Automatically checks IP addresses for blocking during registration and login
 * Enhances security by preventing access from blocked IPs
 */

/**
 * Middleware to check IP blocking for registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
async function checkIPBlockingForRegistration(req, res, next) {
    try {
        // Extract IP address from request
        const ipAddress = ipBlockingService.extractIPAddress(req);
        console.log(`🔍 Checking IP blocking for registration from: ${ipAddress}`);

        // Check if IP is blocked
        const blockingResult = await ipBlockingService.checkIPBlocking(ipAddress);

        if (blockingResult.isBlocked) {
            console.log(`🚫 Registration blocked for IP ${ipAddress}: ${blockingResult.reason}`);

            // Log the blocked attempt
            await ipBlockingService.logIPAccess(
                ipAddress, 
                null, 
                'blocked_registration', 
                req, 
                true, 
                blockingResult.reason
            );

            return res.status(403).json({
                success: false,
                message: 'アクセスが拒否されました',
                reason: blockingResult.reason,
                error: 'IP_BLOCKED',
                details: {
                    ipAddress: ipAddress,
                    blockType: blockingResult.blockType,
                    blockedBy: blockingResult.blockedBy,
                    expiresAt: blockingResult.expiresAt
                }
            });
        }

        // IP is not blocked, log the allowed attempt
        await ipBlockingService.logIPAccess(
            ipAddress, 
            null, 
            'registration', 
            req, 
            false, 
            null
        );

        // Add IP address to request for later use
        req.clientIP = ipAddress;
        console.log(`✅ Registration allowed for IP: ${ipAddress}`);

        next();

    } catch (error) {
        console.error('❌ Error in IP blocking middleware for registration:', error);
        
        // In case of error, allow access but log the error
        const ipAddress = ipBlockingService.extractIPAddress(req);
        await ipBlockingService.logIPAccess(
            ipAddress, 
            null, 
            'registration', 
            req, 
            false, 
            `Middleware error: ${error.message}`
        );

        req.clientIP = ipAddress;
        next();
    }
}

/**
 * Middleware to check IP blocking for login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
async function checkIPBlockingForLogin(req, res, next) {
    try {
        // Extract IP address from request
        const ipAddress = ipBlockingService.extractIPAddress(req);
        console.log(`🔍 Checking IP blocking for login from: ${ipAddress}`);

        // Check if IP is blocked
        const blockingResult = await ipBlockingService.checkIPBlocking(ipAddress);

        if (blockingResult.isBlocked) {
            console.log(`🚫 Login blocked for IP ${ipAddress}: ${blockingResult.reason}`);

            // Log the blocked attempt
            await ipBlockingService.logIPAccess(
                ipAddress, 
                null, 
                'blocked_login', 
                req, 
                true, 
                blockingResult.reason
            );

            return res.status(403).json({
                success: false,
                message: 'ログインが拒否されました',
                reason: blockingResult.reason,
                error: 'IP_BLOCKED',
                details: {
                    ipAddress: ipAddress,
                    blockType: blockingResult.blockType,
                    blockedBy: blockingResult.blockedBy,
                    expiresAt: blockingResult.expiresAt
                }
            });
        }

        // IP is not blocked, log the allowed attempt
        await ipBlockingService.logIPAccess(
            ipAddress, 
            null, 
            'login', 
            req, 
            false, 
            null
        );

        // Add IP address to request for later use
        req.clientIP = ipAddress;
        console.log(`✅ Login allowed for IP: ${ipAddress}`);

        next();

    } catch (error) {
        console.error('❌ Error in IP blocking middleware for login:', error);
        
        // In case of error, allow access but log the error
        const ipAddress = ipBlockingService.extractIPAddress(req);
        await ipBlockingService.logIPAccess(
            ipAddress, 
            null, 
            'login', 
            req, 
            false, 
            `Middleware error: ${error.message}`
        );

        req.clientIP = ipAddress;
        next();
    }
}

/**
 * Middleware to check IP blocking for any authentication action
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
async function checkIPBlockingForAuth(req, res, next) {
    try {
        // Extract IP address from request
        const ipAddress = ipBlockingService.extractIPAddress(req);
        console.log(`🔍 Checking IP blocking for auth action from: ${ipAddress}`);

        // Check if IP is blocked
        const blockingResult = await ipBlockingService.checkIPBlocking(ipAddress);

        if (blockingResult.isBlocked) {
            console.log(`🚫 Auth action blocked for IP ${ipAddress}: ${blockingResult.reason}`);

            // Log the blocked attempt
            await ipBlockingService.logIPAccess(
                ipAddress, 
                null, 
                'blocked_login', 
                req, 
                true, 
                blockingResult.reason
            );

            return res.status(403).json({
                success: false,
                message: 'アクセスが拒否されました',
                reason: blockingResult.reason,
                error: 'IP_BLOCKED',
                details: {
                    ipAddress: ipAddress,
                    blockType: blockingResult.blockType,
                    blockedBy: blockingResult.blockedBy,
                    expiresAt: blockingResult.expiresAt
                }
            });
        }

        // IP is not blocked, log the allowed attempt
        await ipBlockingService.logIPAccess(
            ipAddress, 
            null, 
            'login', 
            req, 
            false, 
            null
        );

        // Add IP address to request for later use
        req.clientIP = ipAddress;
        console.log(`✅ Auth action allowed for IP: ${ipAddress}`);

        next();

    } catch (error) {
        console.error('❌ Error in IP blocking middleware for auth:', error);
        
        // In case of error, allow access but log the error
        const ipAddress = ipBlockingService.extractIPAddress(req);
        await ipBlockingService.logIPAccess(
            ipAddress, 
            null, 
            'login', 
            req, 
            false, 
            `Middleware error: ${error.message}`
        );

        req.clientIP = ipAddress;
        next();
    }
}

/**
 * Middleware to log IP access for any request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
async function logIPAccess(req, res, next) {
    try {
        const ipAddress = ipBlockingService.extractIPAddress(req);
        
        // Log the access (non-blocking)
        await ipBlockingService.logIPAccess(
            ipAddress, 
            req.user?.id || null, 
            'access', 
            req, 
            false, 
            null
        );

        req.clientIP = ipAddress;
        next();

    } catch (error) {
        console.error('❌ Error in IP access logging middleware:', error);
        req.clientIP = ipBlockingService.extractIPAddress(req);
        next();
    }
}

module.exports = {
    checkIPBlockingForRegistration,
    checkIPBlockingForLogin,
    checkIPBlockingForAuth,
    logIPAccess
};
