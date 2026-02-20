/**
 * Example: Integration with ReleaseWindowPage
 * Shows how to use the Release Timing Intelligence system
 */

import { getDaySummaries, findBestWindows } from '../lib/releaseScoring';

/**
 * Example 1: Get intelligent scores for release window analysis
 */
export async function analyzeReleaseWindow(startDate, endDate, projectDetails) {
  try {
    // Configure based on project
    const options = {
      targetAudience: determineTargetAudience(projectDetails),
      targetRegion: projectDetails.targetRegion || 'National',
      considerNearby: true,
      useSportsAPI: true,
      useGoogleCalendar: false, // Set to true if user grants calendar access
      strictMode: false,
    };

    // Get intelligent summaries
    const result = await getDaySummaries(startDate, endDate, options);

    console.log('📊 Release Analysis Results:');
    console.log(`Total Days: ${result.summary.total}`);
    console.log(`Good Days: ${result.summary.good}`);
    console.log(`Okay Days: ${result.summary.okay}`);
    console.log(`Avoid Days: ${result.summary.avoid}`);
    console.log(`Blocked Days: ${result.summary.blocked}`);
    console.log(`Best Date: ${result.summary.bestDate?.dateISO} (Score: ${result.summary.bestDate?.avgScore})`);

    return result;
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

/**
 * Example 2: Find best release windows
 */
export async function findOptimalWindows(startDate, endDate, projectDetails) {
  const result = await analyzeReleaseWindow(startDate, endDate, projectDetails);
  
  // Find windows with at least 3 consecutive good days
  const windows = findBestWindows(result.daySummaries, 3);

  console.log('\n🎯 Top 3 Release Windows:');
  windows.slice(0, 3).forEach((window, index) => {
    console.log(`${index + 1}. ${window.startDate} to ${window.endDate}`);
    console.log(`   Avg Score: ${Math.round(window.avgScore)}/100`);
    console.log(`   Duration: ${window.days.length} days\n`);
  });

  return windows;
}

/**
 * Example 3: Enhanced heatmap data with intelligence
 */
export async function getEnhancedHeatmapData(startDate, endDate, projectDetails) {
  const result = await analyzeReleaseWindow(startDate, endDate, projectDetails);

  // Transform to heatmap format
  const heatmapData = result.daySummaries.map(day => ({
    date: day.date,
    score: day.score,
    recommendation: day.recommendation,
    isBlocked: day.isBlocked,
    
    // Visual properties for heatmap
    color: getColorForScore(day.score, day.isBlocked),
    opacity: day.confidence / 100,
    
    // Tooltip data
    tooltip: {
      title: formatDate(day.date),
      score: `${day.score}/100`,
      recommendation: day.recommendation,
      bestSegment: day.bestSegment,
      reasons: day.reasons.slice(0, 3).map(r => ({
        text: r.reason,
        impact: r.impact,
        color: r.impact < 0 ? '#ef4444' : '#10b981',
      })),
      confidence: `${day.confidence}% confidence`,
    },

    // Competition data
    competingEvents: day.reasons.filter(r => r.source === 'csv'),
    sportsEvents: day.reasons.filter(r => r.source === 'sports'),
    personalEvents: day.reasons.filter(r => r.source === 'gcal'),
  }));

  return heatmapData;
}

/**
 * Determine target audience from project details
 */
function determineTargetAudience(projectDetails) {
  const { genre, scale, language } = projectDetails;

  // Default broad audience
  let audience = ['urbanYouth', 'college', 'family', 'workingClass'];

  // Genre-based targeting
  if (genre?.includes('Action') || genre?.includes('Thriller')) {
    audience = ['urbanYouth', 'college', 'workingClass'];
  } else if (genre?.includes('Family') || genre?.includes('Animation')) {
    audience = ['family', 'kidsParents', 'workingClass'];
  } else if (genre?.includes('Romance')) {
    audience = ['urbanYouth', 'college', 'womencentric'];
  } else if (genre?.includes('Drama')) {
    audience = ['family', 'workingClass', 'seniorCitizens', 'womencentric'];
  }

  // Scale adjustments
  if (scale === 'Regional') {
    audience.push('rural');
  }

  return [...new Set(audience)]; // Remove duplicates
}

/**
 * Get color based on score
 */
function getColorForScore(score, isBlocked) {
  if (isBlocked) return '#6b7280'; // gray
  if (score >= 65) return '#10b981'; // green
  if (score >= 40) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

/**
 * Format date for display
 */
function formatDate(dateISO) {
  const date = new Date(dateISO);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Example 4: Compare two date options
 */
export async function compareDates(date1, date2, projectDetails) {
  const result = await getDaySummaries(
    date1 < date2 ? date1 : date2,
    date1 > date2 ? date1 : date2,
    {
      targetAudience: determineTargetAudience(projectDetails),
      targetRegion: projectDetails.targetRegion || 'National',
    }
  );

  const score1 = result.daySummaries.find(d => d.date === date1);
  const score2 = result.daySummaries.find(d => d.date === date2);

  console.log(`\n📊 Date Comparison:`);
  console.log(`\n${date1}:`);
  console.log(`  Score: ${score1.score}/100 (${score1.recommendation})`);
  console.log(`  Top Reasons:`);
  score1.reasons.slice(0, 3).forEach(r => {
    console.log(`    - ${r.reason}: ${r.impact}`);
  });

  console.log(`\n${date2}:`);
  console.log(`  Score: ${score2.score}/100 (${score2.recommendation})`);
  console.log(`  Top Reasons:`);
  score2.reasons.slice(0, 3).forEach(r => {
    console.log(`    - ${r.reason}: ${r.impact}`);
  });

  const better = score1.score > score2.score ? date1 : date2;
  const diff = Math.abs(score1.score - score2.score);
  
  console.log(`\n✅ Better Date: ${better} (+${diff} points)`);

  return {
    date1: score1,
    date2: score2,
    betterDate: better,
    scoreDifference: diff,
  };
}

/**
 * Example 5: React Component Integration
 */
export function useReleaseIntelligence(startDate, endDate, projectDetails) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await analyzeReleaseWindow(startDate, endDate, projectDetails);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, JSON.stringify(projectDetails)]);

  return { data, loading, error };
}
