/**
 * Release Calendar Adapter
 * Main entry point for UI integration
 */

import { parseCsvEvents, loadCsvEvents } from './csvParser.js';
import { fetchCricketSchedule } from './sportsAdapter.js';
import { listCalendarEvents } from './calendarAdapter.js';
import { computeReleaseScores } from './scorer.js';

/**
 * Get day summaries for UI calendar
 * @param {string} startDateISO - Start date (YYYY-MM-DD)
 * @param {string} endDateISO - End date (YYYY-MM-DD)
 * @param {Object} options - Configuration options
 * @param {string[]} options.targetAudience - Target audience segments
 * @param {string} options.targetRegion - Target region
 * @param {boolean} options.considerNearby - Consider nearby competition
 * @param {boolean} options.useSportsAPI - Use sports API
 * @param {boolean} options.useGoogleCalendar - Use Google Calendar
 * @param {string} options.calendarId - Google Calendar ID
 * @param {boolean} options.strictMode - Strict hard blocking
 * @returns {Promise<Object>} Day summaries and metadata
 */
export async function getDaySummaries(startDateISO, endDateISO, options = {}) {
  const {
    targetAudience = ['urbanYouth', 'college', 'family'],
    targetRegion = 'National',
    considerNearby = true,
    useSportsAPI = true,
    useGoogleCalendar = true,
    calendarId = 'en.indian#holiday@group.v.calendar.google.com',
    calendarAccessToken = null,
    strictMode = false,
  } = options;

  console.log('🎯 Fetching release timing intelligence...');
  console.log(`📅 Range: ${startDateISO} to ${endDateISO}`);
  console.log(`👥 Audience: ${targetAudience.join(', ')}`);
  console.log(`📍 Region: ${targetRegion}`);

  try {
    // Load CSV events
    let csvRows = [];
    try {
      csvRows = await loadCsvEvents();
      console.log(`✅ Loaded ${csvRows.length} CSV events`);
    } catch (error) {
      console.warn('⚠️ Failed to load CSV events:', error.message);
    }

    // Load sports events
    let sportsEvents = [];
    if (useSportsAPI) {
      try {
        sportsEvents = await fetchCricketSchedule(startDateISO, endDateISO);
        console.log(`✅ Loaded ${sportsEvents.length} sports events`);
      } catch (error) {
        console.warn('⚠️ Failed to load sports events:', error.message);
      }
    }

    // Load calendar events
    let gcalEvents = [];
    if (useGoogleCalendar) {
      try {
        gcalEvents = await listCalendarEvents(
          calendarId,
          startDateISO,
          endDateISO,
          { accessToken: calendarAccessToken }
        );
        console.log(`✅ Loaded ${gcalEvents.length} calendar events`);
      } catch (error) {
        console.warn('⚠️ Failed to load calendar events:', error.message);
      }
    }

    // Compute scores
    const result = await computeReleaseScores(
      startDateISO,
      endDateISO,
      csvRows,
      sportsEvents,
      gcalEvents,
      {
        targetAudience,
        targetRegion,
        considerNearby,
        strictMode,
      }
    );

    // Format for UI
    const daySummaries = result.scores.map(score => ({
      date: score.dateISO,
      score: score.avgScore,
      recommendation: score.recommendation,
      isBlocked: score.isBlocked,
      blockReason: score.hardBlockReason,
      confidence: score.confidence,
      bestSegment: score.bestPrimarySegment,
      reasons: score.topReasons,
      segmentScores: score.segmentScores,
    }));

    return {
      daySummaries,
      summary: result.summary,
      metadata: {
        startDate: startDateISO,
        endDate: endDateISO,
        targetAudience,
        targetRegion,
        csvEventsCount: csvRows.length,
        sportsEventsCount: sportsEvents.length,
        calendarEventsCount: gcalEvents.length,
        computeTimeMs: result.elapsed,
      },
    };
  } catch (error) {
    console.error('❌ Failed to get day summaries:', error);
    throw error;
  }
}

