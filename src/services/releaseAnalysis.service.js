/**
 * Release Window Analysis Service
 * 
 * Analyzes optimal release dates based on:
 * - CSV competition calendar data
 * - Buzz score comparison
 * - Holiday/Event/Exam impacts from CSV data
 * 
 * Logic: Combines competition + event impacts to recommend best dates
 */

import { supabase } from '../supabaseClient';
import { getCompetitionMovies } from './competition.service';
import { calculateEventImpact } from './events.service';

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

  // Combine target clusters for event impact analysis
  const allTargetClusters = [...targetCoreClusters, ...targetSecondaryClusters];
  
  // Log audience targeting for debugging
  console.log('🎯 Target Audience Analysis:');
  console.log(`   Primary: ${targetCoreClusters.join(', ') || 'None'}`);
  console.log(`   Secondary: ${targetSecondaryClusters.join(', ') || 'None'}`);
  console.log(`   Combined: ${allTargetClusters.join(', ') || 'None'}`);

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

  // 3. Analyze each date (competition + events/holidays)
  const dateAnalysisPromises = dates.map(date => 
    analyzeSingleDate({
      date,
      competingFilms: competingFilms || [],
      currentBuzzScore,
      targetClusters: allTargetClusters,
    })
  );
  
  const dateAnalysis = await Promise.all(dateAnalysisPromises);

  // Log color distribution
  const colorCounts = dateAnalysis.reduce((acc, d) => {
    acc[d.riskColor] = (acc[d.riskColor] || 0) + 1;
    return acc;
  }, {});
  console.log('🎨 Heatmap Color Distribution:', colorCounts);

  // 4. Get intelligent top suggestions using Groq AI
  console.log('🤖 Generating intelligent recommendations with Groq AI...');
  const topSuggestions = await getIntelligentSuggestions(
    dateAnalysis, 
    allTargetClusters,
    {
      language,
      regionPrimary,
      currentBuzzScore
    }
  );

  return {
    dateAnalysis,
    topSuggestions,
    targetAudience: {
      primary: targetCoreClusters,
      secondary: targetSecondaryClusters,
      all: allTargetClusters
    }
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
 * Analyze a single date (Competition + Events/Holidays)
 * Compares buzz scores of competing movies AND factors in event impacts
 */
async function analyzeSingleDate({
  date,
  competingFilms,
  currentBuzzScore,
  targetClusters = [],
}) {
  const pros = [];
  const cons = [];
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday

  let baseScore = 50; // Start neutral

  // 1. COMPETITION ANALYSIS
  const sameDay = competingFilms.filter(f => f.release_date === date);
  let competitionPenalty = 0;

  if (sameDay.length > 0) {
    for (const film of sameDay) {
      const competitorBuzz = film.external_buzz_score || 0;
      
      if (competitorBuzz > currentBuzzScore) {
        competitionPenalty += 20; // Major penalty for higher buzz
        cons.push(`🎬 ${film.title}: Higher buzz (${competitorBuzz} vs ${currentBuzzScore})`);
      } else if (competitorBuzz > currentBuzzScore * 0.8) {
        competitionPenalty += 10; // Medium penalty for similar buzz
        cons.push(`🎬 ${film.title}: Similar buzz (${competitorBuzz})`);
      } else {
        competitionPenalty += 5; // Small penalty for any competition
        pros.push(`✅ Lower buzz competitor: ${film.title} (${competitorBuzz})`);
      }
    }
  } else {
    pros.push('✅ No competing releases on this date');
    baseScore += 20; // Bonus for clear corridor
  }

  // 2. EVENT/HOLIDAY IMPACT ANALYSIS (AUDIENCE-AWARE)
  const eventImpact = await calculateEventImpact(date, targetClusters);
  
  let eventBonus = 0;
  if (eventImpact.events.length > 0 && eventImpact.detailedImpacts) {
    // Process each event with its specific impact on target audience
    for (const detail of eventImpact.detailedImpacts) {
      const event = detail.event;
      const impact = detail.impact;
      const severity = detail.severity;
      
      // CRITICAL NEGATIVE (Board Exams for College/Youth, IPL Finals for Youth)
      if (severity === 'critical' && impact < -60) {
        eventBonus += impact; // Heavy penalty
        
        if (event.type === 'BOARD_EXAM' || event.type === 'ENTRANCE_EXAM' || event.type === 'EXAM_FINAL') {
          cons.push(`🚫 ${event.name}: CRITICAL - ${Math.abs(impact)}% drop in target audience`);
        } else if (event.type === 'SPORTS') {
          cons.push(`🚫 ${event.name}: CRITICAL - Youth attention diverted (${Math.abs(impact)}%)`);
        } else {
          cons.push(`🚫 ${event.name}: Major negative impact (${Math.abs(impact)}%)`);
        }
      }
      
      // HIGH NEGATIVE (Exams for Kids, IPL for Families)
      else if (severity === 'high' && impact < -30) {
        eventBonus += impact * 0.8; // Significant penalty
        
        if (event.type === 'BOARD_EXAM' || event.type === 'ENTRANCE_EXAM') {
          cons.push(`📚 ${event.name}: ${Math.abs(impact)}% drop - Exams active`);
        } else if (event.type === 'SPORTS') {
          cons.push(`🏏 ${event.name}: ${Math.abs(impact)}% attention shift`);
        } else {
          cons.push(`⚠️ ${event.name}: Moderate negative (${Math.abs(impact)}%)`);
        }
      }
      
      // EXCELLENT POSITIVE (Major Festivals for Family/Mass)
      else if (severity === 'excellent' && impact > 25) {
        eventBonus += impact * 1.5; // Major boost
        
        if (event.type === 'FESTIVAL') {
          pros.push(`🎊 ${event.name}: EXCELLENT - ${impact}% audience boost!`);
        } else if (event.type === 'HOLIDAY') {
          pros.push(`🎉 ${event.name}: Long weekend boost (+${impact}%)`);
        } else if (event.type === 'SCHOOL_VACATION' || event.type === 'SCHOOL_BREAK') {
          pros.push(`🏖️ ${event.name}: Family availability high (+${impact}%)`);
        } else {
          pros.push(`✅ ${event.name}: Strong positive impact (+${impact}%)`);
        }
      }
      
      // GOOD POSITIVE
      else if (impact > 10) {
        eventBonus += impact;
        pros.push(`✅ ${event.name}: +${impact}% boost`);
      }
      
      // MODERATE NEGATIVE
      else if (impact < -10) {
        eventBonus += impact;
        cons.push(`⚠️ ${event.name}: ${Math.abs(impact)}% impact`);
      }
      
      // NEUTRAL (small impact)
      else if (impact !== 0) {
        eventBonus += impact * 0.5;
        if (impact > 0) {
          pros.push(`📅 ${event.name}: Minor positive`);
        } else {
          cons.push(`📅 ${event.name}: Minor negative`);
        }
      }
    }
    
    // Cap the total event bonus/penalty
    eventBonus = Math.max(-60, Math.min(50, eventBonus));
  }

  // 3. WEEKEND BONUS (AUDIENCE-AWARE)
  let weekendBonus = 0;
  const audienceProfile = determineAudienceProfile(targetClusters);
  
  if (dayOfWeek === 5) { // Friday
    // Base Friday bonus
    weekendBonus = 5;
    
    // Extra bonus for family/mass audiences (they prefer long weekends)
    if (audienceProfile.prefersFriday) {
      weekendBonus += 5; // Total +10 for families
      pros.push('📅 Friday release - IDEAL for family audiences (full weekend)');
    } else {
      pros.push('📅 Friday release - full weekend exposure');
    }
  } else if (dayOfWeek === 4) { // Thursday
    weekendBonus = 3;
    if (audienceProfile.prefersFriday) {
      weekendBonus += 3; // Total +6 for families
      pros.push('📅 Thursday release - 4-day weekend (good for families)');
    } else {
      pros.push('📅 Thursday release - 4-day weekend');
    }
  } else if (dayOfWeek === 6 || dayOfWeek === 0) { // Saturday or Sunday
    // Weekends are still good for families
    if (audienceProfile.prefersFriday) {
      weekendBonus = 4;
      pros.push('📅 Weekend release - Family availability high');
    }
  } else if (audienceProfile.prefersWeekday && (dayOfWeek >= 1 && dayOfWeek <= 3)) {
    // Tuesday/Wednesday can work for youth (less competition, cheaper tickets)
    weekendBonus = 2;
    pros.push('📅 Weekday release - Lower competition, youth-friendly pricing');
  }

  // 4. CALCULATE FINAL SCORE (AUDIENCE-AWARE)
  let rawScore = baseScore - competitionPenalty + eventBonus + weekendBonus;
  const finalScore = Math.max(0, Math.min(100, rawScore));

  // 5. DETERMINE RISK LEVEL (More aggressive thresholds for audience impact)
  let riskLevel, riskColor;
  
  // CRITICAL scenarios get RED regardless of score if severe event impact
  const hasCriticalEvent = eventImpact.detailedImpacts?.some(d => d.severity === 'critical');
  
  if (hasCriticalEvent && eventImpact.totalImpact < -60) {
    // Board exams for college youth, IPL finals for youth - FORCE RED
    riskLevel = 'high';
    riskColor = 'red';
  } else if (finalScore >= 75) {
    // Excellent date - clear corridor + positive events
    riskLevel = 'low';
    riskColor = 'green';
  } else if (finalScore >= 55) {
    // Good date - manageable risks
    riskLevel = 'low';
    riskColor = 'green';
  } else if (finalScore >= 35) {
    // Moderate risk - some concerns
    riskLevel = 'medium';
    riskColor = 'orange';
  } else {
    // High risk - significant issues
    riskLevel = 'high';
    riskColor = 'red';
  }

  return {
    date,
    scoreNumeric: finalScore,
    riskLevel,
    riskColor,
    pros,
    cons,
    competingMovies: sameDay,
    events: eventImpact.events || [], // Add events to date analysis
    eventImpact: eventImpact.totalImpact || 0,
    expectedBuzzDelta: eventImpact.totalImpact || 0,
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

/**
 * Determine audience profile and preferences
 */
function determineAudienceProfile(targetClusters) {
  const hasFamilyAudience = targetClusters.some(c => 
    c === 'FAMILY_FESTIVAL' || c === 'KIDS_TEENS' || c === 'SENIOR_CITIZENS'
  );
  
  const hasYouthAudience = targetClusters.some(c => 
    c === 'COLLEGE_YOUTH' || c === 'URBAN_YOUTH_MULTIPLEX'
  );
  
  const hasMassAudience = targetClusters.some(c => 
    c === 'MASS_SINGLE_SCREEN' || c === 'RURAL_HEARTLAND'
  );
  
  return {
    prefersFriday: hasFamilyAudience || hasMassAudience, // Families and mass audiences prefer weekends
    prefersWeekday: hasYouthAudience && !hasFamilyAudience, // Youth-only films can work on weekdays
    prefersFestival: hasFamilyAudience || hasMassAudience,
    sensitiveToCost: hasYouthAudience,
    hasFamilyAudience,
    hasYouthAudience,
    hasMassAudience
  };
}

/**
 * Use Groq AI to intelligently rank and select top 4 suggestions
 * Considers audience-specific preferences like weekends for families
 */
async function getIntelligentSuggestions(dateAnalysis, targetClusters, filmContext) {
  try {
    // Filter to only good dates (green/orange with score > 50)
    const goodDates = dateAnalysis.filter(d => d.scoreNumeric >= 50);
    
    if (goodDates.length === 0) {
      // If no good dates, just return top 4 by score
      return dateAnalysis
        .sort((a, b) => b.scoreNumeric - a.scoreNumeric)
        .slice(0, 4);
    }
    
    // Prepare data for Groq analysis
    const audienceProfile = determineAudienceProfile(targetClusters);
    const datesForAI = goodDates.slice(0, 15).map(d => ({
      date: d.date,
      dayOfWeek: d.dayOfWeek,
      score: d.scoreNumeric,
      riskLevel: d.riskLevel,
      prosCount: d.pros.length,
      consCount: d.cons.length,
      hasCompetition: d.competingMovies.length > 0,
      hasEvents: d.events.length > 0,
      eventImpact: d.eventImpact || 0
    }));
    
    const prompt = `You are a film release strategist for Indian cinema. Analyze these potential release dates and select the BEST 4 dates in order of preference.

TARGET AUDIENCE:
${targetClusters.map(c => `- ${c.replace(/_/g, ' ')}`).join('\n')}

AUDIENCE PREFERENCES:
- Prefers Friday releases: ${audienceProfile.prefersFriday ? 'YES (Family/Mass audience)' : 'NO'}
- Can work on weekdays: ${audienceProfile.prefersWeekday ? 'YES (Youth audience)' : 'NO'}
- Prefers festivals: ${audienceProfile.prefersFestival ? 'YES' : 'NO'}

FILM CONTEXT:
- Language: ${filmContext.language || 'Not specified'}
- Region: ${filmContext.regionPrimary || 'Not specified'}
- Buzz Score: ${filmContext.currentBuzzScore}

AVAILABLE DATES (top candidates):
${datesForAI.map((d, i) => `${i + 1}. ${d.date} (${d.dayOfWeek}) - Score: ${d.score}/100, Risk: ${d.riskLevel}, Competition: ${d.hasCompetition ? 'Yes' : 'No'}, Event Impact: ${d.eventImpact > 0 ? '+' : ''}${d.eventImpact}%`).join('\n')}

SELECTION CRITERIA:
1. For FAMILY audiences → Strongly prefer Fridays/Saturdays and festival periods
2. For YOUTH audiences → Prefer post-exam periods, weekends acceptable, weekdays OK if no competition
3. For MASS audiences → Prefer Fridays, long weekends, festival seasons
4. Avoid dates with high competition regardless of audience
5. Prioritize dates with positive event impacts
6. Balance between highest score and best day-of-week for audience

Return EXACTLY 4 dates in this JSON format (no markdown, just raw JSON):
{
  "recommendations": [
    {"date": "YYYY-MM-DD", "reason": "Brief reason why this is #1"},
    {"date": "YYYY-MM-DD", "reason": "Brief reason why this is #2"},
    {"date": "YYYY-MM-DD", "reason": "Brief reason why this is #3"},
    {"date": "YYYY-MM-DD", "reason": "Brief reason why this is #4"}
  ]
}`;

    // Call Groq
    const { callGroq, parseJSON } = await import('./gemini.service');
    const response = await callGroq(prompt);
    const aiResult = parseJSON(response);
    
    // Map AI recommendations back to full date analysis objects
    const recommendations = aiResult.recommendations.map(rec => {
      const fullDate = dateAnalysis.find(d => d.date === rec.date);
      if (fullDate) {
        return {
          ...fullDate,
          aiReason: rec.reason // Add AI's reasoning
        };
      }
      return null;
    }).filter(Boolean);
    
    // If AI returned less than 4, fill with highest scoring dates
    if (recommendations.length < 4) {
      const usedDates = new Set(recommendations.map(r => r.date));
      const remaining = goodDates
        .filter(d => !usedDates.has(d.date))
        .sort((a, b) => b.scoreNumeric - a.scoreNumeric);
      
      while (recommendations.length < 4 && remaining.length > 0) {
        recommendations.push(remaining.shift());
      }
    }
    
    console.log('✅ Groq AI selected intelligent recommendations');
    return recommendations.slice(0, 4);
    
  } catch (error) {
    console.error('⚠️ Groq AI recommendation failed, using fallback logic:', error.message);
    
    // Fallback: Intelligent sorting without Groq
    return getIntelligentSuggestionsFallback(dateAnalysis, targetClusters);
  }
}

/**
 * Fallback intelligent ranking (no AI)
 * Applies audience-specific preferences manually
 */
function getIntelligentSuggestionsFallback(dateAnalysis, targetClusters) {
  const audienceProfile = determineAudienceProfile(targetClusters);
  
  // Apply audience-specific bonuses
  const scoredDates = dateAnalysis.map(d => {
    let adjustedScore = d.scoreNumeric;
    const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(d.dayOfWeek);
    
    // Family/Mass audiences: Big bonus for Friday/Saturday
    if (audienceProfile.prefersFriday && (dayIndex === 5 || dayIndex === 6)) {
      adjustedScore += 15;
    }
    
    // Family/Mass: Bonus for Sundays
    if (audienceProfile.prefersFriday && dayIndex === 0) {
      adjustedScore += 10;
    }
    
    // Youth-only: Small bonus for Tuesday/Wednesday (cheaper tickets)
    if (audienceProfile.prefersWeekday && (dayIndex >= 1 && dayIndex <= 3)) {
      adjustedScore += 5;
    }
    
    // Festival bonus for family/mass
    if (audienceProfile.prefersFestival && d.eventImpact > 20) {
      adjustedScore += 10;
    }
    
    return {
      ...d,
      adjustedScore
    };
  });
  
  // Sort by adjusted score
  const sorted = scoredDates.sort((a, b) => b.adjustedScore - a.adjustedScore);
  
  // Ensure diversity: don't pick 4 consecutive dates
  const suggestions = [];
  const usedDates = new Set();
  
  for (const dateItem of sorted) {
    if (suggestions.length >= 4) break;
    
    // Check if too close to already selected dates
    const dateObj = new Date(dateItem.date);
    let tooClose = false;
    
    for (const selected of suggestions) {
      const selectedDate = new Date(selected.date);
      const diffDays = Math.abs((dateObj - selectedDate) / (1000 * 60 * 60 * 24));
      if (diffDays < 3) { // Less than 3 days apart
        tooClose = true;
        break;
      }
    }
    
    if (!tooClose) {
      suggestions.push(dateItem);
    }
  }
  
  // If we couldn't get 4 diverse dates, just take top 4
  if (suggestions.length < 4) {
    return sorted.slice(0, 4);
  }
  
  return suggestions;
}
