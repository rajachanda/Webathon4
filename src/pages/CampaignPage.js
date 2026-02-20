import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import TagChip from '../components/TagChip';
import { projectService } from '../services/api.service';
import './CampaignPage.css';

const CampaignPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [blueprint, setBlueprint] = useState(null);
  const [persona, setPersona] = useState(null);
  const [latestBuzz, setLatestBuzz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const [checklist, setChecklist] = useState({});

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    const load = async () => {
      try {
        const [bp, p, snaps] = await Promise.all([
          projectService.getCampaignBlueprint(projectId),
          projectService.getProjectPersona(projectId),
          projectService.getBuzzSnapshots(projectId),
        ]);
        setBlueprint(bp);
        setPersona(p);
        const sorted = (snaps || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        setLatestBuzz(sorted[0] || null);
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
        <p className="page-subtitle">A lightweight action plan based on your film's persona and buzz.</p>

        {/* Context cards */}
        <div className="campaign-context">
          {persona && (
            <Card className="ctx-card">
              <h4 className="ctx-label">Persona</h4>
              <p className="ctx-value">{persona.positioning_statement || persona.persona_summary || '—'}</p>
            </Card>
          )}
          {latestBuzz && (
            <Card className="ctx-card">
              <h4 className="ctx-label">Current Buzz</h4>
              <p className={`ctx-buzz ${latestBuzz.buzz_score >= 70 ? 'ctx-buzz--high' : latestBuzz.buzz_score >= 40 ? 'ctx-buzz--mid' : 'ctx-buzz--low'}`}>
                {latestBuzz.buzz_score} / 100
              </p>
            </Card>
          )}
        </div>

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
                    <TagChip key={i} label={c} color="green" />
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
