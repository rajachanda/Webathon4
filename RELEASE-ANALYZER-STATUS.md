~# Release Window Analyzer - Status & Requirements

## 🔍 CURRENT STATE ANALYSIS

### ✅ What's Working
1. **CSV Data Import**: 48 movies loaded from `/public/assets/updated_movies.csv`
2. **Data Structure**: Each movie has:
   - Title, Release Date, Buzz Score (from CSV)
   - Language (auto-inferred from title)
   - Scale (big/mid/small based on buzz)
   - Target Clusters (auto-assigned)
   - Genre (auto-inferred)
3. **Basic Heatmap**: Shows RED/ORANGE/GREEN based on buzz comparison
4. **Database Tables**: All tables created (competition_calendar, exam_calendar, festival_calendar)
5. **Persona Integration**: target_core_clusters and target_secondary_clusters available
6. **Cluster Overlap Utility**: `calculateClusterOverlap()` function exists in clusterMapping.js

### ❌ What's Missing/Broken

#### Issue 1: Movie Data Not Visible in Heatmap Tooltip
**Problem**: Competing movie names show in console logs but may not display clearly in UI tooltip
**Location**: HeatmapCalendar.js tooltip only shows pros/cons text
**Fix Needed**: Enhance tooltip to show competing movies as a separate section with structured display

#### Issue 2: Simplified Algorithm Removed Advanced Analysis
**Problem**: Current logic ONLY compares buzz scores - ignores:
- Weekend timing (Fri/Sat/Sun releases)
- Nearby competition (±3 days window)
- Exam periods impact
- Festival bonuses
- Target audience overlap
- Language/scale clash severity

**Why Removed**: Previous request to simplify to "CSV file only"
**User Want**: Re-implement these features with persona/clustering awareness

---

## 📊 DATA STRUCTURES ALREADY AVAILABLE

### 1. Competition Calendar (CSV Imported)
```javascript
{
  title: "Jailer 2",
  release_date: "2026-06-12",
  external_buzz_score: 85,
  language: "Tamil",  // Auto-inferred
  scale: "big",       // big (≥75), mid (55-74), small (<55)
  genre: "Action",    // Auto-inferred
  target_clusters: ["MASS_SINGLE_SCREEN", "URBAN_YOUTH_MULTIPLEX"],
  region_primary: "Tamil Nadu"
}
```

### 2. Persona Structure
```javascript
{
  target_core_clusters: ["URBAN_YOUTH_MULTIPLEX", "FAMILY_FESTIVAL"],
  target_secondary_clusters: ["NICHE_CINEPHILE"],
  // ... other persona data
}
```

### 3. Target Clusters (clusterMapping.js)
```javascript
- MASS_SINGLE_SCREEN      // Mass rural audience, single screens
- URBAN_YOUTH_MULTIPLEX   // Urban 18-30, college crowd, multiplex
- FAMILY_FESTIVAL         // Family all ages, senior viewers
- NICHE_CINEPHILE         // OTT viewers 25-40, diaspora, art films
- KIDS_TEENS              // Kids & teens audience
```

### 4. Cluster Overlap Function
```javascript
calculateClusterOverlap(yourClusters, competitorClusters)
// Returns: 0-1 (Jaccard similarity)
// Example: 0.5 = 50% overlap, 0 = no overlap, 1 = identical
```

---

## 🚧 CONSTRAINTS & REQUIREMENTS TO RE-ENABLE FEATURES

### Feature 1: ✅ Weekend Bonuses (READY)
**Status**: Can implement immediately
**Constraint Needed**: None (day of week already calculated)
**Implementation**:
```javascript
- Friday release: +10 points (weekend carry-over)
- Saturday release: +15 points (full weekend)
- Sunday release: +10 points (holiday advantage)
- Thursday release: +5 points (decent)
```
**Persona Integration**: 
- FAMILY_FESTIVAL cluster → Higher weekend bonus (+5 extra)
- URBAN_YOUTH_MULTIPLEX → Lower weekend dependency

---

### Feature 2: ✅ Nearby Competition (READY)
**Status**: Can implement immediately
**Constraint Needed**: User preference for "nearby" window
**Current Default**: ±3 days
**Questions for You**:
1. Should we keep ±3 days or make it configurable?
2. What defines "nearby clash"?
   - Same language within ±3 days?
   - High buzz (≥75) within ±3 days?
   - Same target cluster within ±3 days?

