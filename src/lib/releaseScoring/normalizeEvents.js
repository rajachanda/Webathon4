/**
 * Event Normalization
 * Combines CSV, sports, and calendar events into per-day buckets
 */

import { TIMEZONE } from './types.js';

/**
 * Normalize all events into day buckets
 * @param {CsvEventRow[]} csvRows - CSV events
 * @param {NormalizedDayEvent[]} sportsEvents - Sports events
 * @param {NormalizedDayEvent[]} gcalEvents - Calendar events
 * @param {string} targetRegion - Target region (e.g., 'Tamil Nadu', 'National')
 * @returns {Map<string, NormalizedDayEvent[]>} Map of dateISO -> events
 */
export function normalizeDayEvents(csvRows, sportsEvents, gcalEvents, targetRegion = 'National') {
  const dayEventsMap = new Map();

  // Expand CSV events into daily events
  for (const csvRow of csvRows) {
    const events = expandCsvEvent(csvRow, targetRegion);
    for (const event of events) {
      addEventToDay(dayEventsMap, event);
    }
  }

  // Add sports events
  for (const sportsEvent of sportsEvents) {
    const events = expandMultiDayEvent(sportsEvent);
    for (const event of events) {
      addEventToDay(dayEventsMap, event);
    }
  }

  // Add calendar events
  for (const gcalEvent of gcalEvents) {
    const events = expandMultiDayEvent(gcalEvent);
    for (const event of events) {
      addEventToDay(dayEventsMap, event);
    }
  }

  // Deduplicate events on each day
  for (const [dateISO, events] of dayEventsMap.entries()) {
    dayEventsMap.set(dateISO, deduplicateEvents(events));
  }

  console.log(`✅ Normalized events across ${dayEventsMap.size} days`);
  return dayEventsMap;
}

/**
 * Expand CSV row into daily NormalizedDayEvents
 * @param {CsvEventRow} csvRow - CSV event row
 * @param {string} targetRegion - Target region
 * @returns {NormalizedDayEvent[]} Events for each day
 */
