# 🌐 Network Setup Guide - Fix "Network request failed"

## The Problem

When you see this error:

```
ERROR  Create purchase error: [TypeError: Network request failed]
```

It means your mobile app can't reach the backend server. This happens because:

1. ❌ Using `localhost` (only works on the same machine)
2. ❌ Windows Firewall blocking Node.js
3. ❌ Device on different Wi-Fi network

## Quick Fix Steps

### Step 1: Update `.env` File

**Current (Wrong):**

```bash
EXPO_PUBLIC_SOLVEND_API_URL=http://localhost:3000/api
```

**Fixed (Correct):**

```bash
EXPO_PUBLIC_SOLVEND_API_URL=http://10.140.84.136:3000/api
```

✅ **Already done!** I've updated your `.env` file.

### Step 2: Allow Node.js Through Windows Firewall

**Option A: Quick Method (Recommended)**

1. Press `Win + R`, type: `wf.msc`, press Enter
2. Click "Inbound Rules" on the left
3. Click "New Rule..." on the right
4. Select "Program", click Next
5. Browse to: `C:\Program Files\nodejs\node.exe`
6. Select "Allow the connection", click Next
7. Check all (Domain, Private, Public), click Next
8. Name it: "Node.js Backend", click Finish

**Option B: PowerShell Command (Run as Administrator)**

```powershell
New-NetFirewallRule -DisplayName "Node.js Backend" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow -Profile Any
```

### Step 3: Restart Backend Server

```bash
cd solvend/backend
npm run dev
```

You should see:

```
✅ API Server is running on http://localhost:3000
```

### Step 4: Test Connection from Phone

1. Make sure your phone is on **same Wi-Fi** as your computer
2. Open Safari/Chrome on your phone
3. Go to: `http://10.140.84.136:3000`
4. You should see some response (even an error is OK)

If you see **nothing or timeout** → Firewall is still blocking

### Step 5: Restart Expo

Press `r` in the Expo terminal to reload, or restart completely:

```bash
npx expo start
```

## Testing the Fix

### Test 1: Backend Accessible from Computer

```bash
curl http://localhost:3000
```

Should return: `Cannot GET /` (this is OK!)

### Test 2: Backend Accessible from Network

```bash
curl http://10.140.84.136:3000
```

Should return: `Cannot GET /` (this is OK!)

If you get **connection refused** → Firewall issue

### Test 3: Mobile App Can Connect

In your app, try buying a drink. Check logs:

**Success:**

```
LOG  Solvend API URL: http://10.140.84.136:3000/api
LOG  Step 1: Creating purchase on Solvend backend...
LOG  Purchase created: {referenceId: "...", ...}
```

**Still failing:**

```
ERROR  Create purchase error: [TypeError: Network request failed]
```

## Alternative Solutions

### Option 1: Use ngrok (Easiest for Testing)

1. Install ngrok: https://ngrok.com/download
2. Run: `ngrok http 3000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Update `.env`:
   ```bash
   EXPO_PUBLIC_SOLVEND_API_URL=https://abc123.ngrok.io/api
   ```

**Pros:** No firewall issues, works on any network
**Cons:** URL changes every time, free tier has limits

### Option 2: Expo Tunnel Mode

```bash
npx expo start --tunnel
```

This creates a tunnel for both Expo and can help with network issues.

### Option 3: Use Android Emulator (AVD)

Android emulator can access `10.0.2.2` to reach host machine:

```bash
EXPO_PUBLIC_SOLVEND_API_URL=http://10.0.2.2:3000/api
```

But for physical device, stick with your local IP.

## Your Network Info

**Computer IP:** `10.140.84.136`
**Wi-Fi Network:** Make sure phone is on same network
**Backend Port:** `3000`
**API URL:** `http://10.140.84.136:3000/api`

## Verify Everything

Run these checks:

```bash
# 1. Check your IP hasn't changed
ipconfig | findstr "IPv4"

# 2. Check backend is running
curl http://localhost:3000

# 3. Check firewall isn't blocking
curl http://10.140.84.136:3000

# 4. Check .env file
cat .env

# 5. Restart Expo
npx expo start
```

## Common Issues

### "Connection refused"

- Backend not running → `cd solvend/backend && npm run dev`
- Wrong port → Check backend logs for port number

### "Network request failed"

- Firewall blocking → Follow Step 2 above
- Wrong IP in .env → Update to `10.140.84.136`
- Phone on different Wi-Fi → Connect to same network

### "Timeout"

- Firewall blocking → Add firewall rule
- Backend crashed → Check backend logs
- IP address changed → Run `ipconfig` again

### "Cannot connect to 10.0.0.1"

- Using router IP by mistake → Use computer IP (10.140.84.136)

## Summary

✅ **Updated `.env`** to use `http://10.140.84.136:3000/api`
⚠️ **Need to**: Allow Node.js through Windows Firewall
⚠️ **Need to**: Restart Expo app

**Next step:** Follow Step 2 above to configure Windows Firewall, then restart Expo!
