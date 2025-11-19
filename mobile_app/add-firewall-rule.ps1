# Run this script as Administrator to allow Node.js through Windows Firewall
# Right-click PowerShell and select "Run as Administrator"
# Then run: .\add-firewall-rule.ps1

Write-Host "Adding Windows Firewall rule for Node.js Backend..." -ForegroundColor Yellow

try {
    # Add firewall rule for Node.js
    New-NetFirewallRule `
        -DisplayName "Node.js Backend Server - Solvend" `
        -Direction Inbound `
        -Program "C:\Program Files\nodejs\node.exe" `
        -Action Allow `
        -Profile Private,Domain `
        -Protocol TCP `
        -LocalPort 3000 `
        -Description "Allow Node.js backend server for Solvend mobile app"
    
    Write-Host "✅ Firewall rule added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Node.js can now accept connections on port 3000" -ForegroundColor Cyan
    Write-Host "Your backend should be accessible at: http://10.140.84.136:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart your backend server (Ctrl+C, then npm run dev)" -ForegroundColor White
    Write-Host "2. Test with: curl http://10.140.84.136:3000" -ForegroundColor White
    Write-Host "3. Restart your Expo app" -ForegroundColor White
}
catch {
    Write-Host "❌ Failed to add firewall rule" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please add the rule manually:" -ForegroundColor Yellow
    Write-Host "1. Press Win+R, type: wf.msc" -ForegroundColor White
    Write-Host "2. Click 'Inbound Rules' -> 'New Rule...'" -ForegroundColor White
    Write-Host "3. Select 'Port' -> Next" -ForegroundColor White
    Write-Host "4. Enter port: 3000 -> Next" -ForegroundColor White
    Write-Host "5. Allow the connection -> Next -> Next" -ForegroundColor White
    Write-Host "6. Name it: 'Node.js Backend' -> Finish" -ForegroundColor White
}
