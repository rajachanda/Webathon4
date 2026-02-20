/**
 * Instagram Analytics Service
 * Attempts to fetch Instagram metrics with fallback to estimation
 * 
 * Note: Instagram Graph API requires business accounts and complex authentication.
 * This service provides multiple approaches:
 * 1. Public scraping endpoints (if available)
 * 2. Correlation-based estimation from YouTube data
 * 3. User-provided Instagram handles for future integration
 */

/**
 * Extract Instagram username from URL or handle
 */
export const extractInstagramHandle = (input) => {
  if (!input) return null;
  
  // If it's a URL, extract username
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/;
  const match = input.match(urlPattern);
  if (match) return match[1];
  
  // Otherwise assume it's already a handle
  return input.replace('@', '');
};

/**
 * Attempt to fetch public Instagram data via web endpoints
 * Note: Instagram frequently changes these endpoints, may not work reliably
 */
const tryFetchPublicInstagramData = async (username) => {
  try {
    // Attempt to use Instagram's public JSON endpoint
    // Note: This endpoint may be blocked or require authentication
    const response = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error('Instagram endpoint not accessible');
    }

    const data = await response.json();
    
    if (data?.graphql?.user) {
      const user = data.graphql.user;
      return {
        success: true,
        followers: user.edge_followed_by?.count || 0,
        following: user.edge_follow?.count || 0,
        posts: user.edge_owner_to_timeline_media?.count || 0,
        engagement_rate: calculateEngagementFromProfile(user),
      };
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.warn('Instagram public endpoint failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate engagement rate from Instagram profile data
 */
const calculateEngagementFromProfile = (userProfile) => {
  const posts = userProfile.edge_owner_to_timeline_media?.edges || [];
  if (posts.length === 0) return 0;

  const totalEngagement = posts.reduce((sum, post) => {
    const likes = post.node.edge_liked_by?.count || 0;
    const comments = post.node.edge_media_to_comment?.count || 0;
    return sum + likes + comments;
  }, 0);

  const followers = userProfile.edge_followed_by?.count || 1;
  return (totalEngagement / posts.length) / followers;
};

/**
 * Estimate Instagram metrics based on YouTube correlation
 * Industry research shows correlation between YouTube and Instagram engagement
 */
const estimateFromYouTubeData = (youtubeMetrics) => {
  if (!youtubeMetrics) {
    return getDefaultInstagramMetrics();
  }

  // Typical YouTube-to-Instagram follower ratio: 1:0.3 to 1:0.8
  const instagramFollowerRatio = 0.5;
  
  // Instagram typically has 2-3x higher engagement rate than YouTube
  const engagementMultiplier = 2.5;
  
  const estimatedFollowers = Math.floor(
    (youtubeMetrics.youtube_view_count || 0) * instagramFollowerRatio
  );
  
  const baseEngagement = (
    (youtubeMetrics.youtube_likes_count || 0) + 
    (youtubeMetrics.youtube_comments_count || 0)
  );
  
  const instagram_total_likes = Math.floor(baseEngagement * engagementMultiplier * 0.7);
  const instagram_total_comments = Math.floor(baseEngagement * engagementMultiplier * 0.2);
  const instagram_total_shares = Math.floor(baseEngagement * engagementMultiplier * 0.1);

  // Engagement growth rate based on YouTube watch time rate
  const instagram_engagement_growth_rate = youtubeMetrics.youtube_watch_time_rate || 0.5;

  // Hashtag usage estimation (typically 5-30 per post)
  const instagram_hashtag_usage_count = Math.floor(15 + Math.random() * 15);

  // Sentiment correlation with YouTube (slightly more positive on Instagram)
  const instagram_audience_reactions_sentiment = Math.min(
    (youtubeMetrics.youtube_sentiment_score || 0.5) * 1.1,
    1.0
  );

  return {
    instagram_total_likes,
    instagram_total_comments,
    instagram_total_shares,
    instagram_engagement_growth_rate,
    instagram_hashtag_usage_count,
    instagram_audience_reactions_sentiment,
    estimated: true,
    estimatedFollowers,
  };
};

/**
 * Get default Instagram metrics (when no data available)
 */
const getDefaultInstagramMetrics = () => {
  return {
    instagram_total_likes: 0,
    instagram_total_comments: 0,
    instagram_total_shares: 0,
    instagram_engagement_growth_rate: 0,
    instagram_hashtag_usage_count: 0,
    instagram_audience_reactions_sentiment: 0.5,
    estimated: true,
  };
};

/**
 * Try to fetch Instagram data from Google search (simulation)
 * This would require SerpAPI or similar service
 */
const tryGoogleSearchApproach = async (filmName, instagramHandle) => {
  // Placeholder for future implementation with SerpAPI
  // const query = `${filmName} instagram ${instagramHandle} engagement`;
  // Would fetch Instagram stats from Google search results
  
  console.warn('Google search approach not implemented - using estimation');
  return null;
};

/**
 * Main function to get Instagram analytics
 */
export const getInstagramAnalytics = async (options = {}) => {
  const {
    instagramHandle,
    filmName,
    youtubeMetrics,
    tryPublicEndpoint = true,
  } = options;

  // Approach 1: Try Instagram username if provided
  if (instagramHandle && tryPublicEndpoint) {
    const handle = extractInstagramHandle(instagramHandle);
    if (handle) {
      const publicData = await tryFetchPublicInstagramData(handle);
      if (publicData.success) {
        return {
          method: 'public_endpoint',
          handle,
          ...convertPublicDataToMetrics(publicData),
        };
      }
    }
  }

  // Approach 2: Try Google search approach
  if (filmName && instagramHandle) {
    const googleData = await tryGoogleSearchApproach(filmName, instagramHandle);
    if (googleData) {
      return {
        method: 'google_search',
        ...googleData,
      };
    }
  }

  // Approach 3: Estimate from YouTube data
  if (youtubeMetrics) {
    return {
      method: 'youtube_correlation',
      ...estimateFromYouTubeData(youtubeMetrics),
    };
  }

  // Fallback: Return defaults
  return {
    method: 'default',
    ...getDefaultInstagramMetrics(),
  };
};

/**
 * Convert public endpoint data to our metrics format
 */
const convertPublicDataToMetrics = (publicData) => {
  const avgLikesPerPost = publicData.followers * publicData.engagement_rate * 0.7;
  const avgCommentsPerPost = publicData.followers * publicData.engagement_rate * 0.2;
  const avgSharesPerPost = publicData.followers * publicData.engagement_rate * 0.1;

  return {
    instagram_total_likes: Math.floor(avgLikesPerPost * publicData.posts),
    instagram_total_comments: Math.floor(avgCommentsPerPost * publicData.posts),
    instagram_total_shares: Math.floor(avgSharesPerPost * publicData.posts),
    instagram_engagement_growth_rate: publicData.engagement_rate,
    instagram_hashtag_usage_count: 20, // Default
    instagram_audience_reactions_sentiment: 0.65, // Default positive
    estimated: false,
    followers: publicData.followers,
    posts: publicData.posts,
  };
};

/**
 * Calculate Instagram metrics from manual input or stored data
 */
export const calculateInstagramMetrics = (instagramData) => {
  if (!instagramData) {
    return getDefaultInstagramMetrics();
  }

  return {
    instagram_total_likes: instagramData.instagram_total_likes || 0,
    instagram_total_comments: instagramData.instagram_total_comments || 0,
    instagram_total_shares: instagramData.instagram_total_shares || 0,
    instagram_engagement_growth_rate: instagramData.instagram_engagement_growth_rate || 0,
    instagram_hashtag_usage_count: instagramData.instagram_hashtag_usage_count || 0,
    instagram_audience_reactions_sentiment: instagramData.instagram_audience_reactions_sentiment || 0.5,
  };
};
