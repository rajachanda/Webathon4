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
import './OTTDealPage.css';
import { projectService } from '../services/api.service';
import { getSentimentSummary } from '../services/sentiment.service';

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
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load all data on mount
  useEffect(() => {
    loadPlatforms();
    loadCalendarEvents();
    loadProjectData();
  }, [projectId]);

  // Load existing project data to pre-populate form AND auto-trigger evaluation
  const loadProjectData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching comprehensive project data...');

      // Fetch ALL project data in parallel
      const [project, persona, buzzSnapshots, releaseWindows, sentimentData] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectPersona(projectId).catch(() => null),
        projectService.getBuzzSnapshots(projectId).catch(() => []),
        projectService.getReleaseWindows(projectId).catch(() => []),
        getSentimentSummary(projectId).catch(() => null),
      ]);

      console.log('📊 Loaded data:', { 
        project: !!project, 
        persona: !!persona, 
        buzzCount: buzzSnapshots?.length || 0,
        windowsCount: releaseWindows?.length || 0,
        sentiment: !!sentimentData 
      });

      const metadata = project?.project_metadata || {};
      const newProducerInputs = { ...producerInputs };
      const newPlatformSignals = { ...platformSignals };

      // === AUTO-POPULATE FROM ONBOARDING DATA ===
      
      // Genre from onboarding
      if (metadata.genre) {
        newProducerInputs.filmGenre = metadata.genre;
        if (metadata.subgenre) {
          newProducerInputs.filmGenre += ` - ${metadata.subgenre}`;
        }
      }

      // Budget from onboarding (convert budget band to estimated amount in lakhs)
      if (metadata.budget_band) {
        const budgetMap = {
          'micro': 50,        // 50 lakhs
          'small': 300,       // 3 crores
          'mid': 1500,        // 15 crores
          'medium': 1500,
          'large': 5000       // 50 crores
        };
        const estimatedBudget = budgetMap[metadata.budget_band.toLowerCase()] || 300;
        newProducerInputs.filmBudget = estimatedBudget.toString();
      }

      // Auto-set confidence based on platform strategy
      if (metadata.platform_strategy) {
        const confidenceMap = {
          'theatrical-first': 'high',     // High confidence in theatrical
          'ott-first': 'medium',          // Medium confidence
          'direct-ott': 'low'             // Low confidence in theatrical
        };
        newProducerInputs.confidence = confidenceMap[metadata.platform_strategy] || 'medium';
      }

      // === AUTO-POPULATE FROM PERSONA ===
      if (persona?.film_market_persona) {
        const personaData = persona.film_market_persona;
        
        // Target audience
        if (personaData.primary_audience) {
          newProducerInputs.targetAudience = personaData.primary_audience;
        } else if (personaData.target_clusters?.length > 0) {
          newProducerInputs.targetAudience = personaData.target_clusters.slice(0, 2).join(', ');
        }
      }

      // === AUTO-POPULATE FROM BUZZ SCORES ===
      if (buzzSnapshots && buzzSnapshots.length > 0) {
        const latestBuzz = buzzSnapshots.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        )[0];

        // Buzz score (0-100)
        if (latestBuzz.buzz_score !== undefined) {
          newPlatformSignals.buzz = Math.round(latestBuzz.buzz_score);
        }

        // Trailer views and retention from YouTube data
        if (latestBuzz.metadata?.youtubeMetrics) {
          const ytMetrics = latestBuzz.metadata.youtubeMetrics;
          
          if (ytMetrics.view_count) {
            newPlatformSignals.trailerViews = ytMetrics.view_count;
          }

          // Calculate retention from engagement
          if (ytMetrics.engagement_rate) {
            newPlatformSignals.trailerRetention = Math.round(ytMetrics.engagement_rate * 100);
          } else if (ytMetrics.avg_watch_time && ytMetrics.video_duration) {
            const retention = (ytMetrics.avg_watch_time / ytMetrics.video_duration) * 100;
            newPlatformSignals.trailerRetention = Math.round(retention);
          }
        }
      }

      // === AUTO-POPULATE FROM SENTIMENT ANALYSIS ===
      if (sentimentData) {
        // Convert positive sentiment percentage to 0-1 scale
        const sentimentScore = sentimentData.positivePercent / 100;
        newPlatformSignals.sentiment = sentimentScore;

        console.log('😊 Sentiment data:', {
          positive: `${sentimentData.positivePercent}%`,
          sentiment: sentimentScore,
          totalComments: sentimentData.totalComments
        });
      }

      setProducerInputs(newProducerInputs);
      setPlatformSignals(newPlatformSignals);

      // === AUTO-POPULATE RELEASE WINDOWS FOR CALENDAR EVENTS ===
      if (releaseWindows && releaseWindows.length > 0) {
        const events = releaseWindows.map(w => ({
          event: w.window_label || 'Release Window',
          start_date: w.start_date,
          end_date: w.end_date,
          type: w.intensity_label || 'Recommended'
        }));
        setCalendarEvents(events);
        console.log('📅 Release windows:', events.length);
      }

      setDataLoaded(true);
      
      console.log('✅ Auto-populated ALL data:', {
        genre: newProducerInputs.filmGenre,
        budget: `₹${newProducerInputs.filmBudget}L`,
        audience: newProducerInputs.targetAudience,
        confidence: newProducerInputs.confidence,
        buzz: newPlatformSignals.buzz,
        sentiment: `${(newPlatformSignals.sentiment * 100).toFixed(0)}%`,
        trailerViews: newPlatformSignals.trailerViews
      });

      // === AUTO-TRIGGER EVALUATION ===
      // Wait a bit for UI to update, then automatically evaluate
      setTimeout(() => {
        autoEvaluate(newProducerInputs, newPlatformSignals, releaseWindows);
      }, 500);

    } catch (err) {
      console.error('❌ Failed to load project data:', err);
      setError('Failed to load project data. Please refresh the page.');
      setDataLoaded(true);
      setLoading(false);
    }
  };

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

  // Auto-evaluate OTT deal with fetched data
  const autoEvaluate = async (inputs, signals, windows) => {
    try {
      console.log('🤖 Auto-evaluating OTT deal with fetched data...');

      // Build sample offers from available platforms (for evaluation context)
      const sampleOffers = platforms.slice(0, 3).map((plat, idx) => ({
        platform: plat.name,
        offer_type: plat.deal_types[0] || 'fixed',
        fixed_amount: idx === 0 ? parseFloat(inputs.filmBudget) * 1.2 : undefined,
        mg_amount: idx === 1 ? parseFloat(inputs.filmBudget) * 0.8 : undefined,
        revenue_share_percentage: idx === 1 ? 30 : undefined
      }));

      // Prepare payload with all auto-fetched data
      const payload = {
        producerInputs: {
          ...inputs,
          filmBudget: parseFloat(inputs.filmBudget) || 0
        },
        platformSignals: {
          sentiment: parseFloat(signals.sentiment),
          buzz: parseFloat(signals.buzz),
          trailerViews: parseInt(signals.trailerViews) || 0,
          trailerRetention: parseFloat(signals.trailerRetention)
        },
        offers: sampleOffers,
        calendarEvents: windows?.length > 0 ? windows.map(w => ({
          event: w.window_label || 'Release Window',
          start_date: w.start_date,
          end_date: w.end_date,
          type: w.intensity_label || 'Recommended'
        })) : calendarEvents
      };

      console.log('📤 Sending auto-evaluation payload:', payload);

      const res = await fetch('/api/ott-assistant/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const response = await res.json();

      if (response.success) {
        setResult(response.data);
        console.log('✅ Auto-evaluation complete!', response.data);
      } else {
        console.warn('⚠️ Auto-evaluation failed:', response);
        setError('Auto-evaluation failed. You can manually trigger evaluation.');
      }
    } catch (err) {
      console.error('❌ Auto-evaluation error:', err);
      setError('Auto-evaluation failed. You can manually trigger evaluation.');
    } finally {
      setLoading(false);
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

  // Dynamically suggest THE BEST OTT platform based on film characteristics
  const getSuggestedPlatforms = (inputs, signals) => {
    const genre = (inputs.filmGenre || '').toLowerCase();
    const budget = parseFloat(inputs.filmBudget) || 0;
    const buzz = parseFloat(signals.buzz) || 0;
    const sentiment = parseFloat(signals.sentiment) || 0;
    const views = parseInt(signals.trailerViews) || 0;
    const audience = (inputs.targetAudience || '').toLowerCase();
    
    // Get budget category
    let budgetCategory = 'mid budget';
    if (budget < 200) budgetCategory = 'micro budget';
    else if (budget < 500) budgetCategory = 'small budget';
    else if (budget < 1500) budgetCategory = 'mid budget';
    else budgetCategory = 'high budget';

    console.log('🎯 Platform Selection:', { genre, budgetCategory, buzz, sentiment, views, audience });

    // Score each platform based on fit
    const platformScores = [];

    // Regional platforms get priority if audience matches
    if (
      audience.includes('telugu') || 
      audience.includes('ap') || 
      audience.includes('tg') ||
      audience.includes('andhra') ||
      audience.includes('telangana')
    ) {
      return [{
        icon: '💚',
        name: 'Aha',
        reason: `Perfect fit for Telugu-speaking audiences. As a dedicated Telugu OTT platform, Aha understands the regional nuances and has a proven track record with ${genre ? genre + ' content' : 'South Indian films'}. Their ${budgetCategory} range aligns well with your project, and they've built strong viewer loyalty in Andhra Pradesh and Telangana markets.`
      }];
    }

    if (
      audience.includes('tamil') || 
      audience.includes('tn') ||
      audience.includes('tamilnadu')
    ) {
      return [{
        icon: '🟠',
        name: 'Sun NXT',
        reason: `Ideal choice for Tamil content. Sun NXT dominates the Tamil OTT space with deep penetration in Tamil Nadu. Their expertise in ${genre ? genre + ' films' : 'regional cinema'} and established distribution network makes them the go-to platform for Tamil-speaking audiences. Your ${budgetCategory} production fits their acquisition strategy perfectly.`
      }];
    }

    // Netflix scoring
    let netflixScore = 0;
    let netflixReason = '';
    if (genre.includes('thriller') || genre.includes('drama') || genre.includes('horror')) netflixScore += 30;
    if (buzz >= 70) { netflixScore += 25; netflixReason = 'exceptional pre-release buzz'; }
    else if (buzz >= 60) { netflixScore += 15; netflixReason = 'strong audience anticipation'; }
    if (sentiment >= 0.7) { netflixScore += 20; netflixReason = netflixReason ? netflixReason + ' and highly positive audience sentiment' : 'overwhelmingly positive fan sentiment'; }
    else if (sentiment >= 0.6) { netflixScore += 10; }
    if (budget >= 1000) { netflixScore += 15; netflixReason = netflixReason ? netflixReason + ' with premium production values' : 'premium production quality'; }
    if (views >= 500000) { netflixScore += 20; netflixReason = netflixReason ? netflixReason + ' and viral trailer performance' : 'massive trailer traction'; }
    else if (views >= 200000) { netflixScore += 10; }

    if (!netflixReason && netflixScore > 0) {
      netflixReason = genre.includes('thriller') ? 'gripping thriller appeal' : 
                      genre.includes('drama') ? 'compelling dramatic narrative' : 
                      genre.includes('horror') ? 'intense horror elements' : 'quality content';
    }

    platformScores.push({
      score: netflixScore,
      platform: {
        icon: '🔴',
        name: 'Netflix India',
        reason: `Netflix is your best bet given the ${netflixReason || 'strong content quality'}. As a global platform with significant Indian investment, Netflix excels at promoting ${genre ? genre + ' content' : 'compelling narratives'} to both domestic and international audiences. Your ${budgetCategory} positioning aligns with their acquisition strategy for South Indian cinema, and their algorithm-driven discovery will help your film reach beyond traditional boundaries.`
      }
    });

    // Prime Video scoring
    let primeScore = 0;
    let primeReason = '';
    if (genre.includes('comedy') || genre.includes('family') || genre.includes('romance') || genre.includes('drama')) primeScore += 25;
    if (buzz >= 60) { primeScore += 20; primeReason = 'strong pre-release momentum'; }
    else if (buzz >= 50) { primeScore += 15; primeReason = 'growing audience interest'; }
    else if (buzz >= 40) { primeScore += 10; }
    if (budget >= 300 && budget <= 1000) { primeScore += 20; primeReason = primeReason ? primeReason + ' and ideal budget fit' : 'perfect budget alignment'; }
    if (views >= 200000) { primeScore += 15; primeReason = primeReason ? primeReason + ' with impressive trailer reach' : 'excellent trailer performance'; }
    else if (views >= 100000) { primeScore += 10; }
    
    if (!primeReason && primeScore > 0) {
      primeReason = 'diverse content library and strong regional focus';
    }

    platformScores.push({
      score: primeScore,
      platform: {
        icon: '🔵',
        name: 'Amazon Prime Video',
        reason: `Amazon Prime Video emerges as the ideal platform due to ${primeReason}. Prime has aggressively expanded its South Indian catalog and values ${genre ? genre + ' films' : 'quality regional content'}. Your ${budgetCategory} production fits their sweet spot for acquisitions. With Amazon's massive subscriber base and cross-promotion through their ecosystem, your film will get substantial visibility among family audiences and regional cinema enthusiasts.`
      }
    });

    // Hotstar scoring  
    let hotstarScore = 0;
    let hotstarReason = '';
    if (genre.includes('family') || genre.includes('social') || genre.includes('action') || genre.includes('fantasy')) hotstarScore += 25;
    if (buzz >= 70) { hotstarScore += 25; hotstarReason = 'massive viral potential'; }
    else if (buzz >= 60) { hotstarScore += 20; hotstarReason = 'strong buzz momentum'; }
    else if (buzz >= 50) { hotstarScore += 10; }
    if (views >= 300000) { hotstarScore += 20; hotstarReason = hotstarReason ? hotstarReason + ' and proven mass appeal' : 'exceptional mass market appeal'; }
    else if (views >= 150000) { hotstarScore += 15; }
    if (sentiment >= 0.65) { hotstarScore += 15; }

    if (!hotstarReason && hotstarScore > 0) {
      hotstarReason = genre.includes('family') ? 'family-friendly appeal' : 
                      genre.includes('social') ? 'socially relevant narrative' : 
                      genre.includes('action') ? 'mass action appeal' : 'broad audience reach';
    }

    platformScores.push({
      score: hotstarScore,
      platform: {
        icon: '⭐',
        name: 'Disney+ Hotstar',
        reason: `Disney+ Hotstar stands out as your optimal choice given the ${hotstarReason}. With the largest subscriber base in India and expertise in ${genre ? genre + ' entertainment' : 'mass entertainment'}, Hotstar can amplify your film's reach exponentially. Your ${budgetCategory} range aligns perfectly with their content strategy, and their proven track record of breaking regional films into mainstream consciousness makes them ideal for maximizing your theatrical-to-OTT transition.`
      }
    });

    // Zee5 scoring
    let zee5Score = 0;
    let zee5Reason = '';
    if (genre.includes('social') || genre.includes('drama') || genre.includes('romance') || genre.includes('comedy')) zee5Score += 25;
    if (budget < 800) { zee5Score += 20; zee5Reason = 'perfect budget fit for regional content'; }
    if (buzz >= 50) { zee5Score += 15; }
    if (sentiment >= 0.5) { zee5Score += 10; }

    if (!zee5Reason && zee5Score > 0) {
      zee5Reason = 'strong regional content focus and authentic storytelling';
    }

    platformScores.push({
      score: zee5Score,
      platform: {
        icon: '🟣',
        name: 'Zee5',
        reason: `Zee5 is your best match considering ${zee5Reason}. As a platform deeply rooted in Indian regional content, Zee5 understands the pulse of ${genre ? genre + ' cinema' : 'regional audiences'}. Your ${budgetCategory} production aligns excellently with their acquisition model. They offer better revenue sharing terms for regional films and have built a loyal subscriber base that actively seeks authentic South Indian storytelling.`
      }
    });

    // Sony LIV scoring
    let sonyScore = 0;
    let sonyReason = '';
    if (genre.includes('action') || genre.includes('thriller') || genre.includes('sports')) sonyScore += 25;
    if (buzz >= 55) { sonyScore += 20; sonyReason = 'strong mass appeal'; }
    if (budget >= 400 && budget <= 1200) { sonyScore += 15; }

    if (!sonyReason && sonyScore > 0) {
      sonyReason = 'mass entertainment positioning';
    }

    platformScores.push({
      score: sonyScore,
      platform: {
        icon: '🔶',
        name: 'Sony LIV',
        reason: `Sony LIV represents your optimal platform given ${sonyReason}. Sony's expertise in ${genre ? genre + ' content' : 'mass entertainment'} and cross-promotion opportunities with their sports events create unique visibility. Your ${budgetCategory} film fits their content acquisition strategy, and their growing subscriber base actively seeks engaging regional content with mass appeal.`
      }
    });

    // Sort by score and return the top platform
    platformScores.sort((a, b) => b.score - a.score);
    
    const winner = platformScores[0];
    console.log('✅ Top Platform:', winner.platform.name, 'Score:', winner.score);
    
    // If all scores are very low, return default
    if (winner.score < 15) {
      return [{
        icon: '🔵',
        name: 'Amazon Prime Video',
        reason: `Amazon Prime Video is recommended as your best platform choice. Prime has the most diverse content library and actively seeks ${genre ? genre + ' films' : 'quality regional cinema'} across all budget ranges. Your ${budgetCategory} production fits their inclusive acquisition strategy. With their massive subscriber base and commitment to South Indian content, Prime offers the right balance of reach, revenue potential, and audience engagement for your film.`
      }];
    }

    return [winner.platform];
  };

  return (
    <ProjectLayout>
      <div className="ott-deal-page">
        <div className="page-header">
          <h1 className="page-title">🎬 OTT Deal Recommendation</h1>
          <p className="page-subtitle">AI-powered platform recommendation based on your film's complete data</p>
        </div>

      <div className="ott-deal-content">
        {/* Loading State */}
        {loading && !result && (
          <div className="loading-state" style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'rgba(255,255,255,0.6)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
            <h3>Analyzing Your Film...</h3>
            <p>Fetching data from onboarding, persona, buzz scores, sentiment analysis, and release windows...</p>
          </div>
        )}

        {/* Auto-Fetched Data Summary */}
        {dataLoaded && !loading && (
          <div className="data-summary-section">
            <h2>📊 Film Intelligence Summary</h2>
            <div style={{ 
              fontSize: '13px', 
              color: 'rgba(0, 255, 136, 0.7)', 
              marginBottom: '20px',
              padding: '10px 14px',
              background: 'rgba(0, 255, 136, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 255, 136, 0.2)'
            }}>
              ✓ All data automatically fetched from your project. AI analyzing for best OTT match.
            </div>

            <div className="data-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {/* Film Details */}
              <div className="data-card" style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎬</div>
                <h4 style={{ margin: '0 0 12px', color: '#fff', fontSize: '15px' }}>Film Details</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.8', color: 'rgba(255,255,255,0.7)' }}>
                  <div><strong>Genre:</strong> {producerInputs.filmGenre || 'Not set'}</div>
                  <div><strong>Scale:</strong> {
                    parseFloat(producerInputs.filmBudget) < 200 ? 'Micro budget production' :
                    parseFloat(producerInputs.filmBudget) < 500 ? 'Small budget film' :
                    parseFloat(producerInputs.filmBudget) < 1500 ? 'Mid budget production' :
                    'High budget film'
                  }</div>
                  <div><strong>Confidence:</strong> {(producerInputs.confidence || 'medium').toUpperCase()}</div>
                </div>
              </div>

              {/* Audience */}
              <div className="data-card" style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>👥</div>
                <h4 style={{ margin: '0 0 12px', color: '#fff', fontSize: '15px' }}>Target Audience</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.8', color: 'rgba(255,255,255,0.7)' }}>
                  {producerInputs.targetAudience || 'General audience'}
                </div>
              </div>

              {/* Buzz Score */}
              <div className="data-card" style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
                <h4 style={{ margin: '0 0 12px', color: '#fff', fontSize: '15px' }}>Market Buzz</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.8', color: 'rgba(255,255,255,0.7)' }}>
                  <div><strong>Level:</strong> {
                    platformSignals.buzz >= 70 ? 'Exceptional buzz' :
                    platformSignals.buzz >= 55 ? 'Strong momentum' :
                    platformSignals.buzz >= 40 ? 'Moderate interest' :
                    'Building awareness'
                  }</div>
                  <div><strong>Trailer:</strong> {
                    platformSignals.trailerViews >= 500000 ? 'Viral performance' :
                    platformSignals.trailerViews >= 200000 ? 'Strong reach' :
                    platformSignals.trailerViews >= 100000 ? 'Good traction' :
                    platformSignals.trailerViews > 0 ? 'Growing views' :
                    'Early stage'
                  }</div>
                  <div><strong>Engagement:</strong> {
                    platformSignals.trailerRetention >= 70 ? 'Highly engaging' :
                    platformSignals.trailerRetention >= 50 ? 'Good retention' :
                    'Building interest'
                  }</div>
                </div>
              </div>

              {/* Sentiment */}
              <div className="data-card" style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                  {platformSignals.sentiment >= 0.7 ? '😊' : platformSignals.sentiment >= 0.5 ? '😐' : '😟'}
                </div>
                <h4 style={{ margin: '0 0 12px', color: '#fff', fontSize: '15px' }}>Audience Sentiment</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.8', color: 'rgba(255,255,255,0.7)' }}>
                  <div><strong>Overall:</strong> {
                    platformSignals.sentiment >= 0.75 ? 'Overwhelmingly positive' :
                    platformSignals.sentiment >= 0.65 ? 'Highly positive' :
                    platformSignals.sentiment >= 0.55 ? 'Positive sentiment' :
                    platformSignals.sentiment >= 0.45 ? 'Mixed feedback' :
                    'Needs attention'
                  }</div>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ 
                      height: '6px', 
                      background: 'rgba(255,255,255,0.1)', 
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${platformSignals.sentiment * 100}%`,
                        background: platformSignals.sentiment >= 0.7 ? '#10b981' : platformSignals.sentiment >= 0.5 ? '#f59e0b' : '#ef4444',
                        transition: 'width 0.3s'
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Input Form - Hidden by default, show only if needed */}
        <div className="input-section" style={{ display: 'none' }}>
          <h2>Step 1: Film & Producer Details</h2>
          {dataLoaded && (producerInputs.filmGenre || producerInputs.filmBudget || producerInputs.targetAudience) && (
            <div style={{ 
              fontSize: '12px', 
              color: 'rgba(0, 255, 136, 0.7)', 
              marginBottom: '12px',
              padding: '8px 12px',
              background: 'rgba(0, 255, 136, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(0, 255, 136, 0.2)'
            }}>
              ✓ Auto-filled from project data
            </div>
          )}
          
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
          {dataLoaded && (platformSignals.buzz !== 50 || platformSignals.sentiment !== 0.5 || platformSignals.trailerViews > 0) && (
            <div style={{ 
              fontSize: '12px', 
              color: 'rgba(0, 255, 136, 0.7)', 
              marginBottom: '12px',
              padding: '8px 12px',
              background: 'rgba(0, 255, 136, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(0, 255, 136, 0.2)'
            }}>
              ✓ Auto-filled from buzz metrics
            </div>
          )}

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

          {/* Step 3 - Hidden since we auto-evaluate */}
          <div style={{ display: 'none' }}>
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
          </div>
          {/* End hidden section */}

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Single Best OTT Platform Recommendation */}
        {(dataLoaded || loading) && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.08) 0%, rgba(0, 200, 255, 0.06) 100%)',
            border: '2px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '32px',
            opacity: dataLoaded ? 1 : 0.6,
            boxShadow: '0 8px 32px rgba(0, 255, 136, 0.1)'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              fontSize: '24px',
              fontWeight: '700'
            }}>
              <span style={{ fontSize: '32px' }}>🎯</span>
              Best OTT Platform for Your Film
              {loading && !dataLoaded && <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginLeft: 'auto', fontWeight: '400' }}>Analyzing...</span>}
            </h2>
            
            {getSuggestedPlatforms(producerInputs, platformSignals).map((platform, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '28px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.12)',
                transition: 'all 0.3s'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  marginBottom: '20px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ 
                    fontSize: '56px', 
                    lineHeight: 1,
                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
                  }}>
                    {platform.icon}
                  </div>
                  <div>
                    <div style={{ 
                      fontWeight: '700', 
                      fontSize: '28px',
                      color: '#fff',
                      marginBottom: '4px',
                      letterSpacing: '-0.5px'
                    }}>
                      {platform.name}
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: 'rgba(0, 255, 136, 0.8)',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Recommended Platform
                    </div>
                  </div>
                </div>
                
                <div style={{ 
                  fontSize: '15px', 
                  lineHeight: '1.8',
                  color: 'rgba(255,255,255,0.85)',
                  textAlign: 'justify'
                }}>
                  {platform.reason}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Section */}
        {result && result.recommendation && (
          <div className="results-section">
            <h2>🤖 AI Monetization Strategy</h2>

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

            {result.revenue_projections && (
              <>
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
              </>
            )}

            {result.release_strategy && result.release_strategy.suggested_release_window && (
              <>
                <h2>Release Strategy</h2>

                <div className="release-strategy-card">
                  <p><strong>Suggested Release Window:</strong></p>
                  <p>
                    {new Date(result.release_strategy.suggested_release_window.start_date).toLocaleDateString()} 
                    {' → '}
                    {new Date(result.release_strategy.suggested_release_window.end_date).toLocaleDateString()}
                  </p>
                  <p className="strategy-reasoning">{result.release_strategy.suggested_release_window.reasoning}</p>

                  {result.release_strategy.relevant_calendar_events && result.release_strategy.relevant_calendar_events.length > 0 && (
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
              </>
            )}

            {result.campaign_plan && result.campaign_plan.actions && (
              <>
                <h2>Campaign Plan</h2>

                <div className="campaign-actions">
                  {result.campaign_plan.actions.map((action, idx) => (
                    <div key={idx} className="action-item">
                      <span className="action-number">{idx + 1}</span>
                      <span className="action-text">{action}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      </div>
    </ProjectLayout>
  );
};

export default OTTDealPage;
