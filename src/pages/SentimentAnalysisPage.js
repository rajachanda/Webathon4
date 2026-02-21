import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import Icon from '../components/Icon';
import { projectService } from '../services/api.service';
import { fetchCommentsFromMultipleVideos, extractVideoId } from '../services/youtube.service';
import { analyzeSentimentFromComments, saveSentimentAnalysis, getLatestSentimentAnalysis } from '../services/sentiment.service';
import './SentimentAnalysisPage.css';

const SentimentAnalysisPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState('');
  
  // Form state
  const [urls, setUrls] = useState(['', '', '']);
  const [urlErrors, setUrlErrors] = useState([]);
  
  // Results state
  const [analysis, setAnalysis] = useState(null);
  const [latestAnalysis, setLatestAnalysis] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [p, sentimentData] = await Promise.all([
          projectService.getProject(projectId),
          getLatestSentimentAnalysis(projectId)
        ]);
        setProject(p);
        setLatestAnalysis(sentimentData);
      } catch (e) {
        console.error(e);
        showToast('Error loading project data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handleUrlChange = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
    
    // Clear error for this field
    const newErrors = [...urlErrors];
    newErrors[index] = '';
    setUrlErrors(newErrors);
  };

  const addUrlField = () => {
    if (urls.length < 10) {
      setUrls([...urls, '']);
    }
  };

  const removeUrlField = (index) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
      setUrlErrors(urlErrors.filter((_, i) => i !== index));
    }
  };

  const validateUrls = () => {
    const errors = [];
    const validUrls = [];
    
    urls.forEach((url, index) => {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        errors[index] = '';
        return;
      }
      
      const videoId = extractVideoId(trimmedUrl);
      if (!videoId) {
        errors[index] = 'Invalid YouTube URL';
      } else {
        validUrls.push(trimmedUrl);
        errors[index] = '';
      }
    });
    
    setUrlErrors(errors);
    return { valid: errors.every(e => !e), validUrls };
  };

  const handleAnalyze = async () => {
    const { valid, validUrls } = validateUrls();
    
    if (validUrls.length === 0) {
      showToast('Please enter at least one valid YouTube URL');
      return;
    }
    
    if (!valid) {
      showToast('Please fix invalid URLs before analyzing');
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);
    
    try {
      showToast(`Fetching comments from ${validUrls.length} video(s)...`);
      
      // Fetch comments from all videos
      const { results, errors } = await fetchCommentsFromMultipleVideos(validUrls, 100);
      
      // Combine all comments
      const allComments = [];
      Object.values(results).forEach(result => {
        allComments.push(...result.comments);
      });
      
      if (allComments.length === 0) {
        throw new Error('No comments found in the provided videos. Comments might be disabled.');
      }
      
      if (errors.length > 0) {
        console.warn('Some videos had errors:', errors);
      }
      
      showToast(`Analyzing ${allComments.length} comments using AI...`);
      
      // Get project metadata
      const metadata = project?.project_metadata || {};
      
      // Perform sentiment analysis
      const sentimentResult = await analyzeSentimentFromComments(allComments, {
        title: project?.title,
        language: metadata.language,
        region_primary: metadata.region_primary,
        genre: metadata.genre
      });
      
      // Save to database
      const savedAnalysis = await saveSentimentAnalysis(
        projectId,
        sentimentResult,
        validUrls,
        allComments.length
      );
      
      setAnalysis(savedAnalysis);
      setLatestAnalysis(savedAnalysis);
      showToast('Sentiment analysis completed successfully!');
      
    } catch (error) {
      console.error('Analysis error:', error);
      showToast(error.message || 'Failed to analyze sentiment. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <ProjectLayout>
        <div className="loading-screen">
          <div className="loading-spinner" />
        </div>
      </ProjectLayout>
    );
  }

  const displayAnalysis = analysis || latestAnalysis;

  return (
    <ProjectLayout>
      {toast && <div className="toast">{toast}</div>}
      <div className="sentiment-page">
        <h1 className="page-title">Sentiment Analysis</h1>
        <p className="page-subtitle">
          Analyze audience sentiment from YouTube comments on your trailers, teasers, and interviews.
        </p>

        {/* URL Input Section */}
        <Card>
          <h3 className="section-title">YouTube Video URLs</h3>
          <p className="sentiment-hint">
            Enter YouTube URLs for trailers, teasers, interviews, or any promotional content related to your film.
          </p>
          
          <div className="url-inputs">
            {urls.map((url, index) => (
              <div key={index} className="url-input-row">
                <div className="url-input-group">
                  <input
                    type="text"
                    className={`url-input ${urlErrors[index] ? 'url-input--error' : ''}`}
                    placeholder={`YouTube URL ${index + 1} (trailer, teaser, interview, etc.)`}
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    disabled={analyzing}
                  />
                  {urlErrors[index] && (
                    <span className="url-error">{urlErrors[index]}</span>
                  )}
                </div>
                {urls.length > 1 && (
                  <button
                    className="btn-remove-url"
                    onClick={() => removeUrlField(index)}
                    disabled={analyzing}
                    title="Remove URL"
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {urls.length < 10 && (
            <button
              className="btn-ghost"
              onClick={addUrlField}
              disabled={analyzing}
              style={{ marginTop: 12 }}
            >
              + Add Another URL
            </button>
          )}

          <button
            className="btn-primary-green"
            onClick={handleAnalyze}
            disabled={analyzing}
            style={{ marginTop: 20 }}
          >
            {analyzing ? 'Analyzing Comments...' : <><Icon name="sparkles" size={14} /> Analyze Sentiment</>}
          </button>

          {analyzing && (
            <div className="analyzing-progress">
              <div className="progress-spinner" />
              <p>Fetching YouTube comments and analyzing sentiment with AI...</p>
              <p className="progress-note">This may take 30-60 seconds depending on comment volume.</p>
            </div>
          )}
        </Card>

        {/* Results Section */}
        {displayAnalysis && (
          <>
            {/* Sentiment Overview */}
            <div className="sentiment-overview">
              <Card className="sentiment-card">
                <h4 className="sentiment-label">POSITIVE</h4>
                <div className="sentiment-percentage positive">
                  {displayAnalysis.positive_sentiment}%
                </div>
              </Card>
              <Card className="sentiment-card">
                <h4 className="sentiment-label">NEUTRAL</h4>
                <div className="sentiment-percentage neutral">
                  {displayAnalysis.neutral_sentiment}%
                </div>
              </Card>
              <Card className="sentiment-card">
                <h4 className="sentiment-label">NEGATIVE</h4>
                <div className="sentiment-percentage negative">
                  {displayAnalysis.negative_sentiment}%
                </div>
              </Card>
            </div>

            {/* Summary Opinion */}
            <Card>
              <h3 className="section-title">Summary Opinion</h3>
              <p className="sentiment-summary">{displayAnalysis.summary_opinion}</p>
              <div className="analysis-meta">
                <span><Icon name="chart" size={14} /> {displayAnalysis.total_comments_analyzed} comments analyzed</span>
                <span>•</span>
                <span><Icon name="tv" size={14} /> {displayAnalysis.video_sources?.length || 0} video(s)</span>
                <span>•</span>
                <span><Icon name="calendar" size={14} /> {new Date(displayAnalysis.analyzed_at).toLocaleDateString()}</span>
              </div>
            </Card>

            {/* Key Positive Aspects */}
            <Card>
              <h3 className="section-title">Key Positive Aspects</h3>
              <div className="positive-aspects">
                <div className="aspect-item positive-aspect">
                  <span className="aspect-icon"><Icon name="thumbsUp" size={16} /></span>
                  <span className="aspect-text">{displayAnalysis.key_positive_1}</span>
                </div>
                <div className="aspect-item positive-aspect">
                  <span className="aspect-icon"><Icon name="thumbsUp" size={16} /></span>
                  <span className="aspect-text">{displayAnalysis.key_positive_2}</span>
                </div>
                <div className="aspect-item positive-aspect">
                  <span className="aspect-icon"><Icon name="thumbsUp" size={16} /></span>
                  <span className="aspect-text">{displayAnalysis.key_positive_3}</span>
                </div>
              </div>
            </Card>

            {/* Audience Concerns & Action Strategies */}
            <Card>
              <h3 className="section-title">Audience Concerns & Recommended Actions</h3>
              
              {[1, 2, 3].map(num => (
                <div key={num} className="concern-block">
                  <div className="concern-header">
                    <span className="concern-label">Concern {num}</span>
                    <h4 className="concern-title">{displayAnalysis[`concern_factor_${num}`]}</h4>
                  </div>
                  <div className="concern-content">
                    <div className="concern-problem">
                      <strong>Problem:</strong> {displayAnalysis[`concern_problem_${num}`]}
                    </div>
                    <div className="concern-strategy">
                      <strong>Recommended Action:</strong> {displayAnalysis[`action_strategy_${num}`]}
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            {/* Report Footer */}
            <div className="report-footer">
              <p className="report-timestamp">
                Report Generated: {new Date(displayAnalysis.analyzed_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </>
        )}
      </div>
    </ProjectLayout>
  );
};

export default SentimentAnalysisPage;
