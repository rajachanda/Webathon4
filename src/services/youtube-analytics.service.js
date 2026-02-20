/**
 * YouTube Analytics Service
 * Fetches comprehensive video statistics for buzz score calculation
 */

const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Extract video ID from YouTube URL
 */
export const extractVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

/**
 * Fetch detailed video statistics from YouTube Data API
 */
export const fetchVideoStatistics = async (videoUrl) => {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  const url = `${YOUTUBE_API_BASE}/videos?part=statistics,contentDetails,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found or is private');
  }

  const video = data.items[0];
  const stats = video.statistics;
  const details = video.contentDetails;
  const snippet = video.snippet;

  // Parse video duration (ISO 8601 format: PT#M#S)
  const duration = parseDuration(details.duration);

  return {
    videoId,
    title: snippet.title,
    publishedAt: snippet.publishedAt,
    duration, // in seconds
    viewCount: parseInt(stats.viewCount || 0),
    likeCount: parseInt(stats.likeCount || 0),
    commentCount: parseInt(stats.commentCount || 0),
    favoriteCount: parseInt(stats.favoriteCount || 0),
  };
};

/**
 * Parse ISO 8601 duration to seconds
 */
const parseDuration = (duration) => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Fetch statistics for multiple videos
 */
export const fetchMultipleVideosStatistics = async (videoUrls) => {
  const results = [];
  const errors = [];

  for (const url of videoUrls) {
    try {
      const stats = await fetchVideoStatistics(url);
      results.push(stats);
    } catch (error) {
      errors.push({ url, error: error.message });
    }
  }

  return { results, errors };
};

/**
 * Calculate aggregate YouTube metrics for buzz score
 */
export const calculateYouTubeMetrics = (videoStats) => {
  if (!videoStats || videoStats.length === 0) {
    return {
      youtube_watch_time_avg: 0,
      youtube_likes_count: 0,
      youtube_comments_count: 0,
      youtube_shares_count: 0,
      youtube_watch_time_rate: 0,
      youtube_retention_rate: 0,
      youtube_view_count: 0,
    };
  }

  // Aggregate totals
  const totalViews = videoStats.reduce((sum, v) => sum + v.viewCount, 0);
  const totalLikes = videoStats.reduce((sum, v) => sum + v.likeCount, 0);
  const totalComments = videoStats.reduce((sum, v) => sum + v.commentCount, 0);
  
  // Average watch time estimation (based on video duration and engagement)
  // YouTube doesn't provide actual watch time via public API, so we estimate:
  // Higher engagement (likes/views ratio) suggests better watch time
  const avgDuration = videoStats.reduce((sum, v) => sum + v.duration, 0) / videoStats.length;
  const avgEngagementRate = totalLikes / Math.max(totalViews, 1);
  const estimatedWatchTimeRate = Math.min(avgEngagementRate * 15, 0.85); // Estimate 15-85% retention
  const youtube_watch_time_avg = avgDuration * estimatedWatchTimeRate;

  // Shares estimation (approximately 1-3% of likes typically share)
  const youtube_shares_count = Math.floor(totalLikes * 0.02);

  // Watch time rate (growth simulation based on recency)
  const now = new Date();
  const avgDaysOld = videoStats.reduce((sum, v) => {
    const publishDate = new Date(v.publishedAt);
    const daysOld = (now - publishDate) / (1000 * 60 * 60 * 24);
    return sum + daysOld;
  }, 0) / videoStats.length;
  
  // More recent videos have higher growth rate
  const youtube_watch_time_rate = Math.max(0, 1 - (avgDaysOld / 365)); // Decreases over a year

  // Retention rate estimation (based on engagement metrics)
  const youtube_retention_rate = Math.min(
    (totalLikes + totalComments * 2) / Math.max(totalViews, 1),
    0.95
  );

  return {
    youtube_watch_time_avg,
    youtube_likes_count: totalLikes,
    youtube_comments_count: totalComments,
    youtube_shares_count,
    youtube_watch_time_rate,
    youtube_retention_rate,
    youtube_view_count: totalViews,
  };
};

/**
 * Main function to get YouTube analytics for project
 */
export const getYouTubeAnalytics = async (videoUrls) => {
  if (!videoUrls || videoUrls.length === 0) {
    throw new Error('No video URLs provided');
  }

  const { results, errors } = await fetchMultipleVideosStatistics(videoUrls);
  
  if (results.length === 0) {
    throw new Error('Failed to fetch any video statistics');
  }

  const metrics = calculateYouTubeMetrics(results);
  
  return {
    metrics,
    videoStats: results,
    errors,
    fetchedCount: results.length,
    totalUrls: videoUrls.length,
  };
};
