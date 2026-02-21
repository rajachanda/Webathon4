/**
 * Distributor Service
 * Analyzes and recommends film distributors based on comprehensive project analysis
 * Integrates: buzz scores, sentiment, persona, competitive landscape, and AI insights
 */

import { projectService } from './api.service';
import { callGroq, parseJSON } from './gemini.service';
import { getCompetitionMovies } from './competition.service';
import { supabase } from '../supabaseClient';

// Import CSV data - we'll parse it directly
const CSV_PATH = '/India_Distributors_Database_2026.csv';

/**
 * Parse CSV data
 */
async function loadDistributors() {
  try {
    const response = await fetch(CSV_PATH);
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    const distributors = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      const distributor = {};
      
      headers.forEach((header, index) => {
        distributor[header.trim()] = values[index] ? values[index].trim() : '';
      });
      
      // Convert numeric fields
      distributor['Market Reach Score (%)'] = parseFloat(distributor['Market Reach Score (%)']) || 0;
      distributor['Network Strength Score (%)'] = parseFloat(distributor['Network Strength Score (%)']) || 0;
      distributor['Reliability Score (%)'] = parseFloat(distributor['Reliability Score (%)']) || 0;
      distributor['Overall Performance Score (%)'] = parseFloat(distributor['Overall Performance Score (%)']) || 0;
      distributor['Success Rate (%)'] = parseFloat(distributor['Success Rate (%)']) || 0;
      distributor['Growth Rate Score (%)'] = parseFloat(distributor['Growth Rate Score (%)']) || 0;
      distributor['Market Share Estimate (%)'] = parseFloat(distributor['Market Share Estimate (%)']) || 0;
      
      distributors.push(distributor);
    }
    
    return distributors;
  } catch (error) {
    console.error('Error loading distributors:', error);
    return [];
  }
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

/**
 * Get region-specific focus areas
 */
function getRegionFocusAreas(region) {
  const focusAreas = {
    // Pan India
    'Pan India': {
      type: 'states',
      areas: ['Maharashtra', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Kerala', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Gujarat']
    },
    
    // South India
    'South India': {
      type: 'states_cities',
      states: ['Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Kerala'],
      cities: {
        'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
        'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubli', 'Belagavi'],
        'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kakinada'],
        'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
        'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam']
      }
    },
    
    // AP/TG specific
    'AP/TG': {
      type: 'cities',
      primary: ['Hyderabad', 'Vijayawada', 'Visakhapatnam', 'Guntur', 'Warangal'],
      secondary: ['Tirupati', 'Kakinada', 'Nellore', 'Rajahmundry', 'Karimnagar', 'Nizamabad', 'Khammam']
    },
    
    // Tamil Nadu specific
    'TN': {
      type: 'cities',
      primary: ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
      secondary: ['Tirunelveli', 'Erode', 'Vellore', 'Tiruppur', 'Thoothukudi', 'Thanjavur']
    },
    
    // Karnataka specific
    'KA': {
      type: 'cities',
      primary: ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belagavi'],
      secondary: ['Davanagere', 'Kalaburagi', 'Ballari', 'Vijayapura', 'Shivamogga']
    },
    
    // Kerala specific
    'KL': {
      type: 'cities',
      primary: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam'],
      secondary: ['Kannur', 'Alappuzha', 'Palakkad', 'Kottayam', 'Malappuram']
    }
  };
  
  // Default to Pan India if region not found
  return focusAreas[region] || focusAreas['Pan India'];
}

/**
 * Map headquarters to states
 */
function getStateFromCity(city) {
  const cityStateMap = {
    'Mumbai': 'Maharashtra',
    'Pune': 'Maharashtra',
    'Hyderabad': 'Telangana',
    'Chennai': 'Tamil Nadu',
    'Bengaluru': 'Karnataka',
    'Kochi': 'Kerala',
    'Delhi': 'Delhi',
    'Kolkata': 'West Bengal',
    'Lucknow': 'Uttar Pradesh',
    'Ahmedabad': 'Gujarat',
    'Gurugram': 'Haryana',
    'Noida': 'Uttar Pradesh'
  };
  return cityStateMap[city] || city;
}

/**
 * Get genre-specific distributor expertise bonus
 */
