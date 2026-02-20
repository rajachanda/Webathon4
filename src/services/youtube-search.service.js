/**
 * YouTube Search Service
 * Automatically searches YouTube for top videos related to a film
 */

const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Search YouTube for top videos about a film
 * Returns array of video URLs (never throws error)
 */
export const searchFilmVideos = async (filmName, maxResults = 5) => {
  if (!filmName) {
    console.warn('No film name provided for YouTube search');
    return [];
  }

  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key not configured');
    return [];
  }

  console.log(`🔍 Searching YouTube for: "${filmName}"`);

  try {
    // Simple direct search - just the film name with most relevant results
    const url = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(filmName)}&type=video&maxResults=${maxResults}&order=relevance&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`YouTube API error:`, response.status, errorText);
      return [];
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log(`No YouTube videos found for "${filmName}"`);
      return [];
    }

    const videoUrls = data.items
      .filter(item => item.id.videoId)
      .map(item => `https://www.youtube.com/watch?v=${item.id.videoId}`);

    console.log(`✅ Found ${videoUrls.length} YouTube videos for "${filmName}"`);
    return videoUrls;

  } catch (error) {
    console.error(`YouTube search error:`, error.message);
    return [];
  }
};

/**
 * Search for specific types of film content
 */
export const searchFilmContentByType = async (filmName, contentType = 'trailer', maxResults = 2) => {
  if (!filmName) return [];

  const searchQuery = `${filmName} ${contentType}`;
  
  const url = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${maxResults}&order=viewCount&key=${YOUTUBE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.items || data.items.length === 0) return [];

    return data.items
      .filter(item => item.id.videoId)
      .map(item => ({
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        publishedAt: item.snippet.publishedAt,
      }));
  } catch (error) {
    console.error(`Error searching YouTube for ${contentType}:`, error);
    return [];
  }
};

/**
 * Get comprehensive film video URLs
 * Searches for trailers, teasers, interviews, and songs
 */
export const getComprehensiveFilmVideos = async (filmName, maxVideos = 5) => {
  if (!filmName) return [];

  const contentTypes = ['trailer', 'teaser', 'interview', 'song'];
  const allVideos = [];

  for (const type of contentTypes) {
    const videos = await searchFilmContentByType(filmName, type, 2);
    allVideos.push(...videos);
    
    if (allVideos.length >= maxVideos) break;
  }

  // Remove duplicates and return URLs only
  const uniqueUrls = [...new Set(allVideos.map(v => v.url))];
  return uniqueUrls.slice(0, maxVideos);
};

/**
 * Search Instagram posts (simulation - requires actual Instagram API)
 * For now, returns estimated data based on film name
 */
export const searchInstagramPosts = async (filmName) => {
  // Note: Instagram Graph API requires business account and complex auth
  // This is a placeholder for future implementation
  
  console.log(`Instagram search for: ${filmName}`);
  
  // Return suggested Instagram handles based on film name
  const suggestedHandles = [
    `@${filmName.toLowerCase().replace(/\s+/g, '')}movie`,
    `@${filmName.toLowerCase().replace(/\s+/g, '')}official`,
  ];

  return {
    suggested: true,
    handles: suggestedHandles,
    message: 'Auto-detection not available. Please add Instagram handle manually in configuration.',
  };
};

export default {
  searchFilmVideos,
  searchFilmContentByType,
  getComprehensiveFilmVideos,
  searchInstagramPosts,
};
