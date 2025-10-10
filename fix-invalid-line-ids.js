const { pool } = require('./config/database');
require('dotenv').config();

async function fixInvalidLineIds() {
    console.log('🔧 Fixing Invalid LINE User IDs\n');
    
    try {
        // Test database connection
        console.log('📋 Step 1: Testing database connection...');
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        
        // Find users with invalid LINE User IDs
        console.log('\n📋 Step 2: Finding users with invalid LINE User IDs...');
        const [users] = await pool.execute(`
            SELECT u.id, u.username, u.email, u.line_user_id, 
                   LENGTH(u.line_user_id) as line_id_length,
                   un.line_enabled 
            FROM users u 
            LEFT JOIN user_notifications un ON u.id = un.user_id 
            WHERE u.line_user_id IS NOT NULL
        `);
        
        if (users.length === 0) {
            console.log('⚠️  No users have LINE User ID configured!');
            return;
        }
        
        console.log(`📊 Found ${users.length} user(s) with LINE configured:\n`);
        
        const invalidUsers = [];
        const validUsers = [];
        
        for (const user of users) {
            console.log(`👤 User: ${user.username} (ID: ${user.id})`);
            console.log(`   Email: ${user.email}`);
            console.log(`   LINE User ID: "${user.line_user_id}"`);
            console.log(`   Length: ${user.line_id_length} characters`);
            
            // Check if LINE User ID is valid
            const trimmedId = user.line_user_id.trim();
            const isValid = trimmedId.startsWith('U') && trimmedId.length >= 30;
            
            if (isValid) {
                console.log(`   Status: ✅ VALID`);
                validUsers.push(user);
            } else {
                console.log(`   Status: ❌ INVALID`);
                console.log(`   Issues:`);
                if (!trimmedId.startsWith('U')) {
                    console.log(`     - Does not start with "U"`);
                }
                if (trimmedId.length < 30) {
                    console.log(`     - Too short (${trimmedId.length} chars, need 30+)`);
                }
                invalidUsers.push(user);
            }
            console.log('');
        }
        
        console.log(`📊 Summary:`);
        console.log(`   Valid users: ${validUsers.length}`);
        console.log(`   Invalid users: ${invalidUsers.length}\n`);
        
        if (invalidUsers.length === 0) {
            console.log('✅ All LINE User IDs are valid!');
            return;
        }
        
        // Show options for fixing invalid LINE User IDs
        console.log('🔧 Options to fix invalid LINE User IDs:\n');
        
        console.log('1️⃣  Clear invalid LINE User IDs (set to NULL):');
        console.log('   - Users will need to re-enter their LINE User ID');
        console.log('   - Safe option, no data loss\n');
        
        console.log('2️⃣  Keep invalid LINE User IDs but disable LINE notifications:');
        console.log('   - Users can fix their LINE User ID later');
        console.log('   - LINE notifications will be disabled for these users\n');
        
        console.log('3️⃣  Manual fix (recommended):');
        console.log('   - Update each user\'s LINE User ID manually');
        console.log('   - Users need to provide correct LINE User ID\n');
        
        // Auto-fix option 1: Clear invalid LINE User IDs
        console.log('🚀 Auto-fixing: Clearing invalid LINE User IDs...\n');
        
        for (const user of invalidUsers) {
            try {
                await pool.execute(
                    'UPDATE users SET line_user_id = NULL WHERE id = ?',
                    [user.id]
                );
                
                // Also disable LINE notifications for this user
                await pool.execute(
                    'UPDATE user_notifications SET line_enabled = FALSE WHERE user_id = ?',
                    [user.id]
                );
                
                console.log(`✅ Cleared LINE User ID for ${user.username}`);
                
            } catch (error) {
                console.log(`❌ Failed to clear LINE User ID for ${user.username}: ${error.message}`);
            }
        }
        
        console.log('\n📋 Next Steps:');
        console.log('1. Users need to re-enter their correct LINE User ID');
        console.log('2. LINE User ID must start with "U" and be 33 characters long');
        console.log('3. Users can get their LINE User ID from LINE app:');
        console.log('   - Open LINE app');
        console.log('   - Go to Settings → Profile → ID');
        console.log('   - Copy the LINE User ID (starts with "U")');
        console.log('4. Users should also add the LINE bot as a friend');
        console.log('5. Then LINE notifications will work!');
        
        console.log('\n🎉 Invalid LINE User IDs have been cleared!');
        console.log('   LINE test should now work without errors.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n🔧 Database connection issue:');
            console.log('   Check your database credentials in .env file');
            console.log('   Make sure the database server is running');
        }
    }
}

fixInvalidLineIds();
