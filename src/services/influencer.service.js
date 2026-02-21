/**
 * Influencer Recommendation Service
 * Matches film characteristics with influencer profiles from CSV
 */

/**
 * Load and parse Influencer-Genre.csv
 * @returns {Promise<Array<Object>>} Array of influencer profiles
 */
export async function loadInfluencerData() {
  try {
    const response = await fetch('/assets/Influencer-Genre.csv');
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    const influencers = [];
    
    // Start from line 1 (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('S.No,Influencer')) continue; // Skip empty or header lines
      
      // Parse CSV (handle commas in quoted fields)
      const matches = line.match(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g);
      let parts;
      
      if (matches) {
        parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
      } else {
        parts = line.split(',');
      }
      
      if (parts.length >= 4) {
        const sno = parts[0]?.trim();
        const name = parts[1]?.trim().replace(/^"|"$/g, '');
        const market = parts[2]?.trim().replace(/^"|"$/g, '');
        const genres = parts[3]?.trim().replace(/^"|"$/g, '');
        const description = parts[4]?.trim().replace(/^"|"$/g, '') || null;
        
        if (name && market && genres && sno && !isNaN(parseInt(sno))) {
          influencers.push({
            id: parseInt(sno),
            name,
            market,
            genres: genres.split('/').map(g => g.trim()),
            description,
            // Add platform hints based on name patterns
            platform: inferPlatform(name)
          });
        }
      }
    }
    
    return influencers;
  } catch (error) {
    console.error('Error loading influencer data:', error);
    return [];
  }
}

/**
 * Infer social media platform from influencer name
 */
function inferPlatform(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('youtube') || lowerName.includes('channel')) return 'YouTube';
  if (lowerName.includes('instagram') || lowerName.includes('insta')) return 'Instagram';
  if (lowerName.includes('twitter') || lowerName.includes('x.com')) return 'Twitter/X';
  return 'Multi-platform';
}

/**
 * Match influencers to film characteristics
 * @param {Object} filmDetails - Film metadata
 * @param {Object} persona - Persona data with target clusters
 * @returns {Promise<Array<Object>>} Recommended influencers with match scores
 */
export async function getInfluencerRecommendations(filmDetails, persona) {
  const influencers = await loadInfluencerData();
  if (!influencers.length) return [];
  
  const {
    genre = '',
    subgenre = '',
    language = '',
    region = '',
  } = filmDetails;
  
  const targetClusters = [
    ...(persona?.target_core_clusters || []),
    ...(persona?.target_secondary_clusters || [])
  ];
  
  // Score each influencer
  const scored = influencers.map(influencer => {
    let score = 0;
    const reasons = [];
    
    // 1. Genre matching (highest weight)
    const filmGenres = [genre, subgenre].filter(Boolean).map(g => g.toLowerCase());
    const influencerGenres = influencer.genres.map(g => g.toLowerCase());
    
    for (const fg of filmGenres) {
      for (const ig of influencerGenres) {
        // Exact match
        if (ig.includes(fg) || fg.includes(ig)) {
          score += 40;
          reasons.push(`Matches ${ig}`);
          break;
        }
        // Partial match (e.g., "action" in "mass action")
        if (ig.split(' ').some(word => fg.includes(word) || word.includes(fg))) {
          score += 20;
          reasons.push(`Related to ${ig}`);
          break;
        }
      }
    }
    
    // 2. Market/Language matching
    const influencerMarket = influencer.market.toLowerCase();
    const filmLanguage = language.toLowerCase();
    const filmRegion = region.toLowerCase();
    
    if (influencerMarket === 'pan south' || influencerMarket === 'pan-south') {
      score += 25;
      reasons.push('Pan-South reach');
    } else if (
      influencerMarket.includes(filmLanguage) ||
      filmLanguage.includes(influencerMarket) ||
      influencerMarket.includes(filmRegion) ||
      filmRegion.includes(influencerMarket)
    ) {
      score += 30;
      reasons.push(`${influencer.market} market match`);
    }
    
    // 3. Audience cluster matching
    const clusterKeywords = {
      URBAN_YOUTH_MULTIPLEX: ['youth', 'urban', 'multiplex', 'modern', 'viral'],
      MASS_SINGLE_SCREEN: ['mass', 'commercial', 'mega-star', 'blockbuster', 'jathara'],
      FAMILY_FESTIVAL: ['family', 'comedy', 'festival', 'entertainment'],
      NICHE_CINEPHILE: ['art house', 'intellectual', 'classic', 'analysis', 'indie', 'arthouse'],
      KIDS_TEENS: ['kids', 'junior', 'teen', 'anime', 'youth']
    };
    
    for (const cluster of targetClusters) {
      const keywords = clusterKeywords[cluster] || [];
      const influencerText = `${influencer.genres.join(' ')} ${influencer.description || ''}`.toLowerCase();
      
      for (const keyword of keywords) {
        if (influencerText.includes(keyword)) {
          score += 15;
          reasons.push(`Reaches ${cluster.replace(/_/g, ' ').toLowerCase()} audience`);
          break;
        }
      }
    }
    
    // 4. Special bonuses
    // Horror/Thriller specialists
    if ((genre?.toLowerCase().includes('horror') || genre?.toLowerCase().includes('thriller')) &&
        influencerGenres.some(g => g.includes('horror') || g.includes('thriller') || g.includes('psychological'))) {
      score += 20;
      reasons.push('Horror/Thriller specialist');
    }
    
    // Romance specialists
    if ((genre?.toLowerCase().includes('romance') || subgenre?.toLowerCase().includes('romance')) &&
        influencerGenres.some(g => g.includes('romance') || g.includes('rom-com') || g.includes('romantic'))) {
      score += 20;
      reasons.push('Romance specialist');
    }
    
    // Intellectual/Art films
    if (targetClusters.includes('NICHE_CINEPHILE') &&
        influencerGenres.some(g => g.includes('art house') || g.includes('intellectual') || g.includes('indie'))) {
      score += 25;
      reasons.push('Art house/Indie champion');
    }
    
    return {
      ...influencer,
      matchScore: Math.min(score, 100), // Cap at 100
      matchReasons: reasons.slice(0, 3), // Top 3 reasons
    };
  });
  
  // Filter influencers with score > 20 and sort by score
  return scored
    .filter(inf => inf.matchScore > 20)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6); // Top 6 recommendations
}

/**
 * Get genre-specific influencer suggestions (fallback)
 * @param {string} genre - Film genre
 * @returns {Promise<Array<Object>>} Genre-matched influencers
 */
export async function getInfluencersByGenre(genre) {
  const influencers = await loadInfluencerData();
  if (!influencers.length || !genre) return [];
  
  const genreLower = genre.toLowerCase();
  return influencers.filter(inf => 
    inf.genres.some(g => 
      g.toLowerCase().includes(genreLower) || 
      genreLower.includes(g.toLowerCase())
    )
  ).slice(0, 6);
}

/**
 * Get market-specific influencers
 * @param {string} language - Film language/market
 * @returns {Promise<Array<Object>>} Market-matched influencers
 */
export async function getInfluencersByMarket(language) {
  const influencers = await loadInfluencerData();
  if (!influencers.length || !language) return [];
  
  const languageLower = language.toLowerCase();
  return influencers.filter(inf => 
    inf.market.toLowerCase().includes(languageLower) ||
    inf.market.toLowerCase() === 'pan south' ||
    inf.market.toLowerCase() === 'pan-south'
  ).slice(0, 8);
}
