# ═══════════════════════════════════════════════════════════════
# DATABASE CONNECTION FIX - Complete Solution
# ═══════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔧 DATABASE CONNECTION FIX" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Check current .env file
Write-Host "📋 Current Database Configuration:" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

$envContent = Get-Content .env -Raw
$envContent | Select-String "DB_.*" | ForEach-Object { Write-Host "  $_" }

Write-Host "`n❌ PROBLEM FOUND:" -ForegroundColor Red
Write-Host "  DB_NAME=extension_db (in .env)" -ForegroundColor Yellow
Write-Host "  BUT database.sql creates: website_monitor`n" -ForegroundColor Yellow

Write-Host "🎯 SOLUTION OPTIONS:`n" -ForegroundColor Green

Write-Host "Option 1: Update .env to match database.sql (RECOMMENDED)" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────"
Write-Host "  Change DB_NAME from 'extension_db' to 'website_monitor'`n"

Write-Host "Option 2: Update database.sql to match .env" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────"
Write-Host "  Change database name in SQL from 'website_monitor' to 'extension_db'`n"

# Ask user which option
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
$choice = Read-Host "Which option? (1 or 2, or press Enter for Option 1)"

if ($choice -eq "" -or $choice -eq "1") {
    Write-Host "`n✅ Applying Option 1: Updating .env file..." -ForegroundColor Green
    
    # Update .env file
    $newEnvContent = $envContent -replace "DB_NAME=extension_db", "DB_NAME=website_monitor"
    Set-Content -Path .env -Value $newEnvContent
    
    Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
    Write-Host "  DB_NAME changed to: website_monitor`n" -ForegroundColor Yellow
    
} elseif ($choice -eq "2") {
    Write-Host "`n✅ Applying Option 2: Updating database.sql..." -ForegroundColor Green
    
    # Update database.sql
    $sqlPath = "..\..\databse\database.sql"
    if (Test-Path $sqlPath) {
        $sqlContent = Get-Content $sqlPath -Raw
        $newSqlContent = $sqlContent -replace "website_monitor", "extension_db"
        Set-Content -Path $sqlPath -Value $newSqlContent
        
        Write-Host "✅ database.sql updated successfully!" -ForegroundColor Green
        Write-Host "  Database name changed to: extension_db`n" -ForegroundColor Yellow
    } else {
        Write-Host "❌ database.sql not found at: $sqlPath" -ForegroundColor Red
    }
}

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📝 NEXT STEPS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "1. ✅ Check your MySQL root password" -ForegroundColor White
Write-Host "2. ✅ Update DB_PASSWORD in .env if needed" -ForegroundColor White
Write-Host "3. ✅ Create database:" -ForegroundColor White
Write-Host "     mysql -u root -p < ..\..\databse\database.sql`n" -ForegroundColor Gray
Write-Host "4. ✅ Restart server: npm start`n" -ForegroundColor White

Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

