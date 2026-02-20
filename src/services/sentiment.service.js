/**
 * Sentiment Analysis service using Groq API (free)
 * Analyzes YouTube comments and generates comprehensive film sentiment reports
 */

import { supabase } from '../supabaseClient';

// Use Groq API keys from environment (FREE - get from https://console.groq.com)
const GROQ_KEYS = process.env.REACT_APP_GROQ_API_KEYS 
  ? process.env.REACT_APP_GROQ_API_KEYS.split(',').map(k => k.trim())
  : [];

const MODEL = 'llama-3.3-70b-versatile';
const BASE = 'https://api.groq.com/openai/v1/chat/completions';

let keyIndex = 0;

async function callGroq(prompt, retries = 0) {
  const key = GROQ_KEYS[keyIndex % GROQ_KEYS.length];
  
  if (!key) {
    throw new Error('No Groq API keys configured. Get free key from https://console.groq.com and add to .env as REACT_APP_GROQ_API_KEYS');
  }

  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key.trim()}`
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: MODEL,
      temperature: 0.5,
      max_tokens: 2048
    }),
  });

  if (res.status === 429 || res.status === 503) {
    keyIndex = (keyIndex + 1) % GROQ_KEYS.length;
    if (retries < GROQ_KEYS.length) {
      return callGroq(prompt, retries + 1);
    }
    throw new Error('All Groq API keys are rate-limited. Please try again shortly.');
  }

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Groq API Error:', res.status, errorText);
    try {
      const err = JSON.parse(errorText);
      throw new Error(err?.error?.message || err?.message || `Groq API error ${res.status}`);
    } catch {
      throw new Error(`Groq API error ${res.status}: ${errorText}`);
    }
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return text.trim();
}

function parseJSON(raw) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1].trim() : raw.trim();
  return JSON.parse(jsonStr);
}

/**
 * Analyze sentiment from YouTube comments
 * @param {Array} comments - Array of comment objects with text, author, likes
 * @param {Object} projectMetadata - Film project metadata
 * @returns {Promise<Object>} Sentiment analysis report
 */
export async function analyzeSentimentFromComments(comments, projectMetadata = {}) {
  if (!comments || comments.length === 0) {
    throw new Error('No comments provided for analysis');
  }

  // Take only top 20 comments by likes to reduce token usage
  const topComments = comments
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 20);

  // Format comments for analysis (shorter format)
  const commentTexts = topComments.map((c, i) => 
    `${i + 1}. (${c.likes} likes): ${c.text.slice(0, 200)}`
  ).join('\n');

  const prompt = `
Analyze sentiment of YouTube comments for South Indian film: ${projectMetadata.title || 'Film'}

COMMENTS (${topComments.length}):
${commentTexts}

Return ONLY this JSON structure:
{
  "positive_sentiment": 55,
  "neutral_sentiment": 25,
  "negative_sentiment": 20,
  "summary_opinion": "Brief overall sentiment summary",
  "key_positive_1": "Most liked aspect",
  "key_positive_2": "Second positive",
  "key_positive_3": "Third positive",
  "concern_factor_1": "First Concern",
  "concern_problem_1": "Problem description",
  "action_strategy_1": "Action to fix",
  "concern_factor_2": "Second Concern",
  "concern_problem_2": "Problem description",
  "action_strategy_2": "Action to fix",
  "concern_factor_3": "Third Concern",
  "concern_problem_3": "Problem description",
  "action_strategy_3": "Action to fix"
}

Note: Percentages must total 100.
`;

  const raw = await callGroq(prompt);
  let parsed;
  
  try {
    parsed = parseJSON(raw);
  } catch (error) {
    console.error('Failed to parse Gemini response:', raw);
    throw new Error('Failed to parse sentiment analysis response');
  }

  // Validate percentages
  const total = (parsed.positive_sentiment || 0) + (parsed.neutral_sentiment || 0) + (parsed.negative_sentiment || 0);
  if (Math.abs(total - 100) > 5) {
    const factor = 100 / total;
    parsed.positive_sentiment = Math.round(parsed.positive_sentiment * factor);
    parsed.neutral_sentiment = Math.round(parsed.neutral_sentiment * factor);
    parsed.negative_sentiment = 100 - parsed.positive_sentiment - parsed.neutral_sentiment;
  }

  return parsed;
}

/**
 * Save sentiment analysis to Supabase
 * @param {string} projectId - Project ID
 * @param {Object} analysisData - Sentiment analysis results
 * @param {Array} videoSources - Array of video URLs analyzed
 * @param {number} totalComments - Total comments analyzed
 * @returns {Promise<Object>} Saved record
 */
export async function saveSentimentAnalysis(projectId, analysisData, videoSources, totalComments) {
  const { data, error } = await supabase
    .from('film_sentiment_analysis')
    .insert({
      project_id: projectId,
      positive_sentiment: analysisData.positive_sentiment,
      neutral_sentiment: analysisData.neutral_sentiment,
      negative_sentiment: analysisData.negative_sentiment,
      summary_opinion: analysisData.summary_opinion,
      key_positive_1: analysisData.key_positive_1,
      key_positive_2: analysisData.key_positive_2,
      key_positive_3: analysisData.key_positive_3,
      concern_factor_1: analysisData.concern_factor_1,
      concern_problem_1: analysisData.concern_problem_1,
      action_strategy_1: analysisData.action_strategy_1,
      concern_factor_2: analysisData.concern_factor_2,
      concern_problem_2: analysisData.concern_problem_2,
      action_strategy_2: analysisData.action_strategy_2,
      concern_factor_3: analysisData.concern_factor_3,
      concern_problem_3: analysisData.concern_problem_3,
      action_strategy_3: analysisData.action_strategy_3,
      video_sources: videoSources,
      total_comments_analyzed: totalComments,
      analyzed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get latest sentiment analysis for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Latest sentiment analysis
 */
export async function getLatestSentimentAnalysis(projectId) {
  const { data, error } = await supabase
    .from('film_sentiment_analysis')
    .select('*')
    .eq('project_id', projectId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get all sentiment analyses for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} All sentiment analyses
 */
export async function getAllSentimentAnalyses(projectId) {
  const { data, error } = await supabase
    .from('film_sentiment_analysis')
    .select('*')
    .eq('project_id', projectId)
    .order('analyzed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get simplified sentiment summary for Campaign/Release pages
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Simplified sentiment summary
 */
export async function getSentimentSummary(projectId) {
  try {
    const analysis = await getLatestSentimentAnalysis(projectId);
    
    if (!analysis) {
      return null;
    }

    return {
      positivePercent: analysis.positive_sentiment,
      neutralPercent: analysis.neutral_sentiment,
      negativePercent: analysis.negative_sentiment,
      keyPositives: [
        analysis.key_positive_1,
        analysis.key_positive_2,
        analysis.key_positive_3,
      ].filter(Boolean),
      keyConcerns: [
        {
          factor: analysis.concern_factor_1,
          problem: analysis.concern_problem_1,
          recommendedAction: analysis.action_strategy_1,
        },
        {
          factor: analysis.concern_factor_2,
          problem: analysis.concern_problem_2,
          recommendedAction: analysis.action_strategy_2,
        },
        {
          factor: analysis.concern_factor_3,
          problem: analysis.concern_problem_3,
          recommendedAction: analysis.action_strategy_3,
        },
      ].filter(c => c.factor && c.problem),
      totalComments: analysis.total_comments_analyzed,
      analyzedAt: analysis.analyzed_at,
      videoSources: analysis.video_sources || [],
    };
  } catch (error) {
    console.error('Error fetching sentiment summary:', error);
    return null;
  }
}
