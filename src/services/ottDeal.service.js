/**
 * OTT Deal Assistant Service
 * Helps producers choose between monetization options and provides strategic recommendations
 */

/**
 * Evaluate OTT deal options and recommend best strategy
 * @param {Object} params - Evaluation parameters
 * @returns {Object} Decision object with recommendation
 */
export function evaluateOTTDeal({
  producerInputs,
  platformSignals,
  offers,
  calendarEvents = []
}) {
  // Validate inputs
  if (!producerInputs || !platformSignals || !offers) {
    throw new Error('Missing required inputs: producerInputs, platformSignals, offers');
  }

  const {
    title,
    runtime,
    genre,
    budget,
    producerConfidence // 'high' | 'medium' | 'low'
  } = producerInputs;

  const {
    sentiment_score, // 0-1
    buzz_score, // 0-100
    trailer_metrics,
    comparable_films = []
  } = platformSignals;

  // Step 1: Validate and categorize offers
  const categorizedOffers = categorizeOffers(offers);
  
  // Step 2: Calculate expected revenues for each scenario
  const revenueProjections = calculateRevenueProjections(
    categorizedOffers,
    platformSignals,
    comparable_films,
    genre
  );

  // Step 3: Apply decision logic
  const decision = applyDecisionLogic(
    producerInputs,
    platformSignals,
    categorizedOffers,
    revenueProjections,
    calendarEvents
  );

  // Step 4: Generate release window recommendation
  const releaseWindow = suggestReleaseWindow(
    decision.recommended_option,
    calendarEvents,
    platformSignals,
    genre
  );

  // Step 5: Generate campaign plan
  const campaignPlan = generateCampaignPlan(
    decision.recommended_option,
    platformSignals,
    producerInputs
  );

  return {
    ...decision,
    suggested_release_window: releaseWindow,
    revenue_projection_tabular: revenueProjections,
    recommended_campaign_plan_brief: campaignPlan,
    // Additional metadata
    metadata: {
      evaluated_at: new Date().toISOString(),
      film_title: title,
      total_offers_evaluated: offers.length
    }
  };
}

/**
 * Categorize offers by type
 */
function categorizeOffers(offers) {
  return {
    fixed: offers.filter(o => o.offer_type === 'fixed'),
    mg_revshare: offers.filter(o => o.offer_type === 'MG+revshare'),
    all: offers
  };
}

/**
 * Calculate revenue projections for all offers across scenarios
 */
function calculateRevenueProjections(categorizedOffers, platformSignals, comparableFilms, genre) {
  const { sentiment_score, buzz_score, trailer_metrics } = platformSignals;
  
  // Project view counts (low, medium, high scenarios)
  const viewProjections = projectViewCounts(
    sentiment_score,
    buzz_score,
    trailer_metrics,
    comparableFilms
  );

  const projections = [];

  // Option A: Fixed offers
  categorizedOffers.fixed.forEach(offer => {
    projections.push({
      option: 'A',
      ott_name: offer.ott_name,
      offer_type: 'Fixed Sale',
      low_scenario: {
        revenue: offer.fixed_amount * 0.85, // 15% fees
        timeline: 'Immediate',
        risk: 'None'
      },
      medium_scenario: {
        revenue: offer.fixed_amount * 0.85,
        timeline: 'Immediate',
        risk: 'None'
      },
      high_scenario: {
        revenue: offer.fixed_amount * 0.85,
        timeline: 'Immediate',
        risk: 'None'
      }
    });
  });

  // Option B: Post-release (estimated based on performance)
  if (categorizedOffers.all.length > 0) {
    const avgFixed = categorizedOffers.fixed.reduce((sum, o) => sum + o.fixed_amount, 0) / 
                     (categorizedOffers.fixed.length || 1);
    
    projections.push({
      option: 'B',
      ott_name: 'Post-Release Negotiation',
      offer_type: 'Delayed Sale',
      low_scenario: {
        revenue: avgFixed * 0.6, // 40% discount for weak performance
        timeline: '3-6 months post-release',
        risk: 'High - performance dependent'
      },
      medium_scenario: {
        revenue: avgFixed * 1.1, // 10% premium for decent performance
        timeline: '2-4 months post-release',
        risk: 'Medium'
      },
      high_scenario: {
        revenue: avgFixed * 1.5, // 50% premium for strong performance
        timeline: '1-3 months post-release',
        risk: 'Low if performance strong'
      }
    });
  }

  // Option C: MG + Revenue Share
  categorizedOffers.mg_revshare.forEach(offer => {
    const { mg_amount, rev_share_percentage } = offer;
    
    // Calculate variable revenue based on view projections
    // Assume ₹0.5 per view as rough streaming revenue (platform keeps majority)
    const revenuePerView = 0.5;
    
    projections.push({
      option: 'C',
      ott_name: offer.ott_name,
      offer_type: 'MG + Revenue Share',
      low_scenario: {
        revenue: mg_amount + (viewProjections.low * revenuePerView * (rev_share_percentage / 100)),
        timeline: 'MG upfront + quarterly settlements',
        risk: 'Low (MG guaranteed)'
      },
      medium_scenario: {
        revenue: mg_amount + (viewProjections.medium * revenuePerView * (rev_share_percentage / 100)),
        timeline: 'MG upfront + quarterly settlements',
        risk: 'Low (MG guaranteed)'
      },
      high_scenario: {
        revenue: mg_amount + (viewProjections.high * revenuePerView * (rev_share_percentage / 100)),
        timeline: 'MG upfront + quarterly settlements',
        risk: 'Very Low (upside potential)'
      }
    });
  });

  return projections;
}

