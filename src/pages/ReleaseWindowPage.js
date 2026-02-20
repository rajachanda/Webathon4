import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import CalendarStrip from '../components/CalendarStrip';
import HeatmapCalendar from '../components/HeatmapCalendar';
import TagChip from '../components/TagChip';
import { projectService } from '../services/api.service';
import { analyzeReleaseWindow, saveReleaseWindowSuggestions } from '../services/releaseAnalysis.service';
import { supabase } from '../supabaseClient';
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
      
      showToast(`✓ Release date confirmed: ${new Date(dateItem.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
      
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
                <h3 className="section-title">Release Date Heatmap</h3>
                <p className="page-subtitle">Green = Favorable, Orange = Medium Risk, Red = High Risk</p>
                <HeatmapCalendar 
                  dateAnalysis={dateAnalysis} 
                  onDateSelect={handleSelectDate} 
                />
              </Card>
            )}

            {/* Top Suggestions */}
            {topSuggestions.length > 0 && (
              <Card style={{ marginTop: 20 }}>
                <h3 className="section-title">Top {topSuggestions.length} Recommendations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {topSuggestions.map((suggestion, idx) => (
                    <Card key={suggestion.date} className="suggestion-card" style={{ background: 'rgba(255,255,255,0.05)', padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>
                            #{idx + 1} — {new Date(suggestion.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
                            Score: {Math.round(suggestion.scoreNumeric)}/100
                          </div>
                        </div>
                        <TagChip 
                          label={suggestion.riskLevel === 'low' ? 'Favorable' : suggestion.riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'} 
                          color={suggestion.riskColor} 
                        />
                      </div>
                      
                      {suggestion.pros && suggestion.pros.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#4ade80', marginBottom: 4 }}>✓ Pros:</div>
                          <ul style={{ margin: 0, paddingLeft: 20, color: '#bbb', fontSize: 13 }}>
                            {suggestion.pros.map((pro, i) => (
                              <li key={i}>{pro}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {suggestion.cons && suggestion.cons.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>⚠ Cons:</div>
                          <ul style={{ margin: 0, paddingLeft: 20, color: '#bbb', fontSize: 13 }}>
                            {suggestion.cons.map((con, i) => (
                              <li key={i}>{con}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {suggestion.expectedBuzzDelta !== undefined && suggestion.expectedBuzzDelta !== 0 && (
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
                          Expected Buzz: {suggestion.expectedBuzzDelta > 0 ? '+' : ''}{suggestion.expectedBuzzDelta}
                        </div>
                      )}
                      
                      <button 
                        className="btn-primary-green" 
                        onClick={() => handleSelectDate(suggestion)}
                        disabled={project?.confirmed_release_date === suggestion.date}
                      >
                        {project?.confirmed_release_date === suggestion.date ? '✓ Selected' : 'Select this date'}
                      </button>
                    </Card>
                  ))}
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
