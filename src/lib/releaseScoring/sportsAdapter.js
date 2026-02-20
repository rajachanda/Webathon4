/**
 * Sports API Adapter
 * Fetches cricket schedule and normalizes to events
 */

import { SPORTS_IMPACTS, TIMEZONE } from './types.js';
import { cache } from './cache.js';

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const THESPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const IPL_LEAGUE_ID = '4429'; // IPL on TheSportsDB

/**
 * Fetch cricket schedule from API
 * @param {string} startDateISO - Start date (YYYY-MM-DD)
 * @param {string} endDateISO - End date (YYYY-MM-DD)
 * @returns {Promise<NormalizedDayEvent[]>} Normalized cricket events
 */
export async function fetchCricketSchedule(startDateISO, endDateISO) {
  const cacheKey = `cricket:${startDateISO}:${endDateISO}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('✅ Using cached cricket schedule');
    return cached;
  }

  if (!true) { // TheSportsDB is free, no key check needed
    console.warn('⚠️ Sports data source unavailable');
    return [];
  }

  try {
    const events = await fetchCricketMatches(startDateISO, endDateISO);
    
    // Cache the results
    cache.set(cacheKey, events, CACHE_TTL);
    console.log(`✅ Fetched ${events.length} cricket matches from API`);
    
    return events;
  } catch (error) {
    console.error('Error fetching cricket schedule:', error);
    console.warn('⚠️ Sports API unavailable, checking CSV fallback');
    return [];
  }
}

/**
 * Fetch matches from Cricket API
 * @param {string} startDateISO - Start date
 * @param {string} endDateISO - End date
 * @returns {Promise<NormalizedDayEvent[]>}
 */
async function fetchCricketMatches(startDateISO, endDateISO) {
  const year = startDateISO.substring(0, 4);

  // Use TheSportsDB free API for IPL cricket events
  const url = `${THESPORTSDB_BASE}/eventsseason.php?id=${IPL_LEAGUE_ID}&s=${year}`;
  console.log(`🏏 Fetching cricket from TheSportsDB: season ${year}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TheSportsDB returned ${response.status}`);
  }

  const data = await response.json();

  if (!data.events || !Array.isArray(data.events)) {
    console.warn('⚠️ No cricket events found on TheSportsDB for this season');
    return [];
  }

  // Filter matches within date range and normalize
  const events = [];
  const startTime = new Date(startDateISO).getTime();
  const endTime = new Date(endDateISO + 'T23:59:59').getTime();

  for (const match of data.events) {
    try {
      const matchDate = new Date(match.dateEvent);
      if (isNaN(matchDate.getTime())) continue;
      if (matchDate.getTime() < startTime || matchDate.getTime() > endTime) {
        continue;
      }

      const event = normalizeMatch(match);
      if (event) {
        events.push(event);
      }
    } catch (error) {
      console.warn('Error normalizing match:', error);
    }
  }

  return events;
}

/**
 * Normalize a cricket match to NormalizedDayEvent
 * @param {Object} match - Raw match data from API
 * @returns {NormalizedDayEvent | null}
 */
function normalizeMatch(match) {
  if (!match.dateEvent) {
    return null;
  }

  // Parse date and time (TheSportsDB format)
  const timeStr = match.strTime || '19:30:00';
  const matchDateStr = `${match.dateEvent}T${timeStr.substring(0, 8)}`;
  const matchDate = new Date(matchDateStr + 'Z');
  if (isNaN(matchDate.getTime())) return null;

  // Convert to IST
  const istDate = new Date(matchDate.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const dateISO = match.dateEvent;
  const hour = istDate.getHours();

  // Determine match type and impacts
  const matchType = determineMatchType(match);
  const impacts = getMatchImpacts(matchType, hour);

  const eventName = match.strEvent || match.strEventAlternate || 'Cricket Match';

  return {
    id: `cricket-${match.idEvent || Date.now()}`,
    source: 'sports',
    eventType: 'cricket',
    eventName,
    region: 'National',
    startISO: matchDate.toISOString(),
    endISO: new Date(matchDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    impacts,
    hardBlock: false,
    meta: {
      matchType,
      venue: match.strVenue,
      series: match.strLeague,
      round: match.intRound,
      hour,
    },
  };
}

/**
 * Determine match type (IPL group, playoff, final, India match, etc.)
 * @param {Object} match - Match data
 * @returns {string} Match type
 */
function determineMatchType(match) {
  const eventName = (match.strEvent || '').toLowerCase();
  const description = (match.strDescriptionEN || '').toLowerCase();
  const round = String(match.intRound || '');

  // Check for India national team
  if (eventName.includes('india')) {
    return 'INDIA_MATCH';
  }

  // IPL match categorization
  if (eventName.includes('final') || description.includes('final')) {
    return 'IPL_FINAL';
  }
  if (eventName.includes('playoff') || eventName.includes('qualifier') ||
      eventName.includes('eliminator') || description.includes('playoff')) {
    return 'IPL_PLAYOFF';
  }

  return 'IPL_GROUP';
}

/**
 * Get impact scores for match type
 * @param {string} matchType - Match type
 * @param {number} hour - Hour of match start (0-23)
 * @returns {Partial<Record<AudienceSegment, number>>}
 */
function getMatchImpacts(matchType, hour) {
  let baseImpacts = {};

  switch (matchType) {
    case 'IPL_FINAL':
      baseImpacts = { ...SPORTS_IMPACTS.IPL_FINAL };
      break;
    case 'IPL_PLAYOFF':
      baseImpacts = { ...SPORTS_IMPACTS.IPL_PLAYOFF };
      break;
    case 'IPL_GROUP':
      baseImpacts = { ...SPORTS_IMPACTS.IPL_GROUP };
      break;
    case 'INDIA_MATCH':
      baseImpacts = { ...SPORTS_IMPACTS.INDIA_MATCH };
      break;
    default:
      // Minor impact for other cricket
      baseImpacts = { urbanYouth: -15, college: -10 };
  }

  // Evening matches have higher impact
  if (hour >= 18) {
    const multiplier = SPORTS_IMPACTS.EVENING_MULTIPLIER;
    for (const segment in baseImpacts) {
      baseImpacts[segment] = Math.round(baseImpacts[segment] * multiplier);
    }
  }

  return baseImpacts;
}

/**
 * Check CSV for manual IPL windows (fallback)
 * @param {CsvEventRow[]} csvEvents - CSV events
 * @param {string} startDateISO - Start date
 * @param {string} endDateISO - End date
 * @returns {NormalizedDayEvent[]}
 */
export function getCsvSportsEvents(csvEvents, startDateISO, endDateISO) {
  const sportsEvents = [];

  for (const event of csvEvents) {
    if (event.eventType.toLowerCase().includes('ipl') || 
        event.eventType.toLowerCase().includes('cricket')) {
      
      // Check date overlap
      if (event.endDateISO >= startDateISO && event.startDateISO <= endDateISO) {
        sportsEvents.push({
          id: `csv-sports-${event.eventName}`,
          source: 'csv',
          eventType: event.eventType,
          eventName: event.eventName,
          region: event.region,
          startISO: event.startDateISO + 'T00:00:00',
          endISO: event.endDateISO + 'T23:59:59',
          impacts: event.impacts,
          hardBlock: false,
          meta: { fromCsv: true },
        });
      }
    }
  }

  return sportsEvents;
}