function getGenreExpertiseBonus(distributor, genre) {
  // Map genres to distributor characteristics that indicate expertise
  const genrePreferences = {
    'Action': {
      preferNational: true,
      preferHighReach: true,
      minSuccessRate: 75,
      boost: 1.15
    },
    'Comedy': {
      preferRegional: true,
      preferHighNetwork: true,
      minSuccessRate: 70,
      boost: 1.12
    },
    'Drama': {
      preferReliability: true,
      minReliability: 80,
      minSuccessRate: 80,
      boost: 1.18
    },
    'Romance': {
      preferRegional: true,
      preferHighNetwork: true,
      minSuccessRate: 75,
      boost: 1.10
    },
    'Thriller': {
      preferNational: true,
      preferHighReach: true,
      minSuccessRate: 80,
      boost: 1.14
    },
    'Horror': {
      preferRegional: true,
      minSuccessRate: 65,
      boost: 1.08
    },
    'Family': {
      preferReliability: true,
      minReliability: 85,
      minSuccessRate: 85,
      boost: 1.20
    },
    'Social Drama': {
      preferRegional: true,
      preferReliability: true,
      minReliability: 80,
      boost: 1.15
    },
    'Fantasy': {
      preferNational: true,
      preferInternational: true,
      minSuccessRate: 70,
      boost: 1.12
    }
  };

  const pref = genrePreferences[genre] || { boost: 1.0 };
  let bonus = 1.0;
  let matchCount = 0;
  let totalCriteria = 0;

  // Check coverage preferences
  const coverage = distributor['Coverage Area'];
  if (pref.preferNational) {
    totalCriteria++;
    if (coverage === 'National') {
      matchCount++;
    }
  }
  if (pref.preferRegional) {
    totalCriteria++;
    if (coverage === 'Regional') {
      matchCount++;
    }
  }
  if (pref.preferInternational) {
    totalCriteria++;
    if (coverage === 'International') {
      matchCount++;
    }
  }

  // Check success rate
  const successRate = distributor['Success Rate (%)'] || 0;
  if (pref.minSuccessRate) {
    totalCriteria++;
    if (successRate >= pref.minSuccessRate) {
      matchCount++;
    }
  }

  // Check reliability
  const reliability = distributor['Reliability Score (%)'] || 0;
  if (pref.minReliability) {
    totalCriteria++;
    if (reliability >= pref.minReliability) {
      matchCount++;
    }
  }

  // Check network strength for network-preferred genres
  const networkStrength = distributor['Network Strength Score (%)'] || 0;
  if (pref.preferHighNetwork) {
    totalCriteria++;
    if (networkStrength >= 75) {
      matchCount++;
    }
  }

  // Check market reach for reach-preferred genres
  const marketReach = distributor['Market Reach Score (%)'] || 0;
  if (pref.preferHighReach) {
    totalCriteria++;
    if (marketReach >= 85) {
      matchCount++;
    }
  }

  // Calculate bonus based on match percentage
  if (totalCriteria > 0) {
    const matchPercentage = matchCount / totalCriteria;
    if (matchPercentage >= 0.7) {
      bonus = pref.boost;
    } else if (matchPercentage >= 0.5) {
      bonus = 1 + ((pref.boost - 1) * 0.6);
    } else if (matchPercentage >= 0.3) {
      bonus = 1 + ((pref.boost - 1) * 0.3);
    }
  }

  return bonus;
}

/**
 * Calculate distributor score based on project requirements
 */
