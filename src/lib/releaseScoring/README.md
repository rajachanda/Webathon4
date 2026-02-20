# Release Timing Intelligence System

Advanced multi-source scoring system for optimizing film release dates in India.

## Overview

This library combines data from CSV events, sports schedules (cricket), and personal calendars to compute intelligent release date scores (0-100) across 8 audience segments. It accounts for nearby competition, regional impacts, and hard blocking events.

## Features

- **Multi-Source Data**: CSV events, Cricket API, Google Calendar
- **Audience Segmentation**: 8 distinct segments (urbanYouth, college, family, etc.)
- **Smart Scoring**: Base 100, weighted nearby impacts (±3 days), regional filtering
- **Hard Blocking**: Exams, personal conflicts automatically block dates
- **Performance**: <500ms for 61+ days
- **Timezone**: All operations in Asia/Kolkata (IST)

## Quick Start

```javascript
import { getDaySummaries } from './lib/releaseScoring';

const summaries = await getDaySummaries(
  '2026-01-01',
  '2026-03-31',
  {
    targetAudience: ['urbanYouth', 'college', 'family'],
    targetRegion: 'Tamil Nadu',
    considerNearby: true,
    useSportsAPI: true,
    useGoogleCalendar: true,
  }
);

console.log(summaries.daySummaries); // Scores for each day
console.log(summaries.summary); // Overall statistics
```

## Environment Variables

Add to `.env`:

```bash
REACT_APP_SPORTS_API_KEY=your_cricket_api_key
REACT_APP_GOOGLE_CALENDAR_API_KEY=your_google_calendar_api_key
```

## Data Sources

### 1. CSV Events
**File**: `assets/release_intelligence_2026_india.csv`

**Columns**:
- `Event_Name`: Name of event
- `Event_Type`: HOLIDAY, EXAM_PERIOD, FESTIVAL, etc.
- `Start_Date`: DD/MM/YYYY or YYYY-MM-DD
- `End_Date`: DD/MM/YYYY or YYYY-MM-DD
- `Region`: National, Tamil Nadu, Karnataka, etc.
- `Impact_UrbanYouth`: Impact score for urban youth segment
- `Impact_College`: Impact score for college segment
- ... (8 segments total)

**Example**:
```csv
Event_Name,Event_Type,Start_Date,End_Date,Region,Impact_UrbanYouth,Impact_College,...
Pongal,FESTIVAL,14/01/2026,17/01/2026,Tamil Nadu,-30,-40,...
Board Exams,EXAM_FINAL,01/03/2026,15/03/2026,National,0,-100,...
```

### 2. Sports API (Cricket)
Fetches cricket schedule for:
- IPL matches (group, playoff, final)
- India international matches

**Impacts**:
- IPL Group: -20 urbanYouth, -40 college
- IPL Playoff: -40 urbanYouth, -60 college
- IPL Final: -80 urbanYouth, -80 college
- India Match: -50 urbanYouth, -40 college
- Evening matches (18:00+): 1.25x multiplier

### 3. Google Calendar
Personal calendar events with hard block detection.

**Hard Block Keywords**: exam, final, board, entrance, travel, wedding, surgery, conference

**All-day busy**: -50 impact to all segments

## Audience Segments

```javascript
AUDIENCE_SEGMENTS = {
  urbanYouth: 'Urban Youth (18-30, metros)',
  college: 'College Students (18-24)',
  family: 'Family Audience (all ages)',
  workingClass: 'Working Professionals (25-45)',
  rural: 'Rural Audience (all ages)',
  kidsParents: 'Kids + Parents (5-14, 30-45)',
  seniorCitizens: 'Senior Citizens (60+)',
  womencentric: 'Women-Centric (18-50)',
}
```

## Scoring Algorithm

### 1. Base Score
Start at **100** for each segment.

### 2. Direct Impacts
Apply impacts from events on the target date:
```
score += event.impacts[segment]
```

### 3. Nearby Competition (±3 days)
Apply weighted impacts from nearby dates:
- Same day: 100% (d=0)
- d=1: 60%
- d=2: 30%
- d=3: 10%

```
adjustedImpact = event.impact * NEARBY_WEIGHTS[distance]
```

### 4. Regional Filtering
Non-matching region impacts: **50% weight**
```
if (event.region !== targetRegion && event.region !== 'National') {
  adjustedImpact *= 0.5
}
```

### 5. Hard Blocks
Events like exams, personal calendar conflicts:
```
if (hardBlock) {
  score = 0 (blocked)
}
```

### 6. Clamp to Range
```
score = clamp(score, 0, 100)
```

### 7. Recommendation
- **Good**: score ≥ 65
- **Okay**: 40 ≤ score < 65
- **Avoid**: score < 40
- **Blocked**: Hard block present

### 8. Confidence
```
confidence = 80
if (!hasSportsData) confidence -= 15
if (!hasCalendarData) confidence -= 10
```

## API Reference

### `getDaySummaries(startDateISO, endDateISO, options)`
Get scores for all days in range.

