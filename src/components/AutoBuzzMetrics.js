/**
 * Auto Buzz Metrics Component
 * Displays automatically calculated buzz metrics with real-time updates
 * Includes Groq AI-powered analysis and insights
 */

import React, { useState, useEffect } from 'react';
import { useBuzzMetrics } from '../hooks/useBuzzMetrics';
import './AutoBuzzMetrics.css';

// Groq API integration for AI-powered insights
const GROQ_API_KEYS = process.env.REACT_APP_GROQ_API_KEYS?.split(',') || [];
let currentKeyIndex = 0;

const callGroq = async (prompt) => {
  if (GROQ_API_KEYS.length === 0) {
    throw new Error('Groq API keys not configured');
  }

  const apiKey = GROQ_API_KEYS[currentKeyIndex % GROQ_API_KEYS.length];
  currentKeyIndex++;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a South Indian film marketing expert analyzing buzz metrics. Provide concise, actionable insights and recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const AutoBuzzMetrics = ({ projectId, youtubeUrls, instagramHandle, filmName }) => {
  const {
    metrics,
    buzzScore,
    componentScores,
    loading,
    error,
    metadata,
    rawMetrics,
    refresh,
    saveSnapshot,
  } = useBuzzMetrics(projectId, {
    youtubeVideoUrls: youtubeUrls || [],
    instagramHandle: instagramHandle || '',
    filmName: filmName || '',
    autoFetch: false, // Changed to false - only fetch on button click
    autoSave: false,
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsError, setInsightsError] = useState(null);
  const [shouldGenerateInsights, setShouldGenerateInsights] = useState(false);

  // Generate AI insights after metrics are freshly loaded
  useEffect(() => {
    const generateAIInsights = async () => {
      if (!shouldGenerateInsights || loading || buzzScore === 0) {
        return;
      }

      // Reset flag
      setShouldGenerateInsights(false);
      
      try {
        const analysisPrompt = `
Analyze this South Indian film's buzz metrics:

Film: ${filmName || 'Untitled Film'}
Buzz Score: ${buzzScore.toFixed(1)}/100

Component Scores (Weighted Model):
- YouTube Score: ${componentScores?.youtube?.toFixed(1) || 0}/100 (60% weight)
- Google Trends Score: ${componentScores?.googleTrends?.toFixed(1) || 0}/100 (40% weight)

Detailed Metrics:
- Watch Time: ${(metrics.watch_time_norm * 100).toFixed(1)}%
- Share Rate: ${(metrics.share_rate_norm * 100).toFixed(1)}%
- Sentiment: ${(metrics.sentiment_score_norm * 100).toFixed(1)}%
- Search Growth: ${(metrics.search_growth_norm * 100).toFixed(1)}%
- Engagement: ${(metrics.engagement_rate_norm * 100).toFixed(1)}%

Raw Data:
- YouTube Views: ${rawMetrics?.youtube?.youtube_view_count?.toLocaleString() || 0}
- YouTube Likes: ${rawMetrics?.youtube?.youtube_likes_count?.toLocaleString() || 0}
- YouTube Comments: ${rawMetrics?.youtube?.youtube_comments_count?.toLocaleString() || 0}
- Google Trends Film Interest: ${rawMetrics?.googleTrends?.google_trends_search_spike_film || 0}/100
- Google Trends Growth: ${rawMetrics?.googleTrends?.google_trends_search_growth_rate?.toFixed(1) || 0}%

Provide:
1. Brief performance summary (2-3 sentences)
2. Top 3 strengths
3. Top 3 areas for improvement
4. 2-3 specific actionable recommendations for South Indian film marketing

Keep it concise and actionable.`;

        const insights = await callGroq(analysisPrompt);
        setAiInsights(insights);
      } catch (err) {
        console.error('Error getting AI insights:', err);
        setInsightsError('AI analysis unavailable. Metrics calculated successfully.');
      } finally {
        setAnalyzing(false);
      }
    };

    generateAIInsights();
  }, [shouldGenerateInsights, loading, buzzScore, filmName, componentScores, metrics, rawMetrics]);

  const handleAnalyzeBuzzScore = async () => {
    setAnalyzing(true);
    setInsightsError(null);
    setAiInsights(null); // Clear old insights
    
    try {
      // Fetch and calculate metrics
      await refresh();
      
      // Set flag to generate insights once data is loaded
      setShouldGenerateInsights(true);
      
    } catch (err) {
      setAnalyzing(false);
      setShouldGenerateInsights(false);
      setInsightsError(err.message);
    }
  };

  const handleSaveSnapshot = async () => {
    const result = await saveSnapshot();
    if (result.success) {
      alert('Buzz snapshot saved successfully!');
    } else {
      alert(`Failed to save snapshot: ${result.error || 'Unknown error'}`);
    }
  };

  const metricFields = [
    { 
      id: 'watch_time_norm', 
      label: 'Watch time (normalised 0–1)', 
      weight: '25%',
      description: 'Based on YouTube watch time and retention rate'
    },
    { 
      id: 'share_rate_norm', 
      label: 'Share rate (0–1)', 
      weight: '20%',
      description: 'Based on shares per 1000 views across platforms'
    },
    { 
      id: 'sentiment_score_norm', 
      label: 'Sentiment score (0–1)', 
      weight: '20%',
      description: 'Based on sentiment analysis of comments'
    },
    { 
      id: 'search_growth_norm', 
      label: 'Search growth (0–1)', 
      weight: '15%',
      description: 'Based on trending and growth indicators'
    },
    { 
      id: 'engagement_rate_norm', 
      label: 'Engagement rate (0–1)', 
      weight: '20%',
      description: 'Based on likes, comments, and shares'
    },
  ];

  return (
    <div className="auto-buzz-metrics">
      <div className="auto-buzz-header">
        <h3>Buzz Score Analysis</h3>
        <div className="auto-buzz-actions">
          <button 
            className="auto-buzz-analyze-btn" 
            onClick={handleAnalyzeBuzzScore}
            disabled={loading || analyzing || !youtubeUrls || youtubeUrls.length === 0}
          >
            {analyzing ? '🔄 Analyzing...' : loading ? '⟳ Calculating...' : '🤖 Analyze Buzz Score'}
          </button>
          <button 
            className="auto-buzz-save-btn" 
            onClick={handleSaveSnapshot}
            disabled={loading || analyzing || buzzScore === 0}
          >
            💾 Save Snapshot
          </button>
        </div>
      </div>

      {error && (
        <div className="auto-buzz-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {insightsError && !aiInsights && (
        <div className="auto-buzz-warning">
          <strong>Note:</strong> {insightsError}
        </div>
      )}

      <p className="auto-buzz-hint">
        Click "Analyze Buzz Score" to automatically fetch data from YouTube and Google Trends. 
        AI will provide insights and recommendations. Weighted model: YouTube (60%), Google Trends (40%).
        {metadata && metadata.youtubeVideosAnalyzed > 0 && (
          <> Last analysis included {metadata.youtubeVideosAnalyzed} YouTube video(s).</>
        )}
      </p>

      {/* Component Scores */}
      {componentScores && (componentScores.youtube > 0 || componentScores.googleTrends > 0) && (
        <div className="auto-buzz-components">
          <h4 style={{ fontSize: '0.95rem', marginBottom: 12, color: 'rgba(255,255,255,0.9)' }}>📈 Component Scores</h4>
          <div className="component-scores-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="component-score-card">
              <div className="component-icon">📺</div>
              <div className="component-label">YouTube (60%)</div>
              <div className="component-value" style={{ color: '#ff0000' }}>
                {componentScores.youtube.toFixed(1)}/100
              </div>
            </div>
            <div className="component-score-card">
              <div className="component-icon">📊</div>
              <div className="component-label">Google Trends (40%)</div>
              <div className="component-value" style={{ color: '#4285f4' }}>
                {componentScores.googleTrends.toFixed(1)}/100
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="auto-buzz-metrics-grid">
        {metricFields.map((field) => (
          <div key={field.id} className="auto-buzz-metric-card">
            <div className="auto-buzz-metric-header">
              <label className="auto-buzz-metric-label">
                {field.label}
              </label>
              <span className="auto-buzz-metric-weight">({field.weight})</span>
            </div>
            <div className={`auto-buzz-metric-value ${loading ? 'loading' : ''}`}>
              {loading ? '...' : (metrics[field.id] || 0).toFixed(2)}
            </div>
            <div className="auto-buzz-metric-description">
              {field.description}
            </div>
          </div>
        ))}
      </div>

      <div className="auto-buzz-score-preview">
        <strong>Current Buzz Score:</strong>
        <span className={`auto-buzz-score ${loading ? 'loading' : ''}`}>
          {loading ? '...' : buzzScore.toFixed(1)}
        </span>
        {buzzScore > 0 && (
          <span className="auto-buzz-score-rating">
            {buzzScore >= 75 ? '🔥 Excellent' : 
             buzzScore >= 50 ? '✨ Good' : 
             buzzScore >= 25 ? '📈 Fair' : '📊 Growing'}
          </span>
        )}
      </div>

      {/* AI Insights Section */}
      {aiInsights && (
        <div className="auto-buzz-ai-insights">
          <div className="ai-insights-header">
            <h4>🤖 AI-Powered Insights</h4>
            <span className="ai-insights-badge">Powered by Groq AI</span>
          </div>
          <div className="ai-insights-content">
            {aiInsights.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {analyzing && !aiInsights && (
        <div className="auto-buzz-analyzing">
          <div className="analyzing-spinner">🤖</div>
          <p>AI is analyzing your buzz metrics and generating insights...</p>
        </div>
      )}

      {metadata && (
        <div className="auto-buzz-metadata">
          <small>
            Last calculated: {new Date(metadata.calculatedAt).toLocaleString()}
            {metadata.hasSentimentData && ' • Sentiment data included'}
            {metadata.instagramMethod && ` • Instagram: ${metadata.instagramMethod.replace('_', ' ')}`}
          </small>
        </div>
      )}

      {youtubeUrls?.length === 0 && (
        <div className="auto-buzz-warning">
          ⚠️ No YouTube URLs configured. Configure video URLs above, then click "Analyze Buzz Score" to begin.
        </div>
      )}

      {!analyzing && !aiInsights && buzzScore === 0 && youtubeUrls?.length > 0 && (
        <div className="auto-buzz-info">
          💡 Ready to analyze! Click "Analyze Buzz Score" to fetch metrics and get AI-powered insights.
        </div>
      )}
    </div>
  );
};

export default AutoBuzzMetrics;
