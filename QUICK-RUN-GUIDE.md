# 🚀 Quick Start Guide - OTT Deal Assistant

## Run Everything with One Command

```bash
npm run dev
```

This will start:
- ✅ **Backend Server** (Express API on port 3001)
- ✅ **Frontend React App** (on port 3000)
- ✅ **OTT Deal Assistant** (with real platform data from CSV)

---

## What Happens When You Run `npm run dev`

### 1. Backend Starts (server.js)
```
🚀 Poster Analysis API running on http://localhost:3001
📊 Endpoints available:
   POST /api/ott-assistant/evaluate - Get OTT deal recommendation
   GET  /api/ott-assistant/examples - Get example payloads
   GET  /api/ott-assistant/platforms - Get platform info from CSV
   ...
```

### 2. Frontend Starts (React)
```
Compiled successfully!

You can now view cinystore in the browser.
  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

### 3. Platform Data Loads from CSV
The system will automatically load OTT platform data from:
```
public/assets/OTTs - Sheet1.csv
```

**Platforms loaded**:
- 📺 Netflix India (Fixed Buyout, MG+RevShare)
- 📺 Amazon Prime Video India (Fixed Buyout, MG+RevShare, TVOD)
- 📺 JioHotstar (Fixed Buyout, Sports Rights)

---

## How to Test the OTT Deal Assistant

### Step 1: Start the Application
```bash
npm run dev
```

Wait for both servers to start (~10-30 seconds).

### Step 2: Open in Browser
```
http://localhost:3000/projects/YOUR_PROJECT_ID/ott-deal
```

**Replace `YOUR_PROJECT_ID`** with an actual project ID from your database.

**Shortcut for testing**: Navigate to Dashboard → Select a Project → Look for "OTT Deal" in the navigation/menu.

### Step 3: Use the Interface

1. **Click "Load Example"** button (top right) to populate the form with test data
2. **Adjust the sliders**:
   - Sentiment (0 = negative, 1 = positive)
   - Buzz (0-100)
   - Trailer retention (%)
3. **Add Platform Offers**:
   - Click "+ Add Offer"
   - Select platform (Netflix, Prime, JioHotstar)
   - Choose offer type (Fixed or MG+RevShare)
   - Enter amounts
4. **Click "🔍 Evaluate Options"**
5. **Review Recommendation**:
   - See which option (A/B/C) is recommended
   - View confidence score
   - Check pros/cons
   - Toggle revenue scenarios (Low/Medium/High)
   - Review release strategy and campaign plan

---

## API Testing (Optional)

If you want to test the backend API directly:

### Test 1: Get Platform Data from CSV
```bash
curl http://localhost:3001/api/ott-assistant/platforms
```

**Expected Response**:
```json
{
  "success": true,
  "count": 3,
  "platforms": [
    {
      "name": "Netflix India",
      "deal_types": ["fixed", "mg_plus_revshare"],
      "fixed_buyout_range": {
        "min": 500000000,
        "max": 1000000000,
        "currency": "INR"
      },
      "avg_revenue_per_view": "₹0.50",
      ...
    }
  ],
  "source": "OTTs - Sheet1.csv"
}
```

### Test 2: Get Example Payloads
```bash
curl http://localhost:3001/api/ott-assistant/examples
```

### Test 3: Evaluate a Deal
```bash
curl -X POST http://localhost:3001/api/ott-assistant/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "producerInputs": {
      "confidence": "medium",
      "filmGenre": "Thriller",
      "filmBudget": 400,
      "targetAudience": "Urban youth 18-35"
    },
    "platformSignals": {
      "sentiment": 0.62,
      "buzz": 58,
      "trailerViews": 600000,
      "trailerRetention": 68
    },
    "offers": [
      {
        "platform": "Netflix India",
        "offer_type": "fixed",
        "fixed_amount": 420
      }
    ],
    "calendarEvents": []
  }'
```

---

## Troubleshooting

### Issue: `npm run dev` fails with "command not found"

**Solution**: Install dependencies first:
```bash
npm install
```

### Issue: "concurrently: command not found"

**Solution**: Reinstall concurrently:
```bash
npm install --save-dev concurrently
```

### Issue: Port 3000 or 3001 already in use

**Solution**: Kill the process using the port:

**Windows (PowerShell)**:
```powershell
# Find process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Find process on port 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
```

**Or change the port**: Edit `server.js` line 10:
```javascript
const PORT = process.env.PORT || 3002; // Changed from 3001
```

### Issue: "Cannot find module 'ottPlatforms.service'"

**Solution**: Make sure all files are saved and restart:
```bash
# Stop the servers (Ctrl+C)
# Then restart
npm run dev
```

### Issue: Platforms dropdown is empty

**Solution**: Check the CSV file exists:
```bash
# Verify file exists
Test-Path "public\assets\OTTs - Sheet1.csv"
```

If false, the CSV file is missing. Restore it from backup or create it.

### Issue: Frontend doesn't connect to backend

**Solution**: Check the proxy setting in `package.json`:
```json
"proxy": "http://localhost:3001"
```

Make sure it matches the backend port.

---

## Development Workflow

### Making Changes

**Backend Changes** (server.js, routes/, services/):
1. Save your changes
2. Server will NOT auto-reload - restart manually:
   ```bash
   # Kill the dev command (Ctrl+C)
   npm run dev
   ```

**Frontend Changes** (src/):
1. Save your changes
2. React will auto-reload automatically ✨
3. Check browser for updates

### Viewing Logs

**Backend logs**: Check the terminal where you ran `npm run dev`
- Look for lines with `[0]` prefix (server)

**Frontend logs**: Check the terminal where you ran `npm run dev`
- Look for lines with `[1]` prefix (React)

**Browser console**: Press F12 → Console tab
- Check for errors or success messages like:
  ```
  ✅ Loaded platforms from CSV: ["Netflix India", "Amazon Prime Video India", "JioHotstar"]
  ```

---

## CSV Data Structure

The `OTTs - Sheet1.csv` file contains:

| Attribute | Netflix India | Amazon Prime Video India | JioHotstar |
|-----------|---------------|--------------------------|------------|
| Deal Types Supported | Fixed Buyout; Co-production | Fixed Buyout; MG plus Revenue Share | Fixed Buyout; Sports Rights |
| Fixed Buyout Range | INR 50 crore – INR 100 crore+ | INR 80 crore – INR 350 crore | INR 50 crore – INR 100 crore |
| Monthly Active Users | ~100 million | ~150 million | ~500 million |
| Genre Preference Score | Thriller: 0.9; Romcom: 0.6 | Action/Thriller: 0.9; Drama: 0.7 | Sports: 0.95; Reality: 0.8 |
| IPL/Event Association | WWE (Starting 2025) | Live TV channel collaborations | IPL Exclusive Rights |

**To update platform data**: Edit the CSV file and restart the server.

---

## Next Steps

1. ✅ **Run**: `npm run dev`
2. ✅ **Open**: `http://localhost:3000`
3. ✅ **Navigate**: Dashboard → Your Project → OTT Deal
4. ✅ **Test**: Load example → Evaluate
5. ✅ **Explore**: Try different scenarios with sliders

**Happy OTT deal-making! 🎬💰**

---

## Alternative Commands

If you prefer running frontend and backend separately:

**Terminal 1 - Backend**:
```bash
npm run server
```

**Terminal 2 - Frontend**:
```bash
npm start
```

But using `npm run dev` is easier! 🚀
