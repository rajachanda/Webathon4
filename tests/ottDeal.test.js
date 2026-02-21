/**
 * OTT Deal Assistant - Unit and Integration Tests
 * 
 * Tests for:
 * - Service layer (ottDeal.service.js)
 * - API routes (ottDeal.routes.js)
 * - Decision logic validation
 * - Revenue calculation accuracy
 * 
 * Run with: npm test tests/ottDeal.test.js
 */

const ottDealService = require('../src/services/ottDeal.service');

// Test suite
describe('OTT Deal Assistant Tests', () => {
  
  // ============= DECISION LOGIC TESTS =============
  
  describe('Decision Logic Tests', () => {
    
    test('Low confidence + weak signals should recommend Option A', () => {
      const payload = {
        producerInputs: {
          confidence: 'low',
          filmGenre: 'Drama',
          filmBudget: 250,
          targetAudience: 'General'
        },
        platformSignals: {
          sentiment: 0.35,
          buzz: 25,
          trailerViews: 100000,
          trailerRetention: 45
        },
        offers: [
          { platform: 'Zee5', offer_type: 'fixed', fixed_amount: 280 }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('A');
      expect(result.recommendation.confidence).toBeGreaterThanOrEqual(0.75);
      expect(result.recommendation.reason).toContain('Accept fixed buyout');
    });

    test('High sentiment + high buzz + MG offers should recommend Option C', () => {
      const payload = {
        producerInputs: {
          confidence: 'high',
          filmGenre: 'Thriller',
          filmBudget: 500,
          targetAudience: 'Urban youth 18-35'
        },
        platformSignals: {
          sentiment: 0.72,
          buzz: 68,
          trailerViews: 850000,
          trailerRetention: 78
        },
        offers: [
          { platform: 'Netflix', offer_type: 'fixed', fixed_amount: 450 },
          { 
            platform: 'Amazon Prime', 
            offer_type: 'mg_plus_revshare',
            mg_amount: 350,
            revenue_share_percentage: 35
          }
        ],
        calendarEvents: [
          {
            event: 'IPL 2024',
            start_date: '2024-03-22',
            end_date: '2024-05-26',
            type: 'Sports'
          }
        ]
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('C');
      expect(result.recommendation.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.recommendation.reason).toContain('MG+revshare');
    });

    test('Medium signals should recommend Option B', () => {
      const payload = {
        producerInputs: {
          confidence: 'medium',
          filmGenre: 'Romance',
          filmBudget: 350,
          targetAudience: 'Female 20-40'
        },
        platformSignals: {
          sentiment: 0.55,
          buzz: 45,
          trailerViews: 450000,
          trailerRetention: 62
        },
        offers: [
          { platform: 'SonyLIV', offer_type: 'fixed', fixed_amount: 320 }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('B');
      expect(result.recommendation.confidence).toBeGreaterThanOrEqual(0.60);
    });

    test('Strong buzz + low confidence should still recommend Option A', () => {
      const payload = {
        producerInputs: {
          confidence: 'low',
          filmGenre: 'Action',
          filmBudget: 200,
          targetAudience: 'Mass audience'
        },
        platformSignals: {
          sentiment: 0.48,
          buzz: 55,
          trailerViews: 600000,
          trailerRetention: 70
        },
        offers: [
          { platform: 'Zee5', offer_type: 'fixed', fixed_amount: 300 }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('A');
      expect(result.recommendation.reason).toContain('buzz is promising but producer confidence is low');
    });
  });

  // ============= REVENUE PROJECTION TESTS =============
  
  describe('Revenue Projection Tests', () => {
    
    test('Fixed offer revenue should deduct 15% platform fees', () => {
      const payload = {
        producerInputs: { confidence: 'medium', filmGenre: 'Drama', filmBudget: 300, targetAudience: 'General' },
        platformSignals: { sentiment: 0.5, buzz: 50, trailerViews: 300000, trailerRetention: 60 },
        offers: [
          { platform: 'Netflix', offer_type: 'fixed', fixed_amount: 400 }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      // Fixed amount: 400 lakhs → 400 * 100000 = 40000000
      // After 15% fees: 40000000 * 0.85 = 34000000
      expect(result.revenue_projections.option_a.low).toBe(34000000);
      expect(result.revenue_projections.option_a.medium).toBe(34000000);
      expect(result.revenue_projections.option_a.high).toBe(34000000);
    });

    test('MG + RevShare should calculate variable revenue correctly', () => {
      const payload = {
        producerInputs: { confidence: 'high', filmGenre: 'Thriller', filmBudget: 500, targetAudience: 'Urban' },
        platformSignals: { sentiment: 0.7, buzz: 65, trailerViews: 700000, trailerRetention: 75 },
        offers: [
          {
            platform: 'Amazon Prime',
            offer_type: 'mg_plus_revshare',
            mg_amount: 300,
            revenue_share_percentage: 30
          }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      // MG: 300 lakhs = 30000000
      // Variable revenue depends on projected views × 0.5 × 0.30
      // Should be MG + variable for each scenario
      expect(result.revenue_projections.option_c.low).toBeGreaterThan(30000000);
      expect(result.revenue_projections.option_c.medium).toBeGreaterThan(result.revenue_projections.option_c.low);
      expect(result.revenue_projections.option_c.high).toBeGreaterThan(result.revenue_projections.option_c.medium);
    });

    test('Option B projections should use multipliers on average fixed', () => {
      const payload = {
        producerInputs: { confidence: 'medium', filmGenre: 'Comedy', filmBudget: 350, targetAudience: 'Family' },
        platformSignals: { sentiment: 0.55, buzz: 50, trailerViews: 400000, trailerRetention: 65 },
        offers: [
          { platform: 'Netflix', offer_type: 'fixed', fixed_amount: 380 },
          { platform: 'SonyLIV', offer_type: 'fixed', fixed_amount: 320 }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      // Average fixed: (380 + 320) / 2 = 350 lakhs = 35000000
      // Low: 35000000 * 0.6 = 21000000
      // Medium: 35000000 * 1.1 = 38500000
      // High: 35000000 * 1.5 = 52500000
      expect(result.revenue_projections.option_b.low).toBeCloseTo(21000000, -5);
      expect(result.revenue_projections.option_b.medium).toBeCloseTo(38500000, -5);
      expect(result.revenue_projections.option_b.high).toBeCloseTo(52500000, -5);
    });
  });

  // ============= RELEASE WINDOW TESTS =============
  
  describe('Release Window Tests', () => {
    
    test('Option A should suggest 30-60 day window', () => {
      const payload = {
        producerInputs: { confidence: 'low', filmGenre: 'Drama', filmBudget: 250, targetAudience: 'General' },
        platformSignals: { sentiment: 0.35, buzz: 25, trailerViews: 100000, trailerRetention: 45 },
        offers: [
          { platform: 'Zee5', offer_type: 'fixed', fixed_amount: 280 }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('A');
      
      const startDate = new Date(result.release_strategy.suggested_release_window.start_date);
      const endDate = new Date(result.release_strategy.suggested_release_window.end_date);
      const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
      
      expect(daysDiff).toBeGreaterThanOrEqual(30);
      expect(daysDiff).toBeLessThanOrEqual(60);
    });

    test('Option B should suggest 90-180 day window', () => {
      const payload = {
        producerInputs: { confidence: 'medium', filmGenre: 'Romance', filmBudget: 350, targetAudience: 'Female' },
        platformSignals: { sentiment: 0.55, buzz: 45, trailerViews: 450000, trailerRetention: 62 },
        offers: [
          { platform: 'SonyLIV', offer_type: 'fixed', fixed_amount: 320 }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('B');
      
      const startDate = new Date(result.release_strategy.suggested_release_window.start_date);
      const endDate = new Date(result.release_strategy.suggested_release_window.end_date);
      const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
      
      expect(daysDiff).toBeGreaterThanOrEqual(90);
      expect(daysDiff).toBeLessThanOrEqual(180);
    });

    test('Option C with IPL should align with IPL dates', () => {
      const payload = {
        producerInputs: { confidence: 'high', filmGenre: 'Action', filmBudget: 450, targetAudience: 'Male 18-35' },
        platformSignals: { sentiment: 0.68, buzz: 70, trailerViews: 750000, trailerRetention: 76 },
        offers: [
          {
            platform: 'Disney+ Hotstar',
            offer_type: 'mg_plus_revshare',
            mg_amount: 320,
            revenue_share_percentage: 32
          }
        ],
        calendarEvents: [
          {
            event: 'IPL 2024',
            start_date: '2024-03-22',
            end_date: '2024-05-26',
            type: 'Sports'
          }
        ]
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('C');
      expect(result.release_strategy.relevant_calendar_events).toHaveLength(1);
      expect(result.release_strategy.relevant_calendar_events[0].event).toBe('IPL 2024');
      expect(result.release_strategy.suggested_release_window.reasoning).toContain('IPL');
    });
  });

  // ============= CAMPAIGN PLAN TESTS =============
  
  describe('Campaign Plan Tests', () => {
    
    test('Option A should have minimal campaign actions', () => {
      const payload = {
        producerInputs: { confidence: 'low', filmGenre: 'Drama', filmBudget: 250, targetAudience: 'General' },
        platformSignals: { sentiment: 0.35, buzz: 25, trailerViews: 100000, trailerRetention: 45 },
        offers: [
          { platform: 'Zee5', offer_type: 'fixed', fixed_amount: 280 }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('A');
      expect(result.campaign_plan.actions).toHaveLength(5);
      expect(result.campaign_plan.actions.some(action => action.includes('platform handles'))).toBe(true);
    });

    test('Option C should have co-marketing actions', () => {
      const payload = {
        producerInputs: { confidence: 'high', filmGenre: 'Thriller', filmBudget: 500, targetAudience: 'Urban' },
        platformSignals: { sentiment: 0.72, buzz: 68, trailerViews: 850000, trailerRetention: 78 },
        offers: [
          {
            platform: 'Amazon Prime',
            offer_type: 'mg_plus_revshare',
            mg_amount: 350,
            revenue_share_percentage: 35
          }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('C');
      expect(result.campaign_plan.actions).toHaveLength(5);
      expect(result.campaign_plan.actions.some(action => action.includes('co-marketing'))).toBe(true);
    });
  });

  // ============= EDGE CASE TESTS =============
  
  describe('Edge Case Tests', () => {
    
    test('No offers should still provide Option B guidance', () => {
      const payload = {
        producerInputs: { confidence: 'medium', filmGenre: 'Drama', filmBudget: 300, targetAudience: 'General' },
        platformSignals: { sentiment: 0.5, buzz: 50, trailerViews: 300000, trailerRetention: 60 },
        offers: [],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('B');
      expect(result.recommendation.reason).toContain('No concrete offers yet');
    });

    test('Only MG offers should still evaluate correctly', () => {
      const payload = {
        producerInputs: { confidence: 'high', filmGenre: 'Action', filmBudget: 450, targetAudience: 'Male' },
        platformSignals: { sentiment: 0.65, buzz: 60, trailerViews: 650000, trailerRetention: 72 },
        offers: [
          {
            platform: 'Netflix',
            offer_type: 'mg_plus_revshare',
            mg_amount: 320,
            revenue_share_percentage: 30
          },
          {
            platform: 'Amazon Prime',
            offer_type: 'mg_plus_revshare',
            mg_amount: 300,
            revenue_share_percentage: 32
          }
        ],
        calendarEvents: []
      };

      const result = ottDealService.evaluateOTTDeal(payload);
      
      expect(result.recommendation.option).toBe('C');
      expect(result.revenue_projections.option_c.medium).toBeGreaterThan(0);
    });

    test('Extreme values should not crash', () => {
      const payload = {
        producerInputs: { confidence: 'low', filmGenre: 'Drama', filmBudget: 0, targetAudience: '' },
        platformSignals: { sentiment: 0, buzz: 0, trailerViews: 0, trailerRetention: 0 },
        offers: [],
        calendarEvents: []
      };

      expect(() => {
        ottDealService.evaluateOTTDeal(payload);
      }).not.toThrow();
    });
  });

  // ============= EXAMPLE PAYLOADS TEST =============
  
  describe('Example Payloads Tests', () => {
    
    test('Should return 3 example payloads', () => {
      const examples = ottDealService.getExamplePayloads();
      
      expect(examples).toHaveLength(3);
      expect(examples[0]).toHaveProperty('scenario');
      expect(examples[0]).toHaveProperty('payload');
      expect(examples[0]).toHaveProperty('expected_recommendation');
    });

    test('Each example should evaluate correctly', () => {
      const examples = ottDealService.getExamplePayloads();
      
      examples.forEach(example => {
        const result = ottDealService.evaluateOTTDeal(example.payload);
        expect(result.recommendation.option).toBe(example.expected_recommendation);
      });
    });
  });
});

// Run tests
console.log('Running OTT Deal Assistant Tests...');
console.log('(Use Jest or Mocha for actual test execution)');
console.log('\nExample manual test:');

const testPayload = {
  producerInputs: {
    confidence: 'medium',
    filmGenre: 'Thriller',
    filmBudget: 400,
    targetAudience: 'Urban youth 18-35'
  },
  platformSignals: {
    sentiment: 0.62,
    buzz: 58,
    trailerViews: 600000,
    trailerRetention: 68
  },
  offers: [
    { platform: 'Netflix', offer_type: 'fixed', fixed_amount: 420 },
    {
      platform: 'Amazon Prime',
      offer_type: 'mg_plus_revshare',
      mg_amount: 320,
      revenue_share_percentage: 32
    }
  ],
  calendarEvents: []
};

const testResult = ottDealService.evaluateOTTDeal(testPayload);
console.log('\nTest Result:');
console.log(`Recommendation: ${testResult.recommendation.option}`);
console.log(`Confidence: ${(testResult.recommendation.confidence * 100).toFixed(0)}%`);
console.log(`Reason: ${testResult.recommendation.reason}`);
console.log('\nRevenue Projections (Medium):');
console.log(`Option A: ₹${(testResult.revenue_projections.option_a.medium / 100000).toFixed(2)} Lakhs`);
console.log(`Option B: ₹${(testResult.revenue_projections.option_b.medium / 100000).toFixed(2)} Lakhs`);
console.log(`Option C: ₹${(testResult.revenue_projections.option_c.medium / 100000).toFixed(2)} Lakhs`);

module.exports = { describe, test, expect: null }; // Exports for test runners
