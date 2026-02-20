/**
 * Release Timing Intelligence - Type Definitions
 * 
 * All type definitions and constants for the release scoring system
 */

/**
 * @typedef {'urbanYouth' | 'college' | 'family' | 'workingClass' | 'rural' | 'kidsParents' | 'seniorCitizens' | 'womenCentric'} AudienceSegment
 */

/**
 * @typedef {Object} CsvEventRow
 * @property {string} eventType - Event_Type from CSV
 * @property {string} eventName - Event_Name from CSV
 * @property {string} region - Region (state / National)
 * @property {string} startDateISO - Start_Date (inclusive) in ISO format
 * @property {string} endDateISO - End_Date (inclusive) in ISO format
 * @property {Record<AudienceSegment, number>} impacts - Parsed from impact columns
 */

/**
 * @typedef {Object} NormalizedDayEvent
 * @property {string} id - Unique identifier
 * @property {'csv' | 'sports' | 'gcal'} source - Event source
 * @property {string} eventType - Type of event
 * @property {string} eventName - Name of the event
 * @property {string} region - Region (IN, AP, TN, National, etc.)
 * @property {string} startISO - Event start in IST
 * @property {string} endISO - Event end in IST
 * @property {Partial<Record<AudienceSegment, number>>} impacts - Impact on segments
 * @property {boolean} [hardBlock] - True if event is a hard block
 * @property {any} [meta] - Additional metadata
 */

/**
 * @typedef {Object} DayScore
 * @property {string} dateISO - YYYY-MM-DD in Asia/Kolkata
 * @property {Record<AudienceSegment, number>} segmentScores - 0-100 score per segment
 * @property {boolean} isBlocked - Whether the day is blocked
 * @property {string[]} blockedReasons - Top reasons for blocking
 * @property {AudienceSegment} bestPrimarySegment - Best performing segment
 * @property {number} confidence - 0-100 confidence score
 * @property {'Good' | 'Okay' | 'Avoid'} recommendation - Overall recommendation
 * @property {Array<{reason: string, impact: number, source: string}>} topReasons - Top impact reasons
 * @property {NormalizedDayEvent[]} rawEvents - Events affecting this day
 */

/**
 * @typedef {Object} ScoringOptions
 * @property {AudienceSegment} primarySegment - Primary target segment
 * @property {string} targetRegion - Target region (e.g., 'Tamil Nadu', 'National')
 * @property {boolean} [considerNearby] - Consider ±3 days window (default: true)
 * @property {boolean} [useSportsAPI] - Use sports API (default: true)
 * @property {boolean} [useGoogleCalendar] - Use Google Calendar (default: true)
 * @property {boolean} [ignorePersonalCalendar] - Ignore personal calendar events (default: false)
 * @property {boolean} [strictMode] - Strict blocking mode (default: true)
 * @property {boolean} [debug] - Enable debug output (default: false)
 */

/**
 * Scoring constants
 */
export const SCORING_CONSTANTS = {
  BASE_SCORE: 100,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  HARD_BLOCK_SCORE: 0,
  COMPETITION_NEARBY_DAYS: 3,
  BASE_CONFIDENCE: 80,
  CONFIDENCE_PENALTY_NO_SPORTS: 15,
  CONFIDENCE_PENALTY_NO_CALENDAR: 10,
  MAX_BONUS: 30,
  MAX_BONUS_RELAXED: 50,
  MAX_NEGATIVE_CAP: -100,
  PRIMARY_THRESHOLD: 55,
  GOOD_THRESHOLD: 70,
};

/**
 * Audience segments list
 */
export const AUDIENCE_SEGMENTS = {
  urbanYouth: 'urbanYouth',
  college: 'college',
  family: 'family',
  workingClass: 'workingClass',
  rural: 'rural',
  kidsParents: 'kidsParents',
  seniorCitizens: 'seniorCitizens',
  womenCentric: 'womenCentric',
};

/**
 * Segment display names
 */
export const SEGMENT_LABELS = {
  urbanYouth: 'Urban Youth (18-30)',
  college: 'College Crowd (17-22)',
  family: 'Family (All Ages)',
  workingClass: 'Working Professionals (25-45)',
  rural: 'Rural Audience',
  kidsParents: 'Kids + Parents (5-14, 30-45)',
  seniorCitizens: 'Senior Citizens (60+)',
  womenCentric: 'Women-Centric (18-50)',
};

/**
 * Regional impact multiplier for non-matching regions
 */
export const REGIONAL_IMPACT_MULTIPLIER = 0.5;

/**
 * CSV column mapping
 */
export const CSV_COLUMNS = {
  EVENT_NAME: 'Event_Name',
  EVENT_TYPE: 'Event_Type',
  REGION: 'Region',
  START_DATE: 'Start_Date',
  END_DATE: 'End_Date',
  IMPACT_URBAN_YOUTH: 'Impact_UrbanYouth',
  IMPACT_COLLEGE: 'Impact_College',
  IMPACT_FAMILY: 'Impact_Family',
  IMPACT_WORKING_CLASS: 'Impact_WorkingClass',
  IMPACT_RURAL: 'Impact_Rural',
  IMPACT_KIDS_PARENTS: 'Impact_KidsParents',
  IMPACT_SENIOR_CITIZENS: 'Impact_SeniorCitizens',
  IMPACT_WOMEN_CENTRIC: 'Impact_WomenCentric',
};

/**
 * Hard block event types
 */
export const HARD_BLOCK_EVENT_TYPES = [
  'EXAM_FINAL',
  'BOARD_EXAM',
  'ENTRANCE_EXAM',
];

/**
 * Personal calendar hard block keywords
 */
export const HARD_BLOCK_KEYWORDS = [
  'exam',
  'board',
  'semester',
  'busy',
  'travel',
  'wedding',
  'festival',
  'deadline',
  'emergency',
];

/**
 * Sports impact constants
 */
export const SPORTS_IMPACTS = {
  IPL_GROUP: {
    urbanYouth: -40,
    college: -25,
  },
  IPL_PLAYOFF: {
    urbanYouth: -60,
    college: -40,
  },
  IPL_FINAL: {
    urbanYouth: -80,
    college: -60,
  },
  INDIA_MATCH: {
    urbanYouth: -80,
    college: -60,
    rural: -30,
  },
  EVENING_MULTIPLIER: 1.25, // After 18:00 IST
};

/**
 * Nearby competition window weights
 */
export const NEARBY_WEIGHTS = {
  0: 1.0,   // Same day
  1: 0.6,   // ±1 day
  2: 0.3,   // ±2 days
  3: 0.1,   // ±3 days
};

/**
 * Timezone constant
 */
export const TIMEZONE = 'Asia/Kolkata';
