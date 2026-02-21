import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import CalendarStrip from '../components/CalendarStrip';
import HeatmapCalendar from '../components/HeatmapCalendar';
import TagChip from '../components/TagChip';
import Icon from '../components/Icon';
import { projectService } from '../services/api.service';
import { analyzeReleaseWindow, saveReleaseWindowSuggestions } from '../services/releaseAnalysis.service';
import { supabase } from '../supabaseClient';
import { formatClusterList } from '../config/audienceClusters';
import './ReleaseWindowPage.css';

const ReleaseWindowPage = () => {
  const { projectId } = useParams();
  const [windows, setWindows] = useState([]);
  const [project, setProject] = useState(null);
  const [persona, setPersona] = useState(null);
  const [latestBuzz, setLatestBuzz] = useState(null);
  const [dateAnalysis, setDateAnalysis] = useState([]);
  const [topSuggestions, setTopSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState('');
  const [opts, setOpts] = useState({
    earliest: '',
    latest: '',
    avoid_big_clashes: true,
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    const load = async () => {
      try {
        const [p, w, pers, buzzSnaps] = await Promise.all([
          projectService.getProject(projectId),
          projectService.getReleaseWindows(projectId),
          projectService.getProjectPersona(projectId),
          projectService.getBuzzSnapshots(projectId),
        ]);
        setProject(p);
        setWindows(w || []);
        setPersona(pers);
        
        // Load latest buzz
        const sorted = (buzzSnaps || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setLatestBuzz(sorted[0] || null);
        
        // Set default dates (30-90 days from now)
        const today = new Date();
        const earliestDefault = new Date(today);
        earliestDefault.setDate(today.getDate() + 30);
        const latestDefault = new Date(today);
        latestDefault.setDate(today.getDate() + 90);
        
        setOpts(prev => ({
          ...prev,
          earliest: prev.earliest || earliestDefault.toISOString().split('T')[0],
          latest: prev.latest || latestDefault.toISOString().split('T')[0],
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handleAnalyze = async () => {
    if (!opts.earliest || !opts.latest) { 
      showToast('Please set both date range values.'); 
      return; 
    }
    
    setAnalyzing(true);
    try {
      // Auto-import CSV data if not already loaded
      const { autoImportCompetitionData } = await import('../services/competition.service');
      try {
        await autoImportCompetitionData();
        console.log('✅ CSV competition data loaded');
      } catch (importError) {
        console.log('ℹ️ CSV data already imported or error:', importError.message);
      }
      
      const m = project?.project_metadata || {};
      const result = await analyzeReleaseWindow(projectId, {
        earliestDate: opts.earliest,
        latestDate: opts.latest,
        avoidBigClashes: opts.avoid_big_clashes,
        targetCoreClusters: persona?.target_core_clusters || [],
        targetSecondaryClusters: persona?.target_secondary_clusters || [],
        currentBuzzScore: latestBuzz?.buzz_score || 50,
        language: m.language || '',
        regionPrimary: m.region_primary || '',
      });
      
      setDateAnalysis(result.dateAnalysis);
      setTopSuggestions(result.topSuggestions);
      
      // Save top suggestions to database
      if (result.topSuggestions.length > 0) {
        await saveReleaseWindowSuggestions(projectId, result.topSuggestions);
        setWindows(result.topSuggestions);
      }
      
      showToast('Analysis complete!');
    } catch (e) {
      console.error(e);
      showToast('Analysis failed — check console.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectDate = async (dateItem) => {
    try {
      // Update project with confirmed release date
      const { error } = await supabase
        .from('projects')
        .update({ confirmed_release_date: dateItem.date })
        .eq('id', projectId);
      
      if (error) throw error;
      
      showToast(<><Icon name="check" size={14} /> Release date confirmed: {new Date(dateItem.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</>);
      
      // Update local project state
      setProject(prev => ({ ...prev, confirmed_release_date: dateItem.date }));
    } catch (e) {
      console.error(e);
      showToast('Failed to save release date');
    }
  };

  if (loading) return <ProjectLayout><div className="loading-screen"><div className="loading-spinner" /></div></ProjectLayout>;

  const m = project?.project_metadata || {};

  return (
    <ProjectLayout>
      {toast && <div className="toast">{toast}</div>}
      <div className="release-page">
        <h1 className="page-title">Release Window Analyzer</h1>
        <p className="page-subtitle">Find the best window for your film's release.</p>

        <div className="release-grid">
          {/* Left — project/persona summary */}
          <div className="release-left">
            <Card>
              <h3 className="section-title">Film Summary</h3>
              {project && (
                <div className="release-summary">
                  <div className="rs-title">{project.title}</div>
                  <div className="rs-meta">
                    {[m.language, m.region_primary, m.genre].filter(Boolean).map((v, i) => (
                      <TagChip key={i} label={v} size="sm" color="gray" />
                    ))}
                  </div>
                  {m.budget_band && <div className="rs-detail">Budget: <span>{m.budget_band}</span></div>}
                  {m.star_power_band && <div className="rs-detail">Stars: <span>{m.star_power_band}</span></div>}
                  {m.platform_strategy && <div className="rs-detail">Platform: <span>{m.platform_strategy}</span></div>}
                </div>
              )}
            </Card>

            {/* Target Audience Card */}
            {persona && (persona.target_core_clusters?.length > 0 || persona.target_secondary_clusters?.length > 0) && (
              <Card style={{ marginTop: 20 }}>
                <h3 className="section-title"><Icon name="target" size={18} /> Target Audience</h3>
                <div style={{ marginTop: 12 }}>
                  {persona.target_core_clusters && persona.target_core_clusters.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#4ade80', marginBottom: 6 }}>Primary:</div>
                      <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>
                        {formatClusterList(persona.target_core_clusters)}
                      </div>
                    </div>
                  )}
                  {persona.target_secondary_clusters && persona.target_secondary_clusters.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa', marginBottom: 6 }}>Secondary:</div>
                      <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>
                        {formatClusterList(persona.target_secondary_clusters)}
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 12, padding: 12, background: 'rgba(167,139,250,0.1)', borderRadius: 6, fontSize: 12, color: '#a78bfa' }}>
                    <Icon name="lightbulb" size={13} /> Analysis considers exam schedules, festivals, and events specific to your target audience
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right — analysis tools */}
          <div className="release-right">
            <Card>
              <h3 className="section-title">Set Release Range</h3>
              <div className="release-inputs">
                <div className="release-field">
                  <label>Earliest possible release</label>
                  <input
                    type="date"
                    value={opts.earliest}
                    onChange={e => setOpts({ ...opts, earliest: e.target.value })}
                  />
                </div>
                <div className="release-field">
                  <label>Latest acceptable release</label>
                  <input
                    type="date"
                    value={opts.latest}
                    onChange={e => setOpts({ ...opts, latest: e.target.value })}
                  />
                </div>
                <div className="release-field release-field--checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={opts.avoid_big_clashes}
                      onChange={e => setOpts({ ...opts, avoid_big_clashes: e.target.checked })}
                    />
                    Avoid big clashes (same language)
                  </label>
                </div>
              </div>
              <button
                className="btn-primary-green"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing…' : 'Analyze Windows'}
              </button>
            </Card>

            {/* Heatmap Calendar */}
            {dateAnalysis.length > 0 && (
              <Card style={{ marginTop: 20 }}>
                <h3 className="section-title"><Icon name="calendar" size={18} /> Release Date Heatmap</h3>
                <p className="page-subtitle" style={{ marginTop: 8, marginBottom: 16 }}>
                  <span style={{ color: '#4ade80', fontWeight: 600 }}><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#4ade80',marginRight:4,verticalAlign:'middle'}}/>Green</span> = Best dates (low competition + favorable events) &nbsp;|&nbsp; 
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#f59e0b',marginRight:4,verticalAlign:'middle'}}/>Orange</span> = Moderate risk &nbsp;|&nbsp; 
                  <span style={{ color: '#ef4444', fontWeight: 600 }}><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#ef4444',marginRight:4,verticalAlign:'middle'}}/>Red</span> = Avoid (exams/high competition)
                </p>
                <div style={{ padding: 12, background: 'rgba(167,139,250,0.1)', borderRadius: 6, fontSize: 13, color: '#a78bfa', marginBottom: 16 }}>
                  <Icon name="target" size={14} /> Colors reflect impact on <strong>your target audience</strong>. Hover over dates for detailed breakdown.
                </div>
                <HeatmapCalendar 
                  dateAnalysis={dateAnalysis} 
                  onDateSelect={handleSelectDate} 
                />
              </Card>
            )}

            {/* Top Suggestions */}
            {topSuggestions.length > 0 && (
              <Card style={{ marginTop: 20 }}>
                <div className="recs-header">
                  <Icon name="robot" size={20} />
                  <h3 className="recs-title">AI-Powered Recommendations</h3>
                  <span className="recs-badge">Top {topSuggestions.length}</span>
                </div>
                <p className="recs-desc">
                  Intelligently ranked based on your target audience preferences
                </p>

                <div className="suggestion-cards">
                  {topSuggestions.map((suggestion, idx) => {
                    const rank = idx + 1;
                    const rankClass = `sug-card--${Math.min(rank, 4)}`;
                    const score = Math.round(suggestion.scoreNumeric);
                    const isSelected = project?.confirmed_release_date === suggestion.date;
                    const riskLabel = suggestion.riskLevel === 'low' ? 'Low Risk' : suggestion.riskLevel === 'medium' ? 'Med Risk' : 'High Risk';
                    const riskBg = suggestion.riskLevel === 'low' ? 'rgba(74,222,128,0.15)' : suggestion.riskLevel === 'medium' ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)';
                    const formattedDate = new Date(suggestion.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

                    return (
                      <div key={suggestion.date} className={`sug-card ${rankClass}`}>
                        {/* Card top: rank + date + score */}
                        <div className="sug-card-top">
                          <div className="sug-rank">
                            <span className="sug-rank-num">#{rank}</span>
                            <span className="sug-risk-chip" style={{ background: riskBg, color: suggestion.riskColor || '#fff' }}>
                              {riskLabel}
                            </span>
                          </div>
                          <div className="sug-main">
                            <div className="sug-date">{formattedDate}</div>
                            <div className="sug-score-row">
                              <span className="sug-score-label">Score</span>
                              <div className="sug-score-bar">
                                <div className="sug-score-fill" style={{ width: `${score}%` }} />
                              </div>
                              <span className="sug-score-val">{score}</span>
                            </div>
                          </div>
                        </div>

                        {/* AI Strategy */}
                        {suggestion.aiReason && (
                          <div className="sug-ai-block">
                            <span className="sug-ai-icon">✦</span>
                            <div>
                              <div className="sug-ai-label">AI Strategy</div>
                              <p className="sug-ai-text">{suggestion.aiReason}</p>
                            </div>
                          </div>
                        )}

                        {/* Pros & Cons – two columns */}
                        {((suggestion.pros && suggestion.pros.length > 0) || (suggestion.cons && suggestion.cons.length > 0)) && (
                          <div className="sug-pros-cons">
                            {suggestion.pros && suggestion.pros.length > 0 && (
                              <div>
                                <div className="sug-col-label sug-col-label--green">
                                  <Icon name="check" size={12} /> Pros
                                </div>
                                <ul className="sug-item-list">
                                  {suggestion.pros.map((pro, i) => (
                                    <li key={i} className="sug-item sug-item--pro">{pro}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {suggestion.cons && suggestion.cons.length > 0 && (
                              <div>
                                <div className="sug-col-label sug-col-label--amber">
                                  <Icon name="warning" size={12} /> Cons
                                </div>
                                <ul className="sug-item-list">
                                  {suggestion.cons.map((con, i) => (
                                    <li key={i} className="sug-item sug-item--con">{con}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer: buzz delta + select button */}
                        <div className="sug-footer">
                          {suggestion.expectedBuzzDelta !== undefined && suggestion.expectedBuzzDelta !== 0 ? (
                            <span className="sug-buzz-delta">
                              Expected Buzz: <span>{suggestion.expectedBuzzDelta > 0 ? '+' : ''}{suggestion.expectedBuzzDelta}</span>
                            </span>
                          ) : <span />}
                          <button
                            className="sug-select-btn"
                            onClick={() => handleSelectDate(suggestion)}
                            disabled={isSelected}
                          >
                            {isSelected ? <><Icon name="check" size={14} /> Selected</> : 'Select this date'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
};

export default ReleaseWindowPage;
