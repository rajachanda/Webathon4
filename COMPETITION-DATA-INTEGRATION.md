# Competition Data Integration Guide

## Overview
The CinYstore platform now integrates real competition movie data from a CSV file containing upcoming South Indian film releases with buzz scores. This data powers the **Release Window Analysis** feature, helping producers identify optimal release dates.

---

## Data Source

### CSV File Location
```
public/assets/updated_movies.csv
```

### CSV Structure
```csv
Movie Name,Release Date,Buzz
Sampradayini Suppini Suddapoosani,2026-03-06,69
Sambhavam Adhyayam Onnu,2026-03-06,49
Jai Hanuman,2026-03-18,68
...
```

**Fields:**
- **Movie Name** - Title of the competing film
- **Release Date** - Planned release date (YYYY-MM-DD format)
- **Buzz** - Current buzz score (0-100 scale)

### Dataset Statistics
- **Total Movies:** 48 upcoming releases
- **Date Range:** March 2026 - April 2027
- **Languages:** Telugu, Tamil, Malayalam, Kannada, Hindi/Pan-India
- **Buzz Range:** 35 - 85 (average: ~58)

---

## Features

### 1. Competition Manager (/competition)

**Access:** Header navigation → "Competition" link

**Features:**
- **Import CSV Data** - One-click import from CSV to Supabase
- **Filter Views:**
  - Upcoming (6 months)
  - High Buzz (≥70 score)
  - All Movies (1 year)
- **Movie Cards Display:**
  - Title + Buzz badge (color-coded)
  - Release date
  - Language/Region
  - Scale (Big/Mid/Small)
- **Duplicate Prevention** - Skips already imported movies
- **Statistics Dashboard** - Total count, average buzz

**How to Import:**
1. Navigate to `/competition`
2. Click "Import Movies from CSV" button
3. Wait for import confirmation
4. View imported movies in grid

---

### 2. Release Window Analysis Integration

The imported competition data is automatically used by the Release Window heatmap:

**How It Works:**
1. User sets date range on `/projects/:id/release-window`
2. System queries competition_calendar table
3. Analyzes each date for:
   - **Direct Clashes** - Movies releasing on same date
   - **Cluster Overlap** - Target audience similarity
   - **Buzz Comparison** - Relative buzz scores
4. Calculates risk scores and penalties
5. Displays heatmap with:
   - Green dates (safe, low competition)
   - Orange dates (moderate risk)
   - Red dates (high clash risk)

**Clash Detection Logic:**
```javascript
// Example: User's film targets MASS_SINGLE_SCREEN + URBAN_YOUTH_MULTIPLEX
// Competing film on same date targets MASS_SINGLE_SCREEN + FAMILY_FESTIVAL
// Overlap = 1/3 = 33%
// Penalty = -10 to -30 based on overlap % and buzz delta
```

---

## Service Architecture

### competition.service.js

**Key Functions:**

#### `loadCompetitionDataFromCSV()`
- Fetches CSV from `/assets/updated_movies.csv`
- Parses lines into movie objects
- Infers language from movie name patterns
- Calculates scale from buzz score
- Returns array of movie objects

#### `importCompetitionData(movies)`
- Checks existing database entries
- Filters out duplicates
- Inserts new movies to `competition_calendar` table
- Returns import statistics

#### `autoImportCompetitionData()`
- Combines load + import in one call
- Used by Competition Manager page

#### `getCompetitionMovies(startDate, endDate)`
- Queries database for movies in date range
- Used by Release Window analysis

#### `getHighBuzzCompetition(startDate, endDate)`
- Returns only movies with buzz ≥ 70
- Used for "High Buzz" filter

---

## Language Inference Heuristics

The service uses movie name patterns to guess language:

**Telugu Indicators:**
- Names with: bharat, ntr, nbk, ustaad, swayambhu

**Tamil Indicators:**
- Names with: thug life, jailer, thalaivar, chiyaan, dhruva

**Malayalam Indicators:**
- Names with: aadu, pallichattambi, ajagajantharam, khalifa

**Kannada Indicators:**
- Names with: kempegowda, benz

**Hindi/Pan-India Indicators:**
- Names with: ramayana, lahore, love & war, spirit

**Fallback:** "Regional" (requires manual classification)

---

## Database Schema

### competition_calendar Table

```sql
CREATE TABLE public.competition_calendar (
    id UUID PRIMARY KEY,
    release_date DATE NOT NULL,
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    region_primary TEXT,
    scale TEXT,  -- 'big' (≥75), 'mid' (55-74), 'small' (<55)
    genre TEXT,
    notes TEXT,
    target_clusters JSONB,
    external_buzz_score FLOAT,
    is_confirmed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

**Indexes:**
- `release_date` - Fast date range queries
- `language` - Filter by language

**RLS Policies:**
- SELECT: All authenticated users (public data)
- INSERT/UPDATE: All authenticated users (can be restricted to admin later)

---

## Sample Data Insights

### Top Buzz Movies (Buzz ≥ 80)
1. **Jailer 2** (June 2026) - 85 buzz
2. **Ramayana: Part One** (Nov 2026) - 83 buzz
3. **Drishyam 3** (April 2026) - 82 buzz
4. **Love & War** (Dec 2026) - 82 buzz
5. **King 101** (Jan 2027) - 80 buzz

### High Competition Periods (March-April 2026)
- **March 6:** 3 simultaneous releases
- **March 19:** 4 simultaneous releases (including "Toxic")
- **April 14:** 3 major releases (NBK 111, Vishwambhara, Chiyaan 63)

### Favorable Windows (Low Competition)
- **March 26-27** - Only Ustaad Bhagat Singh nearby
- **May 24-31** - Dhruva Natchathiram alone
- **June 25-July 28** - NTR 31 (Dragon) only

---

## Usage Examples

### Example 1: Import Competition Data
```javascript
import { autoImportCompetitionData } from './services/competition.service';

