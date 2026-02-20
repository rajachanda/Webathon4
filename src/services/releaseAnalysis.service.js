/**
 * Release Window Analysis Service (SIMPLIFIED)
 * 
 * Analyzes optimal release dates based on:
 * - CSV competition calendar data
 * - Buzz score comparison only
 * 
 * Logic: RED if competitor buzz > your buzz, GREEN otherwise
 */

import { supabase } from '../supabaseClient';
import { getCompetitionMovies } from './competition.service';

/**
 * Analyze release window and return per-date risk scores
 * 
 * @param {string} projectId 
 * @param {Object} options 
 * @param {string} options.earliestDate - ISO date string
 * @param {string} options.latestDate - ISO date string
 * @param {boolean} options.avoidBigClashes 
 * @param {Array<string>} options.targetCoreClusters 
 * @param {Array<string>} options.targetSecondaryClusters 
 * @param {number} options.currentBuzzScore 
 * @param {string} options.language 
 * @param {string} options.regionPrimary 
 * @returns {Promise<Object>} { dateAnalysis: [], topSuggestions: [] }
 */
export async function analyzeReleaseWindow(projectId, options) {
  const {
    earliestDate,
    latestDate,
    avoidBigClashes = true,
    targetCoreClusters = [],
    targetSecondaryClusters = [],
    currentBuzzScore = 50,
    language = '',
    regionPrimary = '',
  } = options;

  // 1. Load competition calendar within date range (uses CSV-imported data)
  let competingFilms;
  try {
    competingFilms = await getCompetitionMovies(earliestDate, latestDate);
    console.log(`📊 Release Analysis: Found ${competingFilms?.length || 0} competing films in date range`);
    if (competingFilms && competingFilms.length > 0) {
      console.log(`   - Languages: ${[...new Set(competingFilms.map(f => f.language))].join(', ')}`);
      console.log(`   - Avg buzz: ${(competingFilms.reduce((sum, f) => sum + (f.external_buzz_score || 0), 0) / competingFilms.length).toFixed(1)}`);
      const withClusters = competingFilms.filter(f => f.target_clusters && f.target_clusters.length > 0);
      console.log(`   - With target clusters: ${withClusters.length}/${competingFilms.length}`);
    }
  } catch (compError) {
    console.error('Error loading competition:', compError);
  }

  // 2. Generate date range
  const dates = generateDateRange(earliestDate, latestDate);

  // 3. Analyze each date (simplified buzz-only comparison)
  const dateAnalysis = dates.map(date => {
    const analysis = analyzeSingleDate({
      date,
      competingFilms: competingFilms || [],
      currentBuzzScore,
    });
    return analysis;
  });

  // 4. Sort and pick top suggestions
  const sortedByScore = [...dateAnalysis].sort((a, b) => b.scoreNumeric - a.scoreNumeric);
  const topSuggestions = sortedByScore.slice(0, 4);

  return {
    dateAnalysis,
    topSuggestions,
  };
}

/**
 * Generate array of dates between start and end (inclusive)
 */
function generateDateRange(startStr, endStr) {
  const dates = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Analyze a single date (SIMPLIFIED Version)
 * Compares only buzz scores of competing movies
 */
function analyzeSingleDate({
  date,
  competingFilms,
  currentBuzzScore,
}) {
  const pros = [];
  const cons = [];
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday

  // Find all movies releasing on same date
  const sameDay = competingFilms.filter(f => f.release_date === date);

  // Simple logic: RED if any competitor has higher buzz, GREEN otherwise
  let hasHigherBuzzCompetition = false;

  if (sameDay.length > 0) {
    for (const film of sameDay) {
      const competitorBuzz = film.external_buzz_score || 0;
      
      if (competitorBuzz > currentBuzzScore) {
        hasHigherBuzzCompetition = true;
        cons.push(`Higher buzz: ${competitorBuzz} vs your ${currentBuzzScore}`);
      } else {
        cons.push(`Lower buzz competition: ${competitorBuzz}`);
      }
    }
  } else {
    pros.push('✅ No competing releases on this date');
  }

  // Determine risk based on buzz comparison
  let riskLevel, riskColor, score;
  
  if (hasHigherBuzzCompetition) {
    riskLevel = 'high';
    riskColor = 'red';
    score = 20; // Low score for high risk
  } else if (sameDay.length > 0) {
    riskLevel = 'medium';
    riskColor = 'orange';
    score = 60; // Medium score - competition exists but lower buzz
    pros.push('✅ Your buzz is higher than or equal to competitors');
  } else {
    riskLevel = 'low';
    riskColor = 'green';
    score = 90; // High score for clear corridor
  }

  return {
    date,
    scoreNumeric: score,
    riskLevel,
    riskColor,
    pros,
    cons,
    competingMovies: sameDay, // Add actual movie data for tooltip
    expectedBuzzDelta: 0,
    dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
  };
}

/**
 * Save top suggestions to database
 */
export async function saveReleaseWindowSuggestions(projectId, suggestions) {
  try {
    // Delete old suggestions for this project
    await supabase
      .from('release_windows')
      .delete()
      .eq('project_id', projectId);

    // Insert new suggestions
    const records = suggestions.map(s => ({
      project_id: projectId,
      start_date: s.date,
      end_date: s.date,
      primary_date: s.date,
      label: `${s.dayOfWeek}, ${new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      risk_level: s.riskLevel,
      score_numeric: s.scoreNumeric,
      pros: s.pros,
      cons: s.cons,
      expected_buzz_delta: s.expectedBuzzDelta,
      explanation: `Score: ${Math.round(s.scoreNumeric)}/100`,
    }));

    const { data, error } = await supabase
      .from('release_windows')
      .insert(records)
      .select();

    if (error) throw error;

    return data;
  } catch (err) {
    console.error('Error saving release windows:', err);
    throw err;
  }
}
