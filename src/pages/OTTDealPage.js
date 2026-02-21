/**
 * OTT Deal Assistant Page
 * 
 * Helps producers evaluate and choose between three OTT monetization options:
 * - Option A: Direct sale pre-release
 * - Option B: Sell after theatrical release
 * - Option C: Minimum Guarantee + Revenue Share
 * 
 * Features:
 * - Input form for producer confidence, film details, offers
 * - Real-time evaluation and recommendation
 * - Revenue projections with scenario toggle (low/medium/high)
 * - Release window calendar visualization
 * - Campaign plan generation
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import './OTTDealPage.css';

const OTTDealPage = () => {
  const { projectId } = useParams();
  
  // Form state
  const [producerInputs, setProducerInputs] = useState({
    confidence: 'medium',
    filmGenre: '',
    filmBudget: '',
    targetAudience: ''
  });

  const [platformSignals, setPlatformSignals] = useState({
    sentiment: 0.5,
    buzz: 50,
    trailerViews: 0,
    trailerRetention: 50
  });

  const [offers, setOffers] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [scenarioView, setScenarioView] = useState('medium'); // low/medium/high
  const [platforms, setPlatforms] = useState([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);

  // Load platform information on mount
  useEffect(() => {
    loadPlatforms();
    loadCalendarEvents();
  }, []);

  const loadPlatforms = async () => {
    try {
      const res = await fetch('/api/ott-assistant/platforms');
      const response = await res.json();
      if (response.success) {
        const platformList = response.platforms.map(p => ({
          name: p.name,
          deal_types: p.deal_types || ['fixed'],
          details: p
        }));
        setPlatforms(platformList);
        console.log('✅ Loaded platforms from CSV:', platformList.map(p => p.name));
      }
    } catch (err) {
      console.error('Failed to load platforms:', err);
      // Fallback to basic platform list
      setPlatforms([
        { name: 'Netflix India', deal_types: ['fixed', 'mg_plus_revshare'] },
        { name: 'Amazon Prime Video India', deal_types: ['fixed', 'mg_plus_revshare'] },
        { name: 'JioHotstar', deal_types: ['fixed'] }
      ]);
    } finally {
      setLoadingPlatforms(false);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      // Load from release intelligence or calendar service
      // For now, stub with hardcoded events
      setCalendarEvents([
        {
          event: 'IPL 2024',
          start_date: '2024-03-22',
          end_date: '2024-05-26',
          type: 'Sports'
        },
        {
          event: 'Diwali',
          start_date: '2024-11-01',
          end_date: '2024-11-01',
          type: 'Festival'
        }
      ]);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    }
  };

  const handleAddOffer = () => {
    setOffers([
      ...offers,
      {
        id: Date.now(),
        platform: '',
        offer_type: 'fixed',
        fixed_amount: '',
        mg_amount: '',
        revenue_share_percentage: ''
      }
    ]);
  };

  const handleRemoveOffer = (id) => {
    setOffers(offers.filter(offer => offer.id !== id));
  };

  const handleOfferChange = (id, field, value) => {
    setOffers(offers.map(offer => 
      offer.id === id ? { ...offer, [field]: value } : offer
    ));
  };

  const handleEvaluate = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare payload
      const payload = {
        producerInputs: {
          ...producerInputs,
          filmBudget: parseFloat(producerInputs.filmBudget) || 0
        },
        platformSignals: {
          sentiment: parseFloat(platformSignals.sentiment),
          buzz: parseFloat(platformSignals.buzz),
          trailerViews: parseInt(platformSignals.trailerViews) || 0,
          trailerRetention: parseFloat(platformSignals.trailerRetention)
        },
        offers: offers.map(offer => ({
          platform: offer.platform,
          offer_type: offer.offer_type,
          fixed_amount: offer.offer_type === 'fixed' ? parseFloat(offer.fixed_amount) : undefined,
          mg_amount: offer.offer_type === 'mg_plus_revshare' ? parseFloat(offer.mg_amount) : undefined,
          revenue_share_percentage: offer.offer_type === 'mg_plus_revshare' ? parseFloat(offer.revenue_share_percentage) : undefined
        })),
        calendarEvents: calendarEvents
      };

      const res = await fetch('/api/ott-assistant/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const response = await res.json();

      if (response.success) {
        setResult(response.data);
      } else {
        setError('Evaluation failed');
      }
    } catch (err) {
      console.error('Evaluation error:', err);
      setError(err.message || 'Failed to evaluate OTT deal');
    } finally {
      setLoading(false);
    }
  };

  const loadExample = async () => {
    try {
      const res = await fetch('/api/ott-assistant/examples');
      const response = await res.json();
      if (response.success && response.examples.length > 0) {
        const example = response.examples[0];
        setProducerInputs(example.payload.producerInputs);
        setPlatformSignals(example.payload.platformSignals);
        setOffers(example.payload.offers.map((offer, idx) => ({ ...offer, id: Date.now() + idx })));
      }
    } catch (err) {
      console.error('Failed to load example:', err);
    }
  };

  const getOptionLabel = (option) => {
    const labels = {
      'A': 'Option A: Direct Sale Pre-Release',
      'B': 'Option B: Sell After Theatrical Release',
      'C': 'Option C: Minimum Guarantee + Revenue Share'
    };
    return labels[option] || option;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#10b981'; // Green
    if (confidence >= 0.6) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <ProjectLayout>
      <div className="ott-deal-page">
        <div className="page-header">
          <h1 className="page-title">🎬 OTT Deal Assistant</h1>
          <p className="page-subtitle">Evaluate monetization options and get AI-powered recommendations</p>
          <button className="btn-example" onClick={loadExample}>
            📋 Load Example
          </button>
        </div>

      <div className="ott-deal-content">
        {/* Input Form */}
        <div className="input-section">
          <h2>Step 1: Film & Producer Details</h2>
          
          <div className="form-group">
            <label>Your Confidence Level</label>
            <select 
              value={producerInputs.confidence}
              onChange={(e) => setProducerInputs({ ...producerInputs, confidence: e.target.value })}
            >
              <option value="low">Low - First film or uncertain prospects</option>
              <option value="medium">Medium - Some track record</option>
              <option value="high">High - Strong track record & buzz</option>
            </select>
          </div>

          <div className="form-group">
            <label>Film Genre</label>
            <input 
              type="text"
              placeholder="e.g., Thriller, Romance, Action"
              value={producerInputs.filmGenre}
              onChange={(e) => setProducerInputs({ ...producerInputs, filmGenre: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Film Budget (₹ Lakhs)</label>
            <input 
              type="number"
              placeholder="e.g., 500"
              value={producerInputs.filmBudget}
              onChange={(e) => setProducerInputs({ ...producerInputs, filmBudget: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Target Audience</label>
            <input 
              type="text"
              placeholder="e.g., Urban youth 18-35"
              value={producerInputs.targetAudience}
              onChange={(e) => setProducerInputs({ ...producerInputs, targetAudience: e.target.value })}
            />
          </div>

          <h2>Step 2: Platform Signals</h2>

          <div className="form-group">
            <label>Sentiment Score ({platformSignals.sentiment})</label>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={platformSignals.sentiment}
              onChange={(e) => setPlatformSignals({ ...platformSignals, sentiment: e.target.value })}
            />
            <div className="range-labels">
              <span>Negative</span>
              <span>Neutral</span>
              <span>Positive</span>
            </div>
          </div>

          <div className="form-group">
            <label>Buzz Score ({platformSignals.buzz}/100)</label>
            <input 
              type="range"
              min="0"
              max="100"
              step="1"
              value={platformSignals.buzz}
              onChange={(e) => setPlatformSignals({ ...platformSignals, buzz: e.target.value })}
            />
            <div className="range-labels">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

          <div className="form-group">
            <label>Trailer Views</label>
            <input 
              type="number"
              placeholder="e.g., 500000"
              value={platformSignals.trailerViews}
              onChange={(e) => setPlatformSignals({ ...platformSignals, trailerViews: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Trailer Retention ({platformSignals.trailerRetention}%)</label>
            <input 
              type="range"
              min="0"
              max="100"
              step="1"
              value={platformSignals.trailerRetention}
              onChange={(e) => setPlatformSignals({ ...platformSignals, trailerRetention: e.target.value })}
            />
          </div>

          <h2>Step 3: OTT Platform Offers</h2>
          
          <div className="offers-list">
            {offers.map(offer => (
              <div key={offer.id} className="offer-card">
                <button 
                  className="btn-remove-offer"
                  onClick={() => handleRemoveOffer(offer.id)}
                >
                  ×
                </button>

                <div className="form-group">
                  <label>Platform</label>
                  <select 
                    value={offer.platform}
                    onChange={(e) => handleOfferChange(offer.id, 'platform', e.target.value)}
                  >
                    <option value="">Select platform</option>
                    {platforms.map(platform => (
                      <option key={platform.name} value={platform.name}>
                        {platform.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Offer Type</label>
                  <select 
                    value={offer.offer_type}
                    onChange={(e) => handleOfferChange(offer.id, 'offer_type', e.target.value)}
                  >
                    <option value="fixed">Fixed Buyout</option>
                    <option value="mg_plus_revshare">MG + Revenue Share</option>
                  </select>
                </div>

                {offer.offer_type === 'fixed' && (
                  <div className="form-group">
                    <label>Fixed Amount (₹ Lakhs)</label>
                    <input 
                      type="number"
                      placeholder="e.g., 300"
                      value={offer.fixed_amount}
                      onChange={(e) => handleOfferChange(offer.id, 'fixed_amount', e.target.value)}
                    />
                  </div>
                )}

                {offer.offer_type === 'mg_plus_revshare' && (
                  <>
                    <div className="form-group">
                      <label>Minimum Guarantee (₹ Lakhs)</label>
                      <input 
                        type="number"
                        placeholder="e.g., 200"
                        value={offer.mg_amount}
                        onChange={(e) => handleOfferChange(offer.id, 'mg_amount', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Revenue Share (%)</label>
                      <input 
                        type="number"
                        placeholder="e.g., 30"
                        value={offer.revenue_share_percentage}
                        onChange={(e) => handleOfferChange(offer.id, 'revenue_share_percentage', e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <button className="btn-add-offer" onClick={handleAddOffer}>
            + Add Offer
          </button>

          <button 
            className="btn-evaluate"
            onClick={handleEvaluate}
            disabled={loading}
          >
            {loading ? 'Evaluating...' : '🔍 Evaluate Options'}
          </button>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="results-section">
            <h2>AI Recommendation</h2>

            <div 
              className="recommendation-card"
              style={{ borderColor: getConfidenceColor(result.recommendation.confidence) }}
            >
              <div className="recommendation-header">
                <h3>{getOptionLabel(result.recommendation.option)}</h3>
                <div 
                  className="confidence-badge"
                  style={{ backgroundColor: getConfidenceColor(result.recommendation.confidence) }}
                >
                  {(result.recommendation.confidence * 100).toFixed(0)}% Confidence
                </div>
              </div>

              <p className="recommendation-reason">{result.recommendation.reason}</p>

              <div className="pros-cons">
                <div className="pros">
                  <h4>✅ Pros</h4>
                  <ul>
                    {result.recommendation.pros.map((pro, idx) => (
                      <li key={idx}>{pro}</li>
                    ))}
                  </ul>
                </div>

                <div className="cons">
                  <h4>⚠️ Cons</h4>
                  <ul>
                    {result.recommendation.cons.map((con, idx) => (
                      <li key={idx}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <h2>Revenue Projections</h2>

            <div className="scenario-toggle">
              <button 
                className={scenarioView === 'low' ? 'active' : ''}
                onClick={() => setScenarioView('low')}
              >
                Low Scenario
              </button>
              <button 
                className={scenarioView === 'medium' ? 'active' : ''}
                onClick={() => setScenarioView('medium')}
              >
                Medium Scenario
              </button>
              <button 
                className={scenarioView === 'high' ? 'active' : ''}
                onClick={() => setScenarioView('high')}
              >
                High Scenario
              </button>
            </div>

            <div className="revenue-table">
              <div className="revenue-row">
                <div className="option-label">Option A (Direct Sale)</div>
                <div className="revenue-amount">
                  ₹{(result.revenue_projections.option_a[scenarioView] / 100000).toFixed(2)} Lakhs
                </div>
              </div>
              <div className="revenue-row">
                <div className="option-label">Option B (Post-Release)</div>
                <div className="revenue-amount">
                  ₹{(result.revenue_projections.option_b[scenarioView] / 100000).toFixed(2)} Lakhs
                </div>
              </div>
              <div className="revenue-row">
                <div className="option-label">Option C (MG + RevShare)</div>
                <div className="revenue-amount">
                  ₹{(result.revenue_projections.option_c[scenarioView] / 100000).toFixed(2)} Lakhs
                </div>
              </div>
            </div>

            <h2>Release Strategy</h2>

            <div className="release-strategy-card">
              <p><strong>Suggested Release Window:</strong></p>
              <p>
                {new Date(result.release_strategy.suggested_release_window.start_date).toLocaleDateString()} 
                {' → '}
                {new Date(result.release_strategy.suggested_release_window.end_date).toLocaleDateString()}
              </p>
              <p className="strategy-reasoning">{result.release_strategy.suggested_release_window.reasoning}</p>

              {result.release_strategy.relevant_calendar_events.length > 0 && (
                <div className="calendar-events">
                  <h4>Relevant Events</h4>
                  <ul>
                    {result.release_strategy.relevant_calendar_events.map((event, idx) => (
                      <li key={idx}>
                        <strong>{event.event}</strong> ({event.type})
                        <br />
                        {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <h2>Campaign Plan</h2>

            <div className="campaign-actions">
              {result.campaign_plan.actions.map((action, idx) => (
                <div key={idx} className="action-item">
                  <span className="action-number">{idx + 1}</span>
                  <span className="action-text">{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </ProjectLayout>
  );
};

export default OTTDealPage;