function scoreDistributor(distributor, project, region) {
  let score = 0;
  let weights = {
    performance: 0.20,
    coverage: 0.25,
    reachAlignment: 0.20,
    reliability: 0.15,
    budgetAlignment: 0.10,
    audienceMatch: 0.10
  };
  
  // 1. Performance Score (20%) - Using Network Strength as primary metric
  const networkStrength = distributor['Network Strength Score (%)'] || 0;
  score += (networkStrength / 100) * weights.performance;
  
  // 2. Coverage Alignment (25%)
  let coverageScore = 0;
  const coverage = distributor['Coverage Area'];
  
  if (region === 'Pan India' || region === 'Pan South') {
    // Prefer National/International coverage
    if (coverage === 'National') coverageScore = 1.0;
    else if (coverage === 'International') coverageScore = 0.9;
    else if (coverage === 'Regional') coverageScore = 0.6;
  } else {
    // For specific regions, prefer regional distributors
    const hqState = getStateFromCity(distributor['Headquarters City']);
    const regionStates = getRegionFocusAreas(region).states || [];
    
    if (coverage === 'Regional' && regionStates.includes(hqState)) {
      coverageScore = 1.0;
    } else if (coverage === 'National') {
      coverageScore = 0.85;
    } else if (coverage === 'International') {
      coverageScore = 0.75;
    } else {
      coverageScore = 0.5;
    }
  }
  score += coverageScore * weights.coverage;
  
  // 3. Market Reach Alignment (20%)
  const reachScore = (distributor['Market Reach Score (%)'] || 0) / 100;
  score += reachScore * weights.reachAlignment;
  
  // 4. Reliability (15%)
  const reliabilityScore = (distributor['Reliability Score (%)'] || 0) / 100;
  score += reliabilityScore * weights.reliability;
  
  // 5. Budget Alignment (10%)
  let budgetScore = 0.5; // Default
  const budgetBand = project.budget_band || '';
  const marketShare = distributor['Market Share Estimate (%)'] || 0;
  
  if (budgetBand.includes('Very Low') || budgetBand.includes('Low')) {
    // Low budget → prefer regional distributors with good reliability
    if (coverage === 'Regional') budgetScore = 1.0;
    else if (coverage === 'National' && marketShare < 8) budgetScore = 0.7;
    else budgetScore = 0.4;
  } else if (budgetBand.includes('Mid') || budgetBand.includes('Medium')) {
    // Mid budget → prefer national or strong regional
    if (coverage === 'National') budgetScore = 1.0;
    else if (coverage === 'Regional' && marketShare >= 8) budgetScore = 0.9;
    else if (coverage === 'International') budgetScore = 0.7;
    else budgetScore = 0.6;
  } else if (budgetBand.includes('High') || budgetBand.includes('Very High')) {
    // High budget → prefer national/international with high market share
    if (coverage === 'International') budgetScore = 1.0;
    else if (coverage === 'National' && marketShare >= 10) budgetScore = 1.0;
    else if (coverage === 'National') budgetScore = 0.8;
    else budgetScore = 0.5;
  }
  score += budgetScore * weights.budgetAlignment;
  
  // 6. Audience/Target Cluster Match (10%)
  let audienceScore = 0.5; // Default
  const targetClusters = project.target_clusters || [];
  const successRate = distributor['Success Rate (%)'] || 0;
  
  // Match distributor characteristics to target audience
  if (targetClusters.length > 0) {
    const hasYouth = targetClusters.some(c => c.includes('youth') || c.includes('young'));
    const hasFamily = targetClusters.some(c => c.includes('family') || c.includes('children'));
    const hasMass = targetClusters.some(c => c.includes('mass') || c.includes('rural'));
    const hasUrban = targetClusters.some(c => c.includes('urban') || c.includes('metro'));
    
    const growthRate = distributor['Growth Rate Score (%)'] || 0;
    
    if (hasYouth && growthRate >= 80) {
      audienceScore = 0.9; // Modern, high-growth distributors for youth
    } else if (hasFamily && reliabilityScore >= 0.85) {
      audienceScore = 1.0; // Reliable distributors for family content
    } else if (hasMass && coverage === 'National' && successRate >= 80) {
      audienceScore = 0.95; // National reach for mass audience
    } else if (hasUrban && coverage !== 'Regional') {
      audienceScore = 0.85; // National/International for urban
    } else if (targetClusters.length > 0) {
      audienceScore = 0.7; // Has target audience defined
    }
  }
  score += audienceScore * weights.audienceMatch;
  
  // Convert base score to percentage (0-100)
  let finalScore = score * 100;
  
  // Additive bonuses based on additional project characteristics
  
  // Film industry bonus (+3%)
  if (distributor['Industry'] === 'Film') {
    finalScore += 3;
  }
  
  // Success rate bonus
  if (successRate >= 90) {
    finalScore += 5;
  } else if (successRate >= 85) {
    finalScore += 3;
  } else if (successRate >= 80) {
    finalScore += 2;
  }
  
  // Language-specific bonuses
  const language = project.language || '';
  const hqCity = distributor['Headquarters City'];
  
  if (language === 'Telugu' && (hqCity === 'Hyderabad' || hqCity === 'Vijayawada')) {
    finalScore += 4;
  } else if (language === 'Tamil' && hqCity === 'Chennai') {
    finalScore += 4;
  } else if (language === 'Kannada' && hqCity === 'Bengaluru') {
    finalScore += 4;
  } else if (language === 'Malayalam' && hqCity === 'Kochi') {
    finalScore += 4;
  } else if (language === 'Hindi' && (hqCity === 'Mumbai' || hqCity === 'Delhi')) {
    finalScore += 3;
  }
  
  // Star power bonus (if project has star_power field)
  const starPower = project.star_power || '';
  if (starPower === 'High' && marketShare >= 10) {
    finalScore += 3; // Big distributors for star-driven films
  }
  
  // Buzz score bonus (if available)
  const buzzScore = project.buzz_score || 0;
  if (buzzScore >= 70 && marketShare >= 8) {
    finalScore += 3; // High buzz needs established distributors
  } else if (buzzScore >= 50) {
    finalScore += 1;
  }
  
  // Genre-specific expertise bonus (additive, max +8%)
  if (project.genre) {
    const genreBonus = getGenreExpertiseBonus(distributor, project.genre);
    const additiveBonus = (genreBonus - 1.0) * 40;
    finalScore += additiveBonus;
  }
  
  // Scale-based adjustment
  const scale = project.scale || '';
  if (scale === 'big' && coverage !== 'National' && coverage !== 'International') {
    finalScore *= 0.9; // Penalize regional for big films
  } else if (scale === 'small' && coverage === 'International') {
    finalScore *= 0.85; // Penalize international for small films
  }
  
  return Math.min(finalScore, 95); // Cap at 95 to ensure variation
}