**Options**:
- `targetAudience`: Array of segment keys (default: all)
- `targetRegion`: String (default: 'National')
- `considerNearby`: Boolean (default: true)
- `useSportsAPI`: Boolean (default: true)
- `useGoogleCalendar`: Boolean (default: false)
- `calendarId`: String (default: 'primary')
- `strictMode`: Boolean (default: false)

**Returns**:
```javascript
{
  daySummaries: [{
    date: '2026-01-15',
    score: 72,
    recommendation: 'Good',
    isBlocked: false,
    confidence: 80,
    bestSegment: 'urbanYouth',
    reasons: [
      { reason: 'Pongal (FESTIVAL)', impact: -30, segment: 'urbanYouth' },
      ...
    ],
    segmentScores: { urbanYouth: 70, college: 60, ... }
  }],
  summary: {
    total: 90,
    blocked: 5,
    good: 40,
    okay: 30,
    avoid: 15,
    avgScore: 65,
    bestDate: { ... },
    worstDate: { ... }
  },
  metadata: {
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    targetAudience: ['urbanYouth', ...],
    csvEventsCount: 120,
    sportsEventsCount: 45,
    calendarEventsCount: 10,
    computeTimeMs: 245
  }
}
```

### `findBestWindows(daySummaries, minConsecutiveDays)`
Find consecutive windows of good release dates.

**Returns**:
```javascript
[{
  startDate: '2026-02-10',
  endDate: '2026-02-15',
  days: [...],
  avgScore: 82
}]
```

### `getTooltipData(dateISO, daySummary)`
Format tooltip data for UI display.

### `exportToCSV(daySummaries)`
Export scores to CSV string.

## Caching

- **Sports API**: 15 minutes
- **Google Calendar**: 5 minutes
- In-memory cache with TTL
- Auto-cleanup every 5 minutes

## Timezone Handling

All date/time operations use **Asia/Kolkata** (IST):
- CSV date parsing
- Sports match times
- Calendar event times
- Midnight spillover detection

## Module Structure

```
src/lib/releaseScoring/
├── index.js                      # Main exports
├── types.js                      # Constants, type definitions
├── cache.js                      # In-memory TTL cache
├── csvParser.js                  # Parse CSV events
├── sportsAdapter.js              # Cricket API adapter
├── calendarAdapter.js            # Google Calendar adapter
├── normalizeEvents.js            # Event normalization & expansion
├── scorer.js                     # Core scoring algorithm
└── ReleaseCalendarAdapter.js     # UI integration layer
```

## Error Handling

All data sources have graceful fallbacks:
- CSV load fails → Continue with empty events
- Sports API fails → Reduce confidence by 15%
- Calendar API fails → Reduce confidence by 10%

## Performance

- Target: <500ms for 61 days
- Optimizations:
  - In-memory caching
  - Single-pass event normalization
  - Parallel data fetching (where possible)

## Usage Examples

### Example 1: Basic Usage
```javascript
const { daySummaries } = await getDaySummaries(
  '2026-01-01',
  '2026-01-31',
  { targetRegion: 'Tamil Nadu' }
);

daySummaries.forEach(day => {
  console.log(`${day.date}: ${day.score} (${day.recommendation})`);
});
```

### Example 2: Find Best Windows
```javascript
const { daySummaries } = await getDaySummaries('2026-01-01', '2026-03-31');
const windows = findBestWindows(daySummaries, 3);

console.log('Top 3 release windows:');
windows.slice(0, 3).forEach(w => {
  console.log(`${w.startDate} to ${w.endDate}: ${w.avgScore}`);
});
```

### Example 3: Export to CSV
```javascript
const { daySummaries } = await getDaySummaries('2026-01-01', '2026-12-31');
const csv = exportToCSV(daySummaries);

// Download or save CSV
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
```

### Example 4: Specific Audience
```javascript
const { daySummaries } = await getDaySummaries(
  '2026-01-01',
  '2026-01-31',
  {
    targetAudience: ['college', 'urbanYouth'],
    targetRegion: 'Karnataka',
    considerNearby: true,
  }
);
```

## Integration with Heatmap

```javascript
import { getDaySummaries, getHeatIntensity, getRecommendationColor } from './lib/releaseScoring';

// In your calendar component
const { daySummaries } = await getDaySummaries(startDate, endDate);

const heatmapData = daySummaries.map(day => ({
  date: day.date,
  intensity: getHeatIntensity(day.score), // 0-1 for heatmap
  color: getRecommendationColor(day.recommendation),
  tooltip: getTooltipData(day.date, day),
}));
```

## Testing

Key test cases:
1. ✅ Multi-day CSV event expansion
2. ✅ Midnight spillover (sports matches)
3. ✅ Hard block detection (exams, calendar)
4. ✅ Nearby competition weighting (±3 days)
5. ✅ Regional filtering (50% for non-matching)
6. ✅ Score clamping (0-100)
7. ✅ IPL impact calculation (group/playoff/final)
8. ✅ Evening match multiplier (1.25x after 18:00)
9. ✅ Confidence scoring (API availability)
10. ✅ Deduplication (same event, different sources)

## License

MIT

## Support

For issues or questions, contact the development team.
