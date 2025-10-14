# Anti-Evasion System Implementation Guide

## Overview

This comprehensive anti-evasion system prevents blocked users from creating new accounts using different email addresses, names, or other identifying information. The system uses multiple non-financial signals to detect and block evasion attempts while maintaining a good user experience for legitimate users.

## Key Features

### 🛡️ **Multi-Signal Detection**
- **Email Analysis**: Normalization, disposable email detection, MX/SPF validation
- **Fingerprint Tracking**: Browser fingerprinting with HMAC hashing
- **IP Reputation**: Tor, VPN, hosting provider detection
- **Behavioral Analysis**: Form completion time, registration patterns
- **Name Similarity**: Jaro-Winkler similarity with banned names

### 🔒 **Challenge System**
- **Proof-of-Work**: Client-side computation challenges
- **CAPTCHA Integration**: reCAPTCHA v2/v3 support
- **OAuth Challenges**: Google/GitHub OAuth verification
- **Email Verification**: Multi-stage email validation

### 📊 **Risk Scoring**
- **Weighted Scoring**: Different weights for different signal types
- **Threshold-Based Actions**: Allow, Monitor, Challenge, Block
- **Confidence Levels**: High, medium, low confidence decisions

### 👨‍💼 **Admin Management**
- **Dashboard**: Real-time evasion statistics
- **Signal Management**: Ban/unban signals manually
- **Appeal System**: User appeal process
- **Cluster Analysis**: Related evasion attempt detection

## System Architecture

### Database Schema

#### Core Tables
- **`evasion_signals`**: Stores all collected signals during registration
- **`banned_signals`**: Contains banned emails, fingerprints, IPs, etc.
- **`evasion_attempts`**: Records all registration attempts and outcomes
- **`proof_of_work_challenges`**: Manages PoW challenges
- **`disposable_email_domains`**: Local cache of disposable email domains
- **`ip_reputation`**: IP reputation data (Tor, VPN, hosting)
- **`evasion_clusters`**: Groups related evasion attempts
- **`rate_limits`**: Rate limiting for registration attempts

#### Key Fields
```sql
-- evasion_signals
normalized_email VARCHAR(255)     -- Normalized email for comparison
fp_hash VARCHAR(64)               -- Browser fingerprint hash
ip_address VARCHAR(45)            -- Client IP address
ip_subnet VARCHAR(18)             -- IP subnet for analysis
disposable_email TINYINT(1)       -- Disposable email flag
mx_record_exists TINYINT(1)       -- MX record validation
risk_score INT(11)                -- Calculated risk score

-- banned_signals
signal_type ENUM('email','fp_hash','ip','subnet','asn','name')
signal_value VARCHAR(500)         -- The banned signal value
severity ENUM('low','medium','high','critical')
auto_detected TINYINT(1)           -- Auto-detected vs manual ban
```

### Service Components

#### 1. EvasionSignalCollector
**Purpose**: Collects and normalizes signals during registration

**Key Functions**:
- Email normalization (remove dots, +tags for Gmail)
- Name normalization (remove punctuation, normalize whitespace)
- IP subnet calculation (/24 for IPv4, /64 for IPv6)
- Browser fingerprint generation with HMAC
- DNS validation (MX, SPF records)
- Disposable email detection

**Example Usage**:
```javascript
const collector = new EvasionSignalCollector(dbConfig);
const signals = await collector.collectSignals(registrationData, clientInfo, sessionId);
```

#### 2. EvasionDetectionEngine
**Purpose**: Analyzes signals and calculates risk scores

**Scoring Weights**:
- Banned fingerprint: 140 points
- Banned email: 130 points
- Disposable email: 120 points
- CAPTCHA failure: 90 points
- Banned IP: 80 points
- No MX record: 70 points
- Name similarity: 30 points
- Rate limiting: 20-40 points

**Thresholds**:
- ≥150: Immediate block
- 100-149: Strong challenge (OAuth/PoW)
- 60-99: Medium challenge (CAPTCHA + email)
- 30-59: Monitor mode
- <30: Allow

**Example Usage**:
```javascript
const engine = new EvasionDetectionEngine(dbConfig);
const analysis = await engine.analyzeSignals(signals);
```

#### 3. ProofOfWorkChallenge
**Purpose**: Implements client-side computation challenges

**Features**:
- Configurable difficulty (1-10)
- SHA256-based challenges
- Time-based expiration
- Attempt tracking
- Automatic cleanup

**Example Usage**:
```javascript
const pow = new ProofOfWorkChallenge(dbConfig);
const challenge = await pow.generateChallenge(sessionId, difficulty);
const verification = await pow.verifySolution(sessionId, solution);
```

