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
  { id: 'genre',            label: 'Genre & sub-genre?',                              type: 'genre-subgenre',   required: true,
    mainGenres: ['Action', 'Romance', 'Comedy', 'Drama', 'Thriller', 'Horror', 'Family', 'Social Drama', 'Fantasy'],
    subGenreMap: {
      'Action': ['Martial Arts', 'Superhero', 'Military', 'Heist', 'Spy/Espionage', 'Revenge'],
      'Romance': ['Romantic Drama', 'Romantic Comedy', 'Period Romance', 'Teen Romance', 'Musical Romance'],
      'Comedy': ['Slapstick', 'Dark Comedy', 'Satire', 'Parody', 'Situational Comedy', 'Family Comedy'],
      'Drama': ['Social Drama', 'Family Drama', 'Political Drama', 'Biographical', 'Sports Drama', 'Legal Drama'],
      'Thriller': ['Psychological', 'Crime', 'Mystery', 'Legal Thriller', 'Political Thriller'],
      'Horror': ['Supernatural', 'Slasher', 'Psychological Horror', 'Comedy-Horror', 'Monster'],
      'Family': ['Animation', 'Children', 'Family Adventure', 'Family Drama'],
      'Social Drama': ['Caste/Class Issues', 'Rural', 'Urban', 'Women-centric', 'Education'],
      'Fantasy': ['Mythological', 'Fairy Tale', 'Sci-Fi Fantasy', 'Dark Fantasy', 'Adventure Fantasy']
    }
  },
  { id: 'tone_pace',        label: 'Pick the tone & pace of your film.',              type: 'tone-pace',    required: false,
    toneOptions: ['Light', 'Dark', 'Mixed'],
    paceOptions: ['Fast-paced', 'Slow-burn', 'Balanced'] },
  { id: 'budget_star',      label: 'Budget band & star power?',                      type: 'budget-star',    required: false,
    budgetOptions: ['Micro budget', 'Small budget', 'Mid budget'],
    starPowerOptions: ['Unknown talent', 'Rising star', 'Known face'] },
  { id: 'rating_platform',  label: 'Film rating & platform strategy?',               type: 'rating-platform',    required: false,
    ratingOptions: ['U', 'U/A', 'A'],
    platformOptions: ['Theatrical-first', 'OTT-first', 'Direct-OTT'] },
  { id: 'cast_runtime',     label: 'Runtime, hero & heroine names?',                  type: 'multi-input',  required: false,
    fields: [
      { id: 'runtime', placeholder: 'Runtime in minutes (e.g. 140)' },
      { id: 'hero_name', placeholder: 'Hero name (e.g. Ram Charan)' },
      { id: 'heroine_name', placeholder: 'Heroine name (e.g. Sai Pallavi)' }
    ]
  },
  { id: 'logline_hook',     label: 'Give us the logline + what\'s the interesting hook?', type: 'multi-input',  required: false,
    fields: [
      { id: 'logline', placeholder: 'Logline (e.g. A village boy fights a corrupt system)' },
      { id: 'hook', placeholder: 'Interesting hook (e.g. Interval twist reveals he\'s the villain)' }
    ]
  },
  { id: 'media_links',      label: 'Add your trailer/teaser/song links (optional, helps Buzz & Sentiment analysis)', type: 'multi-input',  required: false,
    fields: [
      { id: 'primary_trailer_url', placeholder: 'Primary trailer URL (e.g. https://youtube.com/watch?v=...)' },
      { id: 'secondary_video_1', placeholder: 'Additional video URL 1 (optional)' },
      { id: 'secondary_video_2', placeholder: 'Additional video URL 2 (optional)' }
    ]
  },
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
      
      // Parse tone/pace
      const tonePaceParts = (answers.tone_pace || '').split(' / ');
      const tone = tonePaceParts[0] || '';
      const pace = tonePaceParts[1] || '';

      // Parse budget/star power
      const budgetStarParts = (answers.budget_star || '').split(' / ');
      const budget_band = budgetStarParts[0] ? budgetStarParts[0].replace(' budget', '').toLowerCase() : '';
      const star_power_band = budgetStarParts[1] ? budgetStarParts[1].toLowerCase() : '';

      // Parse rating/platform
      const ratingPlatformParts = (answers.rating_platform || '').split(' / ');
      const rating = ratingPlatformParts[0] || '';
      const platform = ratingPlatformParts[1] ? ratingPlatformParts[1].toLowerCase().replace('-', '').replace(' ', '-') : '';

      // Parse cast/runtime multi-input
      const castRuntime = answers.cast_runtime || {};
      const runtime_minutes = parseInt(castRuntime.runtime) || null;
      const hero_name = castRuntime.hero_name || '';
      const heroine_name = castRuntime.heroine_name || '';

      // Parse logline/hook multi-input
      const loglineHook = answers.logline_hook || {};
      const logline = loglineHook.logline || '';
      const interesting_hook = loglineHook.hook || '';

      // Parse media links (new Step 9)
      const mediaLinksInput = answers.media_links || {};
      const initial_media_links = {};
      
      if (mediaLinksInput.primary_trailer_url) {
        initial_media_links.primary_trailer_url = mediaLinksInput.primary_trailer_url;
      }
      
      const secondaryVideos = [
        mediaLinksInput.secondary_video_1,
        mediaLinksInput.secondary_video_2,
      ].filter(Boolean);
      
      if (secondaryVideos.length > 0) {
        initial_media_links.secondary_videos = secondaryVideos;
      }

      // Parse genre/subgenre
      const genreParts = (answers.genre || '').split(' / ');
      const mainGenre = genreParts[0] || '';
      const subGenre = genreParts[1] || '';

      const payload = {
        title: answers.title || 'Untitled',
        owner_id: user.id,
        metadata: {
          language: language || '',
          region_primary: region_primary || '',
          genre: mainGenre,
          subgenre: subGenre,
          tone,
          pace,
          budget_band,
          star_power_band,
          rating,
          platform_strategy: platform,
          runtime_minutes,
          hero_name,
          heroine_name,
          logline,
          interesting_hook,
          initial_media_links: Object.keys(initial_media_links).length > 0 ? initial_media_links : null,
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
          <p className="page-subtitle">Answer 9 quick questions and we'll get started.</p>
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
