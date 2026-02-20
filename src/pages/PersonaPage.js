import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import { projectService } from '../services/api.service';
import { generatePersona } from '../services/gemini.service';
import './PersonaPage.css';

const AUDIENCE_SEGMENTS = [
  { code: 'URBAN_YOUTH_18_30', label: 'Urban 18–30, Multiplex, Male-skewed', region: ['AP/TG','TN'] },
  { code: 'URBAN_WOMEN_18_35', label: 'Urban Women 18–35, Romance/Drama', region: ['AP/TG','TN','KA','KL'] },
  { code: 'COLLEGE_CROWD',     label: 'College crowd 17–22, Social media active', region: ['AP/TG','TN','KA'] },
  { code: 'FAMILY_ALL_AGES',   label: 'Family audiences, all age groups', region: ['Pan South'] },
  { code: 'MASS_RURAL',        label: 'Mass rural audience, A-centre fans', region: ['AP/TG','TN'] },
  { code: 'OTT_VIEWER_25_40',  label: 'OTT-primary viewers 25–40, urban/semi-urban', region: ['Pan South'] },
  { code: 'DIASPORA',          label: 'Overseas/diaspora South Indian audience', region: ['Pan South'] },
  { code: 'SENIOR_FAMILY',     label: 'Families 35+, weekend entertainment', region: ['Pan South'] },
];