#### 4. AntiEvasionRegistration
**Purpose**: Main registration flow with evasion detection

**Flow**:
1. Collect signals
2. Analyze for evasion
3. Determine action (allow/challenge/block)
4. Handle challenges
5. Create account if approved
6. Update rate limits

**Example Usage**:
```javascript
const registration = new AntiEvasionRegistration(dbConfig);
const result = await registration.processRegistration(data, clientInfo, sessionId);
```

## Implementation Guide

### 1. Database Setup

```sql
-- Run the anti-evasion schema
SOURCE databse/anti_evasion_schema.sql;

-- Initialize data
INSERT INTO disposable_email_domains (domain, source, confidence) VALUES
('10minutemail.com', 'manual', 1.00),
('tempmail.org', 'manual', 1.00),
('guerrillamail.com', 'manual', 1.00);

-- Add IP reputation data
INSERT INTO ip_reputation (ip_address, ip_subnet, reputation_type, confidence, source) VALUES
('127.0.0.1', '127.0.0.0/24', 'clean', 1.00, 'manual');
```

### 2. API Integration

#### Registration Endpoint
```javascript
// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const clientInfo = extractClientInfo(req);
    const sessionId = generateSessionId();
    
    const result = await antiEvasionRegistration.processRegistration(
        { username, email, password },
        clientInfo,
        sessionId
    );
    
    if (result.success) {
        res.json({ success: true, user_id: result.user_id });
    } else {
        res.status(403).json({
            success: false,
            action: result.action,
            challenge: result.challenge
        });
    }
});
```

#### Challenge Verification
```javascript
// POST /api/auth/verify-challenge
router.post('/verify-challenge', async (req, res) => {
    const { session_id, solution } = req.body;
    
    const result = await antiEvasionRegistration.verifyProofOfWork(session_id, solution);
    
    res.json({
        success: result.success,
        message: result.message
    });
});
```

### 3. Client-Side Integration

#### Proof-of-Work Challenge
```javascript
// Client-side PoW computation
async function solveProofOfWork(challenge) {
    const { data, timestamp, difficulty, target_prefix } = challenge;
    let nonce = 0;
    
    while (true) {
        const hash = await crypto.subtle.digest('SHA-256', 
            new TextEncoder().encode(data + timestamp + nonce)
        );
        const hashHex = Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        
        if (hashHex.startsWith(target_prefix)) {
            return JSON.stringify({
                data, timestamp, nonce, hash: hashHex
            });
        }
        
        nonce++;
    }
}
```

#### Registration Form Enhancement
```html
<form id="registrationForm">
    <input type="text" name="username" required>
    <input type="email" name="email" required>
    <input type="password" name="password" required>
    
    <!-- Hidden fields for client info -->
    <input type="hidden" name="screen_resolution" id="screenResolution">
    <input type="hidden" name="timezone" id="timezone">
    <input type="hidden" name="language" id="language">
    <input type="hidden" name="form_start_time" id="formStartTime">
    
    <button type="submit">Register</button>
</form>

<script>
// Collect client information
document.getElementById('screenResolution').value = 
    screen.width + 'x' + screen.height;
document.getElementById('timezone').value = 
    Intl.DateTimeFormat().resolvedOptions().timeZone;
document.getElementById('language').value = 
    navigator.language;
document.getElementById('formStartTime').value = Date.now();

// Handle registration response
document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    
    if (result.challenge_required) {
        // Handle challenge
        await handleChallenge(result.challenge);
    } else if (result.success) {
        // Registration successful
        window.location.href = '/dashboard';
    } else {
        // Show error message
        showError(result.message);
    }
});
</script>
```

### 4. Admin Interface

#### Dashboard Route
```javascript
// GET /api/admin/evasion/dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
    const evasionStats = await detectionEngine.getEvasionStats(7);
    const challengeStats = await powChallenge.getChallengeStats(7);
    
    res.json({
        success: true,
        data: {
            evasion_stats: evasionStats,
            challenge_stats: challengeStats
        }
    });
});
```

#### Signal Management
```javascript
// POST /api/admin/evasion/ban-signal
router.post('/ban-signal', requireAdmin, async (req, res) => {
    const { signalType, signalValue, reason, severity } = req.body;
    
    await detectionEngine.banSignal(signalType, signalValue, req.user.id, reason, severity);
    
    res.json({ success: true, message: 'Signal banned successfully' });
});
```

## Configuration

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=website_monitor

