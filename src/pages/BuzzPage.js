import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import GaugeMeter from '../components/GaugeMeter';
import SparklineChart from '../components/SparklineChart';
import { projectService } from '../services/api.service';
import './BuzzPage.css';

const DEFAULT_FORM = {
  watch_time_norm: '',
  share_rate_norm: '',
  sentiment_score_norm: '',
  search_growth_norm: '',
  engagement_rate_norm: '',
};

const calcBuzz = (f) => {
  const w = parseFloat(f.watch_time_norm)      || 0;
  const s = parseFloat(f.share_rate_norm)       || 0;
  const se= parseFloat(f.sentiment_score_norm)  || 0;
  const sg= parseFloat(f.search_growth_norm)    || 0;
  const e = parseFloat(f.engagement_rate_norm)  || 0;
  return Math.round((0.25*w + 0.20*s + 0.20*se + 0.15*sg + 0.20*e) * 100);
};

const BuzzPage = () => {
  const { projectId } = useParams();
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectService.getBuzzSnapshots(projectId);
        setSnapshots(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const buzz_score = calcBuzz(form);
      const payload = {
        ...Object.fromEntries(
          Object.entries(form).map(([k, v]) => [k, parseFloat(v) || 0])
        ),
        buzz_score,
        date: new Date().toISOString().split('T')[0],
        source_type: 'manual',
      };
      const snap = await projectService.createBuzzSnapshot(projectId, payload);
      setSnapshots([...snapshots, snap]);
      setForm(DEFAULT_FORM);
      showToast(`Buzz snapshot saved! Score: ${buzz_score}/100`);
    } catch (e) {
      console.error(e);
      showToast('Error saving snapshot.');
    } finally {
      setSaving(false);
    }
  };

  const latest = snapshots[snapshots.length - 1];
  const prev    = snapshots[snapshots.length - 2];
  const buzzScores = snapshots.map(s => s.buzz_score);
  const trend   = latest && prev
    ? ((latest.buzz_score - prev.buzz_score) / (prev.buzz_score || 1) * 100).toFixed(1)
    : null;

  const previewScore = Object.values(form).some(v => v !== '') ? calcBuzz(form) : null;

  if (loading) return <ProjectLayout><div className="loading-screen"><div className="loading-spinner" /></div></ProjectLayout>;

  return (
    <ProjectLayout>
      {toast && <div className="toast">{toast}</div>}
      <div className="buzz-page">
        <h1 className="page-title">Buzz Score & Trend</h1>
        <p className="page-subtitle">
          We combine watch time, shares, sentiment, search growth, and engagement into a single Buzz Score
          to indicate how hot your film's online presence is right now.
        </p>

        <div className="buzz-grid">
          {/* Score card */}
          <Card className="buzz-score-card">
            {latest ? (
              <>
                <GaugeMeter score={latest.buzz_score} />
                <p className="buzz-date">Last updated: {latest.date}</p>
                {trend !== null && (
                  <p className={`buzz-trend ${parseFloat(trend) >= 0 ? 'buzz-trend--up' : 'buzz-trend--down'}`}>
                    {parseFloat(trend) >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last snapshot
                  </p>
                )}
                {buzzScores.length > 1 && (
                  <div className="buzz-sparkline">
                    <SparklineChart data={buzzScores} width={180} height={48} />
                  </div>
                )}
              </>
            ) : (
              <div className="buzz-no-data">
                <p>No buzz data yet.</p>
                <p className="buzz-no-data-sub">Add your first snapshot below.</p>
              </div>
            )}
          </Card>

          {/* Input form */}
          <Card>
            <h3 className="section-title">Add Snapshot (Manual)</h3>
            <p className="buzz-form-hint">Enter values as decimals 0–1 (e.g. 0.72 = 72%)</p>
            {[
              { id: 'watch_time_norm',     label: 'Watch time (normalised 0–1)',     weight: '25%' },
              { id: 'share_rate_norm',     label: 'Share rate (0–1)',                weight: '20%' },
              { id: 'sentiment_score_norm',label: 'Sentiment score (0–1)',           weight: '20%' },
              { id: 'search_growth_norm',  label: 'Search growth (0–1)',             weight: '15%' },
              { id: 'engagement_rate_norm',label: 'Engagement rate (0–1)',           weight: '20%' },
            ].map(f => (
              <div key={f.id} className="buzz-input-row">
                <label className="buzz-input-label">
                  {f.label} <span className="buzz-weight">({f.weight})</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  className="buzz-input"
                  placeholder="0.00"
                  value={form[f.id]}
                  onChange={e => setForm({ ...form, [f.id]: e.target.value })}
                />
              </div>
            ))}

            {previewScore !== null && (
              <div className="buzz-preview">
                Preview score: <strong style={{ color: previewScore >= 70 ? '#00ff88' : previewScore >= 40 ? '#ffa028' : '#ff5050' }}>{previewScore} / 100</strong>
              </div>
            )}

            <button className="btn-primary-green" onClick={handleSave} disabled={saving} style={{ marginTop: 12 }}>
              {saving ? 'Saving…' : 'Save Snapshot'}
            </button>
            <p className="buzz-api-note">
              🔧 TODO: Integrate YouTube / Instagram APIs for auto buzz metrics.
            </p>
          </Card>
        </div>

        {/* History */}
        {snapshots.length > 0 && (
          <Card style={{ marginTop: 24 }}>
            <h3 className="section-title">Snapshot History</h3>
            <div className="buzz-history-table">
              <div className="bht-head">
                <span>Date</span><span>Buzz</span><span>Watch</span><span>Share</span><span>Sentiment</span><span>Search</span><span>Engage</span>
              </div>
              {[...snapshots].reverse().map((s, i) => (
                <div key={s.id || i} className="bht-row">
                  <span>{s.date}</span>
                  <span className="bht-score">{s.buzz_score}</span>
                  <span>{s.watch_time_norm?.toFixed(2)}</span>
                  <span>{s.share_rate_norm?.toFixed(2)}</span>
                  <span>{s.sentiment_score_norm?.toFixed(2)}</span>
                  <span>{s.search_growth_norm?.toFixed(2)}</span>
                  <span>{s.engagement_rate_norm?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </ProjectLayout>
  );
};

export default BuzzPage;
