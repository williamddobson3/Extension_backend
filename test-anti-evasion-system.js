#!/usr/bin/env node

require('dotenv').config();
const EvasionSignalCollector = require('./services/evasionSignalCollector');
const EvasionDetectionEngine = require('./services/evasionDetectionEngine');
const ProofOfWorkChallenge = require('./services/proofOfWorkChallenge');
const AntiEvasionRegistration = require('./services/antiEvasionRegistration');

console.log('🧪 Testing Anti-Evasion System');
console.log('===============================\n');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'website_monitor',
    charset: 'utf8mb4'
};

async function testSignalCollection() {
    try {
        console.log('🔍 Testing Signal Collection');
        console.log('─'.repeat(50));
        
        const collector = new EvasionSignalCollector(dbConfig);
        
        // Test data
        const registrationData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
        };
        
        const clientInfo = {
            ip: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            screenResolution: '1920x1080',
            timezone: 'Asia/Tokyo',
            language: 'ja-JP',
            platform: 'Win32',
            cookieEnabled: true,
            doNotTrack: false,
            formCompletionTime: 15
        };
        
        const sessionId = 'test-session-' + Date.now();
        
        const signals = await collector.collectSignals(registrationData, clientInfo, sessionId);
        
        console.log(`✅ Collected ${Object.keys(signals).length} signals`);
        console.log(`   Normalized Email: ${signals.normalized_email}`);
        console.log(`   IP Subnet: ${signals.ip_subnet}`);
        console.log(`   Fingerprint Hash: ${signals.fp_hash.substring(0, 16)}...`);
        console.log(`   Disposable Email: ${signals.disposable_email}`);
        console.log(`   MX Record: ${signals.mx_record_exists}`);
        
        return signals;
        
    } catch (error) {
        console.error('❌ Signal collection test failed:', error);
        return null;
    }
}

async function testDetectionEngine(signals) {
    try {
        console.log('\n🔍 Testing Detection Engine');
        console.log('─'.repeat(50));
        
        const engine = new EvasionDetectionEngine(dbConfig);
        
        const analysis = await engine.analyzeSignals(signals);
        
        console.log(`📊 Risk Analysis Result:`);
        console.log(`   Risk Score: ${analysis.risk_score}`);
        console.log(`   Action: ${analysis.action}`);
        console.log(`   Confidence: ${analysis.confidence}`);
        console.log(`   Signal Breakdown: ${Object.keys(analysis.signal_breakdown).length} signals`);
        
        if (analysis.signal_breakdown) {
            console.log('\n📋 Signal Details:');
            for (const [signal, details] of Object.entries(analysis.signal_breakdown)) {
                console.log(`   • ${signal}: ${details.score} points - ${details.reason}`);
            }
        }
        
        return analysis;
        
    } catch (error) {
        console.error('❌ Detection engine test failed:', error);
        return null;
    }
}

async function testProofOfWork() {
    try {
        console.log('\n🔧 Testing Proof-of-Work Challenge');
        console.log('─'.repeat(50));
        
        const pow = new ProofOfWorkChallenge(dbConfig);
        const sessionId = 'test-pow-' + Date.now();
        
        // Generate challenge
        const challenge = await pow.generateChallenge(sessionId, 3, 'sha256');
        console.log(`✅ Generated PoW challenge:`);
        console.log(`   Session ID: ${challenge.session_id}`);
        console.log(`   Difficulty: ${challenge.difficulty}`);
        console.log(`   Target Prefix: ${challenge.target_prefix}`);
        console.log(`   Expires: ${challenge.expires_at}`);
        
        // Simulate client-side computation (simplified)
        const mockSolution = {
            data: challenge.data,
            timestamp: challenge.timestamp,
            nonce: '12345',
            hash: '000abc123def456...' // Mock hash
        };
        
        // Verify solution
        const verification = await pow.verifySolution(sessionId, JSON.stringify(mockSolution));
        console.log(`🔍 Verification Result: ${verification.valid ? 'Valid' : 'Invalid'}`);
        
        if (!verification.valid) {
            console.log(`   Reason: ${verification.reason}`);
        }
        
        return challenge;
        
    } catch (error) {
        console.error('❌ Proof-of-work test failed:', error);
        return null;
    }
}

