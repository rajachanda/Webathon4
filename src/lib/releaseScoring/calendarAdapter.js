/**
 * Google Calendar API Adapter
 * Fetches user's calendar events and normalizes them
 */

import { GOOGLE_CALENDAR_API_KEY } from '../../config/api.js';
import { HARD_BLOCK_KEYWORDS, TIMEZONE } from './types.js';
import { cache } from './cache.js';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const GCAL_API_BASE = 'https://www.googleapis.com/calendar/v3';
const INDIAN_HOLIDAYS_CALENDAR = 'en.indian#holiday@group.v.calendar.google.com';

let gcalUnavailable = false;

/**
 * List calendar events for date range
 * @param {string} calendarId - Calendar ID (default: Indian holidays public calendar)
 * @param {string} startDateISO - Start date (YYYY-MM-DD)
 * @param {string} endDateISO - End date (YYYY-MM-DD)
 * @param {Object} options - Options
 * @param {string} [options.accessToken] - User's OAuth access token (needed for 'primary')
 * @returns {Promise<NormalizedDayEvent[]>} Array of normalized events
 */
export async function listCalendarEvents(calendarId, startDateISO, endDateISO, options = {}) {
  // If calendarId is 'primary' and no OAuth token, switch to Indian holidays
  if (calendarId === 'primary' && !options.accessToken) {
    console.log('ℹ️ Personal calendar requires OAuth. Using Indian public holidays calendar.');
    calendarId = INDIAN_HOLIDAYS_CALENDAR;
  }

  const cacheKey = `gcal:${calendarId}:${startDateISO}:${endDateISO}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('✅ Using cached calendar events');
    return cached;
  }

  // Check if API key or token is available
  if (!GOOGLE_CALENDAR_API_KEY && !options.accessToken) {
    console.warn('⚠️ GOOGLE_CALENDAR_API_KEY not configured, skipping calendar data');
    gcalUnavailable = true;
    return [];
  }

  try {
    const events = await fetchCalendarEvents(calendarId, startDateISO, endDateISO, options);

    // Cache the results
    cache.set(cacheKey, events, CACHE_TTL);
    console.log(`✅ Fetched ${events.length} calendar events from Google Calendar`);

    gcalUnavailable = false;
    return events;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    console.warn('⚠️ Google Calendar API unavailable');
    gcalUnavailable = true;
    return [];
  }
}

/**
 * Fetch events from Google Calendar API
 * @param {string} timeMinISO - Start time
 * @param {string} timeMaxISO - End time
 * @param {Object} options - Options
 * @returns {Promise<NormalizedDayEvent[]>}
 */
async function fetchCalendarEvents(calendarId, startDateISO, endDateISO, options) {
  // Build query parameters
  const params = new URLSearchParams({
    timeMin: startDateISO + 'T00:00:00+05:30',
    timeMax: endDateISO + 'T23:59:59+05:30',
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  // API key goes as query param (NOT Authorization header)
  // OAuth token goes as Authorization header
  const headers = { 'Accept': 'application/json' };

  if (options.accessToken) {
    headers['Authorization'] = `Bearer ${options.accessToken}`;
  } else if (GOOGLE_CALENDAR_API_KEY) {
    params.append('key', GOOGLE_CALENDAR_API_KEY);
  }

  const url = `${GCAL_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
  console.log(`📅 Fetching Google Calendar: ${calendarId.substring(0, 30)}...`);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.items || !Array.isArray(data.items)) {
    return [];
  }

  // Normalize events
  const normalized = [];
  for (const item of data.items) {
    const event = normalizeCalendarEvent(item);
    if (event) {
      normalized.push(event);
    }
  }

  return normalized;
}

/**
 * Normalize Google Calendar event to NormalizedDayEvent
 * @param {Object} event - Raw calendar event
 * @returns {NormalizedDayEvent | null}
 */
