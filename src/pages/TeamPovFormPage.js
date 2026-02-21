import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/Card';
import Icon from '../components/Icon';
import { projectService } from '../services/api.service';
import { getQuestionsForRole, getRoleLabel } from '../config/teamRoleQuestions';
import './TeamPovFormPage.css';



const TeamPovFormPage = () => {
  const { token } = useParams();
  const [linkValid,       setLinkValid]       = useState(false);
  const [loadingPage,     setLoadingPage]     = useState(true);
  const [questions,       setQuestions]       = useState([]);
  const [fileMeta,        setFileMeta]        = useState(null);
  const [answers,         setAnswers]         = useState({});
  const [roleFromInvite,  setRoleFromInvite]  = useState('');
  const [roleName,        setRoleName]        = useState('');
  const [submitted,       setSubmitted]       = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState('');

  // ── On mount: validate token + load role-specific questions ─────────
  useEffect(() => {
    const load = async () => {
      try {
        // Validate token and get invite with role
        const invite = await projectService.getTeamInvite(token);
        setLinkValid(true);
        
        const role = invite.role_hint || 'director';
        setRoleFromInvite(role);
        setRoleName(getRoleLabel(role));
        
        // Load role-specific questions
        const roleQuestions = getQuestionsForRole(role);
        setQuestions(roleQuestions);

        // Fetch project metadata for display
        try {
          const meta = await projectService.getProjectMetadataByToken(token);
          setFileMeta(meta);
        } catch (metaErr) {
          console.warn('Could not fetch project metadata:', metaErr.message);
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
    setSubmitting(true);
    setError('');
    try {
      // Build payload with dynamic answers based on role-specific questions
      const dynamicAnswers = [];
      questions.forEach(q => {
        const val = answers[q.id] || '';
        if (val.trim()) {
          dynamicAnswers.push({ question: q.label, answer: val });
        }
      });

      await projectService.submitTeamResponse(token, {
        respondent_role: roleName,
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
          <div className="thanks-icon"><Icon name="warning" size={40} /></div>
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
        {roleName && <p className="team-pov-role-badge">Role: {roleName}</p>}
      </div>
      <div className="team-pov-body">

        {submitted ? (
          <Card className="team-pov-thanks">
            <div className="thanks-icon"><Icon name="film" size={40} /></div>
            <h2>Thank you!</h2>
            <p>Your perspective has been submitted. The producer will use these insights to shape the film's persona.</p>
          </Card>
        ) : (
          <Card className="team-pov-card">
            <h2 className="team-pov-form-title">Share your perspective as {roleName}</h2>
            <p className="team-pov-form-subtitle">Answer these questions tailored to your role.</p>

            {/* Role-specific questions */}
            {questions.map(q => (
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
            }

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