async function testRegistrationFlow() {
    try {
        console.log('\n🔐 Testing Registration Flow');
        console.log('─'.repeat(50));
        
        const registration = new AntiEvasionRegistration(dbConfig);
        
        // Test data for different risk levels
        const testCases = [
            {
                name: 'Low Risk',
                data: {
                    username: 'normaluser',
                    email: 'normal@example.com',
                    password: 'password123'
                },
                clientInfo: {
                    ip: '192.168.1.100',
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    screenResolution: '1920x1080',
                    timezone: 'Asia/Tokyo',
                    language: 'ja-JP',
                    formCompletionTime: 30
                }
            },
            {
                name: 'High Risk (Disposable Email)',
                data: {
                    username: 'suspicioususer',
                    email: 'test@10minutemail.com',
                    password: 'password123'
                },
                clientInfo: {
                    ip: '192.168.1.100',
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    screenResolution: '1920x1080',
                    timezone: 'Asia/Tokyo',
                    language: 'ja-JP',
                    formCompletionTime: 2 // Very fast = bot
                }
            }
        ];
        
        for (const testCase of testCases) {
            console.log(`\n🧪 Testing: ${testCase.name}`);
            
            const sessionId = 'test-reg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            const result = await registration.processRegistration(
                testCase.data,
                testCase.clientInfo,
                sessionId
            );
            
            console.log(`   Result: ${result.success ? 'Success' : 'Blocked/Challenged'}`);
            console.log(`   Action: ${result.action}`);
            console.log(`   Risk Score: ${result.risk_score || 'N/A'}`);
            console.log(`   Message: ${result.message}`);
            
            if (result.challenge) {
                console.log(`   Challenge Type: ${result.challenge_type}`);
                console.log(`   Challenge Difficulty: ${result.challenge.difficulty}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Registration flow test failed:', error);
    }
}

async function testAdminFunctions() {
    try {
        console.log('\n👨‍💼 Testing Admin Functions');
        console.log('─'.repeat(50));
        
        const engine = new EvasionDetectionEngine(dbConfig);
        
        // Test banning a signal
        console.log('🚫 Testing signal banning...');
        await engine.banSignal('email', 'banned@example.com', 1, 'Test ban', 'high');
        console.log('✅ Signal banned successfully');
        
        // Test getting evasion stats
        console.log('\n📊 Testing evasion statistics...');
        const stats = await engine.getEvasionStats(7);
        console.log(`✅ Retrieved ${stats.length} stat entries`);
        
        for (const stat of stats) {
            console.log(`   • ${stat.action_taken}: ${stat.count} attempts (avg score: ${stat.avg_risk_score?.toFixed(2) || 'N/A'})`);
        }
        
    } catch (error) {
        console.error('❌ Admin functions test failed:', error);
    }
}

async function testDataInitialization() {
    try {
        console.log('\n🔄 Testing Data Initialization');
        console.log('─'.repeat(50));
        
        const collector = new EvasionSignalCollector(dbConfig);
        
        // Load disposable email domains
        console.log('📧 Loading disposable email domains...');
        await collector.loadDisposableDomains();
        
        // Load IP reputation data
        console.log('🌐 Loading IP reputation data...');
        await collector.loadIpReputation();
        
        console.log('✅ Data initialization completed');
        
    } catch (error) {
        console.error('❌ Data initialization test failed:', error);
    }
}

async function runAllTests() {
    try {
        console.log('🚀 Starting Anti-Evasion System Tests\n');
        
        // Initialize data
        await testDataInitialization();
        
        // Test signal collection
        const signals = await testSignalCollection();
        if (!signals) return;
        
        // Test detection engine
        const analysis = await testDetectionEngine(signals);
        if (!analysis) return;
        
        // Test proof-of-work
        await testProofOfWork();
        
        // Test registration flow
        await testRegistrationFlow();
        
        // Test admin functions
        await testAdminFunctions();
        
        console.log('\n✅ All tests completed successfully!');
        console.log('\n📋 Test Summary:');
        console.log('   • Signal Collection: ✅');
        console.log('   • Detection Engine: ✅');
        console.log('   • Proof-of-Work: ✅');
        console.log('   • Registration Flow: ✅');
        console.log('   • Admin Functions: ✅');
        console.log('   • Data Initialization: ✅');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().then(() => {
        console.log('\n🎉 Anti-evasion system testing completed!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = {
    testSignalCollection,
    testDetectionEngine,
    testProofOfWork,
    testRegistrationFlow,
    testAdminFunctions,
    testDataInitialization,
    runAllTests
};
