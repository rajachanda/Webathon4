# Release Window Heatmap - How It Works

## Overview
The Release Window Heatmap analyzes your CSV competition data to show the **best and worst dates** to release your film, color-coded as **Green (Safe)**, **Orange (Moderate Risk)**, and **Red (High Risk)**.

---

## Data Flow: CSV → Heatmap

### Step 1: CSV Data Import
**File:** `public/assets/updated_movies.csv`

**Raw Data:**
```csv
Movie Name,Release Date,Buzz
Jailer 2,2026-06-12,85
Drishyam 3,2026-04-02,82
```

### Step 2: Intelligent Inference
**Service:** `src/services/competition.service.js`

For each movie, the system automatically infers:

#### A. **Language** (from movie name patterns)
- **Telugu:** NBK, NTR, Gopichand, Vishwambhara, Swayambhu
- **Tamil:** Jailer, Thalaivar, Chiyaan, Thug Life, Dhruva
- **Malayalam:** Aadu, Pallichattambi, Ajagajantharam
- **Kannada:** Kempegowda, Benz
- **Hindi/Pan-India:** Ramayana, Lahore, Love & War, Spirit, King

#### B. **Scale** (from buzz score)
- **Big:** Buzz ≥ 75 (e.g., Jailer 2: 85)
- **Mid:** Buzz 55-74 (e.g., Jai Hanuman: 68)
- **Small:** Buzz < 55 (e.g., Dacoit: 40)

#### C. **Genre** (from movie name keywords)
- **Action:** Toxic, Dacoit, Patriot
- **Romance:** Love-related titles
- **Comedy:** Aadu series
- **Family Drama:** Drishyam
- **Mythology:** Ramayana, Jai Hanuman

#### D. **Target Clusters** (intelligent audience mapping)

**High Buzz (≥75):**
- `MASS_SINGLE_SCREEN` + `URBAN_YOUTH_MULTIPLEX`
- Example: Jailer 2, Ramayana, King 101

**Mid Buzz (55-74):**
- **Family keywords** → `FAMILY_FESTIVAL`
- **Romance keywords** → `URBAN_YOUTH_MULTIPLEX`
- **Default** → `URBAN_YOUTH_MULTIPLEX` + `MASS_SINGLE_SCREEN`

**Low Buzz (<55):**
- **Kids keywords** → `KIDS_TEENS`
- **Small scale** → `NICHE_CINEPHILE`
- **Default** → `MASS_SINGLE_SCREEN`

**Pan-India bonus:**
- Always adds: `URBAN_YOUTH_MULTIPLEX` + `FAMILY_FESTIVAL`

---

## Step 3: Heatmap Scoring Algorithm

### Factors Analyzed (per date)

#### ✅ **POSITIVE FACTORS** (Green zones)

1. **Weekend Releases** (+10 points)
   - Friday, Saturday, Sunday
   - Thursday gets +5 (good weekend carry-over)

2. **Festivals** (+5 to +15 points)
   - Match with your target audience → +15
   - General holiday → +5
   - Examples: Ugadi (AP/TG), Tamil New Year, Sankranti

3. **Clear Corridor** (+5 to +8 points)
   - No competition on same date
   - Minimal nearby releases

4. **Sufficient Prep Time** (+10 points if >60 days, buzz <60)
   - Time to build marketing momentum

#### ⚠️ **NEGATIVE FACTORS** (Red zones)

1. **Direct Competition Clash** (-8 to -35 points)
   - **Major Clash:** Same language + >30% audience overlap
     - Big film: -25 penalty
     - Mid film: -15 penalty
     - Small film: -8 penalty
   - **Buzz Penalty:** +10 if competitor's buzz > yours
   - Example: Your Telugu MASS film vs Jailer 2 (Tamil, 85 buzz) = moderate clash

2. **Nearby High-Buzz Releases** (-8 points per film)
   - Within ±3 days
   - Same language
   - Big scale OR buzz ≥75

3. **Exam Periods** (-5 to -15 points)
   - **Youth-focused films:** -15 (URBAN_YOUTH_MULTIPLEX, KIDS_TEENS)
   - **Others:** -5

4. **Quiet Periods** (-5 points if your buzz <40)
   - No nearby releases
   - Indicates dead market time

---

## Step 4: Color Coding

