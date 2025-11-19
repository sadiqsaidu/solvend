# Test Backend Connection
# Run this after adding the firewall rule

Write-Host "🧪 Testing Backend Connection..." -ForegroundColor Cyan
Write-Host ""

# Test 1: localhost
Write-Host "Test 1: localhost:3000" -ForegroundColor Yellow
try {
    $response1 = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ localhost works!" -ForegroundColor Green
}
catch {
    if ($_.Exception.Message -like "*Cannot GET*" -or $_.Exception.Message -like "*404*") {
        Write-Host "✅ localhost works! (Got expected error response)" -ForegroundColor Green
    }
    else {
        Write-Host "❌ localhost failed: Backend not running?" -ForegroundColor Red
        Write-Host "   Run: cd solvend/backend && npm run dev" -ForegroundColor White
    }
}
Write-Host ""

# Test 2: Local IP
Write-Host "Test 2: 10.140.84.136:3000" -ForegroundColor Yellow
try {
    $response2 = Invoke-WebRequest -Uri "http://10.140.84.136:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Local IP works! Mobile app should connect!" -ForegroundColor Green
}
catch {
    if ($_.Exception.Message -like "*Cannot GET*" -or $_.Exception.Message -like "*404*") {
        Write-Host "✅ Local IP works! Mobile app should connect!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Local IP failed: Firewall still blocking!" -ForegroundColor Red
        Write-Host "   Follow instructions in FIREWALL_FIX.md" -ForegroundColor White
    }
}
Write-Host ""

# Test 3: API endpoint
Write-Host "Test 3: API endpoint (purchase create)" -ForegroundColor Yellow
try {
    $response3 = Invoke-WebRequest -Uri "http://10.140.84.136:3000/api/purchase/create" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ API endpoint accessible!" -ForegroundColor Green
}
catch {
    if ($_.Exception.Message -like "*400*" -or $_.Exception.Message -like "*Bad Request*") {
        Write-Host "✅ API endpoint accessible! (Got expected validation error)" -ForegroundColor Green
    }
    elseif ($_.Exception.Message -like "*Cannot GET*" -or $_.Exception.Message -like "*404*") {
        Write-Host "⚠️  API responds but wrong method (use POST, not GET)" -ForegroundColor Yellow
    }
    else {
        Write-Host "❌ API endpoint failed!" -ForegroundColor Red
    }
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your computer IP: 10.140.84.136" -ForegroundColor White
Write-Host "Backend URL: http://localhost:3000" -ForegroundColor White
Write-Host "Mobile app should use: http://10.140.84.136:3000/api" -ForegroundColor White
Write-Host ""
Write-Host "If all tests passed (✅), your mobile app should work!" -ForegroundColor Green
Write-Host "If local IP test failed (❌), add firewall rule first." -ForegroundColor Yellow
Write-Host ""
Write-Host "Next: Restart your Expo app and try buying a drink!" -ForegroundColor Cyan