**Proposed Logic**:
```javascript
If competitor within ±3 days:
  - Same language + High buzz (≥75): -8 penalty
  - Same target cluster overlap >30%: -5 penalty
  - Different language, low overlap: -2 penalty
```

---

### Feature 3: ⚠️ Exam Periods (DATA NEEDED)
**Status**: Table exists but EMPTY
**Constraint**: Need actual exam calendar data

**What You Need to Provide**:
```sql
-- Example exam data structure
INSERT INTO exam_calendar (region, exam_type, start_date, end_date, description)
VALUES 
  ('Tamil Nadu', 'Board Exam', '2026-03-15', '2026-03-30', 'Class 10 & 12 Board Exams'),
  ('Karnataka', 'Board Exam', '2026-03-20', '2026-04-05', 'SSLC & PUC Exams'),
  ('All India', 'Entrance Exam', '2026-05-10', '2026-05-25', 'JEE/NEET Season');
```

**Questions for You**:
1. Which regions are important for your project?
2. Which exam periods should we track?
   - Board Exams (Class 10, 12)
   - Entrance Exams (JEE, NEET)
   - University Exams
3. Do you have this data? Or should we use a generic calendar?

**Persona Integration**:
```javascript
If exam period overlaps:
  - KIDS_TEENS cluster: -15 penalty
  - URBAN_YOUTH_MULTIPLEX: -10 penalty (college exams)
  - FAMILY_FESTIVAL: -3 penalty (parents busy)
  - MASS_SINGLE_SCREEN: -2 penalty (minimal impact)
```

---

### Feature 4: ⚠️ Festival Bonuses (DATA NEEDED)
**Status**: Table exists but EMPTY
**Constraint**: Need festival calendar data

**What You Need to Provide**:
```sql
-- Example festival data structure
INSERT INTO festival_calendar (festival_name, region, date, favorable_for_clusters, notes)
VALUES 
  ('Diwali', 'Pan India', '2026-11-01', '["FAMILY_FESTIVAL", "MASS_SINGLE_SCREEN"]', 'Biggest box office period'),
  ('Eid', 'Pan India', '2026-07-07', '["MASS_SINGLE_SCREEN", "FAMILY_FESTIVAL"]', 'Strong family audience'),
  ('Pongal', 'Tamil Nadu', '2026-01-14', '["FAMILY_FESTIVAL", "MASS_SINGLE_SCREEN"]', 'Tamil New Year'),
  ('Onam', 'Kerala', '2026-09-05', '["FAMILY_FESTIVAL"]', 'Kerala harvest festival'),
  ('Christmas', 'Pan India', '2026-12-25', '["FAMILY_FESTIVAL", "URBAN_YOUTH_MULTIPLEX"]', 'Holiday period');
```

**Questions for You**:
1. Which festivals are important for your target regions?
2. Do you have a festival calendar for 2026-2027?
3. Should we create a default festival list?

**Persona Integration**:
```javascript
If festival matches persona clusters:
  - Highly favorable (cluster match): +15 bonus
  - General holiday boost: +5 bonus
  - Non-matching festival: +2 (overall boost)
```

---

### Feature 5: ✅ Target Cluster Overlap (READY)
**Status**: Can implement immediately
**Constraint**: None (function already exists)

**Implementation**:
```javascript
const overlap = calculateClusterOverlap(
  persona.target_core_clusters,
  competitor.target_clusters
);

if (overlap >= 0.7) {
  // 70%+ overlap = SEVERE CLASH
  penalty = -20;
} else if (overlap >= 0.4) {
  // 40-70% overlap = MODERATE CLASH
  penalty = -10;
} else if (overlap >= 0.2) {
  // 20-40% overlap = MINOR CLASH
  penalty = -5;
}
```

**Example**:
```javascript
Your clusters: ["URBAN_YOUTH_MULTIPLEX", "FAMILY_FESTIVAL"]
Competitor: ["URBAN_YOUTH_MULTIPLEX"]
Overlap: 0.33 (33%) → -5 penalty
```

---

### Feature 6: ✅ Language/Scale Penalties (READY)
**Status**: Data already in CSV
**Constraint**: None

**Implementation**:
```javascript
// Same date competition
if (competitor.language === yourLanguage) {
  if (competitor.scale === 'big') {
    penalty = -25 (MAJOR CLASH);
  } else if (competitor.scale === 'mid') {
    penalty = -15 (MEDIUM CLASH);
  } else {
    penalty = -8 (MINOR CLASH);
  }
  
  // Add buzz penalty
  if (competitor.buzz > yourBuzz) {
    penalty -= 10 (BUZZ DISADVANTAGE);
  }
}

// Different language but high cluster overlap
else if (overlap > 0.3) {
  penalty = -8 (CROSS-LANGUAGE COMPETITION);
}
```

