import React, { useState } from 'react';
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

  const step = steps[currentStep];
  const total = steps.length;

  const handleAnswer = (value) => {
    const ans = { ...answers, [step.id]: value };
    setAnswers(ans);
    setHistory([...history, { question: step.label, answer: Array.isArray(value) ? value.join(', ') : value }]);
    setInputValue('');

    if (currentStep + 1 < total) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete && onComplete(ans);
    }
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
        </div>
      )}
    </div>
  );
};

export default ChatForm;
