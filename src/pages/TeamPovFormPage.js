import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/Card';
import { projectService } from '../services/api.service';
import { generateTeamFormQuestions } from '../services/gemini.service';
import './TeamPovFormPage.css';

const DEFAULT_QUESTIONS = [
  { id: 'tone_description',     label: 'How would you describe the tone?',   type: 'text',     placeholder: 'e.g. Raw and emotional, light-hearted…' },
  { id: 'themes_perceived',     label: 'Main themes you see in this film?',  type: 'text',     placeholder: 'e.g. love, revenge, social justice' },
  { id: 'perceived_strengths',  label: 'Biggest strengths?',                 type: 'textarea', placeholder: 'What stands out positively?' },
  { id: 'perceived_weaknesses', label: 'Biggest risks / weaknesses?',        type: 'textarea', placeholder: 'What could be a challenge?' },
  { id: 'likely_audience',      label: 'Who is the likely audience?',        type: 'text',     placeholder: 'e.g. Urban youth 18–28, multiplex crowd' },
  { id: 'reference_films',      label: '2–3 reference films',                type: 'text',     placeholder: 'e.g. Arjun Reddy, Rangasthalam' },
];

const TeamPovFormPage = () => {
  const { token } = useParams();
  const [linkValid,       setLinkValid]       = useState(false);
  const [loadingPage,     setLoadingPage]     = useState(true);
  const [loadingQ,        setLoadingQ]        = useState(false);
  const [questions,       setQuestions]       = useState(DEFAULT_QUESTIONS);
  const [fileMeta,        setFileMeta]        = useState(null);
  const [answers,         setAnswers]         = useState({});
  const [respondentRole,  setRespondentRole]  = useState('');
  const [submitted,       setSubmitted]       = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState('');

  // ── On mount: validate token + fetch metadata + generate questions ─────────
  useEffect(() => {
    const load = async () => {
      try {
        // Validate token
        await projectService.getTeamInvite(token);
        setLinkValid(true);

        // Fetch project metadata (public read via token join)
        let meta = null;
        try {
          meta = await projectService.getProjectMetadataByToken(token);
          setFileMeta(meta);
        } catch (metaErr) {
          console.warn('Could not fetch project metadata:', metaErr.message);
        }

        // Generate Gemini questions if we have metadata
        if (meta) {
          setLoadingQ(true);
          try {
            const generated = await generateTeamFormQuestions(meta);
            if (generated && generated.length > 0) {
              setQuestions(generated);
            }
          } catch (gErr) {
            console.warn('Gemini question generation failed, using defaults:', gErr.message);
            // Leave DEFAULT_QUESTIONS in place
          } finally {
            setLoadingQ(false);
          }
        }
      } catch (e) {
        console.error(e);
        setError('This link is invalid or has expired.');
      } finally {
        setLoadingPage(false);
      }
    };
    load();
  }, [token]);

  const handleAnswer = (id, value) => setAnswers(prev => ({ ...prev, [id]: value }));

  const handleSubmit = async () => {
    if (!respondentRole.trim()) { setError('Please enter your role.'); return; }
    setSubmitting(true);
    setError('');
    try {
      // Build payload — keep standard field names for known question IDs,
      // store the rest in dynamic_answers for LLM processing
      const standardFields  = {};
      const dynamicAnswers  = [];
      questions.forEach(q => {
        const val = answers[q.id] || '';
        const standardKeys = ['tone_description','themes_perceived','perceived_strengths',
                               'perceived_weaknesses','likely_audience','reference_films','notes'];
        if (standardKeys.includes(q.id)) {
          standardFields[q.id] = val;
        } else {
          dynamicAnswers.push({ question: q.label, answer: val });
        }
      });

      await projectService.submitTeamResponse(token, {
        respondent_role: respondentRole,
        ...standardFields,
        dynamic_answers: dynamicAnswers.length > 0 ? dynamicAnswers : undefined,
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render states ────────────────────────────────────────────────────────
  if (loadingPage) return (
    <div className="team-pov-page">
      <div className="loading-screen"><div className="loading-spinner" /></div>
    </div>
  );

  if (error && !linkValid) return (
    <div className="team-pov-page">
      <div className="team-pov-header">
        <h2 className="team-pov-brand">CinYstore</h2>
      </div>
      <div className="team-pov-body">
        <Card className="team-pov-card">
          <div className="thanks-icon">⚠️</div>
          <h2>Invalid link</h2>
          <p>{error}</p>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="team-pov-page">
      <div className="team-pov-header">
        <h2 className="team-pov-brand">CinYstore</h2>
        <p className="team-pov-tagline">
          {fileMeta?.title ? `Share your perspective on "${fileMeta.title}"` : 'Help shape this film\'s persona'}
        </p>
      </div>
      <div className="team-pov-body">

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

            {/* Role — always first */}
            <div className="tpov-field">
              <label>Your role <span className="tpov-required">*</span></label>
              <input
                placeholder="Director, Writer, Co-Producer…"
                value={respondentRole}
                onChange={e => setRespondentRole(e.target.value)}
              />
            </div>

            {/* Dynamic / Gemini-generated questions */}
            {loadingQ ? (
              <div className="tpov-generating">
                <div className="loading-spinner" style={{ width: 20, height: 20 }} />
                <span>Generating personalised questions for this film…</span>
              </div>
            ) : (
              questions.map(q => (
                <div className="tpov-field" key={q.id}>
                  <label>{q.label}</label>
                  {q.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      placeholder={q.placeholder || ''}
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswer(q.id, e.target.value)}
                    />
                  ) : q.type === 'select' ? (
                    <select
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswer(q.id, e.target.value)}
                    >
                      <option value="">Select an option…</option>
                      {(q.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      placeholder={q.placeholder || ''}
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswer(q.id, e.target.value)}
                    />
                  )}
                </div>
              ))
            )}

            {error && <p className="tpov-error">{error}</p>}
            <button
              className="btn-primary-green"
              onClick={handleSubmit}
              disabled={submitting || loadingQ}
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
