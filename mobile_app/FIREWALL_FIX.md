# 🔥 Quick Firewall Fix - 3 Simple Steps

## The Issue

Your mobile app shows: `ERROR Network request failed`

This is because **Windows Firewall** is blocking Node.js from accepting connections from your phone.

---

## ✅ EASIEST FIX - Manual Method (2 minutes)

### Step 1: Open Windows Firewall

1. Press `Win + R` on your keyboard
2. Type: `firewall.cpl`
3. Press Enter

### Step 2: Allow an App

1. Click **"Allow an app or feature through Windows Defender Firewall"** (left side)
2. Click **"Change settings"** button (top)
3. Click **"Allow another app..."** button (bottom)
4. Click **"Browse..."**
5. Navigate to: `C:\Program Files\nodejs\node.exe`
6. Select it and click **"Open"**
7. Click **"Add"**
8. Make sure **both Private and Public** checkboxes are checked
9. Click **"OK"**

### Step 3: Done! ✅

Now test it:

```bash
# In PowerShell (solvend/backend folder):
npm run dev

# In another PowerShell window:
curl http://10.140.84.136:3000
```

You should see a response (not connection refused).

---

## 🚀 ALTERNATIVE - PowerShell Script (Advanced)

If you're comfortable with PowerShell:

1. **Right-click PowerShell** → Select **"Run as Administrator"**
2. Navigate to project folder:
   ```powershell
   cd C:\Users\Gami\Documents\React-Native\dApp\privy
   ```
3. Run the script:
   ```powershell
   .\add-firewall-rule.ps1
   ```

---

## 🧪 Test the Connection

### From Your Computer:

```bash
curl http://10.140.84.136:3000
```

**Success:** You get a response (even an error is OK)  
**Failed:** "Connection refused" or timeout

### From Your Phone:

1. Make sure phone is on **same Wi-Fi** as computer
2. Open Chrome/Safari on your phone
3. Go to: `http://10.140.84.136:3000`
4. You should see _something_ load

---

## 📱 After Firewall is Fixed

1. **Restart Backend:**

   ```bash
   cd solvend/backend
   npm run dev
   ```

2. **Restart Expo:**

   ```bash
   # In your main project folder
   npx expo start
   ```

   Press `r` to reload

3. **Try buying a drink!**

You should now see:

```
LOG  Step 1: Creating purchase on Solvend backend...
LOG  Purchase created: {referenceId: "...", ...}
```

Instead of:

```
ERROR  Network request failed
```

---

## Still Not Working?

### Check Your IP Address

Your IP might have changed. Run:

```bash
ipconfig | findstr "IPv4"
```

If it's different from `10.140.84.136`, update `.env`:

```bash
EXPO_PUBLIC_SOLVEND_API_URL=http://YOUR_NEW_IP:3000/api
```

### Check Same Wi-Fi Network

- Computer Wi-Fi: **[Your network name]**
- Phone Wi-Fi: **[Must be same network]**

### Check Backend is Running

```bash
cd solvend/backend
npm run dev
```

Should show:

```
✅ API Server is running on http://localhost:3000
```

---

## 🎯 Summary

**What we did:**

1. ✅ Changed `.env` from `localhost` to `10.140.84.136`
2. ⏳ **YOU NEED TO DO**: Add firewall rule (Step 1-3 above)
3. ⏳ Restart backend and Expo

**Why it failed before:**

- `localhost` only works on the same device
- Mobile phone needs to connect via your computer's IP
- Windows Firewall blocked the connection by default

**Once firewall is fixed:**

- Mobile app → Your computer IP → Backend server ✅
- Purchases will work!
- OTP validation will work!

---

🔥 **Do Step 1-3 above now, then restart everything!**
