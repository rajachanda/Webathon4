# 📅 Release Window Calendar - Current State (Feb 21, 2026)

## 🔄 EXACT FLOW: How It Works Right Now

### Step 1: User Opens Release Window Page
**URL**: `/projects/{projectId}/release-window`  
**Component**: `ReleaseWindowPage.js`

**What Loads:**
```javascript
1. Project data: title, language, region, genre, budget
2. Persona data: target_core_clusters, target_secondary_clusters
3. Latest buzz score from buzz_snapshots table
4. Default date range: Today + 30 days → Today + 90 days
   - Earliest: March 23, 2026 (30 days from now)
   - Latest: May 22, 2026 (90 days from now)
```

**User Sees:**
- Film summary card (left)
- Date range inputs (right)
- "Analyze Windows" button
- Empty heatmap area

---

### Step 2: User Clicks "Analyze Windows"

**Triggers**: `handleAnalyze()` function

**Data Sent to Analysis Engine:**
```javascript
{
  projectId: "abc-123",
  earliestDate: "2026-03-23",
  latestDate: "2026-05-22",
  avoidBigClashes: true,
  targetCoreClusters: ["URBAN_YOUTH_MULTIPLEX", "FAMILY_FESTIVAL"],
  targetSecondaryClusters: ["NICHE_CINEPHILE"],
  currentBuzzScore: 52,  // From latest buzz snapshot
  language: "Tamil",
  regionPrimary: "Tamil Nadu"
}
```

---

### Step 3: Competition Data Loaded

**Service**: `competition.service.js` → `getCompetitionMovies()`  
**Source**: Supabase `competition_calendar` table (populated from CSV)

**SQL Query:**
```sql
SELECT * FROM competition_calendar
WHERE release_date >= '2026-03-23'
  AND release_date <= '2026-05-22'
ORDER BY release_date;
```

**Data Returned (Example from your CSV):**
```javascript
[
  {
    title: "Ustaad Bhagat Singh",
    release_date: "2026-03-26",
    external_buzz_score: 66,
    language: "Telugu",
    scale: "mid",
    genre: "Action",
    target_clusters: ["MASS_SINGLE_SCREEN", "URBAN_YOUTH_MULTIPLEX"]
  },
  {
    title: "Drishyam 3",
    release_date: "2026-04-02",
    external_buzz_score: 82,
    language: "Malayalam",
    scale: "big",
    genre: "Thriller",
    target_clusters: ["MASS_SINGLE_SCREEN", "URBAN_YOUTH_MULTIPLEX", "FAMILY_FESTIVAL"]
  },
  {
    title: "Nadaprabhu Kempegowda",
    release_date: "2026-04-08",
    external_buzz_score: 46,
    language: "Kannada",
    scale: "small",
    genre: "Action",
    target_clusters: ["MASS_SINGLE_SCREEN"]
  },
  // ... more movies in date range
]
```

**Console Log Output:**
```
📊 Release Analysis: Found 18 competing films in date range
   - Languages: Telugu, Malayalam, Kannada, Tamil, Hindi
   - Avg buzz: 57.3
   - With target clusters: 18/18
```

---

### Step 4: Date Range Generated

**Function**: `generateDateRange(earliestDate, latestDate)`

**Creates array of ALL dates:**
```javascript
[
  "2026-03-23", "2026-03-24", "2026-03-25", ... "2026-05-22"
]
// Total: 61 dates in this example
```

---

### Step 5: Each Date Analyzed (CURRENT SIMPLIFIED ALGORITHM)

**Function**: `analyzeSingleDate()` - Called 61 times (once per date)

#### Example 1: March 26, 2026 (Has Competition)
```javascript
Input:
- date: "2026-03-26"
- competingFilms: [all 18 movies]
- currentBuzzScore: 52 (your movie)

Processing:
1. Filter movies releasing on same date:
   sameDay = ["Ustaad Bhagat Singh" (buzz: 66)]

2. Compare buzz scores:
   Competitor buzz (66) > Your buzz (52) ✗
   → hasHigherBuzzCompetition = TRUE

3. Build pros/cons:
   cons = [
     '🔴 "Ustaad Bhagat Singh" (Buzz: 66) - Higher than your buzz (52)'
   ]
   pros = []

4. Determine risk:
   hasHigherBuzzCompetition == true
   → riskLevel = "high"
   → riskColor = "red"
   → scoreNumeric = 20

Output:
{
  date: "2026-03-26",
  scoreNumeric: 20,
  riskLevel: "high",
  riskColor: "red",
  dayOfWeek: "Thu",
  pros: [],
  cons: [
    '🔴 "Ustaad Bhagat Singh" (Buzz: 66) - Higher than your buzz (52)'
  ],
  expectedBuzzDelta: 0
}
```

