# Release Timing Intelligence - Implementation Guide

## ✅ What Was Built

A complete **Release Timing Intelligence System** with:

### Core Modules (9 files)
1. **types.js** - Type definitions, constants, audience segments
2. **cache.js** - In-memory TTL caching (15min sports, 5min calendar)
3. **csvParser.js** - Parse release_intelligence_2026_india.csv
4. **sportsAdapter.js** - Cricket API integration (IPL, India matches)
5. **calendarAdapter.js** - Google Calendar integration with hard blocks
6. **normalizeEvents.js** - Event aggregation, multi-day expansion
7. **scorer.js** - Core scoring algorithm (0-100 per segment)
8. **ReleaseCalendarAdapter.js** - UI integration layer
9. **index.js** - Main exports

### Supporting Files
- **README.md** - Complete documentation
- **examples.js** - Usage examples
- **release_intelligence_2026_india.csv** - 41 Indian events for 2026

### Configuration
- Updated **src/config/api.js** with SPORTS_API_KEY, GOOGLE_CALENDAR_API_KEY

---

## 🚀 Quick Integration Guide

### Step 1: Add Environment Variables

Add to `.env`:
```bash
REACT_APP_SPORTS_API_KEY=your_cricket_api_key_here
REACT_APP_GOOGLE_CALENDAR_API_KEY=your_google_calendar_api_key_here
```

### Step 2: Basic Usage

```javascript
import { getDaySummaries } from './lib/releaseScoring';

// Get intelligent scores for a date range
const result = await getDaySummaries(
  '2026-01-01',
  '2026-03-31',
  {
    targetAudience: ['urbanYouth', 'college', 'family'],
    targetRegion: 'Tamil Nadu',
    considerNearby: true,
    useSportsAPI: true,
    useGoogleCalendar: false,
  }
);

console.log(result.daySummaries); // Scores for each day
console.log(result.summary); // Overall statistics
```

---

## 📊 Integration with ReleaseWindowPage

### Option A: Simple Integration (Recommended)

Replace the existing analysis with intelligent scoring:

```javascript
// In ReleaseWindowPage.js
import { getDaySummaries, findBestWindows } from '../lib/releaseScoring';

const handleAnalyze = async () => {
  setLoading(true);
  
  try {
    // Get intelligent scores
    const result = await getDaySummaries(
      startDate,
      endDate,
      {
        targetAudience: determineTargetAudience(projectDetails),
        targetRegion: projectDetails.targetRegion || 'National',
        considerNearby: true,
        useSportsAPI: true,
        useGoogleCalendar: false,
      }
    );

    // Update state
    setAnalysisData(result.daySummaries);
    setSummary(result.summary);

    // Find best windows
    const windows = findBestWindows(result.daySummaries, 3);
    setBestWindows(windows);

  } catch (error) {
    console.error('Analysis failed:', error);
  } finally {
    setLoading(false);
  }
};
```

### Option B: Hybrid Approach

Keep existing CSV analysis, add intelligence as enhancement:

```javascript
const handleAnalyze = async () => {
  setLoading(true);
  
  try {
    // Existing CSV analysis
    const csvAnalysis = await analyzeReleaseWindows(...);
    
    // Add intelligence layer
    const intelligence = await getDaySummaries(
      startDate,
      endDate,
      { targetRegion: 'Tamil Nadu' }
    );

    // Merge both analyses
    const enhanced = csvAnalysis.map(day => {
      const intel = intelligence.daySummaries.find(d => d.date === day.date);
      return {
        ...day,
        intelligenceScore: intel?.score,
        recommendation: intel?.recommendation,
        topReasons: intel?.reasons,
        isBlocked: intel?.isBlocked,
      };
    });

    setAnalysisData(enhanced);
  } finally {
    setLoading(false);
  }
};
```

---

## 🗓️ Integration with HeatmapCalendar

### Enhanced Tooltip with Intelligence