function normalizeCalendarEvent(event) {
  if (!event.start || event.status === 'cancelled') {
    return null;
  }

  const isAllDay = Boolean(event.start.date);
  const summary = event.summary || 'Busy';
  
  // Determine start and end times in IST
  let startISO, endISO;
  
  if (isAllDay) {
    // All-day event
    const startDate = event.start.date;
    const endDate = event.end?.date || startDate;
    startISO = startDate + 'T00:00:00';
    endISO = endDate + 'T23:59:59';
  } else {
    // Timed event
    startISO = event.start.dateTime;
    endISO = event.end?.dateTime || startISO;
    
    // Convert to IST if needed
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    const istStart = new Date(startDate.toLocaleString('en-US', { timeZone: TIMEZONE }));
    const istEnd = new Date(endDate.toLocaleString('en-US', { timeZone: TIMEZONE }));
    
    startISO = istStart.toISOString();
    endISO = istEnd.toISOString();
  }

  // Determine if this is a hard block
  const hardBlock = isHardBlockEvent(event, isAllDay);
  
  // Calculate impacts
  const impacts = calculateCalendarImpacts(event, isAllDay, hardBlock);

  return {
    id: `gcal-${event.id}`,
    source: 'gcal',
    eventType: isAllDay ? 'personal-allday' : 'personal-timed',
    eventName: summary,
    region: 'Personal',
    startISO,
    endISO,
    impacts,
    hardBlock,
    meta: {
      location: event.location,
      description: event.description,
      transparency: event.transparency,
      isAllDay,
    },
  };
}

/**
 * Determine if event is a hard block
 * @param {Object} event - Calendar event
 * @param {boolean} isAllDay - Is all-day event
 * @returns {boolean}
 */
function isHardBlockEvent(event, isAllDay) {
  if (!isAllDay) {
    return false; // Timed events are not hard blocks
  }

  const summary = (event.summary || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  const location = (event.location || '').toLowerCase();
  
  const combinedText = `${summary} ${description} ${location}`;
  
  // Check for hard block keywords
  return HARD_BLOCK_KEYWORDS.some(keyword => combinedText.includes(keyword));
}

/**
 * Calculate impact scores for calendar event
 * @param {Object} event - Calendar event
 * @param {boolean} isAllDay - Is all-day event
 * @param {boolean} hardBlock - Is hard block
 * @returns {Partial<Record<AudienceSegment, number>>}
 */
function calculateCalendarImpacts(event, isAllDay, hardBlock) {
  if (isAllDay && hardBlock) {
    // All-day hard block - major negative impact on all segments
    return {
      urbanYouth: -50,
      college: -50,
      family: -50,
      workingClass: -50,
      rural: -50,
      kidsParents: -50,
      seniorCitizens: -50,
      womenCentric: -50,
    };
  }

  if (!isAllDay) {
    // Timed event - check if overlaps prime time (18:00-23:00)
    const startDate = new Date(event.start.dateTime);
    const endDate = new Date(event.end?.dateTime || event.start.dateTime);
    
    const istStart = new Date(startDate.toLocaleString('en-US', { timeZone: TIMEZONE }));
    const istEnd = new Date(endDate.toLocaleString('en-US', { timeZone: TIMEZONE }));
    
    const startHour = istStart.getHours();
    const endHour = istEnd.getHours();
    
    // Check if overlaps 18:00-23:00
    const overlapsPrimeTime = (
      (startHour >= 18 && startHour < 23) ||
      (endHour >= 18 && endHour < 23) ||
      (startHour < 18 && endHour >= 23)
    );
    
    if (overlapsPrimeTime && event.transparency !== 'transparent') {
      // Busy during prime time - moderate negative impact
      return {
        urbanYouth: -20,
        college: -20,
        family: -15,
        workingClass: -15,
        rural: -10,
        kidsParents: -15,
        seniorCitizens: -10,
        womenCentric: -20,
      };
    }
  }

  // Default: minimal impact
  return {
    urbanYouth: -5,
    college: -5,
    family: -5,
  };
}

/**
 * Check if Google Calendar is available
 * @returns {boolean}
 */
export function isGcalAvailable() {
  return !gcalUnavailable;
}

/**
 * Reset unavailable flag (for retry)
 */
export function resetGcalStatus() {
  gcalUnavailable = false;
}