**What User Sees in Heatmap:**
```
┌─────────────┐
│     26      │ ← Day number
│     Thu     │ ← Day of week
└─────────────┘
    🔴 RED      ← Background color

Hover Tooltip:
━━━━━━━━━━━━━━━━━━━━━━━
March 26, 2026
Score: 20/100 🔴

⚠ Cons:
• 🔴 "Ustaad Bhagat Singh" (Buzz: 66) 
  Higher than your buzz (52)
━━━━━━━━━━━━━━━━━━━━━━━
```

---

#### Example 2: April 2, 2026 (Has Competition - Higher Buzz)
```javascript
Input:
- date: "2026-04-02"
- competingFilms: [all 18 movies]
- currentBuzzScore: 52

Processing:
1. sameDay = ["Drishyam 3" (buzz: 82)]

2. Compare:
   82 > 52 → hasHigherBuzzCompetition = TRUE

3. cons = [
     '🔴 "Drishyam 3" (Buzz: 82) - Higher than your buzz (52)'
   ]

4. Result:
   riskColor: "red"
   scoreNumeric: 20

Output:
{
  date: "2026-04-02",
  scoreNumeric: 20,
  riskLevel: "high",
  riskColor: "red",
  dayOfWeek: "Thu",
  cons: ['🔴 "Drishyam 3" (Buzz: 82) - Higher than your buzz (52)'],
  pros: []
}
```

**Heatmap Display:**
```
┌─────────────┐
│      2      │
│     Thu     │
└─────────────┘
    🔴 RED

Tooltip shows Drishyam 3 clash
```

---

#### Example 3: April 8, 2026 (Lower Buzz Competition)
```javascript
Input:
- date: "2026-04-08"
- currentBuzzScore: 52

Processing:
1. sameDay = ["Nadaprabhu Kempegowda" (buzz: 46)]

2. Compare:
   46 < 52 → hasHigherBuzzCompetition = FALSE
   BUT sameDay.length > 0 (competition exists)

3. cons = [
     '📊 "Nadaprabhu Kempegowda" (Buzz: 46)'
   ]
   pros = [
     '✅ Your buzz is higher than or equal to competitors'
   ]

4. Result:
   riskColor: "orange"  (medium risk)
   scoreNumeric: 60

Output:
{
  date: "2026-04-08",
  scoreNumeric: 60,
  riskLevel: "medium",
  riskColor: "orange",
  dayOfWeek: "Wed",
  cons: ['📊 "Nadaprabhu Kempegowda" (Buzz: 46)'],
  pros: ['✅ Your buzz is higher than or equal to competitors']
}
```

**Heatmap Display:**
```
┌─────────────┐
│      8      │
│     Wed     │
└─────────────┘
    🟠 ORANGE

Tooltip:
✅ Pros: Your buzz higher
⚠ Cons: Nadaprabhu Kempegowda releasing
```

---

#### Example 4: March 25, 2026 (No Competition)
```javascript
Input:
- date: "2026-03-25"
- currentBuzzScore: 52

Processing:
1. sameDay = [] (no movies releasing)

2. hasHigherBuzzCompetition = FALSE
   sameDay.length = 0

3. pros = ['✅ No competing releases on this date']
   cons = []

4. Result:
   riskColor: "green"
   scoreNumeric: 90

Output:
{
  date: "2026-03-25",
  scoreNumeric: 90,
  riskLevel: "low",
  riskColor: "green",
  dayOfWeek: "Wed",
  cons: [],
  pros: ['✅ No competing releases on this date']
}
```

**Heatmap Display:**
```
┌─────────────┐
│     25      │
│     Wed     │
└─────────────┘
    🟢 GREEN

Tooltip:
✅ Pros: No competing releases
Score: 90/100
```

---

### Step 6: Results Sorted & Displayed

**Top Suggestions**: Best 4 dates by score (highest to lowest)

