// Role-specific questions for Team POV form
// Each role has a unique set of questions tailored to their perspective

export const TEAM_ROLES = [
  { value: 'director', label: 'Director' },
  { value: 'assistant_director', label: 'Assistant Director' },
  { value: 'writer', label: 'Writer / Scriptwriter' },
  { value: 'producer', label: 'Producer' },
  { value: 'hero', label: 'Hero / Lead Actor' },
  { value: 'heroine', label: 'Heroine / Lead Actress' },
  { value: 'cinematographer', label: 'Cinematographer' },
  { value: 'music_director', label: 'Music Director' },
  { value: 'editor', label: 'Editor' },
  { value: 'art_director', label: 'Art Director' },
];

export const ROLE_SPECIFIC_QUESTIONS = {
  director: [
    { id: 'vision', label: 'What is your core vision for this film?', type: 'textarea', placeholder: 'Describe the essence of what you want to achieve...' },
    { id: 'tone_style', label: 'How would you describe the tone and visual style?', type: 'text', placeholder: 'e.g. Gritty realism, poetic, fast-paced...' },
    { id: 'audience_connect', label: 'Which audience will connect most with this story?', type: 'text', placeholder: 'e.g. Urban youth, family audiences...' },
    { id: 'unique_elements', label: 'What makes this film unique in the market?', type: 'textarea', placeholder: 'Key differentiators from other films...' },
    { id: 'reference_films', label: '2-3 reference films for inspiration', type: 'text', placeholder: 'e.g. Arjun Reddy, Rangasthalam' },
    { id: 'challenges', label: 'What are the biggest challenges you foresee?', type: 'textarea', placeholder: 'Production, marketing, or creative challenges...' },
  ],
  
  assistant_director: [
    { id: 'director_vision', label: 'How do you interpret the director\'s vision?', type: 'textarea', placeholder: 'Your understanding of the film...' },
    { id: 'execution_challenges', label: 'What are the key execution challenges?', type: 'textarea', placeholder: 'Logistical or creative hurdles...' },
    { id: 'tone_pace', label: 'How would you describe the tone and pace?', type: 'text', placeholder: 'e.g. Dark and intense, light-hearted...' },
    { id: 'target_audience', label: 'Who is the target audience?', type: 'text', placeholder: 'e.g. Mass audience, urban youth...' },
    { id: 'strengths', label: 'What are the film\'s biggest strengths?', type: 'textarea', placeholder: 'Story, performances, visuals...' },
  ],
  
  writer: [
    { id: 'story_essence', label: 'What is the essence of your story?', type: 'textarea', placeholder: 'Core narrative and theme...' },
    { id: 'character_arc', label: 'Describe the protagonist\'s journey', type: 'textarea', placeholder: 'How do they transform...' },
    { id: 'themes', label: 'What are the main themes explored?', type: 'text', placeholder: 'e.g. Revenge, redemption, love...' },
    { id: 'unique_hook', label: 'What is the unique hook or twist?', type: 'textarea', placeholder: 'What makes it compelling...' },
    { id: 'emotional_tone', label: 'What emotions should the audience feel?', type: 'text', placeholder: 'e.g. Anger, joy, inspiration...' },
    { id: 'target_demographics', label: 'Who will relate to this story most?', type: 'text', placeholder: 'Age group, demographics...' },
  ],
  
  producer: [
    { id: 'commercial_viability', label: 'What makes this film commercially viable?', type: 'textarea', placeholder: 'Market potential, audience appeal...' },
    { id: 'usp', label: 'What is the unique selling proposition?', type: 'text', placeholder: 'What sets it apart...' },
    { id: 'target_market', label: 'Who is the target market?', type: 'text', placeholder: 'Demographics, regions...' },
    { id: 'competitive_advantage', label: 'How does it stand against competition?', type: 'textarea', placeholder: 'Positioning in the market...' },
    { id: 'marketing_angles', label: 'What are the key marketing angles?', type: 'textarea', placeholder: 'Star power, genre, story...' },
    { id: 'risks_mitigation', label: 'What are the risks and how to mitigate them?', type: 'textarea', placeholder: 'Potential challenges...' },
  ],
  
  hero: [
    { id: 'character_understanding', label: 'How do you understand your character?', type: 'textarea', placeholder: 'Character motivation, personality...' },
    { id: 'character_journey', label: 'Describe your character\'s emotional journey', type: 'textarea', placeholder: 'Transformation arc...' },
    { id: 'audience_connection', label: 'How will audiences connect with this character?', type: 'textarea', placeholder: 'Relatability factor...' },
    { id: 'challenging_scenes', label: 'Which scenes are most challenging/impactful?', type: 'text', placeholder: 'Key moments in the film...' },
    { id: 'unique_aspects', label: 'What makes this role unique for you?', type: 'textarea', placeholder: 'Different from past roles...' },
    { id: 'fan_appeal', label: 'What will appeal most to your fans?', type: 'text', placeholder: 'Action, emotions, style...' },
  ],
  
  heroine: [
    { id: 'character_depth', label: 'How do you perceive your character?', type: 'textarea', placeholder: 'Character strength, depth...' },
    { id: 'narrative_importance', label: 'What is your character\'s importance to the story?', type: 'textarea', placeholder: 'Role in the plot...' },
    { id: 'audience_resonance', label: 'How will female audiences relate to this role?', type: 'textarea', placeholder: 'Representation, empowerment...' },
    { id: 'chemistry', label: 'How would you describe the chemistry with the hero?', type: 'text', placeholder: 'Romantic, conflicted, supportive...' },
    { id: 'standout_moments', label: 'What are your standout moments?', type: 'textarea', placeholder: 'Key scenes or sequences...' },
    { id: 'character_uniqueness', label: 'What makes this character different?', type: 'text', placeholder: 'From typical heroine roles...' },
  ],
  
  cinematographer: [
    { id: 'visual_style', label: 'What is your visual approach for this film?', type: 'textarea', placeholder: 'Color palette, framing, camera movement...' },
    { id: 'mood_creation', label: 'How will visuals create the mood and tone?', type: 'textarea', placeholder: 'Lighting, composition...' },
    { id: 'reference_works', label: 'Visual references or inspirations', type: 'text', placeholder: 'Films, photographers...' },
    { id: 'unique_visuals', label: 'What visual elements will make this stand out?', type: 'textarea', placeholder: 'Unique shots, techniques...' },
    { id: 'audience_impact', label: 'How will visuals enhance audience experience?', type: 'text', placeholder: 'Immersion, emotional impact...' },
  ],
  
  music_director: [
    { id: 'musical_vision', label: 'What is your musical vision for the film?', type: 'textarea', placeholder: 'Genre, style, instrumentation...' },
    { id: 'emotional_landscape', label: 'How will music enhance the emotions?', type: 'textarea', placeholder: 'Score and songs approach...' },
    { id: 'genre_style', label: 'What musical genre/style fits best?', type: 'text', placeholder: 'Folk, western, electronic...' },
    { id: 'standout_tracks', label: 'Which tracks do you think will be chartbusters?', type: 'text', placeholder: 'Potential hit songs...' },
    { id: 'audience_appeal', label: 'What will appeal to music lovers?', type: 'textarea', placeholder: 'Melody, lyrics, beats...' },
  ],
  
  editor: [
    { id: 'pacing_approach', label: 'How do you plan to pace the narrative?', type: 'textarea', placeholder: 'Fast-paced, slow-burn, rhythmic...' },
    { id: 'storytelling_impact', label: 'How will editing enhance storytelling?', type: 'textarea', placeholder: 'Cuts, transitions, structure...' },
    { id: 'tone_pacing', label: 'What tone and pacing will you maintain?', type: 'text', placeholder: 'Tense, relaxed, dynamic...' },
    { id: 'challenging_sequences', label: 'Which sequences will be most challenging?', type: 'textarea', placeholder: 'Action, emotional scenes...' },
    { id: 'audience_engagement', label: 'How will editing keep audiences engaged?', type: 'text', placeholder: 'Narrative hooks, pace...' },
  ],
  
  art_director: [
    { id: 'visual_world', label: 'How are you building the visual world?', type: 'textarea', placeholder: 'Sets, locations, period details...' },
    { id: 'aesthetic_style', label: 'What is the aesthetic style?', type: 'text', placeholder: 'Realistic, stylized, period...' },
    { id: 'key_elements', label: 'What are the key design elements?', type: 'textarea', placeholder: 'Colors, textures, props...' },
    { id: 'authenticity', label: 'How will you ensure authenticity?', type: 'textarea', placeholder: 'Research, references...' },
    { id: 'visual_impact', label: 'What will visually wow the audience?', type: 'text', placeholder: 'Standout sets or designs...' },
  ],
};

// Helper function to get questions for a specific role
export const getQuestionsForRole = (role) => {
  return ROLE_SPECIFIC_QUESTIONS[role] || ROLE_SPECIFIC_QUESTIONS.director;
};

// Helper function to get role label
export const getRoleLabel = (roleValue) => {
  const role = TEAM_ROLES.find(r => r.value === roleValue);
  return role ? role.label : roleValue;
};
