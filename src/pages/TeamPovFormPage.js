import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/Card';
import { projectService } from '../services/api.service';
import './TeamPovFormPage.css';

const TeamPovFormPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    respondent_role: '',
    tone_description: '',
    themes_perceived: '',
    perceived_strengths: '',
    perceived_weaknesses: '',
    likely_audience: '',
    reference_films: '',
    notes: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        await projectService.getTeamInvite(token);
      } catch (e) {
        console.error(e);
        setError('This link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleChange = (field, value) => setForm({ ...form, [field]: value });

  const handleSubmit = async () => {
    if (!form.respondent_role.trim()) { setError('Please enter your role.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await projectService.submitTeamResponse(token, form);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="team-pov-page">
      <div className="loading-screen"><div className="loading-spinner" /></div>
    </div>
  );

  return (
    <div className="team-pov-page">
      <div className="team-pov-header">
        <h2 className="team-pov-brand">CinYstore</h2>
        <p className="team-pov-tagline">Help shape this film's persona</p>
      </div>
      <div className="team-pov-body">
        {error && !submitted && (
          <div className="team-pov-error">{error}</div>
        )}

        {submitted ? (
          <Card className="team-pov-thanks">
            <div className="thanks-icon">🎬</div>
            <h2>Thank you!</h2>
            <p>Your perspective has been submitted. The producer will use these insights to shape the film's persona.</p>
          </Card>
        ) : (
          <Card className="team-pov-card">
            <h2 className="team-pov-form-title">Share your perspective</h2>
            <p className="team-pov-form-subtitle">Answer these quick questions — no login needed.</p>

            <div className="tpov-field">
              <label>Your role</label>
              <input
                placeholder="Director, Writer, Co-Producer…"
                value={form.respondent_role}
                onChange={e => handleChange('respondent_role', e.target.value)}
              />
            </div>
            <div className="tpov-field">
              <label>How would you describe the tone?</label>
              <input
                placeholder="e.g. Raw and emotional, light-hearted…"
                value={form.tone_description}
                onChange={e => handleChange('tone_description', e.target.value)}
              />
            </div>
            <div className="tpov-field">
              <label>Main themes?</label>
              <input
                placeholder="e.g. love, revenge, social issue"
                value={form.themes_perceived}
                onChange={e => handleChange('themes_perceived', e.target.value)}
              />
            </div>
            <div className="tpov-field">
              <label>Biggest strengths?</label>
              <textarea
                rows={2}
                placeholder="What stands out positively?"
                value={form.perceived_strengths}
                onChange={e => handleChange('perceived_strengths', e.target.value)}
              />
            </div>
            <div className="tpov-field">
              <label>Biggest risks / weaknesses?</label>
              <textarea
                rows={2}
                placeholder="What could be a challenge?"
                value={form.perceived_weaknesses}
                onChange={e => handleChange('perceived_weaknesses', e.target.value)}
              />
            </div>
            <div className="tpov-field">
              <label>Who is the likely audience?</label>
              <input
                placeholder="e.g. Urban youth 18–28, multiplex crowd"
                value={form.likely_audience}
                onChange={e => handleChange('likely_audience', e.target.value)}
              />
            </div>
            <div className="tpov-field">
              <label>2–3 reference films</label>
              <input
                placeholder="e.g. Arjun Reddy, Rangasthalam, Baahubali"
                value={form.reference_films}
                onChange={e => handleChange('reference_films', e.target.value)}
              />
            </div>
            <div className="tpov-field">
              <label>Any other notes?</label>
              <textarea
                rows={2}
                placeholder="Anything else you'd like to add…"
                value={form.notes}
                onChange={e => handleChange('notes', e.target.value)}
              />
            </div>

            {error && <p className="tpov-error">{error}</p>}
            <button
              className="btn-primary-green"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeamPovFormPage;
