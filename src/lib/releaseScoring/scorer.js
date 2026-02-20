/**
 * Release Scoring Engine
 * Core algorithm for computing release date scores
 */

import {
  AUDIENCE_SEGMENTS,
  SCORING_CONSTANTS,
  NEARBY_WEIGHTS,
  REGIONAL_IMPACT_MULTIPLIER,
} from './types.js';
import { normalizeDayEvents, getNearbyEvents } from './normalizeEvents.js';

const {
  BASE_SCORE,
  MIN_SCORE,
  MAX_SCORE,
  HARD_BLOCK_SCORE,
  COMPETITION_NEARBY_DAYS,
  BASE_CONFIDENCE,
  CONFIDENCE_PENALTY_NO_SPORTS,
  CONFIDENCE_PENALTY_NO_CALENDAR,
} = SCORING_CONSTANTS;

/**
 * Compute scores for a single date
 * @param {string} dateISO - Date to score (YYYY-MM-DD)
 * @param {Map<string, NormalizedDayEvent[]>} dayEventsMap - All normalized events
 * @param {Object} options - Scoring options
 * @param {string[]} options.targetAudience - Target audience segments
 * @param {string} options.targetRegion - Target region
 * @param {boolean} options.considerNearby - Consider nearby competition (±3 days)
 * @param {boolean} options.strictMode - Strict hard blocking
 * @param {boolean} options.hasSportsData - Whether sports data is available
 * @param {boolean} options.hasCalendarData - Whether calendar data is available
 * @returns {DayScore} Score breakdown for the date
 */
export function computeScoresForDay(dateISO, dayEventsMap, options = {}) {
  const {
    targetAudience = Object.keys(AUDIENCE_SEGMENTS),
    targetRegion = 'National',
    considerNearby = true,
    strictMode = false,
    hasSportsData = true,
    hasCalendarData = true,
  } = options;

  // Initialize scores at BASE_SCORE for each segment
  const segmentScores = {};
  for (const segment of Object.keys(AUDIENCE_SEGMENTS)) {
    segmentScores[segment] = BASE_SCORE;
  }

  const topReasons = [];
  let isBlocked = false;
  let hardBlockReason = null;

  // Get events on this day
  const dayEvents = dayEventsMap.get(dateISO) || [];

  // Apply impacts from events on this day
  for (const event of dayEvents) {
    const { impacts, hardBlock, eventName, eventType, region } = event;

    // Check for hard block
    if (hardBlock || eventType === 'EXAM_FINAL' || eventType === 'BOARD_EXAM') {
      isBlocked = true;
      hardBlockReason = `${eventName} (Hard Block)`;
      
      // Set all scores to 0
      for (const segment of Object.keys(segmentScores)) {
        segmentScores[segment] = HARD_BLOCK_SCORE;
      }

      topReasons.push({
        reason: hardBlockReason,
        impact: -100,
        segment: 'all',
      });

      break; // No need to process further
    }

    // Apply impacts for each segment
    for (const [segment, impact] of Object.entries(impacts)) {
      if (segmentScores[segment] !== undefined) {
        let adjustedImpact = impact;

        // Apply regional multiplier
        if (region && region !== targetRegion && region !== 'National') {
          adjustedImpact = Math.round(impact * REGIONAL_IMPACT_MULTIPLIER);
        }

        segmentScores[segment] += adjustedImpact;

        // Track significant reasons
        if (Math.abs(adjustedImpact) >= 10) {
          topReasons.push({
            reason: `${eventName} (${eventType})`,
            impact: adjustedImpact,
            segment,
            source: event.source,
          });
        }
      }
    }
  }

  // Consider nearby competition (±3 days)
  if (considerNearby && !isBlocked) {
    const nearbyEventsMap = getNearbyEvents(dayEventsMap, dateISO, COMPETITION_NEARBY_DAYS);
    
    for (const [nearDateISO, nearEvents] of nearbyEventsMap.entries()) {
      if (nearDateISO === dateISO) continue; // Skip current day
      
      for (const event of nearEvents) {
        const distance = event.meta?.distance || 0;
        const weight = NEARBY_WEIGHTS[distance] || 0;
        
        if (weight === 0) continue;

        const { impacts, eventName, eventType, region } = event;

        for (const [segment, impact] of Object.entries(impacts)) {
          if (segmentScores[segment] !== undefined) {
            let adjustedImpact = Math.round(impact * weight);

            // Apply regional multiplier
            if (region && region !== targetRegion && region !== 'National') {
              adjustedImpact = Math.round(adjustedImpact * REGIONAL_IMPACT_MULTIPLIER);
            }

            segmentScores[segment] += adjustedImpact;

            // Track significant nearby reasons
            if (Math.abs(adjustedImpact) >= 5) {
              topReasons.push({
                reason: `${eventName} (${distance}d away)`,
                impact: adjustedImpact,
                segment,
                source: event.source,
                nearby: true,
              });
            }
          }
        }
      }
    }
  }

  // Clamp scores to valid range
  for (const segment of Object.keys(segmentScores)) {
    segmentScores[segment] = Math.max(MIN_SCORE, Math.min(MAX_SCORE, segmentScores[segment]));
  }

  // Calculate average score across target audience
  const targetScores = targetAudience.map(seg => segmentScores[seg] || 0);
  const avgScore = targetScores.reduce((sum, s) => sum + s, 0) / targetScores.length;

  // Determine recommendation
  let recommendation = 'Good';
  if (isBlocked) {
    recommendation = 'Blocked';
  } else if (avgScore < 40) {
    recommendation = 'Avoid';
  } else if (avgScore < 65) {
    recommendation = 'Okay';
  }

  // Calculate confidence
  let confidence = BASE_CONFIDENCE;
  if (!hasSportsData) {
    confidence -= CONFIDENCE_PENALTY_NO_SPORTS;
  }
  if (!hasCalendarData) {
    confidence -= CONFIDENCE_PENALTY_NO_CALENDAR;
  }

  // Find best primary segment
  let bestPrimarySegment = null;
  let maxScore = -1;
  for (const segment of targetAudience) {
    if (segmentScores[segment] > maxScore) {
      maxScore = segmentScores[segment];
      bestPrimarySegment = segment;
    }
  }

  // Sort reasons by impact magnitude
  topReasons.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    dateISO,
    segmentScores,
    avgScore: Math.round(avgScore),
    isBlocked,
    hardBlockReason,
    recommendation,
    confidence,
    bestPrimarySegment,
    topReasons: topReasons.slice(0, 5), // Top 5 reasons
  };
}

