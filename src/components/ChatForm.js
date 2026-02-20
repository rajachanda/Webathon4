import React, { useState, useRef, useEffect } from 'react';
import './ChatForm.css';

/**
 * Generic conversational stepper.
 * Props:
 *   steps: Array of { id, label, type: 'text'|'select'|'chips'|'textarea', options?, placeholder?, required? }
 *   onComplete: (answers: object) => void
 */
const ChatForm = ({ steps = [], onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState([]); // [{question, answer}]
  const [genreSubStep, setGenreSubStep] = useState('main'); // 'main' or 'sub'
  const [selectedMainGenre, setSelectedMainGenre] = useState('');
  const [tonePaceStep, setTonePaceStep] = useState('tone'); // 'tone' or 'pace'
  const [selectedTone, setSelectedTone] = useState('');
  const [budgetStarStep, setBudgetStarStep] = useState('budget'); // 'budget' or 'star'
  const [selectedBudget, setSelectedBudget] = useState('');
  const [ratingPlatformStep, setRatingPlatformStep] = useState('rating'); // 'rating' or 'platform'
  const [selectedRating, setSelectedRating] = useState('');
  const [multiInputValues, setMultiInputValues] = useState({}); // For multi-input fields
  const historyEndRef = useRef(null);

  const step = steps[currentStep];
  const total = steps.length;

  // Auto-scroll to bottom when history updates
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, currentStep]);

  const handleAnswer = (value) => {
    const ans = { ...answers, [step.id]: value };
    setAnswers(ans);
    
    // Format answer for display
    let displayAnswer = value;
    if (step.type === 'multi-input' && typeof value === 'object') {
      displayAnswer = Object.values(value).filter(Boolean).join(' | ') || 'Skipped';
    } else if (Array.isArray(value)) {
      displayAnswer = value.join(', ');
    }
    
    setHistory([...history, { question: step.label, answer: displayAnswer }]);
    setInputValue('');

    // Reset genre sub-step when moving to next question
    if (step.type === 'genre-subgenre') {
      setGenreSubStep('main');
      setSelectedMainGenre('');
    }
    
    // Reset tone-pace step when moving to next question
    if (step.type === 'tone-pace') {
      setTonePaceStep('tone');
      setSelectedTone('');
    }
    
    // Reset budget-star step when moving to next question
    if (step.type === 'budget-star') {
      setBudgetStarStep('budget');
      setSelectedBudget('');
    }
    
    // Reset rating-platform step when moving to next question
    if (step.type === 'rating-platform') {
      setRatingPlatformStep('rating');
      setSelectedRating('');
    }
    
    // Reset multi-input values
    if (step.type === 'multi-input') {
      setMultiInputValues({});
    }

    if (currentStep + 1 < total) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete && onComplete(ans);
    }
  };

  const handleGenreMainSelect = (genre) => {
    setSelectedMainGenre(genre);
    setGenreSubStep('sub');
  };

  const handleGenreSubSelect = (subgenre) => {
    const value = subgenre ? `${selectedMainGenre} / ${subgenre}` : selectedMainGenre;
    handleAnswer(value);
  };

  const handleGenreBack = () => {
    setGenreSubStep('main');
    setSelectedMainGenre('');
  };

  const handleToneSelect = (tone) => {
    setSelectedTone(tone);
    setTonePaceStep('pace');
  };

  const handlePaceSelect = (pace) => {
    const value = pace ? `${selectedTone} / ${pace}` : selectedTone;
    handleAnswer(value);
  };

  const handleTonePaceBack = () => {
    setTonePaceStep('tone');
    setSelectedTone('');
  };

  const handleBudgetSelect = (budget) => {
    setSelectedBudget(budget);
    setBudgetStarStep('star');
  };

  const handleStarPowerSelect = (starPower) => {
    const value = starPower ? `${selectedBudget} / ${starPower}` : selectedBudget;
    handleAnswer(value);
  };

  const handleBudgetStarBack = () => {
    setBudgetStarStep('budget');
    setSelectedBudget('');
  };

  const handleRatingSelect = (rating) => {
    setSelectedRating(rating);
    setRatingPlatformStep('platform');
  };

  const handlePlatformSelect = (platform) => {
    const value = platform ? `${selectedRating} / ${platform}` : selectedRating;
    handleAnswer(value);
  };

  const handleRatingPlatformBack = () => {
    setRatingPlatformStep('rating');
    setSelectedRating('');
  };

  const handleMultiInputChange = (fieldId, value) => {
    setMultiInputValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleMultiInputSubmit = () => {
    handleAnswer(multiInputValues);
  };

  const handleChipToggle = (opt, current) => {
    const arr = current || [];
    const next = arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt];
    setAnswers({ ...answers, [step.id]: next });
  };

  const handleSkip = () => {
    handleAnswer('');
  };

  const currentChips = answers[step?.id] || [];

  return (
    <div className="chat-form">
      {/* Progress bar */}
      <div className="chat-progress-bar">
        <div
          className="chat-progress-fill"
          style={{ width: `${((currentStep) / total) * 100}%` }}
        />
      </div>
      <p className="chat-step-counter">Step {currentStep + 1} of {total}</p>

      {/* Chat history */}
      <div className="chat-history">
        {history.map((h, i) => (
          <React.Fragment key={i}>
            <div className="chat-bubble chat-bubble--bot">{h.question}</div>
            {h.answer && <div className="chat-bubble chat-bubble--user">{h.answer}</div>}
          </React.Fragment>
        ))}

        {/* Current question */}
        {step && (
          <div className="chat-bubble chat-bubble--bot">{step.label}</div>
        )}
        <div ref={historyEndRef} />
      </div>

      {/* Input area */}
      {step && (
        <div className="chat-input-area">
          {(step.type === 'text' || step.type === 'textarea') && (
            <>
              {step.type === 'textarea' ? (
                <textarea
                  className="chat-textarea"
                  rows={3}
                  placeholder={step.placeholder || 'Type your answer…'}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                />
              ) : (
                <input
                  className="chat-input"
                  type="text"
                  placeholder={step.placeholder || 'Type your answer…'}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && inputValue.trim() && handleAnswer(inputValue.trim())}
                />
              )}
              <div className="chat-input-actions">
                <button
                  className="chat-btn-primary"
                  onClick={() => inputValue.trim() && handleAnswer(inputValue.trim())}
                  disabled={!inputValue.trim()}
                >
                  Next →
                </button>
                {!step.required && (
                  <button className="chat-btn-skip" onClick={handleSkip}>Skip / Later</button>
                )}
              </div>
            </>
          )}

          {step.type === 'select' && (
            <div className="chat-select-list">
              {(step.options || []).map(opt => (
                <button
                  key={opt}
                  className="chat-option-btn"
                  onClick={() => handleAnswer(opt)}
                >
                  {opt}
                </button>
              ))}
              {!step.required && (
                <button className="chat-btn-skip" onClick={handleSkip}>Skip / Later</button>
              )}
            </div>
          )}

          {step.type === 'chips' && (
            <div className="chat-chips-area">
              <div className="chat-chips">
                {(step.options || []).map(opt => (
                  <button
                    key={opt}
                    className={`chip-btn ${currentChips.includes(opt) ? 'chip-btn--active' : ''}`}
                    onClick={() => handleChipToggle(opt, currentChips)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="chat-input-actions">
                <button
                  className="chat-btn-primary"
                  onClick={() => handleAnswer(currentChips)}
                  disabled={step.required && currentChips.length === 0}
                >
                  Next →
                </button>
                {!step.required && (
                  <button className="chat-btn-skip" onClick={handleSkip}>Skip / Later</button>
                )}
              </div>
            </div>
          )}

          {step.type === 'genre-subgenre' && (
            <div className="chat-select-list">
              {genreSubStep === 'main' && (
                <>
                  <p className="genre-step-label">Select Main Genre:</p>
                  {(step.mainGenres || []).map(genre => (
                    <button
                      key={genre}
                      className="chat-option-btn"
                      onClick={() => handleGenreMainSelect(genre)}
                    >
                      {genre}
                    </button>
                  ))}
                  {!step.required && (
                    <button className="chat-btn-skip" onClick={handleSkip}>Skip / Later</button>
                  )}
                </>
              )}
              {genreSubStep === 'sub' && (
                <>
                  <p className="genre-step-label">Selected: <strong>{selectedMainGenre}</strong></p>
                  <p className="genre-step-label">Now select Sub-genre (or skip):</p>
                  {(step.subGenreMap?.[selectedMainGenre] || []).map(subgenre => (
                    <button
                      key={subgenre}
                      className="chat-option-btn"
                      onClick={() => handleGenreSubSelect(subgenre)}
                    >
                      {subgenre}
                    </button>
                  ))}
                  <div className="chat-input-actions" style={{ marginTop: '12px' }}>
                    <button
                      className="chat-btn-secondary"
                      onClick={handleGenreBack}
                    >
                      ← Back to Main Genre
                    </button>
                    <button
                      className="chat-btn-primary"
                      onClick={() => handleGenreSubSelect('')}
                    >
                      Continue without Sub-genre →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step.type === 'tone-pace' && (
            <div className="chat-select-list">
              {tonePaceStep === 'tone' && (
                <>
                  <p className="genre-step-label">Select Tone:</p>
                  {(step.toneOptions || []).map(tone => (
                    <button
                      key={tone}
                      className="chat-option-btn"
                      onClick={() => handleToneSelect(tone)}
                    >
                      {tone}
                    </button>
                  ))}
                  {!step.required && (
                    <button className="chat-btn-skip" onClick={handleSkip}>Skip / Later</button>
                  )}
                </>
              )}
              {tonePaceStep === 'pace' && (
                <>
                  <p className="genre-step-label">Tone: <strong>{selectedTone}</strong></p>
                  <p className="genre-step-label">Now select Pace:</p>
                  {(step.paceOptions || []).map(pace => (
                    <button
                      key={pace}
                      className="chat-option-btn"
                      onClick={() => handlePaceSelect(pace)}
                    >
                      {pace}
                    </button>
                  ))}
                  <div className="chat-input-actions" style={{ marginTop: '12px' }}>
                    <button
                      className="chat-btn-secondary"
                      onClick={handleTonePaceBack}
                    >
                      ← Back to Tone
                    </button>
                    <button
                      className="chat-btn-primary"
                      onClick={() => handlePaceSelect('')}
                    >
                      Continue without Pace →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step.type === 'budget-star' && (
            <div className="chat-select-list">
              {budgetStarStep === 'budget' && (
                <>
                  <p className="genre-step-label">Select Budget Band:</p>
                  {(step.budgetOptions || []).map(budget => (
                    <button
                      key={budget}
                      className="chat-option-btn"
                      onClick={() => handleBudgetSelect(budget)}
                    >
                      {budget}
                    </button>
                  ))}
                  {!step.required && (
                    <button className="chat-btn-skip" onClick={handleSkip}>Skip / Later</button>
                  )}
                </>
              )}
              {budgetStarStep === 'star' && (
                <>
                  <p className="genre-step-label">Budget: <strong>{selectedBudget}</strong></p>
                  <p className="genre-step-label">Now select Star Power:</p>
                  {(step.starPowerOptions || []).map(starPower => (
                    <button
                      key={starPower}
                      className="chat-option-btn"
                      onClick={() => handleStarPowerSelect(starPower)}
                    >
                      {starPower}
                    </button>
                  ))}
                  <div className="chat-input-actions" style={{ marginTop: '12px' }}>
                    <button
                      className="chat-btn-secondary"
                      onClick={handleBudgetStarBack}
                    >
                      ← Back to Budget
                    </button>
                    <button
                      className="chat-btn-primary"
                      onClick={() => handleStarPowerSelect('')}
                    >
                      Continue without Star Power →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step.type === 'rating-platform' && (
            <div className="chat-select-list">
              {ratingPlatformStep === 'rating' && (
                <>
                  <p className="genre-step-label">Select Film Rating:</p>
                  {(step.ratingOptions || []).map(rating => (
                    <button
                      key={rating}
                      className="chat-option-btn"
                      onClick={() => handleRatingSelect(rating)}
                    >
                      {rating}
                    </button>
                  ))}
                  {!step.required && (
                    <button className="chat-btn-skip" onClick={handleSkip}>Skip / Later</button>
                  )}
                </>
              )}
              {ratingPlatformStep === 'platform' && (
                <>
                  <p className="genre-step-label">Rating: <strong>{selectedRating}</strong></p>
                  <p className="genre-step-label">Now select Platform Strategy:</p>
                  {(step.platformOptions || []).map(platform => (
                    <button
                      key={platform}
                      className="chat-option-btn"
                      onClick={() => handlePlatformSelect(platform)}
                    >
                      {platform}
                    </button>
                  ))}
                  <div className="chat-input-actions" style={{ marginTop: '12px' }}>
                    <button
                      className="chat-btn-secondary"
                      onClick={handleRatingPlatformBack}
                    >
                      ← Back to Rating
                    </button>
                    <button
                      className="chat-btn-primary"
                      onClick={() => handlePlatformSelect('')}
                    >
                      Continue without Platform →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step.type === 'multi-input' && (
            <>
              <div className="chat-multi-input">
                {(step.fields || []).map((field, idx) => (
                  <input
                    key={field.id}
                    className="chat-input"
                    type="text"
                    placeholder={field.placeholder || ''}
                    value={multiInputValues[field.id] || ''}
                    onChange={e => handleMultiInputChange(field.id, e.target.value)}
                    onKeyDown={e => {
                      // Submit on Enter from the last field
                      if (e.key === 'Enter' && idx === step.fields.length - 1) {
                        handleMultiInputSubmit();
                      }
                    }}
                  />
                ))}
              </div>
              <div className="chat-input-actions">
                <button
                  className="chat-btn-primary"
                  onClick={handleMultiInputSubmit}
                >
                  Next →
                </button>
                {!step.required && (
                  <button className="chat-btn-skip" onClick={handleSkip}>Skip / Later</button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatForm;