```javascript
// In HeatmapCalendar.js
import { getTooltipData, getRecommendationColor } from '../lib/releaseScoring';

const renderTooltip = (dateItem) => {
  if (!dateItem.intelligence) return null;

  const intel = dateItem.intelligence;

  return (
    <div className="tooltip-content">
      <h3>{formatDate(dateItem.date)}</h3>
      
      {/* Intelligence Score */}
      <div className="intel-score" style={{ 
        backgroundColor: getRecommendationColor(intel.recommendation) 
      }}>
        <span className="score">{intel.score}/100</span>
        <span className="recommendation">{intel.recommendation}</span>
      </div>

      {/* Blocked Status */}
      {intel.isBlocked && (
        <div className="blocked-warning">
          🚫 {intel.blockReason}
        </div>
      )}

      {/* Top Reasons */}
      <div className="reasons">
        <h4>Key Factors:</h4>
        {intel.reasons.slice(0, 3).map((reason, idx) => (
          <div key={idx} className="reason-item">
            <span className="reason-text">{reason.reason}</span>
            <span className={`reason-impact ${reason.impact < 0 ? 'negative' : 'positive'}`}>
              {reason.impact > 0 ? '+' : ''}{reason.impact}
            </span>
          </div>
        ))}
      </div>

      {/* Segment Breakdown */}
      <div className="segments">
        <h4>Audience Scores:</h4>
        <div className="segment-grid">
          <div>Urban Youth: {intel.segmentScores.urbanYouth}</div>
          <div>College: {intel.segmentScores.college}</div>
          <div>Family: {intel.segmentScores.family}</div>
        </div>
      </div>

      {/* Confidence */}
      <div className="confidence">
        Confidence: {intel.confidence}%
      </div>

      {/* Existing Competition Data */}
      {dateItem.competingMovies?.length > 0 && (
        <div className="competing-releases">
          <h4>Competing Releases:</h4>
          {dateItem.competingMovies.map(movie => (
            <div key={movie.title} className="movie-card">
              <strong>{movie.title}</strong>
              <div>Buzz: {movie.buzzScore}</div>
              <div>{movie.language} • {movie.scale}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Heatmap Color Scheme

```javascript
// Color cells based on intelligence score
const getCellColor = (dateItem) => {
  if (!dateItem.intelligence) {
    return '#e5e7eb'; // gray-200 (no data)
  }

  const { score, isBlocked } = dateItem.intelligence;

  if (isBlocked) {
    return '#6b7280'; // gray-500 (blocked)
  }

  // Green to Red gradient based on score
  if (score >= 80) return '#10b981'; // green-500
  if (score >= 65) return '#84cc16'; // lime-500
  if (score >= 50) return '#fbbf24'; // amber-400
  if (score >= 40) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
};
```

---

## 🎯 Usage Scenarios

### Scenario 1: Find Best Release Date

```javascript
import { getDaySummaries, findBestDates } from './lib/releaseScoring';

const result = await getDaySummaries('2026-01-01', '2026-12-31');
const bestDates = findBestDates(result.scores, 10);

console.log('Top 10 Release Dates:');
bestDates.forEach((date, idx) => {
  console.log(`${idx + 1}. ${date.dateISO}: ${date.avgScore}/100`);
});
```

### Scenario 2: Avoid Exam Periods

The system automatically blocks exam periods (Board Exams, JEE, NEET):

```javascript
const result = await getDaySummaries('2026-03-01', '2026-03-31');

const blockedDays = result.daySummaries.filter(d => d.isBlocked);
console.log('Blocked Days:', blockedDays.map(d => d.date));
// Output: ['2026-03-01', '2026-03-02', ..., '2026-03-25'] (Board Exams)
```

### Scenario 3: Regional Release

```javascript
// Tamil release during Pongal
const result = await getDaySummaries(
  '2026-01-10',
  '2026-01-20',
  {
    targetAudience: ['family', 'rural', 'workingClass'],
    targetRegion: 'Tamil Nadu',
  }
);

// Pongal impact: -30 to -60 across segments
// System will recommend dates before/after Pongal
```

### Scenario 4: Avoid IPL Clashes

```javascript
// May 2026 (IPL Finals)
const result = await getDaySummaries(
  '2026-05-01',
  '2026-05-31',
  {
    targetAudience: ['urbanYouth', 'college'],
    useSportsAPI: true,
  }
);

// IPL Final days will show -70 to -80 for youth segments
```

---

## 📈 Data Flow

```
User Input (Date Range, Project Details)
         ↓
getDaySummaries()
         ↓
    ┌────┴────┬────────────┬────────────┐
    ↓         ↓            ↓            ↓
CSV Parser  Sports API  Calendar API  (parallel)
    ↓         ↓            ↓
    └────┬────┴────────────┘
         ↓
normalizeDayEvents() → Expand multi-day, dedupe
         ↓
computeScoresForRange()
         ↓
    For each day:
    - Start at 100
    - Apply day impacts
    - Apply nearby (±3) weighted
    - Check hard blocks
    - Clamp to 0-100
         ↓
    DayScore[]
         ↓