**Example Output:**
```javascript
Top Suggestions (sorted by scoreNumeric):

#1: March 25, 2026 (Wed) - Score: 90 🟢 GREEN
    ✅ No competing releases

#2: April 8, 2026 (Wed) - Score: 60 🟠 ORANGE
    ✅ Your buzz higher than competitors
    ⚠ Nadaprabhu Kempegowda releasing (Buzz: 46)

#3: March 26, 2026 (Thu) - Score: 20 🔴 RED
    ⚠ Ustaad Bhagat Singh (Buzz: 66) - Higher buzz

#4: April 2, 2026 (Thu) - Score: 20 🔴 RED
    ⚠ Drishyam 3 (Buzz: 82) - Higher buzz
```

**Heatmap Visual:**
```
March 2026
┌───┬───┬───┬───┬───┬───┬───┐
│   │   │   │   │   │   │   │
├───┼───┼───┼───┼───┼───┼───┤
│   │   │ 🟢│ 🟢│ 🟢│ 🔴│ 🟢│
│   │   │ 25│ 26│ 27│ 28│ 29│
│   │   │Wed│Thu│Fri│Sat│Sun│
└───┴───┴───┴───┴───┴───┴───┘

April 2026
┌───┬───┬───┬───┬───┬───┬───┐
│ 🟢│ 🔴│ 🟢│ 🟢│ 🟢│ 🟢│ 🟢│
│  1│  2│  3│  4│  5│  6│  7│
│Wed│Thu│Fri│Sat│Sun│Mon│Tue│
├───┼───┼───┼───┼───┼───┼───┤
│ 🟠│ 🟢│ 🟢│ 🟢│ 🟢│ 🟢│ 🔴│
│  8│  9│ 10│ 11│ 12│ 13│ 14│
│Wed│Thu│Fri│Sat│Sun│Mon│Tue│
└───┴───┴───┴───┴───┴───┴───┘
```

---

### Step 7: User Interaction

**Actions Available:**
1. **Hover over date cell** → See tooltip with pros/cons
2. **Click "Select this date"** → Saves to `projects.confirmed_release_date`
3. **Change date range** → Re-analyze with new competition data

---

## ⚙️ CURRENT ALGORITHM LOGIC (Simplified)

```python
FOR EACH date in range:
    1. Find movies releasing on exact same date
    
    2. IF no movies on that date:
           ✅ GREEN (score: 90)
           pros: "No competition"
       
    3. ELSE IF any movie has buzz > your buzz:
           🔴 RED (score: 20)
           cons: "Movie X (Buzz: Y) higher than yours"
       
    4. ELSE:
           🟠 ORANGE (score: 60)
           pros: "Your buzz is higher"
           cons: List competing movies

    5. Return color + score + pros/cons
```

**What's MISSING (Currently Ignored):**
- ❌ Day of week (weekends vs weekdays)
- ❌ Nearby competition (±3 days)
- ❌ Language matching
- ❌ Target cluster overlap
- ❌ Scale (big/mid/small) impact
- ❌ Exam periods
- ❌ Festival bonuses
- ❌ Region matching

---

## 🎯 REAL EXAMPLE: Your Tamil Film (Buzz: 52)

**Scenario**: Analyzing March 23 - May 22, 2026

**What Happens:**

### Date: March 26, 2026
```
Competition: Ustaad Bhagat Singh (Telugu, Buzz: 66)
Your Buzz: 52
Result: 🔴 RED (Buzz: 66 > 52)

Current Logic:
- Sees higher buzz → Color RED
- Ignores: Different language (Telugu vs Tamil)
- Ignores: Target cluster overlap
- Ignores: It's a Thursday (not weekend)

Smarter Logic Would Consider:
- Different language: Less severe clash
- Cluster overlap: 50% (URBAN_YOUTH_MULTIPLEX common)
- Thursday release: Not ideal for opening
- Regional focus: Telugu (Andhra/Telangana) vs Tamil (TN)
→ Should be ORANGE, not RED
```

### Date: April 2, 2026
```
Competition: Drishyam 3 (Malayalam, Buzz: 82)
Your Buzz: 52
Result: 🔴 RED (Buzz: 82 > 52)

Current Logic:
- Sees much higher buzz → RED
- Ignores: Different language (Malayalam)
- Ignores: Different primary region (Kerala vs Tamil Nadu)
- Ignores: Thursday (not weekend)

Smarter Logic Would Consider:
- Same clusters: FAMILY_FESTIVAL overlap = 67%
- But different market: Kerala vs Tamil Nadu
- Very high buzz (82) = Pan-India appeal
- Cross-language competition possible
→ Should be ORANGE/RED depending on cluster overlap weight
```

