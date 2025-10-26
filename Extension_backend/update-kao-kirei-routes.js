const fs = require('fs');
const path = require('path');

console.log('🔧 Updating Kao Kirei Routes - Remove Global Notifications\n');

const filesToUpdate = [
    {
        path: 'routes/kaoKireiTest.js',
        changes: [
            {
                find: /AND is_global_notification = 1/g,
                replace: '-- Removed: AND is_global_notification = 1 (now treats as normal sites)',
                description: 'Remove global notification filter from Kao Kirei queries'
            },
            {
                find: /WHERE is_global_notification = 1/g,
                replace: 'WHERE 1=1 -- Removed: is_global_notification = 1',
                description: 'Remove global notification WHERE clause'
            }
        ]
    },
    {
        path: 'services/enhancedBulkNotificationService.js',
        changes: [
            {
                find: /sites\[0\]\.is_global_notification/g,
                replace: 'false /* Removed global notification logic */',
                description: 'Disable global notification checks'
            }
        ]
    },
    {
        path: 'services/kaoKireiIntegrationService.js',
        changes: [
            {
                find: /is_global_notification/g,
                replace: '0 as is_global_notification /* Always 0 now */',
                description: 'Set is_global_notification to always 0'
            }
        ]
    },
    {
        path: 'services/kaoKireiChangeDetector.js',
        changes: [
            {
                find: /const isGlobal = sites\[0\]\.is_global_notification;/g,
                replace: 'const isGlobal = false; // Removed: sites[0].is_global_notification;',
                description: 'Always set isGlobal to false'
            }
        ]
    },
    {
        path: 'services/enhancedWebsiteScraper.js',
        changes: [
            {
                find: /is_global_notification/g,
                replace: '0 as is_global_notification /* Disabled */',
                description: 'Disable global notification in scraper'
            }
        ]
    }
];

let updatedFiles = 0;
let totalChanges = 0;

filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, file.path);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${file.path}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let fileChanged = false;
    let fileChanges = 0;
    
    file.changes.forEach(change => {
        const matches = content.match(change.find);
        if (matches && matches.length > 0) {
            content = content.replace(change.find, change.replace);
            fileChanged = true;
            fileChanges += matches.length;
            console.log(`✅ ${file.path}`);
            console.log(`   ${change.description}`);
            console.log(`   Changes: ${matches.length}\n`);
        }
    });
    
    if (fileChanged) {
        // Backup original file
        const backupPath = filePath + '.backup';
        fs.copyFileSync(filePath, backupPath);
        
        // Write updated content
        fs.writeFileSync(filePath, content, 'utf8');
        
        updatedFiles++;
        totalChanges += fileChanges;
        console.log(`💾 Backed up to: ${file.path}.backup\n`);
    }
});

console.log('═══════════════════════════════════════════════════════════════');
console.log(`✅ Update Complete!`);
console.log(`   Files updated: ${updatedFiles}`);
console.log(`   Total changes: ${totalChanges}`);
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📋 Next Steps:');
console.log('1. Run migration SQL: node migrate-remove-global-notifications.sql');
console.log('2. Restart server: npm start');
console.log('3. Test: Users must manually add Kao Kirei sites');
console.log('4. Verify: Notifications only sent to users who added sites\n');

console.log('⚠️  Important:');
console.log('- Kao Kirei sites are now normal sites');
console.log('- Users must add them manually');
console.log('- No more global notifications');
console.log('- Backup files created with .backup extension\n');

