import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import CalendarStrip from '../components/CalendarStrip';
import TagChip from '../components/TagChip';
import { projectService } from '../services/api.service';
import './ReleaseWindowPage.css';

const ReleaseWindowPage = () => {
  const { projectId } = useParams();
  const [windows, setWindows] = useState([]);
  const [project, setProject] = useState(null);
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
        const [p, w] = await Promise.all([
          projectService.getProject(projectId),
          projectService.getReleaseWindows(projectId),
        ]);
        setProject(p);
        setWindows(w || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handleAnalyze = async () => {
    if (!opts.earliest || !opts.latest) { showToast('Please set both date range values.'); return; }
    setAnalyzing(true);
    try {
      const result = await projectService.analyzeReleaseWindow(projectId, opts);
      setWindows(result || []);
      showToast('Analysis complete!');
    } catch (e) {
      console.error(e);
      showToast('Analysis failed — check console.');
    } finally {
      setAnalyzing(false);
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
              <div className="release-todo-note">
                <span>🔧 </span>
                <span>TODO: Release analysis engine — reads competition_calendar, applies rules and writes release_windows rows.</span>
              </div>
            </Card>

            {/* Calendar results */}
            <Card style={{ marginTop: 20 }}>
              <h3 className="section-title">Recommended Corridors</h3>
              <CalendarStrip windows={windows} />
            </Card>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
};

export default ReleaseWindowPage;