UI (HeatmapCalendar, ReleaseWindowPage)
```

---

## 🧪 Testing

### Test Different Scenarios

```javascript
// Test 1: Diwali period (massive impact)
const diwali = await getDaySummaries('2026-11-10', '2026-11-16');
// Expected: High negative impacts across all segments

// Test 2: Summer break (positive for kids)
const summer = await getDaySummaries('2026-05-01', '2026-06-15');
// Expected: +15 to +20 for kidsParents, family

// Test 3: Board exam period (hard block)
const exams = await getDaySummaries('2026-03-01', '2026-03-25');
// Expected: isBlocked = true for all days

// Test 4: Normal weekday
const normal = await getDaySummaries('2026-02-10', '2026-02-10');
// Expected: Score ~100 (no events)
```

---

## 🔧 Customization

### Add Custom Event Types

Edit `types.js`:
```javascript
export const EVENT_TYPES = {
  // ... existing types
  COMPANY_EVENT: 'COMPANY_EVENT',
  PREMIERE: 'PREMIERE',
};
```

### Adjust Scoring Weights

Edit `types.js`:
```javascript
export const NEARBY_WEIGHTS = {
  0: 1.0,   // Same day (100%)
  1: 0.7,   // ±1 day (70%) - increased from 60%
  2: 0.4,   // ±2 days (40%) - increased from 30%
  3: 0.2,   // ±3 days (20%) - increased from 10%
};
```

### Add New Audience Segment

Edit `types.js`:
```javascript
export const AUDIENCE_SEGMENTS = {
  // ... existing segments
  teens: 'Teenagers (13-19)',
};
```

Then update CSV with `Impact_Teens` column.

---

## 📝 Best Practices

### 1. Cache Management
- Sports API: Cached for 15 minutes
- Google Calendar: Cached for 5 minutes
- Clear cache manually: `cache.clear()`

### 2. Performance
- For 61+ days: ~200-400ms
- Use `considerNearby: false` for faster results (less accurate)
- Parallelize CSV + API calls where possible

### 3. Error Handling
```javascript
try {
  const result = await getDaySummaries(...);
} catch (error) {
  // Fallback to CSV-only analysis
  console.warn('Intelligence unavailable, using basic analysis');
  const basicResult = await analyzeReleaseWindows(...);
}
```

### 4. Confidence Interpretation
- 80%: All data sources available
- 65%: Sports API unavailable
- 70%: Calendar API unavailable
- 55%: Both APIs unavailable (CSV only)

---

## 🎨 UI Styling Suggestions

### Recommendation Colors
```css
.recommendation-good {
  background-color: #10b981; /* green-500 */
  color: white;
}

.recommendation-okay {
  background-color: #f59e0b; /* amber-500 */
  color: white;
}

.recommendation-avoid {
  background-color: #ef4444; /* red-500 */
  color: white;
}

.recommendation-blocked {
  background-color: #6b7280; /* gray-500 */
  color: white;
  text-decoration: line-through;
}
```

### Score Badge
```css
.score-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
}

.score-badge.high {
  background: linear-gradient(135deg, #10b981, #84cc16);
  color: white;
}

.score-badge.medium {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  color: white;
}

.score-badge.low {
  background: linear-gradient(135deg, #ef4444, #f87171);
  color: white;
}
```

---

## 🚧 Future Enhancements

1. **Machine Learning**: Train model on historical box office data
2. **Social Media**: Integrate Twitter/Instagram trending topics
3. **Weather API**: Rain/extreme weather impacts
4. **OTT Releases**: Account for streaming competition
5. **Regional Languages**: More granular language-based targeting
6. **Predictive Windows**: ML-based best window suggestions
7. **A/B Testing**: Compare multiple release date options
8. **Export Reports**: PDF/Excel comprehensive reports

---

## 📞 Support

For questions or issues:
1. Check README.md for detailed API reference
2. See examples.js for usage patterns
3. Review types.js for constants and configuration
4. Inspect scorer.js for algorithm details

---

## ✅ Implementation Checklist

- [ ] Add API keys to .env
- [ ] Import getDaySummaries in ReleaseWindowPage
- [ ] Replace/enhance existing analysis logic
- [ ] Update HeatmapCalendar tooltip rendering
- [ ] Add color scheme for recommendations
- [ ] Test with different date ranges
- [ ] Test with different project genres/regions
- [ ] Add error handling and fallbacks
- [ ] Update UI loading states
- [ ] Add user feedback (toast notifications)

---

**System is ready to use!** Start with the Quick Integration Guide above.