const PersonaPage = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const [teamResponses, setTeamResponses] = useState([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(location.state?.toast || '');
  const [form, setForm] = useState({ persona_summary: '', positioning_statement: '', core_audience_segments: [], secondary_audience_segments: [] });
  const [locked, setLocked] = useState(false);
  const [projectMeta, setProjectMeta] = useState(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, tr, proj] = await Promise.all([
          projectService.getProjectPersona(projectId),
          projectService.getTeamResponses(projectId),
          projectService.getProject(projectId),
        ]);
        if (p) {
          setLocked(p.locked || false);
          setForm({
            persona_summary: p.persona_summary || '',
            positioning_statement: p.positioning_statement || '',
            core_audience_segments: p.core_audience_segments || [],
            secondary_audience_segments: p.secondary_audience_segments || [],
          });
        }
        setTeamResponses(tr || []);
        if (proj?.project_metadata) setProjectMeta(proj.project_metadata);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handleGenerateLink = async () => {
    try {
      const invite = await projectService.createTeamInvite(projectId, '');
      const url = `${window.location.origin}/projects/${projectId}/team-link/${invite.token}`;
      setInviteUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await projectService.updatePersona(projectId, form);
      setToast('Persona saved!');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleLock = async () => {
    try {
      await projectService.lockPersona(projectId, !locked);
      setLocked(!locked);
      setToast(locked ? 'Persona unlocked.' : 'Persona locked!');
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSegment = (code, type) => {
    if (locked) return;
    const key = type === 'core' ? 'core_audience_segments' : 'secondary_audience_segments';
    const current = form[key] || [];
    const next = current.includes(code) ? current.filter(c => c !== code) : [...current, code];
    setForm({ ...form, [key]: next });
  };

  if (loading) return <ProjectLayout><div className="loading-screen"><div className="loading-spinner" /></div></ProjectLayout>;

  return (
    <ProjectLayout>
      {toast && <div className="toast">{toast}</div>}
      <div className="persona-page">
        <h1 className="page-title">Persona & Target Audience</h1>
        <p className="page-subtitle">Define who your film speaks to.</p>

        <div className="persona-grid">
          {/* Left — Persona editor */}
          <div className="persona-left">
            <Card>
              <div className="persona-card-header">
                <h3 className="section-title" style={{ margin: 0 }}>Persona Summary</h3>
                {locked && <span className="lock-icon">🔒 Locked</span>}
              </div>

              <textarea
                className="persona-textarea"
                rows={5}
                placeholder="Describe your film's core persona (tone, mood, archetype)…"
                value={form.persona_summary}
                onChange={e => !locked && setForm({ ...form, persona_summary: e.target.value })}
                readOnly={locked}
              />

              <label className="persona-field-label">Positioning Statement</label>
              <input
                className="persona-input"
                type="text"
                placeholder="e.g. A rural action drama for mass audience in AP/TG"
                value={form.positioning_statement}
                onChange={e => !locked && setForm({ ...form, positioning_statement: e.target.value })}
                readOnly={locked}
              />

              <div className="persona-actions">
                {!locked && (
                  <button className="btn-primary-green" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Persona'}
                  </button>
                )}
                <button className="btn-ghost" onClick={handleLock}>
                  {locked ? '🔓 Unlock Persona' : '🔒 Lock Persona'}
                </button>
              </div>

              <div className="persona-llm-note">
                <button
                  className="btn-gemini"
                  disabled={generating || locked}
                  onClick={async () => {
                    if (!projectMeta) { setToast('Project details not loaded yet.'); return; }
                    setGenerating(true);
                    try {
                      const result = await generatePersona(projectMeta, teamResponses);
                      setForm(prev => ({
                        ...prev,
                        persona_summary:            result.persona_summary        || prev.persona_summary,
                        positioning_statement:       result.positioning_statement  || prev.positioning_statement,
                        core_audience_segments:      (result.core_audience_segments      || []).filter(c => AUDIENCE_SEGMENTS.some(s => s.code === c)),
                        secondary_audience_segments: (result.secondary_audience_segments || []).filter(c => AUDIENCE_SEGMENTS.some(s => s.code === c)),
                      }));
                      setToast('✦ Persona generated by Gemini — review & save.');
                    } catch (e) {
                      console.error(e);
                      setToast('Gemini error: ' + e.message);
                    } finally {
                      setGenerating(false);
                    }
                  }}
                >
                  {generating ? (
                    <><span className="gemini-spinner" />Generating…</>
                  ) : (
                    <>✦ Generate Persona with Gemini</>
                  )}
                </button>
                <p className="gemini-hint">Uses film details + team responses to auto-fill persona. You can edit before saving.</p>
              </div>
            </Card>

            {/* Team link */}
            <Card style={{ marginTop: 20 }}>
              <h3 className="section-title">Team POV</h3>
              <p className="persona-team-subtitle">Get your director, writer, co-producer to share their perspective.</p>
              <button className="btn-primary-green" onClick={handleGenerateLink}>Generate team link</button>
              {inviteUrl && (
                <div className="invite-url-box">
                  <span className="invite-url-text">{inviteUrl}</span>
                  <button className="btn-ghost" onClick={() => { navigator.clipboard.writeText(inviteUrl); setToast('Link copied!'); }}>
                    Copy
                  </button>
                </div>
              )}
              {teamResponses.length > 0 && (
                <div className="team-response-list">
                  <h4 className="section-title" style={{ marginTop: 16 }}>Responses ({teamResponses.length})</h4>
                  {teamResponses.map(r => (
                    <Card key={r.id} className="team-response-card">
                      <div className="tr-role">{r.respondent_role || 'Team member'}</div>
                      {r.perceived_strengths && <p className="tr-field"><strong>Strengths:</strong> {r.perceived_strengths}</p>}
                      {r.likely_audience    && <p className="tr-field"><strong>Audience:</strong> {r.likely_audience}</p>}
                      {r.reference_films    && <p className="tr-field"><strong>References:</strong> {r.reference_films}</p>}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right — Audience builder */}
          <div className="persona-right">
            <Card>
              <h3 className="section-title">Core Audience Segments</h3>
              <p className="persona-team-subtitle">Select primary segments who'll watch this film first.</p>
              <div className="audience-chips">
                {AUDIENCE_SEGMENTS.map(seg => (
                  <div
                    key={seg.code}
                    className={`audience-chip ${form.core_audience_segments?.includes(seg.code) ? 'audience-chip--active' : ''} ${locked ? 'audience-chip--locked' : ''}`}
                    onClick={() => toggleSegment(seg.code, 'core')}
                  >
                    <span className="aud-label">{seg.label}</span>
                    <span className="aud-region">{seg.region.join(', ')}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card style={{ marginTop: 20 }}>
              <h3 className="section-title">Secondary Audience Segments</h3>
              <p className="persona-team-subtitle">Audiences who may discover the film post-release.</p>
              <div className="audience-chips">
                {AUDIENCE_SEGMENTS.map(seg => (
                  <div
                    key={seg.code}
                    className={`audience-chip ${form.secondary_audience_segments?.includes(seg.code) ? 'audience-chip--active audience-chip--secondary' : ''} ${locked ? 'audience-chip--locked' : ''}`}
                    onClick={() => toggleSegment(seg.code, 'secondary')}
                  >
                    <span className="aud-label">{seg.label}</span>
                    <span className="aud-region">{seg.region.join(', ')}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
};

export default PersonaPage;
