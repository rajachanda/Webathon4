import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Card from '../components/Card';
import ChatForm from '../components/ChatForm';
import { useAuth } from '../AuthContext';
import { projectService } from '../services/api.service';
import './NewProjectOnboarding.css';

const STEPS = [
  { id: 'title',            label: "What's your film called? 🎬",                    type: 'text',     required: true, placeholder: 'e.g. Rangasthalam 2' },
  { id: 'language_region',  label: 'Language & primary region?',                      type: 'select',   required: true,
    options: ['Telugu – AP/TG', 'Tamil – TN', 'Kannada – KA', 'Malayalam – KL', 'Pan South'] },
  { id: 'genre',            label: 'Genre & sub-genre?',                              type: 'select',   required: true,
    options: ['Action', 'Romance', 'Comedy', 'Drama', 'Thriller', 'Horror', 'Family', 'Social Drama', 'Fantasy', 'Action-Comedy', 'Romantic Comedy', 'Action-Drama'] },
  { id: 'tone_pace',        label: 'Pick the tone & pace of your film.',              type: 'chips',    required: false,
    options: ['Light', 'Dark', 'Mixed', 'Fast-paced', 'Slow-burn', 'Balanced'] },
  { id: 'budget_star',      label: 'Budget band & star power?',                      type: 'chips',    required: false,
    options: ['Micro budget', 'Small budget', 'Mid budget', 'Unknown talent', 'Rising star', 'Known face'] },
  { id: 'rating_platform',  label: 'Film rating & platform strategy?',               type: 'chips',    required: false,
    options: ['U', 'U/A', 'A', 'Theatrical-first', 'OTT-first', 'Direct-OTT'] },
  { id: 'runtime_cast',     label: 'Runtime, hero & heroine names (brief)?',         type: 'text',     required: false, placeholder: 'e.g. 140 min | Ram | Sai Pallavi' },
  { id: 'logline',          label: 'Give us the logline + what\'s the interesting hook?', type: 'textarea', required: false, placeholder: 'e.g. A village boy fights a corrupt system… Hook: twist in interval' },
];

const NewProjectOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async (answers) => {
    setSaving(true);
    setError('');
    try {
      // Parse composite answers
      const [language, region_primary] = (answers.language_region || '').split(' – ');
      const toneChips  = answers.tone_pace  || [];
      const toneArr    = Array.isArray(toneChips) ? toneChips : [toneChips];
      const tone       = toneArr.find(t => ['Light','Dark','Mixed'].includes(t)) || '';
      const pace       = toneArr.find(t => ['Fast-paced','Slow-burn','Balanced'].includes(t)) || '';

      const budgetChips = answers.budget_star || [];
      const budgetArr   = Array.isArray(budgetChips) ? budgetChips : [budgetChips];
      const budget_band     = budgetArr.find(b => ['Micro budget','Small budget','Mid budget'].includes(b))?.replace(' budget','').toLowerCase() || '';
      const star_power_band = budgetArr.find(b => ['Unknown talent','Rising star','Known face'].includes(b))?.toLowerCase() || '';

      const rpChips  = answers.rating_platform || [];
      const rpArr    = Array.isArray(rpChips) ? rpChips : [rpChips];
      const rating   = rpArr.find(r => ['U','U/A','A'].includes(r)) || '';
      const platform = rpArr.find(r => ['Theatrical-first','OTT-first','Direct-OTT'].includes(r))?.toLowerCase().replace('-','').replace(' ','-') || '';

      const castParts = (answers.runtime_cast || '').split('|').map(s => s.trim());
      const runtime_minutes = parseInt(castParts[0]) || null;
      const hero_name   = castParts[1] || '';
      const heroine_name = castParts[2] || '';

      const payload = {
        title: answers.title || 'Untitled',
        owner_id: user.id,
        metadata: {
          language: language || '',
          region_primary: region_primary || '',
          genre: answers.genre || '',
          subgenre: '',
          tone,
          pace,
          budget_band,
          star_power_band,
          rating,
          platform_strategy: platform,
          runtime_minutes,
          hero_name,
          heroine_name,
          logline: answers.logline || '',
          interesting_hook: answers.logline || '',
        },
      };

      const project = await projectService.createProjectWithMetadata(payload);
      navigate(`/projects/${project.id}/persona`, {
        state: { toast: "Nice! We've captured the basics. Let's sharpen the film's persona and audience." },
      });
    } catch (e) {
      console.error(e);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-page">
      <Header />
      <div className="onboarding-body">
        <div className="onboarding-heading">
          <h1 className="page-title">Introduce your film 🎬</h1>
          <p className="page-subtitle">Answer 8 quick questions and we'll get started.</p>
        </div>
        <Card className="onboarding-card">
          {saving ? (
            <div className="onboarding-saving">
              <div className="loading-spinner" />
              <p>Saving your film…</p>
            </div>
          ) : (
            <ChatForm steps={STEPS} onComplete={handleComplete} />
          )}
          {error && <p className="onboarding-error">{error}</p>}
        </Card>
      </div>
    </div>
  );
};

export default NewProjectOnboarding;