/**
 * Project view counts based on signals (replaceable with ML model)
 */
function projectViewCounts(sentiment_score, buzz_score, trailer_metrics, comparableFilms) {
  // Base projection from trailer views
  const baseViews = trailer_metrics?.views || 100000;
  const retention = trailer_metrics?.retention_percent || 50;
  
  // Sentiment multiplier
  const sentimentMultiplier = 0.5 + (sentiment_score * 1.5); // 0.5x to 2x
  
  // Buzz multiplier
  const buzzMultiplier = 0.5 + (buzz_score / 100) * 2; // 0.5x to 2.5x
  
  // Retention bonus
  const retentionBonus = retention > 70 ? 1.3 : retention > 50 ? 1.1 : 0.9;
  
  const multiplier = sentimentMultiplier * buzzMultiplier * retentionBonus;
  
  return {
    low: Math.round(baseViews * multiplier * 0.5),
    medium: Math.round(baseViews * multiplier * 1.0),
    high: Math.round(baseViews * multiplier * 2.0)
  };
}

/**
 * Apply decision logic to recommend option
 */
function applyDecisionLogic(producerInputs, platformSignals, categorizedOffers, revenueProjections, calendarEvents) {
  const { producerConfidence } = producerInputs;
  const { sentiment_score, buzz_score } = platformSignals;

  let recommended_option = 'A';
  let confidence = 0.5;
  let reason = '';
  let pros = [];
  let cons = [];

  // Decision Tree Logic

  // Case 1: Low confidence + weak signals → Option A (Direct Sale)
  if (
    producerConfidence === 'low' &&
    sentiment_score < 0.4 &&
    buzz_score < 30 &&
    categorizedOffers.fixed.length > 0
  ) {
    recommended_option = 'A';
    confidence = 0.85;
    reason = 'With low confidence, weak sentiment (below 0.4), and buzz under 30, accepting a fixed buyout now minimizes risk and provides immediate liquidity. The current offers provide certainty in an uncertain market.';
    pros = [
      'Immediate cash flow with no performance risk',
      'Minimal marketing spend required',
      'Quick deal closure (typical 2-4 weeks)',
      'OTT handles all distribution and promotion'
    ];
    cons = [
      'No upside if film performs exceptionally well',
      'Lower total revenue if viral success occurs',
      'Relinquish all future revenue streams',
      'Limited negotiation leverage post-acceptance'
    ];
  }

  // Case 2: High sentiment + high buzz + good MG offers → Option C (MG + Revenue Share)
  else if (
    sentiment_score >= 0.6 &&
    buzz_score >= 50 &&
    (producerConfidence === 'medium' || producerConfidence === 'high') &&
    categorizedOffers.mg_revshare.length > 0
  ) {
    recommended_option = 'C';
    confidence = 0.9;
    reason = 'Strong sentiment (0.6+), solid buzz (50+), and your confidence indicate potential for strong viewership. An MG + revenue share deal gives you guaranteed upfront payment PLUS upside from performance, maximizing long-term returns.';
    pros = [
      'Guaranteed minimum payment upfront (MG)',
      'Participate in upside if film becomes hit',
      'Incentivizes platform to promote heavily',
      'Cashflow + long-term revenue potential'
    ];
    cons = [
      'Revenue share payments come quarterly (delayed)',
      'Requires transparent reporting from platform',
      'May need to track metrics and audit rights',
      'Slightly more complex contract terms'
    ];
  }

  // Case 3: Medium signals but wants post-release data → Option B
  else if (
    producerConfidence === 'medium' &&
    sentiment_score >= 0.45 &&
    buzz_score >= 35 &&
    categorizedOffers.fixed.length > 0
  ) {
    recommended_option = 'B';
    confidence = 0.65;
    reason = 'Your signals are decent but not exceptional. Waiting to negotiate post-release allows you to use actual box office or festival performance data to command a better price. However, this carries promotional costs and timing risk.';
    pros = [
      'Leverage actual performance data in negotiations',
      'Potentially 10-50% higher sale price if film succeeds',
      'Maintain control during initial release window',
      'Can test theatrical or festival circuit first'
    ];
    cons = [
      'Bears full marketing and promotion costs (3-6 months)',
      'Risk of weaker performance lowering offers',
      'Delayed cashflow (typically 3-6 months)',
      'Must track KPIs: opening weekend, word-of-mouth, awards'
    ];
  }

  // Case 4: Strong buzz but low confidence or weak offers → Option A (safe choice)
  else if (
    buzz_score >= 60 &&
    (producerConfidence === 'low' || categorizedOffers.mg_revshare.length === 0) &&
    categorizedOffers.fixed.length > 0
  ) {
    recommended_option = 'A';
    confidence = 0.75;
    reason = 'Despite strong buzz, your low confidence or lack of revenue-share offers suggests accepting the fixed buyout. Good buzz ensures the fixed offers are competitive, and you avoid performance risk.';
    pros = [
      'Strong buzz means fixed offers are already competitive',
      'Immediate certainty despite good indicators',
      'No exposure to execution risk',
      'Fast liquidity for next project'
    ];
    cons = [
      'Miss potential upside from strong buzz',
      'Could have negotiated MG+revshare with more time',
      'No long-term revenue participation'
    ];
  }

  // Case 5: No offers or very weak offers → Guidance to wait
  else if (categorizedOffers.all.length === 0) {
    recommended_option = 'B';
    confidence = 0.4;
    reason = 'No offers currently available. Recommend building buzz through targeted festival strategy, collecting KPIs (trailer views, social engagement), and approaching platforms after establishing market interest.';
    pros = [
      'Time to build buzz and improve negotiation position',
      'Festival circuit can generate competitive bidding',
      'Collect performance data to justify higher valuation'
    ];
    cons = [
      'Delayed revenue (6-12 months minimum)',
      'Requires active marketing and festival fees',
      'No guarantee of securing better offers later',
      'Cashflow pressure if no bridging finance'
    ];
  }

  // Default: Medium scenario → Compare best fixed vs best MG
  else {
    const bestFixed = categorizedOffers.fixed.length > 0 
      ? Math.max(...categorizedOffers.fixed.map(o => o.fixed_amount))
      : 0;
    
    const bestMG = categorizedOffers.mg_revshare.length > 0
      ? Math.max(...categorizedOffers.mg_revshare.map(o => o.mg_amount))
      : 0;

    if (bestMG > 0 && bestMG >= bestFixed * 0.7) {
      recommended_option = 'C';
      confidence = 0.7;
      reason = 'MG offers provide reasonable upfront payment with upside potential. Given your moderate signals, this balances risk and reward better than fixed sale.';
      pros = ['Balanced risk-reward', 'Upside participation', 'Guaranteed MG'];
      cons = ['Delayed variable payments', 'More complex terms'];
    } else if (bestFixed > 0) {
      recommended_option = 'A';
      confidence = 0.7;
      reason = 'Fixed offers are strong relative to MG options. Certainty of full payment now outweighs uncertain upside from revenue share.';
      pros = ['Immediate full payment', 'No performance risk', 'Simple deal'];
      cons = ['No upside potential', 'Miss revenue if hit'];
    } else {
      recommended_option = 'B';
      confidence = 0.5;
      reason = 'Current offers are weak. Recommend waiting to gather more market data before committing.';
      pros = ['Time to improve position', 'Leverage data later'];
      cons = ['Delayed cashflow', 'Marketing costs'];
    }
  }

  return {
    recommended_option,
    confidence,
    reason,
    pros,
    cons
  };
}

