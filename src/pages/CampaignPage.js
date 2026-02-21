import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import TagChip from '../components/TagChip';
import Icon from '../components/Icon';
import { projectService } from '../services/api.service';
import { getSentimentSummary } from '../services/sentiment.service';
import { getInfluencerRecommendations } from '../services/influencer.service';
import { 
  getVerdictColor,
  getVerdictLabel,
  getScoreInterpretation
} from '../services/poster.service';
import { getClusterLabel, getClusterColor } from '../utils/clusterMapping';
import './CampaignPage.css';

const CampaignPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [blueprint, setBlueprint] = useState(null);
  const [persona, setPersona] = useState(null);
  const [project, setProject] = useState(null);
  const [latestBuzz, setLatestBuzz] = useState(null);
  const [buzzTrend, setBuzzTrend] = useState('flat');
  const [releaseWindow, setReleaseWindow] = useState(null);
  const [sentimentSummary, setSentimentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [toast, setToast] = useState('');
  const [checklist, setChecklist] = useState({});
  
  // Poster analysis state
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // Influencer recommendations state
  const [influencers, setInfluencers] = useState([]);
  const [loadingInfluencers, setLoadingInfluencers] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    const load = async () => {
      try {
        const [bp, p, proj, snaps, sentiment, windows] = await Promise.all([
          projectService.getCampaignBlueprint(projectId),
          projectService.getProjectPersona(projectId),
          projectService.getProject(projectId),
          projectService.getBuzzSnapshots(projectId),
          getSentimentSummary(projectId),
          projectService.getReleaseWindows(projectId).catch(() => []),
        ]);
        setBlueprint(bp);
        setPersona(p);
        setProject(proj);
        
        // Process buzz data and calculate trend
        const sorted = (snaps || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const latest = sorted[0] || null;
        const previous = sorted[1] || null;
        setLatestBuzz(latest);
        
        // Calculate buzz trend
        if (latest && previous) {
          const diff = latest.buzz_score - previous.buzz_score;
          setBuzzTrend(diff >= 5 ? 'up' : diff <= -5 ? 'down' : 'flat');
        } else {
          setBuzzTrend('flat');
        }
        
        // Find best release window if no confirmed date
        const sortedWindows = (windows || []).sort((a, b) => (b.score_numeric || 0) - (a.score_numeric || 0));
        setReleaseWindow(sortedWindows[0] || null);
        
        setSentimentSummary(sentiment);
        
        // Initialize checklist from action_progress
        if (bp?.action_progress?.actions) {
          const checkState = {};
          bp.action_progress.actions.forEach(a => {
            if (a.completed) checkState[a.id] = true;
          });
          setChecklist(checkState);
        }
        
        // Load influencer recommendations
        if (proj && p) {
          setLoadingInfluencers(true);
          try {
            const filmDetails = {
              genre: proj.project_metadata?.genre,
              subgenre: proj.project_metadata?.subgenre,
              language: proj.project_metadata?.language,
              region: proj.project_metadata?.region,
            };
            const recommendations = await getInfluencerRecommendations(filmDetails, p);
            setInfluencers(recommendations);
          } catch (err) {
            console.error('Failed to load influencers:', err);
          } finally {
            setLoadingInfluencers(false);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationError(null);
    try {
      const bp = await projectService.generateCampaignBlueprint(projectId);
      setBlueprint(bp);
      showToast(<><Icon name="check" size={14} /> Campaign blueprint generated!</>);
    } catch (e) {
      console.error(e);
      const errorMsg = e.message || 'Campaign generation failed';
      setGenerationError(errorMsg);
      showToast('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file');
      return;
    }
    
    setUploadedImage(file);
    setAnalysisResult(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  const handleAnalyzePoster = async () => {
    if (!uploadedImage) {
      showToast('Please upload a poster first');
      return;
    }
    
    setAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      // Create form data to send the image
      const formData = new FormData();
      formData.append('image', uploadedImage);
      
      // Call backend API
      const response = await fetch('/api/posters/analyze-upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const result = await response.json();
      setAnalysisResult(result);
      showToast(<><Icon name="check" size={14} /> Poster analysis complete!</>);
    } catch (error) {
      console.error('Analysis error:', error);
      showToast(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleCheck = async (actionId) => {
    const newChecklist = { ...checklist, [actionId]: !checklist[actionId] };
    setChecklist(newChecklist);
    
    // Prepare action_progress data
    const actionProgressData = {
      actions: Object.keys(newChecklist)
        .filter(id => newChecklist[id])
        .map(id => ({ id, completed: true }))
    };
    
    // Persist to database (fire and forget)
    try {
      await projectService.updateCampaignBlueprintProgress(projectId, actionProgressData);
    } catch (e) {
      console.error('Failed to save checklist progress:', e);
    }
  };

  if (loading) return <ProjectLayout><div className="loading-screen"><div className="loading-spinner" /></div></ProjectLayout>;

  const actions = blueprint?.next_14_days_actions || [];
  const channels = blueprint?.channels_focus || [];

  return (
    <ProjectLayout>
      {toast && <div className="toast">{toast}</div>}
      <div className="campaign-page">
        <h1 className="page-title">Campaign Blueprint</h1>
        <p className="page-subtitle">Sentiment-aware, low-budget campaign plan for your target audience.</p>

        {/* Enhanced Context cards */}
        <div className="campaign-context" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
          {persona && (
            <Card className="ctx-card">
              <h4 className="ctx-label">Persona & Audience</h4>
              <p className="ctx-value" style={{ fontSize: 14, marginBottom: 12 }}>
                {persona.positioning_statement || persona.persona_summary || '—'}
              </p>
              {(persona.target_core_clusters?.length > 0 || persona.target_secondary_clusters?.length > 0) && (
                <div>
                  {persona.target_core_clusters?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Core Audience:</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {persona.target_core_clusters.map(cluster => (
                          <TagChip 
                            key={cluster} 
                            label={getClusterLabel(cluster)} 
                            color={getClusterColor(cluster)} 
                            size="sm" 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {persona.target_secondary_clusters?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Secondary:</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {persona.target_secondary_clusters.map(cluster => (
                          <TagChip 
                            key={cluster} 
                            label={getClusterLabel(cluster)} 
                            color="gray" 
                            size="sm" 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
          
          <Card className="ctx-card">
            <h4 className="ctx-label">Release Date & Timeline</h4>
            {project?.confirmed_release_date ? (
              <>
                <p className="ctx-value" style={{ fontSize: 18, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>
                  {new Date(project.confirmed_release_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
                <p style={{ fontSize: 12, color: '#888' }}>
                  {Math.ceil((new Date(project.confirmed_release_date) - new Date()) / (1000 * 60 * 60 * 24))} days to release
                </p>
              </>
            ) : releaseWindow?.primary_date ? (
              <>
                <p className="ctx-value" style={{ fontSize: 16, fontWeight: 600, color: '#fbbf24', marginBottom: 8 }}>
                  Tentative: {new Date(releaseWindow.primary_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
                <button
                  onClick={() => navigate(`/projects/${projectId}/release-window`)}
                  style={{
                    fontSize: 11,
                    padding: '6px 12px',
                    background: 'rgba(251, 191, 36, 0.2)',
                    border: '1px solid #fbbf24',
                    borderRadius: '6px',
                    color: '#fbbf24',
                    cursor: 'pointer'
                  }}
                >
                  Confirm Date
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>No fixed date selected</p>
                <button
                  onClick={() => navigate(`/projects/${projectId}/release-window`)}
                  style={{
                    fontSize: 11,
                    padding: '6px 12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                >
                  Choose Release Date
                </button>
              </>
            )}
          </Card>
          
          {latestBuzz && (
            <Card className="ctx-card">
              <h4 className="ctx-label">Current Buzz Score</h4>
              <p className={`ctx-buzz ${latestBuzz.buzz_score >= 70 ? 'ctx-buzz--high' : latestBuzz.buzz_score >= 40 ? 'ctx-buzz--mid' : 'ctx-buzz--low'}`}>
                {latestBuzz.buzz_score} / 100
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: '#888' }}>
                  {latestBuzz.buzz_score >= 70 ? 'High' : latestBuzz.buzz_score >= 40 ? 'Medium' : 'Low'} Momentum
                </span>
                <span style={{ 
                  fontSize: 14, 
                  color: buzzTrend === 'up' ? '#4ade80' : buzzTrend === 'down' ? '#f87171' : '#888'
                }}>
                  {buzzTrend === 'up' ? '↑' : buzzTrend === 'down' ? '↓' : '→'}
                </span>
                <span style={{ fontSize: 11, color: '#666' }}>vs last snapshot</span>
              </div>
            </Card>
          )}
          
          {sentimentSummary ? (
            <Card className="ctx-card">
              <h4 className="ctx-label">Audience Sentiment</h4>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#4ade80' }}>
                    {sentimentSummary.positivePercent}%
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>Positive</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>
                    {sentimentSummary.neutralPercent}%
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>Neutral</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f87171' }}>
                    {sentimentSummary.negativePercent}%
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>Negative</div>
                </div>
              </div>
              {sentimentSummary.keyConcerns && sentimentSummary.keyConcerns.length > 0 && (
                <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 8 }}>
                  <Icon name="warning" size={12} /> {sentimentSummary.keyConcerns[0].factor}
                </div>
              )}
            </Card>
          ) : (
            <Card className="ctx-card" style={{ background: 'rgba(251, 191, 36, 0.1)', borderLeft: '3px solid #fbbf24' }}>
              <h4 className="ctx-label" style={{ color: '#fbbf24' }}>Audience Sentiment</h4>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>No sentiment data yet</p>
              <button
                onClick={() => navigate(`/projects/${projectId}/sentiment`)}
                style={{
                  fontSize: 11,
                  padding: '6px 12px',
                  background: 'rgba(251, 191, 36, 0.2)',
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  color: '#fbbf24',
                  cursor: 'pointer'
                }}
              >
                Run Analysis
              </button>
            </Card>
          )}
        </div>

        {/* Warning Banners for Missing Dependencies */}
        {!persona && (
          <Card style={{ marginBottom: 16, background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444' }}>
            <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>
              <Icon name="warning" size={14} /> <strong>Persona Required:</strong> Lock your persona first to generate an accurate campaign.
              <button
                onClick={() => navigate(`/projects/${projectId}/persona`)}
                style={{
                  marginLeft: 12,
                  fontSize: 11,
                  padding: '4px 10px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  color: '#ef4444',
                  cursor: 'pointer'
                }}
              >
                Go to Persona
              </button>
            </p>
          </Card>
        )}
        
        {!latestBuzz && (
          <Card style={{ marginBottom: 16, background: 'rgba(251, 191, 36, 0.1)', borderLeft: '3px solid #fbbf24' }}>
            <p style={{ fontSize: 13, color: '#fbbf24', margin: 0 }}>
              <Icon name="warning" size={14} /> <strong>No Buzz Data:</strong> Campaign will be generated without current buzz insights.
            </p>
          </Card>
        )}
        
        {!sentimentSummary && persona && (
          <Card style={{ marginBottom: 16, background: 'rgba(251, 191, 36, 0.1)', borderLeft: '3px solid #fbbf24' }}>
            <p style={{ fontSize: 13, color: '#fbbf24', margin: 0 }}>
              <Icon name="warning" size={14} /> <strong>No Sentiment Analysis:</strong> Campaign won't include comment-based audience insights.
              <button
                onClick={() => navigate(`/projects/${projectId}/sentiment`)}
                style={{
                  marginLeft: 12,
                  fontSize: 11,
                  padding: '4px 10px',
                  background: 'rgba(251, 191, 36, 0.2)',
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  color: '#fbbf24',
                  cursor: 'pointer'
                }}
              >
                Analyze Sentiment
              </button>
            </p>
          </Card>
        )}

        {/* Key insights from sentiment */}
        {sentimentSummary && (
          <Card style={{ marginBottom: 24, background: 'rgba(251, 191, 36, 0.1)', borderLeft: '3px solid #fbbf24' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fbbf24', marginBottom: 12 }}>
              <Icon name="lightbulb" size={14} /> Campaign Focus Areas (Based on Sentiment)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {sentimentSummary.keyPositives && sentimentSummary.keyPositives.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#4ade80', marginBottom: 6 }}>
                    Amplify These:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#bbb' }}>
                    {sentimentSummary.keyPositives.slice(0, 2).map((pos, idx) => (
                      <li key={idx}>{pos}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sentimentSummary.keyConcerns && sentimentSummary.keyConcerns.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f87171', marginBottom: 6 }}>
                    Address These:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#bbb' }}>
                    {sentimentSummary.keyConcerns.slice(0, 2).map((concern, idx) => (
                      <li key={idx}>{concern.factor}: {concern.recommendedAction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Poster Analysis Section */}
        <Card style={{ marginBottom: 24, background: 'rgba(139, 92, 246, 0.1)', borderLeft: '3px solid #8b5cf6' }}>
          <h4 style={{ fontSize: 16, fontWeight: 600, color: '#a78bfa', marginBottom: 16 }}>
            🎨 Poster Analysis (3-Second Rule)
          </h4>
          
          <p style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
            Upload your movie poster to analyze its stopping power using AI trained on 26+ posters.
          </p>

          {/* Upload Section */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="file"
              id="poster-upload"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="poster-upload"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                color: '#fff',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              📤 Upload Poster Image
            </label>
            {uploadedImage && (
              <span style={{ marginLeft: 12, fontSize: 13, color: '#4ade80' }}>
                <Icon name="check" size={14} /> {uploadedImage.name}
              </span>
            )}
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <img
                src={imagePreview}
                alt="Uploaded poster preview"
                style={{
                  maxWidth: '300px',
                  maxHeight: '400px',
                  borderRadius: '8px',
                  border: '2px solid #8b5cf6',
                  objectFit: 'contain'
                }}
              />
            </div>
          )}

          {/* Action Button */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button
              className="btn-primary-green"
              onClick={handleAnalyzePoster}
              disabled={!uploadedImage || analyzing}
              style={{ 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                opacity: (!uploadedImage || analyzing) ? 0.5 : 1
              }}
            >
              {analyzing ? '⏳ Analyzing...' : '🔍 Analyze Poster'}
            </button>
          </div>

          {/* Analysis Results */}
          {analysisResult && (
            <div className="analysis-result-card" style={{
              background: 'rgba(139, 92, 246, 0.15)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
              <h5 style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa', marginBottom: 12 }}>
                Analysis Results
              </h5>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <img
                    src={imagePreview}
                    alt="Analyzed poster"
                    style={{ width: '100%', borderRadius: '6px', maxHeight: '300px', objectFit: 'contain' }}
                  />
                </div>
                
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Attractiveness Score</div>
                    <div style={{ 
                      fontSize: 32, 
                      fontWeight: 700, 
                      color: getVerdictColor(analysisResult.verdict)
                    }}>
                      {analysisResult.score}/100
                    </div>
                    <div style={{ 
                      fontSize: 11, 
                      color: getVerdictColor(analysisResult.verdict),
                      fontWeight: 600,
                      marginTop: 4
                    }}>
                      {getScoreInterpretation(analysisResult.score)}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Verdict</div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: 12,
                      fontWeight: 600,
                      background: getVerdictColor(analysisResult.verdict) + '20',
                      color: getVerdictColor(analysisResult.verdict)
                    }}>
                      {getVerdictLabel(analysisResult.verdict)}
                    </span>
                  </div>
                  
                  {analysisResult.suggestions && (
                    <div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Suggestions</div>
                      <p style={{ fontSize: 13, color: '#bbb', margin: 0, lineHeight: 1.5 }}>
                        {analysisResult.suggestions}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Low Score Warning */}
              {analysisResult.score < 50 && (
                <div style={{
                  marginTop: 12,
                  padding: '12px',
                  background: 'rgba(251, 191, 36, 0.15)',
                  borderRadius: '6px',
                  borderLeft: '3px solid #fbbf24'
                }}>
                  <p style={{ fontSize: 12, color: '#fbbf24', margin: 0, lineHeight: 1.5 }}>
                    <Icon name="warning" size={14} /> <strong>Poster might be hurting conversions.</strong> Consider tweaking before heavy spends on ads.
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Influencer Recommendations Section */}
        {influencers.length > 0 && (
          <Card style={{ marginBottom: 24, background: 'rgba(34, 197, 94, 0.1)', borderLeft: '3px solid #22c55e' }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: '#22c55e', marginBottom: 8 }}>
              🎤 Recommended Influencers for Promotion
            </h4>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
              Based on your film's genre, language, and target audience. Collaborate for wider reach.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {influencers.map((influencer, idx) => (
                <div
                  key={influencer.id}
                  style={{
                    padding: '14px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Header with match score */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 4px 0' }}>
                        {influencer.name}
                      </h5>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#22c55e',
                          fontWeight: 600
                        }}>
                          {influencer.market}
                        </span>
                        <span style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          fontWeight: 600
                        }}>
                          {influencer.platform}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: influencer.matchScore >= 70 ? '#22c55e' : influencer.matchScore >= 50 ? '#fbbf24' : '#888',
                      textAlign: 'right',
                      minWidth: '40px'
                    }}>
                      {influencer.matchScore}%
                    </div>
                  </div>
                  
                  {/* Genres */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Genres:</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {influencer.genres.slice(0, 3).map((genre, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#ccc'
                          }}
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Match reasons */}
                  {influencer.matchReasons.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Why this match:</div>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#aaa', lineHeight: 1.5 }}>
                        {influencer.matchReasons.slice(0, 2).map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Description (if available) */}
                  {influencer.description && (
                    <p style={{ fontSize: 11, color: '#999', margin: '8px 0 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>
                      "{influencer.description.substring(0, 80)}{influencer.description.length > 80 ? '...' : ''}"
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            {loadingInfluencers && (
              <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>
                Loading influencer recommendations...
              </div>
            )}
          </Card>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              className="btn-primary-green" 
              onClick={handleGenerate} 
              disabled={generating || !persona}
              title={!persona ? 'Please lock a persona first' : ''}
              style={{ opacity: (generating || !persona) ? 0.5 : 1 }}
            >
              {generating ? 'Generating…' : blueprint ? '↻ Regenerate Blueprint' : '✦ Generate Campaign Blueprint'}
            </button>
            
            {generationError && (
              <button 
                className="btn-primary-green" 
                onClick={handleGenerate}
                disabled={generating || !persona}
                style={{ 
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  opacity: (generating || !persona) ? 0.5 : 1
                }}
              >
                ↻ Retry
              </button>
            )}
          </div>
          
          {generationError && (
            <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>
              <Icon name="warning" size={14} /> {generationError}
            </p>
          )}
        </div>

        {blueprint ? (
          <>
            {blueprint.summary && (
              <Card style={{ marginBottom: 20 }}>
                <h3 className="section-title">Summary</h3>
                <p className="campaign-summary">{blueprint.summary}</p>
              </Card>
            )}

            {channels.length > 0 && (
              <Card style={{ marginBottom: 20 }}>
                <h3 className="section-title">Focus Channels</h3>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                  Recommended channels for each target audience cluster.
                </p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {channels.map((c, i) => {
                    // Handle both old format (string) and new format (object)
                    if (typeof c === 'string') {
                      return <TagChip key={i} label={c} color="green" />;
                    }
                    return (
                      <div key={i} style={{
                        padding: '12px',
                        background: 'rgba(74, 222, 128, 0.1)',
                        borderRadius: '8px',
                        borderLeft: '3px solid #4ade80'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          {c.clusterCode && (
                            <TagChip 
                              label={getClusterLabel(c.clusterCode)} 
                              color={getClusterColor(c.clusterCode)} 
                              size="sm" 
                            />
                          )}
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#4ade80' }}>
                            {c.channel || 'Unknown Channel'}
                          </span>
                        </div>
                        {c.rationale && (
                          <p style={{ fontSize: 13, color: '#aaa', margin: 0, lineHeight: 1.4 }}>
                            {c.rationale}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card>
              <h3 className="section-title">Next 14 Days Actions</h3>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                Tactical day-by-day plan leading to release. Check off as you complete.
              </p>
              {actions.length > 0 ? (
                <div className="campaign-actions-list">
                  {actions
                    .sort((a, b) => (a.dayOffset || 0) - (b.dayOffset || 0))
                    .map((action, idx) => {
                      const actionId = `day_${action.dayOffset}_${idx}`;
                      const dayLabel = action.dayOffset === 0 ? 'Release Day' : 
                                      action.dayOffset > 0 ? `Day +${action.dayOffset}` : 
                                      `Day ${action.dayOffset}`;
                      return (
                        <label 
                          key={actionId} 
                          className={`campaign-action ${checklist[actionId] ? 'campaign-action--done' : ''}`}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px', marginBottom: 8 }}
                        >
                          <input
                            type="checkbox"
                            checked={!!checklist[actionId]}
                            onChange={() => toggleCheck(actionId)}
                            style={{ marginTop: 4, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ 
                                fontSize: 11, 
                                fontWeight: 600, 
                                color: action.dayOffset < -7 ? '#8b5cf6' : action.dayOffset < 0 ? '#fbbf24' : '#4ade80',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: action.dayOffset < -7 ? 'rgba(139, 92, 246, 0.2)' : action.dayOffset < 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(74, 222, 128, 0.2)'
                              }}>
                                {dayLabel}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                                {action.title}
                              </span>
                            </div>
                            <p style={{ fontSize: 13, color: '#aaa', margin: '4px 0', lineHeight: 1.4 }}>
                              {action.description}
                            </p>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                              {action.channel && (
                                <span style={{ fontSize: 11, color: '#888', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                  📢 {action.channel}
                                </span>
                              )}
                              {action.clusterTargets?.map((cluster, i) => (
                                <TagChip key={i} label={getClusterLabel(cluster)} color={getClusterColor(cluster)} size="sm" />
                              ))}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>No actions defined yet.</p>
              )}
            </Card>
          </>
        ) : (
          <Card className="campaign-empty-state">
            <div className="ces-icon">📋</div>
            <p>No blueprint yet. Generate one to see your 14-day action plan.</p>
          </Card>
        )}
      </div>
    </ProjectLayout>
  );
};

export default CampaignPage;
