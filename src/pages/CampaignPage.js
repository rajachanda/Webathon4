import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import TagChip from '../components/TagChip';
import { projectService } from '../services/api.service';
import { getSentimentSummary } from '../services/sentiment.service';
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
  const [sentimentSummary, setSentimentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const [checklist, setChecklist] = useState({});
  
  // Poster analysis state
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    const load = async () => {
      try {
        const [bp, p, proj, snaps, sentiment] = await Promise.all([
          projectService.getCampaignBlueprint(projectId),
          projectService.getProjectPersona(projectId),
          projectService.getProject(projectId),
          projectService.getBuzzSnapshots(projectId),
          getSentimentSummary(projectId),
        ]);
        setBlueprint(bp);
        setPersona(p);
        setProject(proj);
        const sorted = (snaps || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setLatestBuzz(sorted[0] || null);
        setSentimentSummary(sentiment);
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
    try {
      const bp = await projectService.generateCampaignBlueprint(projectId);
      setBlueprint(bp);
      showToast('Campaign blueprint generated!');
    } catch (e) {
      console.error(e);
      showToast('Generation failed — TODO: connect LLM service.');
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
      showToast('✓ Poster analysis complete!');
    } catch (error) {
      console.error('Analysis error:', error);
      showToast(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleCheck = (key) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }));

  if (loading) return <ProjectLayout><div className="loading-screen"><div className="loading-spinner" /></div></ProjectLayout>;

  const actions = blueprint?.next_14_days_actions || [];
  const channels = blueprint?.channels_focus || [];

  const week1 = actions.filter(a => a.week === 1 || a.week === '-2');
  const week2 = actions.filter(a => a.week === 2 || a.week === '-1');
  const otherActions = actions.filter(a => !week1.includes(a) && !week2.includes(a));

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
              <h4 className="ctx-label">Persona & Positioning</h4>
              <p className="ctx-value" style={{ fontSize: 14, marginBottom: 12 }}>
                {persona.positioning_statement || persona.persona_summary || '—'}
              </p>
              {persona.target_core_clusters && persona.target_core_clusters.length > 0 && (
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
              )}
            </Card>
          )}
          
          {project?.confirmed_release_date && (
            <Card className="ctx-card">
              <h4 className="ctx-label">Confirmed Release Date</h4>
              <p className="ctx-value" style={{ fontSize: 18, fontWeight: 700, color: '#4ade80' }}>
                {new Date(project.confirmed_release_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
              <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {Math.ceil((new Date(project.confirmed_release_date) - new Date()) / (1000 * 60 * 60 * 24))} days to go
              </p>
            </Card>
          )}
          
          {latestBuzz && (
            <Card className="ctx-card">
              <h4 className="ctx-label">Current Buzz Score</h4>
              <p className={`ctx-buzz ${latestBuzz.buzz_score >= 70 ? 'ctx-buzz--high' : latestBuzz.buzz_score >= 40 ? 'ctx-buzz--mid' : 'ctx-buzz--low'}`}>
                {latestBuzz.buzz_score} / 100
              </p>
              <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {latestBuzz.buzz_score >= 70 ? 'High' : latestBuzz.buzz_score >= 40 ? 'Medium' : 'Low'} Momentum
              </p>
            </Card>
          )}
          
          {sentimentSummary && (
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
                  ⚠ Key concern: {sentimentSummary.keyConcerns[0].factor}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Key insights from sentiment */}
        {sentimentSummary && (
          <Card style={{ marginBottom: 24, background: 'rgba(251, 191, 36, 0.1)', borderLeft: '3px solid #fbbf24' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fbbf24', marginBottom: 12 }}>
              💡 Campaign Focus Areas (Based on Sentiment)
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
                ✓ {uploadedImage.name}
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
            </div>
          )}
        </Card>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn-primary-green" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating…' : blueprint ? '↻ Regenerate Blueprint' : '✦ Generate Campaign Blueprint'}
            </button>
            <button 
              className="btn-primary-green" 
              onClick={() => navigate(`/projects/${projectId}/sentiment`)}
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              📊 Sentiment Analysis
            </button>
          </div>
          <p className="campaign-llm-note">
            🤖 TODO: LLM campaign generator — takes persona + buzz + release date and outputs blueprint.
          </p>
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
                <div className="campaign-channels">
                  {channels.map((c, i) => (
                    <TagChip key={i} label={typeof c === 'string' ? c : c.channel || c.name || 'Unknown'} color="green" />
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <h3 className="section-title">Next 14 Days Actions</h3>
              {[
                { label: 'Week –2', items: week1 },
                { label: 'Week –1', items: week2 },
                { label: 'Other',   items: otherActions },
              ].map(group =>
                group.items.length > 0 ? (
                  <div key={group.label} className="campaign-week">
                    <p className="campaign-week-label">{group.label}</p>
                    {group.items.map((action, i) => {
                      const key = `${group.label}-${i}`;
                      return (
                        <label key={key} className={`campaign-action ${checklist[key] ? 'campaign-action--done' : ''}`}>
                          <input
                            type="checkbox"
                            checked={!!checklist[key]}
                            onChange={() => toggleCheck(key)}
                          />
                          <span>{typeof action === 'string' ? action : action.text || action.action || JSON.stringify(action)}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null
              )}
              {actions.length === 0 && (
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
