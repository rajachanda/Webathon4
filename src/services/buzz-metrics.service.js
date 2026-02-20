/**
 * Buzz Metrics Calculation Service
 * Orchestrates data collection from YouTube and Google Trends
 * Calculates weighted buzz score:
 * - YouTube: 60%
 * - Google Trends: 40%
 * 
 * Instagram removed due to API authentication requirements
 */

import { getYouTubeAnalytics } from './youtube-analytics.service';
import { getInterestOverTime, calculateGoogleTrendsScore } from './google-trends.service';
import { supabase } from '../supabaseClient';

/**
 * Normalize a value to 0-1 range using min-max normalization
 */
const normalize = (value, min, max) => {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

/**
 * Normalize with logarithmic scale (good for counts that vary widely)
 */
const normalizeLog = (value, maxExpected) => {
  if (value <= 0) return 0;
  const logValue = Math.log10(value + 1);
  const logMax = Math.log10(maxExpected + 1);
  return Math.min(1, logValue / logMax);
};

/**
 * Get latest sentiment analysis for a project
 */
const getSentimentAnalysis = async (projectId) => {
  try {
    const { data, error } = await supabase
      .from('film_sentiment_analysis')
      .select('*')
      .eq('project_id', projectId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.warn('Failed to fetch sentiment analysis:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Error fetching sentiment:', error);
    return null;
  }
};

/**
 * Calculate YouTube component score (0-100)
 * Based on notebook model: likes (40%), comments (30%), sentiment (30%)
 */
const calculateYouTubeScore = (youtubeMetrics, sentimentScore) => {
  // Scale likes (max expected: 1,000,000 for viral content)
  const likesScaled = Math.min(youtubeMetrics.youtube_likes_count / 1000000, 1) * 100;
  
  // Scale comments (max expected: 50,000 for highly engaged content)
  const commentsScaled = Math.min(youtubeMetrics.youtube_comments_count / 50000, 1) * 100;
  
  // Scale sentiment from -1 to 1 → 0 to 100
  const sentimentScaled = (sentimentScore + 1) * 50;
  
  // Weighted combination: 40% likes, 30% comments, 30% sentiment
  const score = (likesScaled * 0.4) + (commentsScaled * 0.3) + (sentimentScaled * 0.3);
  
  return Math.min(100, Math.max(0, score));
};



/**
 * Main function to calculate buzz score using weighted model
 * Matches the Jupyter notebook approach
 */
export const calculateBuzzMetrics = async (projectId, options = {}) => {
  const {
    youtubeVideoUrls = [],
    instagramHandle = null,
    filmName = '',
  } = options;

  try {
    // Step 1: Fetch YouTube Analytics
    let youtubeMetrics = {
      youtube_watch_time_avg: 0,
      youtube_likes_count: 0,
      youtube_comments_count: 0,
      youtube_shares_count: 0,
      youtube_watch_time_rate: 0,
      youtube_retention_rate: 0,
      youtube_view_count: 0,
      youtube_sentiment_score: 0,
    };

    if (youtubeVideoUrls && youtubeVideoUrls.length > 0) {
      const youtubeData = await getYouTubeAnalytics(youtubeVideoUrls);
      youtubeMetrics = { ...youtubeMetrics, ...youtubeData.metrics };
    }

    // Step 2: Fetch Google Trends Data
    const googleTrendsData = filmName 
      ? await getInterestOverTime(filmName)
      : {
          google_trends_search_spike_film: 50,
          google_trends_search_spike_actors: 30,
          google_trends_search_spike_genre: 20,
          google_trends_search_growth_rate: 5,
        };

    // Step 3: Fetch Sentiment Analysis
    const sentimentData = await getSentimentAnalysis(projectId);
    
    // Extract sentiment score
    let youtubeSentimentScore = 0;
    if (sentimentData && sentimentData.overall_sentiment_score !== undefined) {
      const score = sentimentData.overall_sentiment_score;
      if (score >= -1 && score <= 1) {
        youtubeSentimentScore = score;
      } else if (score >= 0 && score <= 100) {
        youtubeSentimentScore = (score / 50) - 1;
      }
    }
    youtubeMetrics.youtube_sentiment_score = youtubeSentimentScore;

    // Step 4: Calculate component scores (0-100 each)
    const youtubeScore = calculateYouTubeScore(youtubeMetrics, youtubeSentimentScore);
    const googleTrendsScore = calculateGoogleTrendsScore(googleTrendsData);

    // Step 5: Calculate final weighted buzz score
    // YouTube: 60%, Google Trends: 40%
    const buzzScore = (
      youtubeScore * 0.60 +
      googleTrendsScore * 0.40
    );

    // Step 6: Calculate normalized metrics
    // Engagement rate: (likes + comments) / views
    // Typical YouTube engagement: 2-5% is good, 5-10% is excellent, 10%+ is viral
    const rawEngagementRate = (youtubeMetrics.youtube_likes_count + youtubeMetrics.youtube_comments_count) / 
      Math.max(youtubeMetrics.youtube_view_count, 1);
    
    // Scale engagement: 0-10% engagement maps to 0-1 normalized
    const engagementScaled = Math.min(rawEngagementRate * 10, 1);
    
    // Watch time: Use retention rate (already estimated in YouTube service based on engagement)
    // youtube_retention_rate is calculated as: 40% base + (engagement * 4), capped at 85%
    const watchTimeScaled = Math.min(youtubeMetrics.youtube_retention_rate || 0, 1);
    
    const normalizedMetrics = {
      watch_time_norm: watchTimeScaled,
      share_rate_norm: Math.min(youtubeMetrics.youtube_shares_count / 10000, 1),
      sentiment_score_norm: (youtubeSentimentScore + 1) / 2,
      search_growth_norm: Math.min(Math.max((googleTrendsData.google_trends_search_growth_rate + 10) / 60, 0), 1),
      engagement_rate_norm: engagementScaled,
    };

    return {
      success: true,
      buzzScore: Math.round(buzzScore * 100) / 100,
      componentScores: {
        youtube: Math.round(youtubeScore * 100) / 100,
        googleTrends: Math.round(googleTrendsScore * 100) / 100,
      },
      normalizedMetrics: {
        watch_time_norm: parseFloat(normalizedMetrics.watch_time_norm.toFixed(2)),
        share_rate_norm: parseFloat(normalizedMetrics.share_rate_norm.toFixed(2)),
        sentiment_score_norm: parseFloat(normalizedMetrics.sentiment_score_norm.toFixed(2)),
        search_growth_norm: parseFloat(normalizedMetrics.search_growth_norm.toFixed(2)),
        engagement_rate_norm: parseFloat(normalizedMetrics.engagement_rate_norm.toFixed(2)),
      },
      rawMetrics: {
        youtube: youtubeMetrics,
        googleTrends: googleTrendsData,
        sentiment: sentimentData,
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        projectId,
        youtubeVideosAnalyzed: youtubeVideoUrls.length,
        hasSentimentData: !!sentimentData,
        model: 'youtube-60-googletrends-40',
      },
    };
  } catch (error) {
    console.error('❌ Error calculating buzz metrics:', error);
    return {
      success: false,
      error: error.message,
      buzzScore: 0,
      componentScores: {
        youtube: 0,
        googleTrends: 0,
      },
      normalizedMetrics: {
        watch_time_norm: 0,
        share_rate_norm: 0,
        sentiment_score_norm: 0,
        search_growth_norm: 0,
        engagement_rate_norm: 0,
      },
    };
  }
};

/**
 * Save buzz metrics snapshot to database
 */
export const saveBuzzSnapshot = async (projectId, metricsData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const snapshot = {
      project_id: projectId,
      user_id: user.id,
      watch_time_norm: metricsData.normalizedMetrics.watch_time_norm,
      share_rate_norm: metricsData.normalizedMetrics.share_rate_norm,
      sentiment_score_norm: metricsData.normalizedMetrics.sentiment_score_norm,
      search_growth_norm: metricsData.normalizedMetrics.search_growth_norm,
      engagement_rate_norm: metricsData.normalizedMetrics.engagement_rate_norm,
      buzz_score: metricsData.buzzScore,
      metadata: metricsData.metadata,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('buzz_snapshots')
      .insert([snapshot])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error saving buzz snapshot:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get buzz metrics history for a project
 */
export const getBuzzHistory = async (projectId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('buzz_snapshots')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching buzz history:', error);
    return { success: false, error: error.message, data: [] };
  }
};
