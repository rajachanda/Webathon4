/**
 * YouTube API service for fetching video comments
 * Uses YouTube Data API v3 to extract comments from videos
 */

const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY || process.env.Youtube_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url) {
  if (!url) return null;
  
  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Fetch comments from a YouTube video
 * @param {string} videoId - YouTube video ID
 * @param {number} maxResults - Maximum number of comments to fetch (default: 20)
 * @returns {Promise<Array>} Array of comments with text, author, likes, and timestamp
 */
export async function fetchYouTubeComments(videoId, maxResults = 20) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured in environment variables');
  }

  try {
    const url = `${YOUTUBE_API_BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${Math.min(maxResults, 100)}&order=relevance&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403) {
        throw new Error('YouTube API quota exceeded or comments are disabled for this video');
      }
      throw new Error(errorData.error?.message || `YouTube API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return [];
    }
    
    // Extract and format comments
    const comments = data.items.map(item => {
      const snippet = item.snippet.topLevelComment.snippet;
      return {
        id: item.id,
        text: snippet.textDisplay.replace(/<[^>]*>/g, ''), // Remove HTML tags
        author: snippet.authorDisplayName,
        likes: snippet.likeCount || 0,
        publishedAt: snippet.publishedAt,
        updatedAt: snippet.updatedAt
      };
    });
    
    // Sort by likes (descending) and take top comments
    return comments.sort((a, b) => b.likes - a.likes).slice(0, maxResults);
  } catch (error) {
    console.error('YouTube API error:', error);
    throw error;
  }
}

/**
 * Fetch comments from multiple YouTube URLs
 * @param {Array<string>} urls - Array of YouTube URLs
 * @param {number} commentsPerVideo - Comments to fetch per video
 * @returns {Promise<Object>} Object with video IDs as keys and comments as values
 */
export async function fetchCommentsFromMultipleVideos(urls, commentsPerVideo = 20) {
  const results = {};
  const errors = [];
  
  for (const url of urls) {
    const videoId = extractVideoId(url);
    
    if (!videoId) {
      errors.push({ url, error: 'Invalid YouTube URL' });
      continue;
    }
    
    try {
      const comments = await fetchYouTubeComments(videoId, commentsPerVideo);
      results[videoId] = {
        url,
        videoId,
        comments,
        count: comments.length
      };
    } catch (error) {
      errors.push({ url, videoId, error: error.message });
    }
  }
  
  return { results, errors };
}

/**
 * Get video details (title, description, statistics)
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Video details
 */
export async function getVideoDetails(videoId) {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  try {
    const url = `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }
    
    const video = data.items[0];
    return {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      publishedAt: video.snippet.publishedAt,
      channelTitle: video.snippet.channelTitle,
      viewCount: parseInt(video.statistics.viewCount || 0),
      likeCount: parseInt(video.statistics.likeCount || 0),
      commentCount: parseInt(video.statistics.commentCount || 0)
    };
  } catch (error) {
    console.error('Error fetching video details:', error);
    throw error;
  }
}
