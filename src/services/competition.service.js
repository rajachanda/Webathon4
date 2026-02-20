import { supabase } from '../supabaseClient';

/**
 * Competition Calendar Service
 * Handles loading and managing competition movie data
 */

/**
 * Parse CSV data from public assets
 * @returns {Promise<Array>} Parsed movie data
 */
export async function loadCompetitionDataFromCSV() {
  try {
    const response = await fetch('/assets/updated_movies.csv');
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    const movies = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 3) {
        const movieName = values[0]?.trim();
        const releaseDate = values[1]?.trim();
        const buzzScore = parseFloat(values[2]?.trim());
        
        if (movieName && releaseDate && !isNaN(buzzScore)) {
          // Infer language from movie name patterns (basic heuristic)
          const language = inferLanguage(movieName);
          
          // Infer scale from buzz score
          const scale = buzzScore >= 75 ? 'big' : buzzScore >= 55 ? 'mid' : 'small';
          
          // Infer target clusters
          const targetClusters = inferTargetClusters(movieName, buzzScore, scale, language);
          
          // Infer genre
          const genre = inferGenre(movieName);
          
          movies.push({
            title: movieName,
            release_date: releaseDate,
            external_buzz_score: buzzScore,
            language: language,
            scale: scale,
            genre: genre,
            target_clusters: targetClusters,
            is_confirmed: true,
            region_primary: inferRegion(language),
            notes: `Auto-imported from CSV with buzz score ${buzzScore}`
          });
        }
      }
    }
    
    return movies;
  } catch (error) {
    console.error('Error loading CSV:', error);
    throw error;
  }
}

/**
 * Infer target audience clusters based on movie characteristics
 * @param {string} movieName 
 * @param {number} buzzScore 
 * @param {string} scale 
 * @param {string} language 
 * @returns {Array<string>} Target cluster codes
 */
function inferTargetClusters(movieName, buzzScore, scale, language) {
  const clusters = [];
  const nameLower = movieName.toLowerCase();
  
  // High buzz movies (≥75) usually target mass + multiplex
  if (buzzScore >= 75) {
    clusters.push('MASS_SINGLE_SCREEN');
    clusters.push('URBAN_YOUTH_MULTIPLEX');
  }
  
  // Mid-range buzz (55-74) - varies by type
  else if (buzzScore >= 55) {
    // Family-friendly keywords
    if (nameLower.includes('family') || nameLower.includes('drishyam') || 
        nameLower.includes('aadu') || scale === 'mid') {
      clusters.push('FAMILY_FESTIVAL');
    }
    // Youth-oriented
    else if (nameLower.includes('romantic') || nameLower.includes('love')) {
      clusters.push('URBAN_YOUTH_MULTIPLEX');
    }
    // Default mid-range
    else {
      clusters.push('URBAN_YOUTH_MULTIPLEX');
      clusters.push('MASS_SINGLE_SCREEN');
    }
  }
  
  // Lower buzz (<55) - niche or smaller releases
  else {
    // Kids movies
    if (nameLower.includes('kids') || nameLower.includes('junior')) {
      clusters.push('KIDS_TEENS');
    }
    // Art/niche films
    else if (scale === 'small') {
      clusters.push('NICHE_CINEPHILE');
    }
    // Default small releases
    else {
      clusters.push('MASS_SINGLE_SCREEN');
    }
  }
  
  // Pan-India releases target broader audience
  if (language === 'Hindi/Pan-India') {
    if (!clusters.includes('URBAN_YOUTH_MULTIPLEX')) {
      clusters.push('URBAN_YOUTH_MULTIPLEX');
    }
    if (!clusters.includes('FAMILY_FESTIVAL')) {
      clusters.push('FAMILY_FESTIVAL');
    }
  }
  
  // Ensure at least one cluster
  if (clusters.length === 0) {
    clusters.push('MASS_SINGLE_SCREEN');
  }
  
  return clusters;
}

/**
 * Infer genre from movie name
 */
function inferGenre(movieName) {
  const nameLower = movieName.toLowerCase();
  
  if (nameLower.includes('action') || nameLower.includes('toxic') || 
      nameLower.includes('dacoit') || nameLower.includes('patriot')) {
    return 'Action';
  }
  if (nameLower.includes('romantic') || nameLower.includes('love')) {
    return 'Romance';
  }
  if (nameLower.includes('comedy') || nameLower.includes('aadu')) {
    return 'Comedy';
  }
  if (nameLower.includes('horror') || nameLower.includes('thriller')) {
    return 'Thriller';
  }
  if (nameLower.includes('family') || nameLower.includes('drishyam')) {
    return 'Family Drama';
  }
  if (nameLower.includes('ramayana') || nameLower.includes('hanuman')) {
    return 'Mythology';
  }
  
  return 'Drama'; // Default
}