# Anti-Evasion
EVASION_SECRET=your-evasion-secret-key
JWT_SECRET=your-jwt-secret

# reCAPTCHA (optional)
RECAPTCHA_SITE_KEY=your-site-key
RECAPTCHA_SECRET_KEY=your-secret-key
```

### Scoring Configuration
```javascript
// Customize scoring weights
const customWeights = {
    BANNED_FP_HASH: 150,      // Increase for stricter fingerprint matching
    BANNED_EMAIL: 140,        // Increase for stricter email matching
    DISPOSABLE_EMAIL: 100,    // Decrease if you want to allow some disposable emails
    CAPTCHA_FAIL: 80,         // Adjust based on CAPTCHA reliability
    NAME_SIMILARITY: 40       // Increase for stricter name matching
};

// Customize thresholds
const customThresholds = {
    IMMEDIATE_BLOCK: 160,     // Increase for more lenient blocking
    STRONG_CHALLENGE: 110,    // Adjust challenge requirements
    MEDIUM_CHALLENGE: 70,     // Adjust medium challenge threshold
    LOW_RISK: 40              // Adjust monitoring threshold
};
```

## Monitoring and Maintenance

### 1. Data Cleanup
```javascript
// Clean up old data (run daily)
await signalCollector.cleanupOldSignals(30);  // Keep 30 days
await powChallenge.cleanupExpiredChallenges(24);  // Keep 24 hours
await registration.cleanupOldData(30);  // Keep 30 days
```

### 2. Performance Monitoring
```javascript
// Monitor system performance
const stats = await detectionEngine.getEvasionStats(7);
console.log(`Processed ${stats.total_attempts} attempts`);
console.log(`Blocked ${stats.blocked_count} attempts`);
console.log(`Challenge rate: ${stats.challenge_rate}%`);
```

### 3. False Positive Management
```javascript
// Review and adjust thresholds based on false positive rate
const falsePositiveRate = stats.false_positives / stats.total_attempts;
if (falsePositiveRate > 0.05) {  // 5% threshold
    console.log('High false positive rate detected - consider adjusting thresholds');
}
```

## Security Considerations

### 1. Privacy Protection
- All PII is hashed with HMAC before storage
- Raw fingerprint data is not stored
- IP addresses are anonymized to subnets
- Regular data cleanup to comply with privacy laws

### 2. Rate Limiting
- IP-based rate limiting
- Fingerprint-based rate limiting
- Email-based rate limiting
- Progressive penalties for repeated violations

### 3. Challenge Security
- Proof-of-work challenges are time-limited
- Difficulty scales with risk score
- Multiple challenge types prevent single-point failure
- Client-side computation prevents server overload

## Testing

### 1. Unit Tests
```bash
# Run the comprehensive test suite
node test-anti-evasion-system.js
```

### 2. Integration Tests
```javascript
// Test registration flow
const result = await antiEvasionRegistration.processRegistration(
    testData, clientInfo, sessionId
);
assert(result.success === expected);
```

### 3. Load Testing
```javascript
// Test system under load
for (let i = 0; i < 1000; i++) {
    await antiEvasionRegistration.processRegistration(
        generateTestData(), clientInfo, generateSessionId()
    );
}
```

## Troubleshooting

### Common Issues

#### 1. High False Positive Rate
- **Cause**: Thresholds too strict
- **Solution**: Increase threshold values
- **Monitoring**: Track false positive rate in admin dashboard

#### 2. Performance Issues
- **Cause**: Large signal database
- **Solution**: Implement data cleanup, add database indexes
- **Monitoring**: Track query execution times

#### 3. Challenge Failures
- **Cause**: Client-side computation issues
- **Solution**: Implement fallback challenges, adjust difficulty
- **Monitoring**: Track challenge completion rates

### Debug Mode
```javascript
// Enable debug logging
process.env.EVASION_DEBUG = 'true';

// Detailed logging will be output
console.log('🔍 Signal collection:', signals);
console.log('📊 Risk analysis:', analysis);
console.log('🔒 Challenge generation:', challenge);
```

## Conclusion

This anti-evasion system provides comprehensive protection against user evasion attempts while maintaining a good experience for legitimate users. The system is designed to be:

- **Scalable**: Handles high-volume registration attempts
- **Configurable**: Easy to adjust thresholds and weights
- **Maintainable**: Clear separation of concerns, comprehensive logging
- **Privacy-compliant**: Minimal PII storage, regular cleanup
- **Cost-effective**: No external API costs, uses free data sources

The system successfully prevents blocked users from creating new accounts while allowing legitimate users to register without friction.
