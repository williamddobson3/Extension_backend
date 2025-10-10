const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000/api';

async function testUserBlocking() {
    console.log('🧪 Testing User Blocking Functionality\n');

    try {
        // Test 1: Register a test user
        console.log('1. Registering test user...');
        const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser123',
                email: 'testuser123@example.com',
                password: 'password123'
            })
        });
        
        const registerData = await registerResponse.json();
        if (registerData.success) {
            console.log('✅ User registered successfully');
            const userId = registerData.user.id;
            const userToken = registerData.token;

            // Test 2: Login as admin (assuming admin exists)
            console.log('\n2. Logging in as admin...');
            const adminLoginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin', // Adjust based on your admin credentials
                    password: 'adminpassword' // Adjust based on your admin credentials
                })
            });

            const adminLoginData = await adminLoginResponse.json();
            if (adminLoginData.success && adminLoginData.user.is_admin) {
                console.log('✅ Admin login successful');
                const adminToken = adminLoginData.token;

                // Test 3: Block the test user
                console.log('\n3. Blocking test user...');
                const blockResponse = await fetch(`${API_BASE_URL}/users/${userId}/block`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason: 'Test blocking functionality' })
                });

                const blockData = await blockResponse.json();
                if (blockData.success) {
                    console.log('✅ User blocked successfully');

                    // Test 4: Try to login with blocked user
                    console.log('\n4. Testing login with blocked user...');
                    const blockedLoginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: 'testuser123',
                            password: 'password123'
                        })
                    });

                    const blockedLoginData = await blockedLoginResponse.json();
                    if (blockedLoginResponse.status === 403 && blockedLoginData.message.includes('blocked')) {
                        console.log('✅ Blocked user cannot login (expected behavior)');
                    } else {
                        console.log('❌ Blocked user was able to login (unexpected)');
                    }

                    // Test 5: Try to re-register with same credentials
                    console.log('\n5. Testing re-registration with blocked user credentials...');
                    const reRegisterResponse = await fetch(`${API_BASE_URL}/auth/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: 'testuser123',
                            email: 'testuser123@example.com',
                            password: 'password123'
                        })
                    });

                    const reRegisterData = await reRegisterResponse.json();
                    if (reRegisterResponse.status === 403 && reRegisterData.message.includes('blocked')) {
                        console.log('✅ Blocked user cannot re-register (expected behavior)');
                    } else {
                        console.log('❌ Blocked user was able to re-register (unexpected)');
                    }

                    // Test 6: Unblock the user
                    console.log('\n6. Unblocking test user...');
                    const unblockResponse = await fetch(`${API_BASE_URL}/users/${userId}/unblock`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${adminToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const unblockData = await unblockResponse.json();
                    if (unblockData.success) {
                        console.log('✅ User unblocked successfully');

                        // Test 7: Try to login with unblocked user
                        console.log('\n7. Testing login with unblocked user...');
                        const unblockedLoginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                username: 'testuser123',
                                password: 'password123'
                            })
                        });

                        const unblockedLoginData = await unblockedLoginResponse.json();
                        if (unblockedLoginData.success) {
                            console.log('✅ Unblocked user can login (expected behavior)');
                        } else {
                            console.log('❌ Unblocked user cannot login (unexpected)');
                        }
                    } else {
                        console.log('❌ Failed to unblock user');
                    }

                } else {
                    console.log('❌ Failed to block user:', blockData.message);
                }

            } else {
                console.log('❌ Admin login failed or user is not admin');
            }

        } else {
            console.log('❌ User registration failed:', registerData.message);
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }

    console.log('\n🏁 User blocking functionality test completed');
}

// Run the test
testUserBlocking();