function expandCsvEvent(csvRow, targetRegion) {
  // Check if event is relevant to target region
  const isRelevant = isRegionRelevant(csvRow.region, targetRegion);
  if (!isRelevant) {
    return [];
  }

  const events = [];
  const startDate = new Date(csvRow.startDateISO);
  const endDate = new Date(csvRow.endDateISO);

  // Iterate through each day (inclusive)
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateISO = currentDate.toISOString().split('T')[0];
    
    events.push({
      id: `csv-${csvRow.eventName}-${dateISO}`,
      source: 'csv',
      eventType: csvRow.eventType,
      eventName: csvRow.eventName,
      region: csvRow.region,
      startISO: csvRow.startDateISO + 'T00:00:00',
      endISO: csvRow.endDateISO + 'T23:59:59',
      impacts: csvRow.impacts,
      hardBlock: isHardBlockEventType(csvRow.eventType),
      meta: {
        dateInRange: dateISO,
        fromCsv: true,
      },
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return events;
}

/**
 * Expand multi-day event into daily events
 * @param {NormalizedDayEvent} event - Event spanning multiple days
 * @returns {NormalizedDayEvent[]} Events for each day
 */
function expandMultiDayEvent(event) {
  const startDate = new Date(event.startISO);
  const endDate = new Date(event.endISO);

  // Convert to IST
  const istStart = new Date(startDate.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const istEnd = new Date(endDate.toLocaleString('en-US', { timeZone: TIMEZONE }));

  const startDayISO = istStart.toISOString().split('T')[0];
  const endDayISO = istEnd.toISOString().split('T')[0];

  // If same day, return single event
  if (startDayISO === endDayISO) {
    return [{
      ...event,
      meta: {
        ...event.meta,
        dateInRange: startDayISO,
      },
    }];
  }

  // Spans multiple days
  const events = [];
  const currentDate = new Date(startDayISO);
  const lastDate = new Date(endDayISO);

  while (currentDate <= lastDate) {
    const dateISO = currentDate.toISOString().split('T')[0];
    
    events.push({
      ...event,
      id: `${event.id}-${dateISO}`,
      meta: {
        ...event.meta,
        dateInRange: dateISO,
        spillover: dateISO !== startDayISO,
      },
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return events;
}

/**
 * Add event to day map
 * @param {Map<string, NormalizedDayEvent[]>} dayEventsMap - Day events map
 * @param {NormalizedDayEvent} event - Event to add
 */
function addEventToDay(dayEventsMap, event) {
  const dateISO = event.meta?.dateInRange || event.startISO.split('T')[0];
  
  if (!dayEventsMap.has(dateISO)) {
    dayEventsMap.set(dateISO, []);
  }
  
  dayEventsMap.get(dateISO).push(event);
}

/**
 * Check if region is relevant to target
 * @param {string} eventRegion - Event region
 * @param {string} targetRegion - Target region
 * @returns {boolean}
 */
function isRegionRelevant(eventRegion, targetRegion) {
  if (!eventRegion || eventRegion === '' || eventRegion.toLowerCase() === 'national') {
    return true; // National events apply everywhere
  }

  if (eventRegion.toLowerCase() === targetRegion.toLowerCase()) {
    return true; // Exact match
  }

  // Partial match (e.g., "Tamil Nadu" matches "TN")
  const eventLower = eventRegion.toLowerCase();
  const targetLower = targetRegion.toLowerCase();
  
  if (eventLower.includes(targetLower) || targetLower.includes(eventLower)) {
    return true;
  }

  return false;
}

/**
 * Check if event type is a hard block
 * @param {string} eventType - Event type
 * @returns {boolean}
 */
function isHardBlockEventType(eventType) {
  const hardBlockTypes = ['EXAM_FINAL', 'BOARD_EXAM', 'ENTRANCE_EXAM'];
  return hardBlockTypes.includes(eventType);
}

/**
 * Deduplicate events by name, source, and date
 * @param {NormalizedDayEvent[]} events - Events to deduplicate
 * @returns {NormalizedDayEvent[]} Deduplicated events
 */
function deduplicateEvents(events) {
  const seen = new Set();
  const unique = [];

  for (const event of events) {
    const key = `${event.source}:${event.eventName}:${event.startISO}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(event);
    }
  }

  return unique;
}

/**
 * Get events for a specific date range
 * @param {Map<string, NormalizedDayEvent[]>} dayEventsMap - Day events map
 * @param {string} startDateISO - Start date
 * @param {string} endDateISO - End date
 * @returns {Map<string, NormalizedDayEvent[]>} Filtered map
 */
export function getEventsInRange(dayEventsMap, startDateISO, endDateISO) {
  const filtered = new Map();
  
  for (const [dateISO, events] of dayEventsMap.entries()) {
    if (dateISO >= startDateISO && dateISO <= endDateISO) {
      filtered.set(dateISO, events);
    }
  }

  return filtered;
}

/**
 * Get events near a specific date (±N days)
 * @param {Map<string, NormalizedDayEvent[]>} dayEventsMap - Day events map
 * @param {string} dateISO - Target date
 * @param {number} daysAround - Days before and after (default: 3)
 * @returns {Map<string, NormalizedDayEvent[]>} Nearby events with distance
 */
export function getNearbyEvents(dayEventsMap, dateISO, daysAround = 3) {
  const targetDate = new Date(dateISO);
  const nearby = new Map();

  for (let offset = -daysAround; offset <= daysAround; offset++) {
    const date = new Date(targetDate);
    date.setDate(date.getDate() + offset);
    const nearDateISO = date.toISOString().split('T')[0];

    if (dayEventsMap.has(nearDateISO)) {
      const events = dayEventsMap.get(nearDateISO).map(e => ({
        ...e,
        meta: {
          ...e.meta,
          dayOffset: offset,
          distance: Math.abs(offset),
        },
      }));
      nearby.set(nearDateISO, events);
    }
  }

  return nearby;
}
