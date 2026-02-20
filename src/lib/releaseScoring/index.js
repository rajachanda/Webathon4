/**
 * Release Scoring Library - Main Entry Point
 */

// Main UI Adapter
export {
  getDaySummaries,
  getTooltipData,
  findBestWindows,
  exportToCSV,
  getRecommendationColor,
  getHeatIntensity,
} from './ReleaseCalendarAdapter.js';

// Core Scoring Functions
export {
  computeScoresForDay,
  computeScoresForRange,
  findBestDates,
  findWorstDates,
  getSummaryStats,
  computeReleaseScores,
} from './scorer.js';

// Event Normalization
export {
  normalizeDayEvents,
  getEventsInRange,
  getNearbyEvents,
} from './normalizeEvents.js';

// Data Adapters
export { parseCsvEvents, loadCsvEvents } from './csvParser.js';
export { fetchCricketSchedule } from './sportsAdapter.js';
export { listCalendarEvents } from './calendarAdapter.js';

// Types and Constants
export {
  AUDIENCE_SEGMENTS,
  EVENT_TYPES,
  SPORTS_IMPACTS,
  SCORING_CONSTANTS,
  NEARBY_WEIGHTS,
  CSV_COLUMNS,
  TIMEZONE,
} from './types.js';