### Date: April 14, 2026
```
Competition:
- NBK 111 (Telugu, Buzz: 69)
- Vishwambhara (Telugu, Buzz: 50)
- Chiyaan 63 (Tamil, Buzz: 76) ← SAME LANGUAGE!

Your Buzz: 52
Result: 🔴 RED (Chiyaan 63 buzz: 76 > 52)

Current Logic:
- Sees Chiyaan 63 higher buzz → RED
- Shows all 3 movies in cons
- Ignores: Same language = MAJOR CLASH
- Ignores: Tuesday release (not ideal)

Smarter Logic Would Consider:
- Chiyaan 63 = SAME TAMIL FILM = 🚨 CRITICAL CLASH
- High buzz Tamil star film
- AVOID THIS DATE AT ALL COSTS
- Should be DEEP RED with warning
→ Score should be 5, not 20
```

### Date: March 25, 2026
```
Competition: None
Your Buzz: 52
Result: 🟢 GREEN (No competition)

Current Logic:
- No movies → GREEN (score: 90)
- Ignores: Wednesday (mid-week)
- Ignores: Clear corridor ±3 days
- Ignores: Low current buzz (52)

Smarter Logic Would Consider:
- Wednesday release = Not ideal for opening
- But clear corridor = Good
- Buzz 52 = Medium, needs marketing push
- Time until release: 33 days = Decent prep time
→ Should be GREEN but with notes about weekday release
→ Score: 75 (good but not perfect)
```

---

## 📊 DATA FLOW SUMMARY

```
User Input
   ↓
[Date Range: Mar 23 - May 22]
[Your Buzz: 52]
[Language: Tamil]
[Clusters: URBAN_YOUTH, FAMILY]
   ↓
Competition Service
   ↓
[Load CSV → Supabase]
[18 movies in range]
   ↓
Analysis Engine (CURRENT)
   ↓
For each of 61 dates:
  • Find same-day movies
  • Compare buzz only
  • Assign color (Red/Orange/Green)
   ↓
Heatmap Display
   ↓
[Visual calendar with colored cells]
[Tooltips with movie names]
[Top 4 suggestions list]
```

---

## 🔍 WHAT YOU CAN SEE IN UI RIGHT NOW

**1. Heatmap Calendar**
- Cells colored: 🟢 Green / 🟠 Orange / 🔴 Red
- Each cell shows: Day number + Day of week
- Hover shows: Movie names + Buzz scores + Pros/Cons

**2. Top Suggestions Panel**
- Best 4 dates ranked by score
- Each shows:
  - Date with full format
  - Score (0-100)
  - Risk level badge
  - Pros list
  - Cons list
  - "Select this date" button

**3. Competition Data**
- All 48 CSV movies imported
- Visible in cons when they clash
- Shows movie title + buzz score

**4. Console Logs** (Open DevTools)
```
📊 Release Analysis: Found 18 competing films
   - Languages: Telugu, Malayalam, Kannada, Tamil, Hindi
   - Avg buzz: 57.3
   - With target clusters: 18/18
```

---

## 🚨 CURRENT LIMITATIONS

**1. Ignores Language Matching**
- Tamil film vs Telugu film = Same penalty
- Should: Same language = Higher penalty

**2. Ignores Day of Week**
- Wednesday vs Friday = Same score
- Should: Weekend releases get +10-15 bonus

**3. Ignores Cluster Overlap**
- Your clusters vs competitor = Not calculated
- Should: High overlap = Higher penalty

**4. Ignores Nearby Competition**
- Only looks at exact date
- Should: Check ±3 days window

**5. No Exam/Festival Data**
- Tables exist but empty
- Should: Exam periods = penalty, Festivals = bonus

**6. Treats All Competition Equal**
- Big-scale vs small-scale = Same
- Should: Big film clash = Higher penalty

---

## 💡 NEXT STEPS TO ENHANCE

**Phase 1**: Add smart penalties (No new data needed)
- Weekend bonuses
- Language matching
- Cluster overlap
- Scale-based penalties
- Nearby competition (±3 days)

**Phase 2**: Add calendar data (Needs your input)
- Exam periods for key regions
- Festival calendar 2026-2027

**Phase 3**: Advanced features
- Regional market overlap
- Star power consideration
- Historical clash analysis

---

**Current State**: ✅ WORKING but BASIC
**CSV Data**: ✅ ALL 48 MOVIES LOADED
**Display**: ✅ SHOWS MOVIE NAMES IN TOOLTIPS
**Smart Analysis**: ❌ SIMPLIFIED (buzz-only comparison)