async function loadData() {
  try {
    const result = await autoImportCompetitionData();
    console.log(result.message);
    // "Imported 48 movies, skipped 0 duplicates"
  } catch (error) {
    console.error('Import failed:', error);
  }
}
```

### Example 2: Get Movies for Release Window
```javascript
import { getCompetitionMovies } from './services/competition.service';

async function analyzeWindow() {
  const startDate = '2026-03-01';
  const endDate = '2026-05-31';
  
  const movies = await getCompetitionMovies(startDate, endDate);
  console.log(`Found ${movies.length} competing films`);
  
  // Filter by language
  const teluguMovies = movies.filter(m => m.language === 'Telugu');
  console.log(`${teluguMovies.length} Telugu releases`);
}
```

### Example 3: Find High-Buzz Clashes
```javascript
import { getHighBuzzCompetition } from './services/competition.service';

async function findThreats() {
  const startDate = '2026-04-01';
  const endDate = '2026-06-30';
  
  const bigMovies = await getHighBuzzCompetition(startDate, endDate);
  
  bigMovies.forEach(movie => {
    console.log(`${movie.title} - ${movie.release_date} - Buzz: ${movie.external_buzz_score}`);
  });
}
```

---

## Updating Competition Data

### Option 1: Update CSV File
1. Edit `public/assets/updated_movies.csv`
2. Add/update rows following the same format
3. Navigate to `/competition`
4. Click "Import Movies from CSV"
5. System will skip duplicates and import only new movies

### Option 2: Manual Database Entry
```sql
INSERT INTO public.competition_calendar 
(release_date, title, language, region_primary, scale, external_buzz_score, is_confirmed)
VALUES 
('2026-08-15', 'New Blockbuster', 'Telugu', 'AP/TG', 'big', 88, true);
```

### Option 3: API Integration (Future Enhancement)
- Integrate with BoxOffice APIs
- Auto-sync with IMDb/TMDb
- Real-time buzz tracking

---

## CSV Maintenance Best Practices

### Data Quality
- ✅ Use consistent date format (YYYY-MM-DD)
- ✅ Keep buzz scores 0-100 range
- ✅ Update buzz scores regularly (monthly recommended)
- ✅ Mark tentative releases with lower buzz scores

### Organization
- Sort by release date (ascending)
- Group by language/region in comments
- Add notes for major clashes

### Example Updated Row
```csv
Pushpa 3,2026-12-25,92
# High-profile Christmas release, pan-India
```

---

## Troubleshooting

### Import Shows "0 imported, X skipped"
**Cause:** All movies already exist in database  
**Solution:** Check existing data on Competition Manager page, or manually delete old entries

### Movies Not Showing in Heatmap
**Cause:** Date range doesn't overlap with imported data  
**Solution:** Extend date range on Release Window page, or import more recent data

### Wrong Language Detected
**Cause:** Language inference heuristic limitation  
**Solution:** Manually update in database:
```sql
UPDATE public.competition_calendar 
SET language = 'Tamil' 
WHERE title = 'Movie Name';
```

### CSV Parse Errors
**Cause:** Malformed CSV (extra commas, missing fields)  
**Solution:** Validate CSV structure, ensure 3 columns per row

---

## Performance Considerations

### Database Query Optimization
- Indexed `release_date` field for fast range queries
- Cached results in frontend (React state)
- Pagination for large datasets (future)

### CSV File Size Limits
- Current: 48 movies (~2KB)
- Recommended max: 500 movies (~20KB)
- Browser limit: ~50MB for fetch

### Real-Time Updates
- Import is manual (on-demand)
- No auto-sync (prevents stale data issues)
- Future: Webhook-based sync

---

## Integration with Other Features

### Persona Page
- Not directly used (but informs user strategy)

### Buzz Page
- User's buzz score feeds into Release Window analysis
- Compares user's buzz vs competing films

### Release Window Page
- **Primary integration point**
- Competition data determines heatmap colors
- Pros/cons lists reference specific competing films

### Campaign Page
- Indirectly: Informed by chosen release date
- Future: Could suggest competitor-aware tactics

---

## Future Enhancements

### Phase 1 (Near-term)
- [ ] Manual CSV upload (file picker)
- [ ] Edit/delete individual movies
- [ ] Genre classification
- [ ] Target cluster assignment

### Phase 2 (Mid-term)
- [ ] API integration (TMDb/BoxOffice)
- [ ] Auto-sync weekly
- [ ] Buzz score tracking over time
- [ ] Social media sentiment for competitors

### Phase 3 (Long-term)
- [ ] ML model for buzz prediction
- [ ] Trailer analysis for competitor films
- [ ] Theater availability data integration
- [ ] Historical performance comparison

---

## Technical Notes

### CSV Encoding
- UTF-8 recommended
- Handles special characters (Tamil/Telugu names)

### Date Parsing
- Uses JavaScript `Date()` constructor
- Assumes YYYY-MM-DD format
- Timezone: UTC (normalized)

### Buzz Score Normalization
- Input: 0-100 integer
- Stored as: Float (allows decimals in future)
- Scale mapping:
  - 75-100 → "big"
  - 55-74 → "mid"
  - 0-54 → "small"

---

## Support & Feedback

For issues or suggestions regarding competition data:
1. Check CSV file format
2. Verify database migrations ran successfully
3. Inspect browser console for errors
4. Contact platform admin

---

**Last Updated:** February 2026  
**Data Version:** 1.0 (48 movies, Mar 2026 - Apr 2027)