---

## 🎯 PROPOSED ENHANCED ALGORITHM

### Score Calculation (0-100 scale)
```javascript
Base Score: 50

1. Weekend Bonus: +10 to +15 (persona-weighted)
2. Competition Penalty: -5 to -35 (based on language + scale + buzz + cluster overlap)
3. Nearby Competition: -2 to -8 (±3 days window)
4. Exam Period: -2 to -15 (based on target clusters)
5. Festival Bonus: +2 to +15 (cluster match bonus)
6. Clear Corridor Bonus: +8 (no competition)
7. Buzz Delta Bonus: +5 to +10 (time to build buzz)

Final Score: Max(0, Min(100, calculated_score))
```

### Risk Color Coding
```javascript
Score ≥ 70: GREEN (Low Risk)
Score 40-69: ORANGE (Medium Risk)
Score < 40: RED (High Risk)
```

---

## 📋 ACTION ITEMS FOR YOU

### Immediate Actions (I can implement now)
- [ ] **Fix tooltip display** - Show competing movies in structured format
- [ ] **Re-enable weekend bonuses** - With persona weighting
- [ ] **Re-enable nearby competition** (±3 days) - With cluster awareness
- [ ] **Re-enable cluster overlap penalties** - Using existing function
- [ ] **Re-enable language/scale penalties** - From CSV data

### Data You Need to Provide
- [ ] **Exam Calendar**: Which regions? Which exams? Dates?
- [ ] **Festival Calendar**: Which festivals? Dates for 2026-2027?
- [ ] **Nearby Window Preference**: Keep ±3 days or change?

### Optional Enhancements
- [ ] Add "Empty Corridor" strategy toggle (favor quiet periods vs crowded periods)
- [ ] Add language preference weight (same language = bad or neutral?)
- [ ] Add custom penalty weights (user can adjust how much each factor matters)

---

## 🔧 QUICK FIXES I CAN DO NOW

### Fix 1: Enhanced Tooltip (Show Movie Names)
**Current**: Only shows text in pros/cons
**New**: Separate section showing:
```
Competing Releases (3):
- Jailer 2 (Buzz: 85, Tamil, Mass/Multiplex)
- Thug Life (Buzz: 55, Tamil, Urban Youth)
- Vala (Buzz: 35, Malayalam, Niche)
```

### Fix 2: Re-enable All Features (Except Exams/Festivals)
Can immediately implement:
- ✅ Weekend bonuses with persona weighting
- ✅ Nearby competition (±3 days)
- ✅ Cluster overlap calculations
- ✅ Language/scale clash detection
- ⏸️ Exam periods (pending your data)
- ⏸️ Festival bonuses (pending your data)

---

## 💬 YOUR DECISIONS NEEDED

Please answer these to proceed:

### Question 1: Exam Calendar Data
**Option A**: You provide actual exam dates for your regions
**Option B**: I create a generic exam calendar (Board exams March-April, Entrance May-June)
**Option C**: Skip exams for now, implement later

### Question 2: Festival Calendar Data
**Option A**: You provide festival dates for 2026-2027
**Option B**: I create a default Indian festival calendar
**Option C**: Skip festivals for now, implement later

### Question 3: Nearby Competition Window
**Option A**: Keep ±3 days (standard industry practice)
**Option B**: Change to ±5 days (wider buffer)
**Option C**: Make it configurable per user

### Question 4: Implementation Priority
**Option A**: Implement all features NOW with placeholder exam/festival data
**Option B**: Wait for you to provide exact exam/festival data before implementing
**Option C**: Implement features in phases (weekend/competition first, exams/festivals later)

---

## 🚀 RECOMMENDED NEXT STEPS

1. **Immediate** (I'll do now):
   - Fix tooltip to show competing movie details properly
   - Re-enable weekend bonuses
   - Re-enable cluster overlap penalties
   - Re-enable language/scale clash detection

2. **After Your Input**:
   - Add exam period logic (once you provide data or approve defaults)
   - Add festival bonuses (once you provide data or approve defaults)
   - Fine-tune nearby competition window

3. **Testing**:
   - Dry run with sample project
   - Verify all 48 CSV movies display correctly
   - Check tooltip shows movie details
   - Validate color coding (red/orange/green)

---

**Ready to proceed! Tell me your constraints/preferences and I'll implement the enhanced analyzer.** 🎬