/**
 * Get latest sentiment analysis for a project
 */
async function getSentimentAnalysis(projectId) {
  try {
    const { data, error } = await supabase
      .from('film_sentiment_analysis')
      .select('*')
      .eq('project_id', projectId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.warn('No sentiment analysis found:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Error fetching sentiment:', error);
    return null;
  }
}

/**
 * Build comprehensive film profile for AI analysis
 */
async function buildFilmProfile(projectId, project) {
  try {
    // Fetch all available analysis data
    const [buzzSnapshots, sentiment, persona] = await Promise.all([
      projectService.getBuzzSnapshots(projectId),
      getSentimentAnalysis(projectId),
      projectService.getProjectPersona(projectId).catch(() => null)
    ]);

    // Get latest buzz score
    let latestBuzzScore = 0;
    let buzzTrend = 'stable';
    if (buzzSnapshots && buzzSnapshots.length > 0) {
      const latest = buzzSnapshots[buzzSnapshots.length - 1];
      latestBuzzScore = latest.buzz_score || 0;
      
      // Calculate trend
      if (buzzSnapshots.length >= 2) {
        const previous = buzzSnapshots[buzzSnapshots.length - 2];
        const diff = latestBuzzScore - (previous.buzz_score || 0);
        if (diff > 5) buzzTrend = 'rising';
        else if (diff < -5) buzzTrend = 'falling';
      }
    }

    // Get competition context if release date available
    let competition = [];
    if (project.release_date) {
      const releaseDate = new Date(project.release_date);
      const startDate = new Date(releaseDate);
      startDate.setDate(startDate.getDate() - 14); // 2 weeks before
      const endDate = new Date(releaseDate);
      endDate.setDate(endDate.getDate() + 14); // 2 weeks after
      
      try {
        competition = await getCompetitionMovies(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        // Filter out the current project
        competition = competition.filter(m => m.title !== project.title);
      } catch (err) {
        console.warn('Could not fetch competition:', err);
      }
    }

    // Build comprehensive profile
    return {
      basic: {
        title: project.title || 'Untitled',
        genre: project.genre || 'Drama',
        language: project.language || 'Regional',
        region: project.region_primary || 'Pan India',
        budget_band: project.budget_band || 'Mid Budget',
        scale: project.scale || 'medium',
        release_date: project.release_date || null
      },
      buzz: {
        currentScore: latestBuzzScore,
        trend: buzzTrend,
        snapshotsCount: buzzSnapshots?.length || 0
      },
      sentiment: sentiment ? {
        positive_percentage: sentiment.positive_sentiment || 0,
        neutral_percentage: sentiment.neutral_sentiment || 0,
        negative_percentage: sentiment.negative_sentiment || 0,
        overall_sentiment: sentiment.summary_opinion || 'No sentiment data',
        confidence_score: Math.round((sentiment.positive_sentiment || 0) / 100 * 100), // Derive confidence from sentiment strength
        key_insights: [sentiment.key_positive_1, sentiment.key_positive_2, sentiment.key_positive_3].filter(Boolean)
      } : null,
      audience: persona ? {
        target_clusters: persona.target_clusters || project.target_clusters || [],
        demographics: persona.demographics || {},
        psychographics: persona.psychographics || {}
      } : {
        target_clusters: project.target_clusters || []
      },
      competition: {
        totalFilms: competition.length,
        sameLanguage: competition.filter(m => m.language === project.language).length,
        highBuzzFilms: competition.filter(m => (m.external_buzz_score || 0) >= 70).length,
        crowdedness: competition.length > 5 ? 'high' : competition.length > 2 ? 'medium' : 'low'
      }
    };
  } catch (error) {
    console.error('Error building film profile:', error);
    // Return minimal profile on error
    return {
      basic: {
        title: project.title || 'Untitled',
        genre: project.genre || 'Drama',
        language: project.language || 'Regional',
        region: project.region_primary || 'Pan India',
        budget_band: project.budget_band || 'Mid Budget',
        scale: project.scale || 'medium'
      },
      buzz: { currentScore: 0, trend: 'unknown', snapshotsCount: 0 },
      sentiment: null,
      audience: { target_clusters: project.target_clusters || [] },
      competition: { totalFilms: 0, sameLanguage: 0, highBuzzFilms: 0, crowdedness: 'unknown' }
    };
  }
}

/**
 * Analyze distributors using Groq AI for intelligent matching
 */
async function analyzeDistributorsWithAI(filmProfile, topDistributors) {
  try {
    // Prepare distributor summary for AI
    const distributorSummary = topDistributors.slice(0, 30).map(d => ({
      name: d['Distributor Name'],
      coverage: d['Coverage Area'],
      hq: d['Headquarters City'],
      successRate: d['Success Rate (%)'],
      reliability: d['Reliability Score (%)'],
      marketShare: d['Market Share Estimate (%)'],
      networkStrength: d['Network Strength Score (%)'],
      marketReach: d['Market Reach Score (%)']
    }));

    const prompt = `You are an expert film distribution analyst for the Indian film industry.

FILM PROFILE:
- Title: ${filmProfile.basic.title}
- Genre: ${filmProfile.basic.genre}
- Language: ${filmProfile.basic.language}
- Region: ${filmProfile.basic.region}
- Budget: ${filmProfile.basic.budget_band}
- Scale: ${filmProfile.basic.scale}

CURRENT BUZZ & SENTIMENT:
- Buzz Score: ${filmProfile.buzz.currentScore}/100 (${filmProfile.buzz.trend})
- Sentiment: ${filmProfile.sentiment ? `${filmProfile.sentiment.positive_percentage}% positive, ${filmProfile.sentiment.negative_percentage}% negative` : 'No data'}
${filmProfile.sentiment ? `- Overall: ${filmProfile.sentiment.overall_sentiment} (${filmProfile.sentiment.confidence_score}% confidence)` : ''}

TARGET AUDIENCE:
- Clusters: ${filmProfile.audience.target_clusters.join(', ') || 'Mass audience'}

COMPETITIVE LANDSCAPE:
- Total competing films (±2 weeks): ${filmProfile.competition.totalFilms}
- Same language films: ${filmProfile.competition.sameLanguage}
- High buzz competitors: ${filmProfile.competition.highBuzzFilms}
- Market crowdedness: ${filmProfile.competition.crowdedness}

TOP 30 DISTRIBUTORS (algorithmic pre-filter):
${JSON.stringify(distributorSummary, null, 2)}

TASK:
Based on this film's complete profile, recommend the TOP 10 BEST-FIT distributors from the list above.

Consider:
1. **Buzz & Sentiment**: High buzz + positive sentiment → established national distributors. Low buzz or negative sentiment → reliable regional specialists.
2. **Competition**: Crowded market → distributors with crisis management and marketing strength. Clear window → aggressive national push.
3. **Budget & Scale**: Match distributor market share to film's budget band and scale.
4. **Audience**: Match distributor strengths to target clusters (youth/family/mass/urban).
5. **Language & Region**: Prioritize HQ alignment with primary region.

Return ONLY a JSON array with top 10 distributor names and brief reasoning:
{
  "recommendations": [
    {"name": "Distributor Name", "reason": "One-line justification"},
    ...
  ]
}`;

    const response = await callGroq(prompt);
    
    // Try to parse JSON response
    try {
      const parsed = parseJSON(response);
      return parsed.recommendations || [];
    } catch (parseError) {
      // If JSON parsing fails, try to extract distributor names from text
      console.warn('AI response not in JSON format, skipping AI insights');
      return [];
    }
  } catch (error) {
    console.warn('AI analysis failed, continuing with algorithmic scoring:', error);
    return [];
  }
}

/**
 * Get distributor recommendations for a project (NEW: uses comprehensive analysis)
 */
export async function getDistributorRecommendations(projectIdOrProject) {
  try {
    let project;
    let projectId;

    // Handle both projectId (string) and project object
    if (typeof projectIdOrProject === 'string') {
      projectId = projectIdOrProject;
      project = await projectService.getProject(projectId);
    } else {
      project = projectIdOrProject;
      projectId = project.id;
    }

    // Build comprehensive film profile with all analysis data
    console.log('Building comprehensive film profile...');
    const filmProfile = await buildFilmProfile(projectId, project);
    console.log('Film profile:', filmProfile);

    // Load all distributors
    const distributors = await loadDistributors();
    
    // Filter for film industry only
    const filmDistributors = distributors.filter(d => d['Industry'] === 'Film');
    
    // Determine region from project
    const region = determineRegion(project);
    const focusAreas = getRegionFocusAreas(region);
    
    // Update project with latest buzz score from profile
    const enrichedProject = {
      ...project,
      buzz_score: filmProfile.buzz.currentScore,
      target_clusters: filmProfile.audience.target_clusters
    };
    
    // Score all distributors using enhanced project data
    const scored = filmDistributors.map(dist => ({
      ...dist,
      matchScore: scoreDistributor(dist, enrichedProject, region)
    }));
    
    // Sort by score
    scored.sort((a, b) => b.matchScore - a.matchScore);

    // Get AI recommendations if we have sufficient film data
    let aiRecommendations = [];
    if (filmProfile.buzz.currentScore > 0 || filmProfile.sentiment) {
      console.log('Using AI for intelligent distributor matching...');
      aiRecommendations = await analyzeDistributorsWithAI(filmProfile, scored);
      console.log('AI recommendations:', aiRecommendations);
    }

    // Boost scores for AI-recommended distributors
    if (aiRecommendations.length > 0) {
      const aiBoost = new Map();
      aiRecommendations.forEach((rec, index) => {
        // Higher boost for top AI recommendations
        const boost = 15 - index; // +15 for #1, +14 for #2, etc.
        aiBoost.set(rec.name, { boost, reason: rec.reason });
      });

      // Apply AI boosts
      scored.forEach(dist => {
        const aiRec = aiBoost.get(dist['Distributor Name']);
        if (aiRec) {
          dist.matchScore = Math.min(dist.matchScore + aiRec.boost, 95);
          dist.aiRecommended = true;
          dist.aiReason = aiRec.reason;
        }
      });

      // Re-sort after AI boost
      scored.sort((a, b) => b.matchScore - a.matchScore);
    }
    
    // Group by coverage area
    const national = scored.filter(d => d['Coverage Area'] === 'National').slice(0, 10);
    const regional = scored.filter(d => d['Coverage Area'] === 'Regional').slice(0, 10);
    const international = scored.filter(d => d['Coverage Area'] === 'International').slice(0, 5);
    
    // Organize by priority based on region focus
    const recommendations = organizeByRegion(scored, region, focusAreas);
    
    return {
      region,
      focusAreas,
      filmProfile, // Include profile for debugging/display
      aiRecommendations: aiRecommendations.map(r => r.name), // List of AI-recommended names
      all: scored.slice(0, 30),
      national,
      regional,
      international,
      byRegion: recommendations
    };
  } catch (error) {
    console.error('Error getting distributor recommendations:', error);
    throw error;
  }
}

/**
 * Determine region from project data
 */
function determineRegion(project) {
  const regionPrimary = project.region_primary || '';
  const language = project.language || '';
  
  // Direct mappings
  if (regionPrimary === 'AP/TG') return 'AP/TG';
  if (regionPrimary === 'TN') return 'TN';
  if (regionPrimary === 'KA') return 'KA';
  if (regionPrimary === 'KL') return 'KL';
  if (regionPrimary === 'Pan South') return 'South India';
  
  // Language-based fallback
  if (language === 'Telugu') return 'AP/TG';
  if (language === 'Tamil') return 'TN';
  if (language === 'Kannada') return 'KA';
  if (language === 'Malayalam') return 'KL';
  
  return 'Pan India';
}

/**
 * Organize distributors by regional priority
 */
function organizeByRegion(distributors, region, focusAreas) {
  const result = {};
  
  if (focusAreas.type === 'states') {
    // Pan India - organize by states
    focusAreas.areas.forEach(state => {
      const stateDistributors = distributors.filter(d => {
        const hqState = getStateFromCity(d['Headquarters City']);
        return hqState === state;
      }).slice(0, 5);
      
      if (stateDistributors.length > 0) {
        result[state] = categorizeByPriority(stateDistributors);
      }
    });
  } else if (focusAreas.type === 'states_cities') {
    // South India - organize by states and cities
    focusAreas.states.forEach(state => {
      const stateDistributors = distributors.filter(d => {
        const hqState = getStateFromCity(d['Headquarters City']);
        return hqState === state;
      });
      
      if (stateDistributors.length > 0) {
        result[state] = {
          stateLevel: categorizeByPriority(stateDistributors.slice(0, 5)),
          cities: {}
        };
        
        // City-level breakdown
        const cities = focusAreas.cities[state] || [];
        cities.forEach(city => {
          const cityDistributors = stateDistributors.filter(d => 
            d['Headquarters City'] === city
          ).slice(0, 3);
          
          if (cityDistributors.length > 0) {
            result[state].cities[city] = categorizeByPriority(cityDistributors);
          }
        });
      }
    });
  } else if (focusAreas.type === 'cities') {
    // Specific region - organize by cities
    result.primary = {};
    result.secondary = {};
    
    focusAreas.primary.forEach(city => {
      const cityDistributors = distributors.filter(d => 
        d['Headquarters City'] === city
      ).slice(0, 3);
      
      if (cityDistributors.length > 0) {
        result.primary[city] = categorizeByPriority(cityDistributors);
      }
    });
    
    focusAreas.secondary.forEach(city => {
      const cityDistributors = distributors.filter(d => 
        d['Headquarters City'] === city
      ).slice(0, 2);
      
      if (cityDistributors.length > 0) {
        result.secondary[city] = categorizeByPriority(cityDistributors);
      }
    });
  }
  
  return result;
}

/**
 * Categorize distributors into Priority 1, 2, 3
 */
function categorizeByPriority(distributors) {
  const sorted = [...distributors].sort((a, b) => b.matchScore - a.matchScore);
  
  return {
    priority1: sorted.slice(0, 1),
    priority2: sorted.slice(1, 2),
    priority3: sorted.slice(2, 3)
  };
}

/**
 * Get genre-specific insights
 */
export function getGenreInsights(genre, subgenre) {
  const insights = {
    'Action': 'Wide theatrical release recommended. Prioritizing national distributors with proven mass appeal track record. Focus on mass centers and B/C tier cities for maximum reach.',
    'Romance': 'Urban and semi-urban focus essential. Selected distributors excel in family audience segments. Regional distributors with strong network strength preferred.',
    'Comedy': 'Universal appeal across demographics. Distributors chosen for both multiplex and single-screen expertise. Regional expertise valued for local humor resonance.',
    'Drama': 'Content-driven release strategy. Prioritizing distributors with high reliability scores (80%+) and strong word-of-mouth capabilities. Regional specialists preferred.',
    'Thriller': 'Urban-centric multiplex strategy. National distributors with high market reach (85%+) prioritized. Weekend release pattern recommended.',
    'Horror': 'Niche demographic targeting. Regional distributors with proven horror genre success rates selected. Strategic release in key centers.',
    'Family': 'Holiday release optimization. Distributors filtered for exceptional reliability (85%+) and family content success rates. Regional + National mix preferred.',
    'Social Drama': 'Tier-2/3 city focus. Regional distributors with strong reliability scores prioritized. Word-of-mouth critical - high network strength required.',
    'Fantasy': 'Premium exhibition focus. National/International distributors preferred. VFX showcase capability and multiplex network essential.'
  };
  
  return insights[genre] || 'Strategic release planning recommended. Distributors ranked by network strength, reliability, and regional coverage alignment.';
}

/**
 * Get distributor specialization based on genre and characteristics
 */
export function getDistributorSpecialization(distributor, genre) {
  const coverage = distributor['Coverage Area'];
  const successRate = distributor['Success Rate (%)'] || 0;
  const reliability = distributor['Reliability Score (%)'] || 0;
  const marketShare = parseFloat(distributor['Market Share Estimate (%)']) || 0;
  const growthRate = distributor['Growth Rate Score (%)'] || 0;
  const hqCity = distributor['Headquarters City'];
  const foundedYear = parseInt(distributor['Founded Year']) || 2000;
  const experience = 2026 - foundedYear;
  
  // Genre-specific specialization messages
  const specializations = {
    'Action': () => {
      if (coverage === 'National' && successRate >= 85) {
        return `Excellent for mass-market action films • ${experience}+ years experience in wide releases • Strong B/C tier penetration`;
      } else if (coverage === 'Regional' && successRate >= 80) {
        return `Regional action specialist • Proven track record in ${hqCity} market • ${marketShare > 5 ? 'High' : 'Growing'} market dominance`;
      } else if (marketShare >= 10) {
        return `Major player with ${marketShare.toFixed(1)}% market share • Action blockbuster distribution expert • Nationwide reach`;
      } else {
        return `Action film specialist • ${successRate}% success rate • ${coverage.toLowerCase()} coverage strength`;
      }
    },
    
    'Comedy': () => {
      if (coverage === 'Regional' && reliability >= 85) {
        return `Regional comedy specialist • Local market expertise in ${hqCity} • ${reliability}% reliability for family comedies`;
      } else if (successRate >= 85 && coverage === 'National') {
        return `National comedy distributor • ${successRate}% proven success rate • Both multiplex & single-screen expertise`;
      } else if (growthRate >= 80) {
        return `Rising comedy specialist • ${growthRate}% growth trajectory • Modern distribution approach`;
      } else {
        return `Comedy film distributor • ${experience} years in entertainment • ${coverage.toLowerCase()} market strength`;
      }
    },
    
    'Romance': () => {
      if (reliability >= 85 && successRate >= 80) {
        return `Family-friendly romance specialist • ${reliability}% reliability score • Strong urban/semi-urban networks`;
      } else if (coverage === 'Regional') {
        return `Regional romance expert • ${hqCity}-based market knowledge • Proven family audience reach`;
      } else if (marketShare >= 8) {
        return `Major romance distributor • ${marketShare.toFixed(1)}% market share • Established multiplex partnerships`;
      } else {
        return `Romance genre specialist • ${successRate}% success rate • ${coverage.toLowerCase()} coverage`;
      }
    },
    
    'Drama': () => {
      if (reliability >= 90) {
        return `Premium content-driven distributor • ${reliability}% reliability • Exceptional word-of-mouth track record`;
      } else if (coverage === 'Regional' && successRate >= 85) {
        return `Regional drama specialist • ${successRate}% success in meaningful content • Strong tier-2/3 presence`;
      } else if (experience >= 30) {
        return `Veteran distributor (${experience} years) • Deep drama expertise • Trusted industry relationships`;
      } else {
        return `Drama specialist • ${reliability}% reliability score • ${coverage.toLowerCase()} market expertise`;
      }
    },
    
    'Thriller': () => {
      if (coverage === 'National' && successRate >= 85) {
        return `Urban thriller specialist • ${successRate}% success rate • Premium multiplex network strength`;
      } else if (marketShare >= 10) {
        return `Major thriller distributor • ${marketShare.toFixed(1)}% market dominance • Weekend release expertise`;
      } else if (growthRate >= 85) {
        return `Emerging thriller specialist • ${growthRate}% growth rate • Modern marketing approach`;
      } else {
        return `Thriller genre distributor • ${successRate}% success rate • ${coverage.toLowerCase()} reach`;
      }
    },
    
    'Horror': () => {
      if (coverage === 'Regional' && successRate >= 75) {
        return `Niche horror specialist • ${successRate}% genre success rate • Strategic ${hqCity} market positioning`;
      } else if (reliability >= 80) {
        return `Reliable horror distributor • ${reliability}% reliability • Proven niche audience targeting`;
      } else if (marketShare >= 5) {
        return `Established horror distributor • ${marketShare.toFixed(1)}% market share • Genre-specific expertise`;
      } else {
        return `Horror film specialist • ${experience} years experience • ${coverage.toLowerCase()} market focus`;
      }
    },
    
    'Family': () => {
      if (reliability >= 90 && successRate >= 85) {
        return `Premium family content distributor • ${reliability}% reliability • ${successRate}% family film success rate`;
      } else if (coverage === 'National') {
        return `National family entertainer • Holiday release specialist • ${experience} years of family content`;
      } else if (marketShare >= 8) {
        return `Major family distributor • ${marketShare.toFixed(1)}% market share • Festival period expertise`;
      } else {
        return `Family film specialist • ${reliability}% reliability • ${coverage.toLowerCase()} coverage`;
      }
    },
    
    'Social Drama': () => {
      if (coverage === 'Regional' && reliability >= 85) {
        return `Social content specialist • ${reliability}% reliability • Strong tier-2/3 city penetration in ${hqCity}`;
      } else if (successRate >= 85) {
        return `Social drama expert • ${successRate}% success rate • Word-of-mouth marketing strength`;
      } else if (experience >= 25) {
        return `Veteran social content distributor (${experience} years) • Deep regional roots • Community engagement`;
      } else {
        return `Social drama specialist • ${reliability}% reliability • ${coverage.toLowerCase()} market strength`;
      }
    },
    
    'Fantasy': () => {
      if (coverage === 'International' || coverage === 'National') {
        return `Premium fantasy distributor • ${coverage.toLowerCase()} reach • VFX showcase capability`;
      } else if (marketShare >= 10) {
        return `Major fantasy specialist • ${marketShare.toFixed(1)}% market share • High-budget film expertise`;
      } else if (growthRate >= 85) {
        return `Modern fantasy distributor • ${growthRate}% growth • Premium multiplex partnerships`;
      } else {
        return `Fantasy genre distributor • ${successRate}% success rate • ${coverage.toLowerCase()} premium reach`;
      }
    }
  };
  
  // Get the specialization function for the genre, or use a default
  const getSpecialization = specializations[genre] || (() => {
    if (successRate >= 90) {
      return `Top-tier distributor • ${successRate}% success rate • ${coverage.toLowerCase()} market leader`;
    } else if (reliability >= 90) {
      return `Highly reliable distributor • ${reliability}% reliability • ${experience} years in business`;
    } else if (marketShare >= 10) {
      return `Major market player • ${marketShare.toFixed(1)}% market share • Established network`;
    } else if (coverage === 'National') {
      return `National distributor • ${experience} years experience • Pan-India reach`;
    } else {
      return `${coverage} specialist • ${hqCity}-based • ${successRate}% success rate`;
    }
  });
  
  return getSpecialization();
}