/**
 * Compute scores for a date range
 * @param {string} startDateISO - Start date
 * @param {string} endDateISO - End date
 * @param {Map<string, NormalizedDayEvent[]>} dayEventsMap - All normalized events
 * @param {Object} options - Scoring options
 * @returns {DayScore[]} Scores for all dates in range
 */
export function computeScoresForRange(startDateISO, endDateISO, dayEventsMap, options = {}) {
  const scores = [];
  const startDate = new Date(startDateISO);
  const endDate = new Date(endDateISO);

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateISO = currentDate.toISOString().split('T')[0];
    const dayScore = computeScoresForDay(dateISO, dayEventsMap, options);
    scores.push(dayScore);
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`✅ Computed scores for ${scores.length} days (${startDateISO} to ${endDateISO})`);
  return scores;
}

/**
 * Find best release dates in range
 * @param {DayScore[]} scores - All scores
 * @param {number} topN - Number of best dates to return
 * @returns {DayScore[]} Top N best dates
 */
export function findBestDates(scores, topN = 5) {
  const nonBlockedScores = scores.filter(s => !s.isBlocked);
  
  // Sort by avgScore descending
  const sorted = [...nonBlockedScores].sort((a, b) => b.avgScore - a.avgScore);
  
  return sorted.slice(0, topN);
}

/**
 * Find worst release dates in range
 * @param {DayScore[]} scores - All scores
 * @param {number} topN - Number of worst dates to return
 * @returns {DayScore[]} Top N worst dates
 */
export function findWorstDates(scores, topN = 5) {
  const nonBlockedScores = scores.filter(s => !s.isBlocked);
  
  // Sort by avgScore ascending
  const sorted = [...nonBlockedScores].sort((a, b) => a.avgScore - b.avgScore);
  
  return sorted.slice(0, topN);
}

/**
 * Get summary statistics for scored dates
 * @param {DayScore[]} scores - All scores
 * @returns {Object} Summary statistics
 */
export function getSummaryStats(scores) {
  const blocked = scores.filter(s => s.isBlocked);
  const nonBlocked = scores.filter(s => !s.isBlocked);
  
  const good = nonBlocked.filter(s => s.recommendation === 'Good');
  const okay = nonBlocked.filter(s => s.recommendation === 'Okay');
  const avoid = nonBlocked.filter(s => s.recommendation === 'Avoid');

  const avgScores = nonBlocked.map(s => s.avgScore);
  const avgOverall = avgScores.length > 0
    ? avgScores.reduce((sum, s) => sum + s, 0) / avgScores.length
    : 0;

  return {
    total: scores.length,
    blocked: blocked.length,
    good: good.length,
    okay: okay.length,
    avoid: avoid.length,
    avgScore: Math.round(avgOverall),
    bestDate: nonBlocked.length > 0 ? findBestDates(scores, 1)[0] : null,
    worstDate: nonBlocked.length > 0 ? findWorstDates(scores, 1)[0] : null,
  };
}

/**
 * Main orchestration: Load all data and compute scores
 * @param {string} startDateISO - Start date
 * @param {string} endDateISO - End date
 * @param {CsvEventRow[]} csvRows - CSV events
 * @param {NormalizedDayEvent[]} sportsEvents - Sports events
 * @param {NormalizedDayEvent[]} gcalEvents - Calendar events
 * @param {Object} options - Scoring options
 * @returns {Object} Scores and summary
 */
export async function computeReleaseScores(
  startDateISO,
  endDateISO,
  csvRows,
  sportsEvents,
  gcalEvents,
  options = {}
) {
  const startTime = Date.now();

  // Normalize all events
  const dayEventsMap = normalizeDayEvents(
    csvRows,
    sportsEvents,
    gcalEvents,
    options.targetRegion
  );

  // Compute scores for range
  const scores = computeScoresForRange(startDateISO, endDateISO, dayEventsMap, {
    ...options,
    hasSportsData: sportsEvents.length > 0,
    hasCalendarData: gcalEvents.length > 0,
  });

  // Get summary stats
  const summary = getSummaryStats(scores);

  const elapsed = Date.now() - startTime;
  console.log(`✅ Release scoring complete in ${elapsed}ms`);

  return {
    scores,
    summary,
    dayEventsMap,
    elapsed,
  };
}