/**
 * Get enhanced tooltip data for a specific date
 * @param {string} dateISO - Date to query
 * @param {Object} daySummary - Day summary from getDaySummaries
 * @returns {Object} Enhanced tooltip data
 */
export function getTooltipData(dateISO, daySummary) {
  if (!daySummary || daySummary.date !== dateISO) {
    return null;
  }

  const { score, recommendation, isBlocked, blockReason, reasons, segmentScores } = daySummary;

  // Format reasons for display
  const formattedReasons = reasons.map(r => {
    const sign = r.impact >= 0 ? '+' : '';
    const nearbyTag = r.nearby ? ' (nearby)' : '';
    return {
      text: r.reason,
      impact: `${sign}${r.impact}${nearbyTag}`,
      segment: r.segment,
      color: r.impact < 0 ? 'red' : 'green',
    };
  });

  // Get color based on recommendation
  let color = 'green';
  if (isBlocked) {
    color = 'gray';
  } else if (recommendation === 'Avoid') {
    color = 'red';
  } else if (recommendation === 'Okay') {
    color = 'yellow';
  }

  return {
    date: dateISO,
    score,
    recommendation,
    isBlocked,
    blockReason,
    color,
    reasons: formattedReasons,
    segmentScores,
  };
}

/**
 * Get best release windows in range
 * @param {Object[]} daySummaries - All day summaries
 * @param {number} minConsecutiveDays - Minimum consecutive good days
 * @returns {Object[]} Best release windows
 */
export function findBestWindows(daySummaries, minConsecutiveDays = 3) {
  const windows = [];
  let currentWindow = null;

  for (const summary of daySummaries) {
    if (summary.isBlocked || summary.recommendation === 'Avoid') {
      // End current window
      if (currentWindow && currentWindow.days.length >= minConsecutiveDays) {
        windows.push(currentWindow);
      }
      currentWindow = null;
    } else if (summary.recommendation === 'Good') {
      // Start or extend window
      if (!currentWindow) {
        currentWindow = {
          startDate: summary.date,
          endDate: summary.date,
          days: [summary],
          avgScore: summary.score,
        };
      } else {
        currentWindow.endDate = summary.date;
        currentWindow.days.push(summary);
        currentWindow.avgScore =
          currentWindow.days.reduce((sum, d) => sum + d.score, 0) / currentWindow.days.length;
      }
    }
  }

  // Add final window
  if (currentWindow && currentWindow.days.length >= minConsecutiveDays) {
    windows.push(currentWindow);
  }

  // Sort by average score
  windows.sort((a, b) => b.avgScore - a.avgScore);

  return windows;
}

/**
 * Export scores to CSV
 * @param {Object[]} daySummaries - Day summaries
 * @returns {string} CSV string
 */
export function exportToCSV(daySummaries) {
  const headers = ['Date', 'Score', 'Recommendation', 'Blocked', 'Best Segment', 'Top Reason'];
  const rows = daySummaries.map(s => [
    s.date,
    s.score,
    s.recommendation,
    s.isBlocked ? 'Yes' : 'No',
    s.bestSegment || '',
    s.reasons[0]?.text || '',
  ]);

  const csvLines = [headers, ...rows].map(row => row.join(',')).join('\n');
  return csvLines;
}

/**
 * Get recommendation color for UI
 * @param {string} recommendation - Recommendation (Good/Okay/Avoid/Blocked)
 * @returns {string} CSS color
 */
export function getRecommendationColor(recommendation) {
  const colors = {
    Good: '#10b981', // green-500
    Okay: '#f59e0b', // amber-500
    Avoid: '#ef4444', // red-500
    Blocked: '#6b7280', // gray-500
  };
  return colors[recommendation] || '#6b7280';
}

/**
 * Get heat intensity for heatmap (0-1)
 * @param {number} score - Score (0-100)
 * @returns {number} Intensity (0-1)
 */
export function getHeatIntensity(score) {
  return Math.max(0, Math.min(1, score / 100));
}
