/**
 * Poster Analysis Service
 * Frontend API client for interacting with the poster analysis backend
 */

const API_BASE_URL = process.env.REACT_APP_POSTER_API_URL || '/api';

/**
 * Fetches the list of available posters from the server
 * @returns {Promise<Array<{filename: string, path: string, url: string}>>}
 */
export async function getPosterList() {
  try {
    const response = await fetch(`${API_BASE_URL}/posters/list`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch poster list: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch posters');
    }
    
    return data.posters;
  } catch (error) {
    console.error('Error fetching poster list:', error);
    throw error;
  }
}

/**
 * Analyzes a single poster using the ML model
 * @param {string} imagePath - Path to the poster image (e.g., '/assets/posters/1.jpg')
 * @returns {Promise<{score: number, verdict: string, suggestions: string|null}>}
 */
export async function analyzePoster(imagePath) {
  try {
    const response = await fetch(`${API_BASE_URL}/posters/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imagePath }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Analysis failed: ${response.statusText}`);
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Analysis failed');
    }
    
    return data.analysis;
  } catch (error) {
    console.error('Error analyzing poster:', error);
    throw error;
  }
}

/**
 * Compares two posters (A/B testing)
 * @param {string} imagePathA - Path to first poster
 * @param {string} imagePathB - Path to second poster
 * @returns {Promise<Object>} Comparison result with winner
 */
export async function comparePosters(imagePathA, imagePathB) {
  try {
    const response = await fetch(`${API_BASE_URL}/posters/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imagePathA, imagePathB }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Comparison failed: ${response.statusText}`);
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Comparison failed');
    }
    
    return data.comparison;
  } catch (error) {
    console.error('Error comparing posters:', error);
    throw error;
  }
}

/**
 * Gets verdict color for UI display
 * @param {string} verdict - "good" | "bad" | "needs_improvement"
 * @returns {string} CSS color
 */
export function getVerdictColor(verdict) {
  const colors = {
    'good': '#4ade80',
    'bad': '#ef4444',
    'needs_improvement': '#f59e0b',
    'needs improvement': '#f59e0b',
  };
  return colors[verdict.toLowerCase()] || '#6b7280';
}

/**
 * Gets verdict label for display
 * @param {string} verdict
 * @returns {string}
 */
export function getVerdictLabel(verdict) {
  const labels = {
    'good': 'Good',
    'bad': 'Needs Work',
    'needs_improvement': 'Needs Improvement',
    'needs improvement': 'Needs Improvement',
  };
  return labels[verdict.toLowerCase()] || verdict;
}

/**
 * Gets score interpretation
 * @param {number} score - Score from 0-100
 * @returns {string}
 */
export function getScoreInterpretation(score) {
  if (score >= 80) return 'Excellent - High audience appeal';
  if (score >= 65) return 'Good - Above average attractiveness';
  if (score >= 50) return 'Moderate - Room for improvement';
  if (score >= 35) return 'Below Average - Consider revisions';
  return 'Poor - Major improvements needed';
}
