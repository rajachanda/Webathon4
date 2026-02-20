# Sentiment Analysis Feature - Setup Guide

## 🎬 Overview

The Sentiment Analysis feature allows you to analyze audience sentiment from YouTube comments on your film's promotional content (trailers, teasers, interviews). It uses AI to provide insights into what audiences love, their concerns, and recommended actions.

## 📋 Prerequisites

1. **YouTube API Key** - Already configured in your `.env` file
2. **Gemini API Keys** - Already configured for AI analysis
3. **Supabase Database** - Need to create the sentiment analysis table

## 🚀 Setup Instructions

### Step 1: Create Supabase Table

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **rvzdceoagbtmyodcfvwp**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the `sentiment-analysis-setup.sql` file
6. Copy the entire SQL script
7. Paste it into the SQL Editor
8. Click **Run** button
9. Wait for success message

### Step 2: Verify Installation

1. Go to **Table Editor** in Supabase Dashboard
2. You should see `film_sentiment_analysis` table
3. Verify the table has these columns:
   - id, project_id
   - positive_sentiment, neutral_sentiment, negative_sentiment
   - summary_opinion
   - key_positive_1, key_positive_2, key_positive_3
   - concern_factor_1, concern_problem_1, action_strategy_1
   - concern_factor_2, concern_problem_2, action_strategy_2
   - concern_factor_3, concern_problem_3, action_strategy_3
   - video_sources, total_comments_analyzed
   - analyzed_at, created_at, updated_at

### Step 3: Test the Feature

1. Start your React app: `npm start`
2. Navigate to any project
3. Go to the **Campaign** page
4. Click the **"📊 Sentiment Analysis"** button
5. Enter YouTube URLs (trailers, teasers, interviews)
6. Click **"✦ Analyze Sentiment"**
7. Wait 30-60 seconds for analysis to complete

## 📊 How It Works

### 1. YouTube Comment Extraction
- Extracts up to 100 comments per video
- Fetches most relevant comments (sorted by relevance)
- Supports multiple video URLs simultaneously
- Validates YouTube URLs automatically

### 2. AI Sentiment Analysis
- Uses Gemini AI (same as your existing features)
- Analyzes all comments collectively
- Generates sentiment percentages (positive/neutral/negative)
- Identifies key positive aspects
- Detects audience concerns
- Provides actionable recommendations

### 3. Report Generation
The analysis report includes:
- **Sentiment Overview**: Percentage breakdown
- **Summary Opinion**: Overall audience sentiment
- **Key Positive Aspects**: What audiences love (3 items)
- **Audience Concerns**: Issues or risks identified (3 items)
- **Recommended Actions**: Strategies to address concerns (3 items)

## 🎯 Usage Tips

### Best Videos to Analyze
- ✅ Official trailers (theatrical, teaser)
- ✅ Character introductions
- ✅ Behind-the-scenes content
- ✅ Cast/director interviews
- ✅ Song teasers
- ❌ Avoid unofficial clips or fan videos

### Optimal Comment Volume
- Minimum: 50 comments total
- Recommended: 200-500 comments
- Uses up to 100 comments per video

### When to Run Analysis
- After releasing a new trailer
- Before major marketing decisions
- Weekly during promotional campaign
- After buzz score drops

## 🔧 Technical Details

### New Files Created
1. `src/services/youtube.service.js` - YouTube API integration
2. `src/services/sentiment.service.js` - Sentiment analysis with Gemini AI
3. `src/pages/SentimentAnalysisPage.js` - Main sentiment analysis page
4. `src/pages/SentimentAnalysisPage.css` - Styling
5. `sentiment-analysis-setup.sql` - Database schema

### Modified Files
1. `src/App.js` - Added sentiment route
2. `src/pages/CampaignPage.js` - Added sentiment button
3. `src/components/ProjectLayout.js` - Added sidebar link
4. `src/config/api.js` - Added table reference

### API Usage
- **YouTube Data API v3**: Comment extraction
- **Gemini AI (gemini-1.5-flash)**: Sentiment analysis
- **Automatic key rotation**: Prevents quota issues

## 🛠️ Troubleshooting

### YouTube API Errors

**"YouTube API quota exceeded"**
- YouTube API has daily quota limits
- Wait 24 hours or upgrade your Google Cloud quota

**"Comments are disabled"**
- Some videos have comments disabled
- Use different video URLs

**"Invalid YouTube URL"**
- Ensure URL is from youtube.com or youtu.be
- Supported formats:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`

### AI Analysis Errors

**"All Gemini API keys are rate-limited"**
- Multiple API keys are used with auto-rotation
- Wait a few minutes and try again
- Consider adding more API keys in `.env`

**"No comments found"**
- Video might have comments disabled
- Check if video exists and is public
- Try videos with more engagement

## 📈 Interpreting Results

### Sentiment Percentages
- **High Positive (70%+)**: Strong audience excitement
- **Balanced (40-60% positive)**: Mixed reactions, monitor closely
- **High Negative (40%+)**: Address concerns urgently

### Action Priority
1. **High priority**: Concerns with negative sentiment >30%
2. **Medium priority**: Mixed feedback areas
3. **Low priority**: Minor improvements

### Using Insights
- Adjust marketing messaging based on positive aspects
- Address concerns in next promotional content
- Use positive quotes in campaigns
- Monitor sentiment trends over time

## 🔒 Security & Privacy

- YouTube comments are public data
- No user authentication required for fetching
- Analysis stored securely in Supabase
- RLS policies ensure data privacy
- API keys protected in environment variables

## 📞 Support

If you encounter issues:
1. Check Supabase logs
2. Review browser console errors
3. Verify YouTube API key is valid
4. Ensure videos have public comments enabled
5. Check network connectivity

## 🎯 Future Enhancements

Potential improvements:
- Export reports to PDF
- Historical sentiment tracking
- Competitor analysis
- Automated alerts for negative trends
- Integration with social media APIs (Twitter, Instagram)
- Sentiment comparison across multiple films

---

**Made for CinYstore** - Paora Filmy hai Boss.. 🎬