**Formula:**
```javascript
Base score = 50
+ Weekend bonus
+ Festival bonus
+ Clear corridor bonus
- Competition penalties
- Exam penalties
- Timing penalties

Final score = clamped to 0-100
```

**Color Thresholds:**
- **Green (Safe):** Score ≥ 70
- **Orange (Moderate):** Score 40-69
- **Red (High Risk):** Score < 40

---

## Real Examples from Your CSV

### Example 1: April 2, 2026 (Drishyam 3 Release)

**Competition:**
- Drishyam 3 (82 buzz, likely FAMILY_FESTIVAL cluster)

**Your Film:** Telugu, MASS_SINGLE_SCREEN + URBAN_YOUTH_MULTIPLEX, Buzz: 55

**Analysis:**
- ✅ Thursday (+5 weekend carry-over)
- ⚠️ If different language (Malayalam): Moderate clash (-10 to -15)
- ⚠️ If same language: Major clash (-25 to -35)
- **Result:** Likely **Orange** if different language, **Red** if same

---

### Example 2: March 19, 2026 (4 Releases!)

**Competition:**
- Toxic: A Fairy Tale (66 buzz)
- Dacoit (40 buzz)
- Karuppu (55 buzz)
- Aadu 3 (68 buzz)

**Analysis:**
- ⚠️ Multiple releases on same day
- ⚠️ Mixed languages (some overlap likely)
- **Result:** **Red zone** due to overcrowding

---

### Example 3: May 24, 2026 (Dhruva Natchathiram only)

**Competition:**
- Only Dhruva Natchathiram (Tamil, 50 buzz)

**Your Film:** Telugu, Buzz: 60

**Analysis:**
- ✅ Friday release (+10)
- ✅ Different language, minimal clash
- ✅ Clear corridor (+8)
- ✅ Your buzz > competitor
- **Result:** **Green zone** (Score ~73)

---

## Step 5: Top Suggestions Display

**ReleaseWindowPage shows:**
1. **Heatmap Calendar** - All dates color-coded
2. **Top 4 Dates** - Ranked by score (best first)

**Each suggestion includes:**
- Date + Day of week
- Risk level badge (Green/Orange/Red)
- **Detailed Pros/Cons** (from analysis)
- Expected buzz delta
- "Select this date" button → saves to `projects.confirmed_release_date`

---

## Detailed Pros/Cons Examples

### ✅ Pros (what you'll see)
- `✅ Friday - optimal for box office openings`
- `✅ No direct date clashes`
- `✅ Clear corridor - minimal competition`
- `🎉 Ugadi - highly favorable for your target audience`
- `⏰ Sufficient time to build buzz and marketing momentum`

### ⚠️ Cons (what you'll see)
- `⚠️ MAJOR CLASH: "Jailer 2" (Tamil, Buzz: 85, 67% audience overlap)`
- `⚠️ Same language clash: "NTR 31" (big-scale, Buzz: 72)`
- `🔥 High-buzz nearby: "Ramayana" 2 days after (Buzz: 83)`
- `📚 Exam period - youth/student audience significantly affected`
- `⏰ Limited time to improve buzz - requires urgent marketing`

---

## How to Use

### 1. **Import Competition Data**
```
Navigate to: /competition
Click: "Import Movies from CSV"
Result: 48 movies imported with inferred clusters
```

### 2. **Set Your Film Details**
- Onboarding: Set language, region
- Persona Page: Define target clusters (auto-derived or manual)
- Buzz Page: Track your buzz score

### 3. **Analyze Release Window**
```
Navigate to: /projects/:id/release-window
Set date range: e.g., March 1 - May 31, 2026
Click: "Analyze Windows"
```

### 4. **Interpret Heatmap**
- **Hover over dates** → See detailed pros/cons
- **Look for green zones** → Safe dates
- **Avoid red zones** → High competition
- **Check top 4 suggestions** → Algorithm's best picks

### 5. **Select Release Date**
- Review top suggestions
- Click "Select this date" on preferred option
- Saved to database for Campaign module

---

## Competition Calendar Data Structure

**After CSV import, each entry has:**
```javascript
{
  title: "Jailer 2",
  release_date: "2026-06-12",
  external_buzz_score: 85,
  language: "Tamil",                    // ← INFERRED
  region_primary: "TN",                 // ← INFERRED
  scale: "big",                         // ← INFERRED (buzz ≥75)
  genre: "Action",                      // ← INFERRED
  target_clusters: [                    // ← INFERRED
    "MASS_SINGLE_SCREEN",
    "URBAN_YOUTH_MULTIPLEX"
  ],
  is_confirmed: true,
  notes: "Auto-imported from CSV with buzz score 85"
}
```

