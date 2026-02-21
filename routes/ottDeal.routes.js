/**
 * OTT Deal Assistant API Routes
 * 
 * Exposes the OTT monetization decision service via REST API
 * 
 * Routes:
 * - POST /api/ott-assistant/evaluate - Get OTT deal recommendations
 * - GET /api/ott-assistant/examples - Get example payloads for testing
 * - GET /api/ott-assistant/platforms - Get platform information
 * 
 * Wire into server.js:
 * const ottDealRoutes = require('./routes/ottDeal.routes');
 * app.use('/api/ott-assistant', ottDealRoutes);
 */

const express = require('express');
const router = express.Router();
const ottDealService = require('../src/services/ottDeal.service');
const ottPlatformsService = require('../src/services/ottPlatforms.service');

/**
 * POST /api/ott-assistant/evaluate
 * 
 * Evaluate OTT monetization options and return recommendations
 * 
 * Request body:
 * {
 *   "producerInputs": {
 *     "confidence": "low" | "medium" | "high",
 *     "filmGenre": string,
 *     "filmBudget": number,
 *     "targetAudience": string
 *   },
 *   "platformSignals": {
 *     "sentiment": number (0-1),
 *     "buzz": number (0-100),
 *     "trailerViews": number,
 *     "trailerRetention": number (0-100)
 *   },
 *   "offers": Array<{
 *     "platform": string,
 *     "offer_type": "fixed" | "mg_plus_revshare",
 *     "fixed_amount"?: number,
 *     "mg_amount"?: number,
 *     "revenue_share_percentage"?: number
 *   }>,
 *   "calendarEvents": Array<{
 *     "event": string,
 *     "start_date": string (ISO),
 *     "end_date": string (ISO),
 *     "type": string
 *   }>
 * }
 * 
 * Response:
 * {
 *   "recommendation": {
 *     "option": "A" | "B" | "C",
 *     "confidence": number (0-1),
 *     "reason": string,
 *     "pros": string[],
 *     "cons": string[]
 *   },
 *   "revenue_projections": {
 *     "option_a": { low, medium, high },
 *     "option_b": { low, medium, high },
 *     "option_c": { low, medium, high }
 *   },
 *   "release_strategy": {
 *     "suggested_release_window": { start_date, end_date, reasoning },
 *     "relevant_calendar_events": Array
 *   },
 *   "campaign_plan": {
 *     "actions": Array<string>
 *   }
 * }
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { producerInputs, platformSignals, offers, calendarEvents } = req.body;

    // Validation
    if (!producerInputs || !platformSignals) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'producerInputs and platformSignals are required',
        example: ottDealService.getExamplePayloads()[0]
      });
    }

    // Validate ranges
    if (platformSignals.sentiment < 0 || platformSignals.sentiment > 1) {
      return res.status(400).json({
        error: 'Invalid sentiment value',
        message: 'sentiment must be between 0 and 1'
      });
    }

    if (platformSignals.buzz < 0 || platformSignals.buzz > 100) {
      return res.status(400).json({
        error: 'Invalid buzz value',
        message: 'buzz must be between 0 and 100'
      });
    }

    // Call service
    const result = ottDealService.evaluateOTTDeal({
      producerInputs,
      platformSignals,
      offers: offers || [],
      calendarEvents: calendarEvents || []
    });

    // Return recommendation
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result
    });

  } catch (error) {
    console.error('OTT evaluation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/ott-assistant/examples
 * 
 * Get example payloads for testing
 * 
 * Response:
 * {
 *   "examples": Array<{
 *     "scenario": string,
 *     "payload": object,
 *     "expected_recommendation": string
 *   }>
 * }
 */
router.get('/examples', (req, res) => {
  try {
    const examples = ottDealService.getExamplePayloads();
    
    res.json({
      success: true,
      count: examples.length,
      examples: examples
    });
  } catch (error) {
    console.error('Error fetching examples:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/ott-assistant/platforms
 * 
 * Get information about supported OTT platforms (loaded from CSV)
 * 
 * Response:
 * {
 *   "platforms": Array<{
 *     "name": string,
 *     "deal_types": string[],
 *     "fixed_buyout_range": object,
 *     "revenue_share_range": string,
 *     ...
 *   }>
 * }
 */
router.get('/platforms', async (req, res) => {
  try {
    const platforms = await ottPlatformsService.loadOTTPlatforms();
    
    res.json({
      success: true,
      count: platforms.length,
      platforms: platforms,
      source: 'OTTs - Sheet1.csv'
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/ott-assistant/simulate
 * 
 * Simulate multiple scenarios and compare outcomes
 * 
 * Request body:
 * {
 *   "basePayload": {...},  // Base evaluation payload
 *   "scenarios": [
 *     { "name": "Scenario 1", "overrides": {...} },
 *     { "name": "Scenario 2", "overrides": {...} }
 *   ]
 * }
 * 
 * Response:
 * {
 *   "simulations": Array<{
 *     "scenario_name": string,
 *     "result": {...}
 *   }>
 * }
 */
router.post('/simulate', async (req, res) => {
  try {
    const { basePayload, scenarios } = req.body;

    if (!basePayload || !scenarios || !Array.isArray(scenarios)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'basePayload and scenarios array required'
      });
    }

    const simulations = scenarios.map(scenario => {
      // Merge base payload with scenario overrides
      const simulationPayload = {
        ...basePayload,
        producerInputs: {
          ...basePayload.producerInputs,
          ...(scenario.overrides?.producerInputs || {})
        },
        platformSignals: {
          ...basePayload.platformSignals,
          ...(scenario.overrides?.platformSignals || {})
        },
        offers: scenario.overrides?.offers || basePayload.offers,
        calendarEvents: scenario.overrides?.calendarEvents || basePayload.calendarEvents
      };

      const result = ottDealService.evaluateOTTDeal(simulationPayload);

      return {
        scenario_name: scenario.name,
        overrides_applied: scenario.overrides,
        result: result
      };
    });

    res.json({
      success: true,
      simulation_count: simulations.length,
      simulations: simulations
    });

  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