/**
 * Infer language from movie name (basic heuristic)
 */
function inferLanguage(movieName) {
  const nameLower = movieName.toLowerCase();
  
  // Common Telugu name patterns
  if (nameLower.includes('bharat') || nameLower.includes('ntr') || 
      nameLower.includes('nbk') || nameLower.includes('ustaad') ||
      nameLower.includes('vrushakarma') || nameLower.includes('swayambhu') ||
      nameLower.includes('vishwambhara') || nameLower.includes('gopichand')) {
    return 'Telugu';
  }
  
  // Common Tamil patterns
  if (nameLower.includes('thug life') || nameLower.includes('jailer') || 
      nameLower.includes('thalaivar') || nameLower.includes('chiyaan') ||
      nameLower.includes('dhruva') || nameLower.includes('jana nayagan') ||
      nameLower.includes('karuppu') || nameLower.includes('sardar')) {
    return 'Tamil';
  }
  
  // Common Malayalam patterns
  if (nameLower.includes('aadu') || nameLower.includes('pallichattambi') || 
      nameLower.includes('ajagajantharam') || nameLower.includes('khalifa')) {
    return 'Malayalam';
  }
  
  // Common Kannada patterns
  if (nameLower.includes('kempegowda') || nameLower.includes('benz')) {
    return 'Kannada';
  }
  
  // Pan-India/Hindi
  if (nameLower.includes('ramayana') || nameLower.includes('lahore') || 
      nameLower.includes('love & war') || nameLower.includes('spirit') ||
      nameLower.includes('king 101')) {
    return 'Hindi/Pan-India';
  }
  
  // Default to Regional (will need manual classification)
  return 'Regional';
}

/**
 * Infer region from language
 */
function inferRegion(language) {
  const regionMap = {
    'Telugu': 'AP/TG',
    'Tamil': 'TN',
    'Malayalam': 'KL',
    'Kannada': 'KA',
    'Hindi/Pan-India': 'Pan-India'
  };
  return regionMap[language] || 'Regional';
}

/**
 * Import competition data to Supabase
 * @param {Array} movies - Array of movie objects
 * @returns {Promise<Object>} Import results
 */
export async function importCompetitionData(movies) {
  try {
    // First, check if data already exists to avoid duplicates
    const { data: existing, error: fetchError } = await supabase
      .from('competition_calendar')
      .select('title, release_date');
    
    if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "not found" errors
      throw fetchError;
    }
    
    // Create a Set of existing entries for quick lookup
    const existingSet = new Set(
      (existing || []).map(e => `${e.title}|${e.release_date}`)
    );
    
    // Filter out duplicates
    const newMovies = movies.filter(movie => 
      !existingSet.has(`${movie.title}|${movie.release_date}`)
    );
    
    if (newMovies.length === 0) {
      return { success: true, imported: 0, skipped: movies.length, message: 'All movies already exist' };
    }
    
    // Insert new movies
    const { data, error } = await supabase
      .from('competition_calendar')
      .insert(newMovies)
      .select();
    
    if (error) throw error;
    
    return { 
      success: true, 
      imported: data.length, 
      skipped: movies.length - newMovies.length,
      message: `Imported ${data.length} movies, skipped ${movies.length - newMovies.length} duplicates`
    };
  } catch (error) {
    console.error('Error importing competition data:', error);
    throw error;
  }
}

/**
 * Get competition movies for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Competition movies
 */
export async function getCompetitionMovies(startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('competition_calendar')
      .select('*')
      .gte('release_date', startDate)
      .lte('release_date', endDate)
      .order('release_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching competition movies:', error);
    throw error;
  }
}

/**
 * Load CSV and auto-import to database
 * @returns {Promise<Object>} Import results
 */
export async function autoImportCompetitionData() {
  try {
    const movies = await loadCompetitionDataFromCSV();
    const result = await importCompetitionData(movies);
    return result;
  } catch (error) {
    console.error('Error in auto-import:', error);
    throw error;
  }
}

/**
 * Get movies by language
 */
export async function getCompetitionMoviesByLanguage(language, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('competition_calendar')
      .select('*')
      .eq('language', language)
      .gte('release_date', startDate)
      .lte('release_date', endDate)
      .order('release_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching movies by language:', error);
    throw error;
  }
}

/**
 * Get high-buzz competition (buzz >= 70)
 */
export async function getHighBuzzCompetition(startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('competition_calendar')
      .select('*')
      .gte('external_buzz_score', 70)
      .gte('release_date', startDate)
      .lte('release_date', endDate)
      .order('external_buzz_score', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching high-buzz competition:', error);
    throw error;
  }
}