---

## Cluster Overlap Calculation

**Formula:**
```javascript
Overlap = (Your clusters ∩ Competitor clusters) / (All unique clusters)

Example:
Your film: [MASS_SINGLE_SCREEN, URBAN_YOUTH_MULTIPLEX]
Competitor: [MASS_SINGLE_SCREEN, FAMILY_FESTIVAL]

Intersection: [MASS_SINGLE_SCREEN] = 1
Union: [MASS_SINGLE_SCREEN, URBAN_YOUTH_MULTIPLEX, FAMILY_FESTIVAL] = 3

Overlap = 1/3 = 33%
```

**Clash Severity:**
- **>30% overlap:** Major clash
- **0-30% overlap:** Moderate clash
- **0% overlap:** No audience clash (safe)

---

## Debugging & Verification

### Console Logs (check browser console)
When you run analysis, you'll see:
```
📊 Release Analysis: Found 15 competing films in date range
   - Languages: Telugu, Tamil, Malayalam, Hindi/Pan-India
   - Avg buzz: 62.3
   - With target clusters: 15/15
```

### Competition Manager View
Navigate to `/competition` to verify:
- Each movie shows **Target Audience** chips
- Buzz badges are color-coded (green/orange/gray)
- Genre and scale are displayed

---

## Customization Options

### Manual Cluster Override
If inference is wrong:
1. Go to Supabase → `competition_calendar` table
2. Edit `target_clusters` column (JSONB array)
3. Example: `["FAMILY_FESTIVAL", "NICHE_CINEPHILE"]`

### Add More Movies
1. Edit `public/assets/updated_movies.csv`
2. Add rows: `Movie Name,Release Date,Buzz`
3. Re-import on Competition Manager page

### Adjust Scoring Weights
Edit `src/services/releaseAnalysis.service.js`:
- Line 136: Weekend bonus (currently +10)
- Line 151: Major clash penalty (currently -25 for big films)
- Line 184: Nearby competition penalty (currently -8)
- Line 197: Exam penalty (currently -15 for youth films)
- Line 213: Festival bonus (currently +15)

---

## Troubleshooting

### Problem: All dates show green
**Cause:** No competition data loaded
**Fix:** Import CSV on `/competition` page

### Problem: Heatmap shows red everywhere
**Cause 1:** Too many competing films in range
**Fix:** Extend date range or pick different window

**Cause 2:** Your buzz score is very low (<30)
**Fix:** Build buzz first via Buzz Page

### Problem: Inferred clusters seem wrong
**Cause:** Movie name didn't match patterns
**Fix:** Manually edit in Supabase or improve inference function

### Problem: Exam/festival data missing
**Cause:** Database migration not run
**Fix:** Execute `feature-expansion-migrations.sql` in Supabase

---

## Performance Notes

- **Date range limit:** 365 days max recommended
- **Competition query:** Indexed on `release_date` (fast)
- **Analysis time:** ~500ms for 90-day window with 50 movies
- **Heatmap render:** Client-side React (instant)

---

## Future Enhancements

### Planned:
- [ ] Machine learning buzz prediction
- [ ] Historical release success data
- [ ] Trailer clash detection
- [ ] Theater availability integration
- [ ] Regional holiday auto-sync

### Easy Additions:
- [ ] Export heatmap as PDF
- [ ] Share analysis with team
- [ ] Compare multiple date ranges
- [ ] "What-if" scenarios (change your buzz score)

---

## Summary Checklist

**For accurate heatmap results:**
- ✅ Import CSV data (`/competition` page)
- ✅ Set your film's language & region (Onboarding)
- ✅ Define target clusters (Persona page)
- ✅ Track your buzz score (Buzz page)
- ✅ Run database migration (`feature-expansion-migrations.sql`)
- ✅ Set realistic date range (30-120 days out)
- ✅ Review top 4 suggestions, not just heatmap colors
- ✅ Consider pros/cons, not just score

**The heatmap is only as good as your input data!**

---

**Questions?** Check browser console for analysis logs or inspect Competition Manager to verify imported data.