/**
 * Suggest optimal release window
 */
function suggestReleaseWindow(recommendedOption, calendarEvents, platformSignals, genre) {
  const now = new Date();
  const { buzz_score } = platformSignals;

  // Option A: Direct sale → OTT decides timing, suggest immediate availability
  if (recommendedOption === 'A') {
    return {
      start_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      end_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days
      rationale: 'For direct OTT sale, platform controls release timing. Suggest 30-60 days for contract execution and content ingestion. Minimal promotional window needed.'
    };
  }

  // Option B: Post-release → Need theatrical window first
  if (recommendedOption === 'B') {
    return {
      start_date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days
      end_date: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 180 days
      rationale: 'Allow 3-6 months for theatrical/festival run to gather performance data. OTT sale negotiation begins after establishing market reception and box office numbers.'
    };
  }

  // Option C: MG + RevShare → Optimize for streaming spikes
  if (recommendedOption === 'C') {
    // Check for high-engagement calendar events
    const upcomingEvents = calendarEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate > now && eventDate < new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    });

    // If major event (e.g., IPL, festival) align release
    const majorEvent = upcomingEvents.find(e => 
      e.name.toLowerCase().includes('ipl') || 
      e.name.toLowerCase().includes('festival') ||
      e.impact > 70
    );

    if (majorEvent && buzz_score >= 40) {
      const eventDate = new Date(majorEvent.date);
      return {
        start_date: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(eventDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        rationale: `Align with ${majorEvent.name} (${majorEvent.date}) when streaming viewership spikes. Launch 1 week before to ride the engagement wave. Strong buzz (${buzz_score}) supports this timing.`
      };
    }

    // Default: Standard OTT release window (Friday evening)
    const daysToFriday = (5 - now.getDay() + 7) % 7 || 7;
    const nextFriday = new Date(now.getTime() + daysToFriday * 24 * 60 * 60 * 1000 + 45 * 24 * 60 * 60 * 1000); // 45 days + next Friday
    
    return {
      start_date: new Date(nextFriday.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date: new Date(nextFriday.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rationale: 'Target Friday evening release for maximum weekend viewership. Allow 6-8 weeks for promotional campaign to build anticipation. Weekend launches drive higher initial engagement.'
    };
  }

  // Fallback
  return {
    start_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    rationale: 'Standard 60-90 day window for distribution preparation and marketing.'
  };
}

/**
 * Generate campaign plan based on chosen option
 */
function generateCampaignPlan(recommendedOption, platformSignals, producerInputs) {
  const { buzz_score, sentiment_score } = platformSignals;
  const { genre, budget } = producerInputs;

  const plans = {
    A: [
      'Minimal marketing spend required - OTT platform handles primary promotion',
      'Focus on contract negotiation and legal review (2-3 weeks)',
      'Provide platform with high-quality assets (poster, trailer, EPK)',
      'Coordinate exclusivity terms and rights management',
      'Plan brief social media tease for OTT premiere date'
    ],
    B: [
      'Run theatrical or festival campaign for 3-6 months to establish track record',
      'Track critical KPIs: opening weekend numbers, critic reviews, audience ratings, social buzz',
      'Document all performance metrics in detailed deck for OTT negotiations',
      'Budget ₹5-15L for promotional activities (depending on scale)',
      'Approach OTT platforms with performance data after establishing market validation'
    ],
    C: [
      'Collaborate with OTT platform on co-marketing campaigns (shared costs)',
      'Leverage platform algorithmic boost and homepage features in contract',
      'Run pre-release buzz campaign: influencer partnerships, social media teasers',
      'Track viewership KPIs weekly to optimize audience retention and watch-through rates',
      'Negotiate audit rights and transparent reporting in contract to verify revenue share calculations'
    ]
  };

  return plans[recommendedOption] || plans.A;
}

/**
 * Get sample payloads for testing
 */
export function getExamplePayloads() {
  return {
    example1: {
      name: 'Conservative Film - Weak Buzz - Stable Fixed Offer',
      payload: {
        producerInputs: {
          title: 'Whispers in the Alley',
          runtime: 105,
          genre: 'Drama',
          cast: 'Emerging actors',
          budget: 2000000,
          production_completion_date: '2026-01-15',
          producerConfidence: 'low'
        },
        platformSignals: {
          sentiment_score: 0.35,
          buzz_score: 25,
          trailer_metrics: {
            views: 50000,
            avg_watch_time_seconds: 45,
            retention_percent: 42
          },
          comparable_films: [
            { title: 'Similar Drama 1', platform_performance: 'moderate', genre_similarity_score: 0.85 }
          ]
        },
        offers: [
          {
            ott_name: 'Amazon Prime Video India',
            country_territory: 'India',
            offer_type: 'fixed',
            fixed_amount: 8000000,
            payment_timing: 'upfront',
            notes: 'Exclusive 3 years'
          }
        ],
        calendarEvents: []
      },
      expectedRecommendation: 'A'
    },
    
    example2: {
      name: 'Strong Buzz Film - Multiple MG Offers - IPL Event',
      payload: {
        producerInputs: {
          title: 'Urban Legends',
          runtime: 128,
          genre: 'Action Thriller',
          cast: 'Popular lead',
          budget: 12000000,
          production_completion_date: '2026-02-01',
          producerConfidence: 'high'
        },
        platformSignals: {
          sentiment_score: 0.72,
          buzz_score: 68,
          trailer_metrics: {
            views: 850000,
            avg_watch_time_seconds: 105,
            retention_percent: 78
          },
          comparable_films: [
            { title: 'Action Hit 1', platform_performance: 'strong', genre_similarity_score: 0.9 },
            { title: 'Thriller Success', platform_performance: 'strong', genre_similarity_score: 0.82 }
          ]
        },
        offers: [
          {
            ott_name: 'Netflix India',
            country_territory: 'India',
            offer_type: 'MG+revshare',
            mg_amount: 15000000,
            rev_share_percentage: 25,
            payment_timing: 'MG upfront, revenue quarterly',
            notes: 'Exclusive 2 years'
          },
          {
            ott_name: 'Disney+ Hotstar',
            country_territory: 'India',
            offer_type: 'MG+revshare',
            mg_amount: 12000000,
            rev_share_percentage: 30,
            payment_timing: 'MG upfront, revenue quarterly',
            notes: 'Co-marketing during IPL'
          }
        ],
        calendarEvents: [
          {
            name: 'IPL 2026',
            date: '2026-04-15',
            impact: 85,
            notes: 'Peak streaming engagement'
          }
        ]
      },
      expectedRecommendation: 'C'
    },
    
    example3: {
      name: 'Medium Buzz Film - Only Fixed Offers',
      payload: {
        producerInputs: {
          title: 'College Days',
          runtime: 115,
          genre: 'Rom-Com',
          cast: 'Fresh faces',
          budget: 5000000,
          production_completion_date: '2025-12-20',
          producerConfidence: 'medium'
        },
        platformSignals: {
          sentiment_score: 0.58,
          buzz_score: 42,
          trailer_metrics: {
            views: 320000,
            avg_watch_time_seconds: 78,
            retention_percent: 65
          },
          comparable_films: [
            { title: 'Romance Hit', platform_performance: 'moderate', genre_similarity_score: 0.88 }
          ]
        },
        offers: [
          {
            ott_name: 'Zee5',
            country_territory: 'India',
            offer_type: 'fixed',
            fixed_amount: 6500000,
            payment_timing: 'milestone-based',
            notes: '50% on signing, 50% on delivery'
          },
          {
            ott_name: 'SonyLIV',
            country_territory: 'India',
            offer_type: 'fixed',
            fixed_amount: 7000000,
            payment_timing: 'upfront',
            notes: 'Exclusive 2 years'
          }
        ],
        calendarEvents: []
      },
      expectedRecommendation: 'A'
    }
  };
}
