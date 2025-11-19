# 🚨 QUICK FIX REQUIRED - Network Error

## What Happened?

Your mobile app showed:

```
ERROR  Create purchase error: [TypeError: Network request failed]
```

## Why?

The app was using `localhost:3000` which only works on your computer, not on your phone.

## What I Fixed:

✅ **Updated `.env`** to use your computer's IP address:

```bash
EXPO_PUBLIC_SOLVEND_API_URL=http://10.140.84.136:3000/api
```

## What YOU Need to Do:

### 🔥 Step 1: Add Firewall Rule (2 minutes)

**Option A - Easy Manual Way:**

1. Press `Win + R`
2. Type: `firewall.cpl` → Press Enter
3. Click: **"Allow an app or feature through Windows Defender Firewall"**
4. Click: **"Change settings"**
5. Click: **"Allow another app..."** → **"Browse..."**
6. Navigate to: `C:\Program Files\nodejs\node.exe`
7. Select it → Click **"Add"**
8. Check **both Private and Public** boxes
9. Click **"OK"**

**Option B - PowerShell Script:**

```powershell
# Run PowerShell as Administrator
cd C:\Users\Gami\Documents\React-Native\dApp\privy
.\add-firewall-rule.ps1
```

📖 **Full instructions:** See `FIREWALL_FIX.md`

### 🧪 Step 2: Test Connection

```powershell
.\test-connection.ps1
```

You should see all ✅ green checks.

### 🔄 Step 3: Restart Everything

**Restart Backend:**

```bash
# Ctrl+C to stop, then:
cd solvend/backend
npm run dev
```

**Restart Expo:**

```bash
# In main project folder
npx expo start
# Press 'r' to reload
```

### 🎉 Step 4: Test Purchase

Try buying a drink! You should now see:

```
LOG  Step 1: Creating purchase on Solvend backend...
LOG  Purchase created: {referenceId: "...", ...}
✅ Success!
```

---

## Files I Created to Help You:

1. **`FIREWALL_FIX.md`** - Step-by-step firewall instructions
2. **`add-firewall-rule.ps1`** - Automated firewall script
3. **`test-connection.ps1`** - Test if firewall is working
4. **`NETWORK_SETUP_GUIDE.md`** - Complete network troubleshooting

## Quick Checklist:

- [x] Updated `.env` with computer IP (10.140.84.136)
- [ ] Add Node.js to Windows Firewall (YOU DO THIS)
- [ ] Test connection works
- [ ] Restart backend server
- [ ] Restart Expo app
- [ ] Test purchase flow

---

## TL;DR

1. **Do firewall fix** → See `FIREWALL_FIX.md` Step 1-3
2. **Run test** → `.\test-connection.ps1`
3. **Restart everything** → Backend + Expo
4. **Try buying drink** → Should work! 🎉

**The problem:** localhost → phone can't connect  
**The solution:** Use computer IP (10.140.84.136) + open firewall  
**The result:** Mobile app works! ✅

---

🔥 **Start with FIREWALL_FIX.md right now!**
