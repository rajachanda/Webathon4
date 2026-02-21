# OTT Deal Assistant - Complete Documentation

## 📋 Overview

The OTT Deal Assistant is an AI-powered recommendation system that helps indie film producers make data-driven decisions about OTT monetization. It analyzes producer confidence, platform signals (sentiment, buzz, trailer metrics), and current offers to recommend one of three strategic options:

- **Option A**: Direct sale pre-release (lowest risk, immediate cash)
- **Option B**: Sell after theatrical release (leverage performance data)
- **Option C**: Minimum Guarantee + Revenue Share (maximize upside)

---

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  src/pages/OTTDealPage.js + OTTDealPage.css                │
│  - Producer input form                                      │
│  - Platform signals (sentiment, buzz, trailer metrics)     │
│  - Offer management (add/remove platforms)                 │
│  - Results visualization (recommendation + projections)    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Express)                     │
│  routes/ottDeal.routes.js                                    │
│  - POST /api/ott-assistant/evaluate                         │
│  - GET /api/ott-assistant/examples                          │
│  - GET /api/ott-assistant/platforms                         │
│  - POST /api/ott-assistant/simulate                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 Business Logic (Service)                     │
│  src/services/ottDeal.service.js                            │
│  - evaluateOTTDeal() - Main orchestrator                    │
│  - Decision tree with 5 major logic branches               │
│  - Revenue projection calculator (3 scenarios)             │
│  - Release window optimizer (calendar-aware)               │
│  - Campaign plan generator                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              ML Stubs (Python - Optional)                    │
│  ml_stubs/ott_scoring.py                                     │
│  - compute_sentiment_score() - 0 to 1                       │
│  - compute_buzz_score() - 0 to 100                          │
│  - project_views() - Low/medium/high scenarios             │
│  - calculate_revenue_per_view() - Platform rates           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup & Wiring

### Step 1: Verify Files

Ensure all files are in place:

```
src/
  services/
    ottDeal.service.js         ✅ Core business logic
  pages/
    OTTDealPage.js             ✅ React component
    OTTDealPage.css            ✅ Styling
routes/
  ottDeal.routes.js            ✅ API routes
ml_stubs/
  ott_scoring.py               ✅ ML placeholder functions
tests/
  ottDeal.test.js              ✅ Unit & integration tests
```

### Step 2: Wire API Routes into Server

In your main `server.js` or `app.js`, add:

```javascript
// Import OTT Deal routes
const ottDealRoutes = require('./routes/ottDeal.routes');

// Mount routes (place this with your other route definitions)
app.use('/api/ott-assistant', ottDealRoutes);
```

**Full example:**

```javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Routes
const ottDealRoutes = require('./routes/ottDeal.routes');
app.use('/api/ott-assistant', ottDealRoutes);

// Other routes...
// app.use('/api/persona', personaRoutes);
// app.use('/api/buzz', buzzRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 3: Add Route to React App

In your main router (e.g., `src/App.js`), add the OTT Deal page:

```javascript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import OTTDealPage from './pages/OTTDealPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Existing routes */}
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* OTT Deal Assistant route */}
        <Route path="/ott-deal-assistant" element={<OTTDealPage />} />
      </Routes>
    </Router>
  );
}
```

### Step 4: Add Navigation Link

In your navigation component (e.g., `src/components/Header.js`), add:

```javascript
<nav>
  <Link to="/">Home</Link>
  <Link to="/dashboard">Dashboard</Link>
  <Link to="/campaign">Campaign</Link>
  <Link to="/ott-deal-assistant">💰 OTT Deal Assistant</Link>
</nav>
```

---

## 🧪 Testing

### Run Unit Tests

```bash
npm test tests/ottDeal.test.js
```

**Test coverage includes:**
- ✅ Decision logic (all 5 branches)
- ✅ Revenue projections (fixed, MG+revshare, post-release multipliers)
- ✅ Release window calculations (30-60 days for A, 90-180 for B, IPL alignment for C)
- ✅ Campaign plan generation
- ✅ Edge cases (no offers, extreme values)

### Manual API Testing

**Test 1: Low confidence + weak signals → Option A**

```bash
curl -X POST http://localhost:5000/api/ott-assistant/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "producerInputs": {
      "confidence": "low",
      "filmGenre": "Drama",
      "filmBudget": 250,
      "targetAudience": "General"
    },
    "platformSignals": {
      "sentiment": 0.35,
      "buzz": 25,
      "trailerViews": 100000,
      "trailerRetention": 45
    },
    "offers": [
      { "platform": "Zee5", "offer_type": "fixed", "fixed_amount": 280 }
    ],
    "calendarEvents": []
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "recommendation": {
      "option": "A",
      "confidence": 0.85,
      "reason": "Accept fixed buyout to minimize risk...",
      "pros": [...],
      "cons": [...]
    },
    "revenue_projections": {
      "option_a": { "low": 23800000, "medium": 23800000, "high": 23800000 },
      ...
    }
  }
}
```

**Test 2: High sentiment + buzz + MG offers → Option C**

```bash
curl -X POST http://localhost:5000/api/ott-assistant/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "producerInputs": {
      "confidence": "high",
      "filmGenre": "Thriller",
      "filmBudget": 500,
      "targetAudience": "Urban youth"
    },
    "platformSignals": {
      "sentiment": 0.72,
      "buzz": 68,
      "trailerViews": 850000,
      "trailerRetention": 78
    },
    "offers": [
      { "platform": "Netflix", "offer_type": "fixed", "fixed_amount": 450 },
      { 
        "platform": "Amazon Prime",
        "offer_type": "mg_plus_revshare",
        "mg_amount": 350,
        "revenue_share_percentage": 35
      }
    ],
    "calendarEvents": [
      {
        "event": "IPL 2024",
        "start_date": "2024-03-22",
        "end_date": "2024-05-26",
        "type": "Sports"
      }
    ]
  }'
```

**Expected response:**
```json
{
  "recommendation": {
    "option": "C",
    "confidence": 0.90,
    "reason": "MG+revshare maximizes returns with strong signals..."
  }
}
```

**Test 3: Get example payloads**

```bash
curl http://localhost:5000/api/ott-assistant/examples
```

**Test 4: Get platform information**

```bash
curl http://localhost:5000/api/ott-assistant/platforms
```

---

## 🧠 Decision Logic Explained

The system uses a **5-branch decision tree**:

### Branch 1: Low Confidence + Weak Signals → Option A
```javascript
if (confidence === 'low' && sentiment < 0.4 && buzz < 30) {
  return {
    option: 'A',
    confidence: 0.85,
    reason: 'Accept fixed buyout to minimize risk...'
  }
}
```

### Branch 2: High Signals + MG Offers → Option C
```javascript
if (sentiment >= 0.6 && buzz >= 50 && 
    (confidence === 'medium' || confidence === 'high') &&
    mgOffers.length > 0) {
  return {
    option: 'C',
    confidence: 0.90,
    reason: 'MG+revshare maximizes returns...'
  }
}
```

### Branch 3: Medium Signals → Option B
```javascript
if (sentiment >= 0.45 && sentiment < 0.65 && buzz >= 35 && buzz < 60) {
  return {
    option: 'B',
    confidence: 0.65,
    reason: 'Use theatrical performance to negotiate...'
  }
}
```

### Branch 4: Strong Buzz + Low Confidence → Option A
```javascript
if (confidence === 'low' && buzz >= 40) {
  return {
    option: 'A',
    confidence: 0.70,
    reason: 'Buzz is promising but producer confidence is low...'
  }
}
```

### Branch 5: No Offers → Option B (Guidance)
```javascript
if (offers.length === 0) {
  return {
    option: 'B',
    confidence: 0.60,
    reason: 'No concrete offers yet. Build buzz through theatrical...'
  }
}
```

---

## 💰 Revenue Calculation Details

### Option A: Fixed Buyout
```javascript
revenue = fixed_amount * 0.85  // 15% platform fees
```

**Example:**
- Zee5 offers ₹280 lakhs
- Net: 280 × 100000 × 0.85 = **₹23.8 million**

### Option B: Post-Release Sale
```javascript
avgFixed = average(all_fixed_offers)
low    = avgFixed * 0.6   // Weak theatrical performance
medium = avgFixed * 1.1   // Expected performance
high   = avgFixed * 1.5   // Strong performance
```

**Example:**
- Netflix: ₹380 lakhs, SonyLIV: ₹320 lakhs
- Average: ₹350 lakhs
- Projections:
  - Low: 350 × 0.6 = **₹210 lakhs**
  - Medium: 350 × 1.1 = **₹385 lakhs**
  - High: 350 × 1.5 = **₹525 lakhs**

### Option C: MG + Revenue Share
```javascript
projectedViews = baseViews * sentimentMultiplier * buzzMultiplier * retentionBonus
variableRevenue = projectedViews * 0.5 * (revenue_share_percentage / 100)
totalRevenue = mg_amount + variableRevenue
```

**Example:**
- Amazon Prime: ₹300 lakhs MG + 30% revshare
- Projected views (medium): 8 million
- Variable: 8M × ₹0.50 × 0.30 = **₹1.2 million**
- Total: 300 lakhs + 12 lakhs = **₹312 lakhs**

---

## 📅 Release Window Logic

### Option A: 30-60 Days (OTT Decides)
```javascript
startDate = today + 30 days
endDate = today + 60 days
reasoning = "Platform controls release timeline (30-60 days is typical)"
```

### Option B: 90-180 Days (Theatrical First)
```javascript
startDate = today + 90 days
endDate = today + 180 days
reasoning = "Allow theatrical run (8-12 weeks) before OTT release"
```

### Option C: Aligned with Major Events
```javascript
if (buzz >= 40 && iplEvent exists) {
  startDate = iplEvent.start_date
  endDate = iplEvent.end_date
  reasoning = "Launch during IPL to maximize viewership on Disney+ Hotstar"
} else {
  // Default to next Friday
  startDate = nextFriday()
  endDate = nextFriday() + 14 days
  reasoning = "Co-marketing with platform. Friday launch for max weekend views"
}
```

---

## 🎬 Campaign Plan Actions

### Option A (Direct Sale)
1. Finalize marketing assets per platform specifications
2. Coordinate trailer drop with platform (platform handles most promotion)
3. Minimal influencer outreach (1-2 micro-influencers)
4. Monitor pre-release buzz via social listening
5. Post-release: track views and retention metrics

### Option B (Post-Release)
1. Execute full theatrical marketing campaign
2. Track opening weekend box office KPIs
3. Monitor audience sentiment via exit polls and social media
4. Share positive theatrical data with OTT buyers
5. Negotiate competitive offers based on performance

### Option C (MG + RevShare)
1. Co-marketing with platform: align content calendar
2. Leverage platform's promotional reach (push notifications, homepage features)
3. Coordinate influencer campaigns (5-8 macro-influencers)
4. Time release with major events (IPL, festivals) if applicable
5. Drive viewership through collaborative social media campaigns

---

## 🔄 Production ML Integration

The current system uses **stub functions** in `ml_stubs/ott_scoring.py`. To integrate production ML models:

### Replace Sentiment Scoring
```python
# CURRENT STUB
def compute_sentiment_score(comments):
    # Simple keyword matching
    return 0.5

# PRODUCTION
from transformers import pipeline
sentiment_pipeline = pipeline("sentiment-analysis", model="nlptown/bert-base-multilingual-uncased-sentiment")

def compute_sentiment_score(comments):
    results = sentiment_pipeline(comments)
    scores = [r['score'] if r['label'] in ['4 stars', '5 stars'] else 0 for r in results]
    return sum(scores) / len(scores)
```

### Replace Buzz Scoring
```python
# CURRENT STUB
def compute_buzz_score(metrics):
    # Weighted logarithmic scoring
    return 50.0

# PRODUCTION
import joblib
buzz_model = joblib.load('models/buzz_scoring_model.pkl')

def compute_buzz_score(metrics):
    features = np.array([[
        metrics['views'],
        metrics['likes'],
        metrics['shares'],
        metrics['comments'],
        metrics['growth_rate'],
        metrics['share_velocity']
    ]])
    return buzz_model.predict(features)[0]
```

### Replace View Projections
```python
# CURRENT STUB
def project_views(comparable_films, trailer_metrics, region):
    # Simple averaging
    return {'low': 2500000, 'medium': 5000000, 'high': 10000000}

# PRODUCTION
from sklearn.ensemble import RandomForestRegressor
views_model = joblib.load('models/views_projection_model.pkl')

def project_views(comparable_films, trailer_metrics, region):
    features = extract_features(comparable_films, trailer_metrics, region)
    prediction = views_model.predict(features)[0]
    return {
        'low': int(prediction * 0.5),
        'medium': int(prediction),
        'high': int(prediction * 2.0)
    }
```

---

## 📊 Example Scenarios

### Scenario 1: Conservative First-Time Producer
**Inputs:**
- Confidence: Low
- Genre: Drama
- Budget: ₹2.5 crores
- Sentiment: 0.35 (negative leaning)
- Buzz: 25/100 (low)
- Offers: Zee5 fixed ₹2.8 crores

**Output:**
- **Recommendation**: Option A (85% confidence)
- **Revenue**: ₹2.38 crores (after fees)
- **Reasoning**: "Minimize risk with guaranteed payout"

---

### Scenario 2: Strong Buzz with IPL Synergy
**Inputs:**
- Confidence: High
- Genre: Thriller
- Budget: ₹5 crores
- Sentiment: 0.72 (positive)
- Buzz: 68/100 (high)
- Offers: 
  - Netflix fixed ₹4.5 crores
  - Amazon Prime MG ₹3.5 crores + 35% revshare
- Calendar: IPL March-May

**Output:**
- **Recommendation**: Option C (90% confidence)
- **Revenue**: ₹4.2-7.8 crores (low-high scenarios)
- **Release Window**: IPL dates (March 22 - May 26)
- **Reasoning**: "MG+revshare maximizes returns with strong signals. Launch during IPL for viewership spike."

---

### Scenario 3: Medium Buzz, No Strong Offers
**Inputs:**
- Confidence: Medium
- Genre: Romance
- Budget: ₹3.5 crores
- Sentiment: 0.55 (neutral-positive)
- Buzz: 45/100 (medium)
- Offers: SonyLIV fixed ₹3.2 crores

**Output:**
- **Recommendation**: Option B (65% confidence)
- **Revenue**: ₹2.1-5.3 crores (depends on theatrical)
- **Release Window**: 90-180 days (after theatrical)
- **Reasoning**: "Use theatrical performance to negotiate better OTT deals"

---

## 🐛 Troubleshooting

### API Returns 400 "Missing required fields"
**Solution:** Ensure payload includes both `producerInputs` and `platformSignals`:

```javascript
const payload = {
  producerInputs: { confidence, filmGenre, filmBudget, targetAudience },
  platformSignals: { sentiment, buzz, trailerViews, trailerRetention },
  offers: [...],
  calendarEvents: [...]
};
```

### API Returns 400 "Invalid sentiment value"
**Solution:** Sentiment must be 0-1, buzz must be 0-100:

```javascript
platformSignals: {
  sentiment: 0.65,  // ✅ Valid (0 to 1)
  buzz: 58,         // ✅ Valid (0 to 100)
  // NOT: sentiment: 65 ❌
}
```

### React Component Shows CORS Error
**Solution:** Enable CORS in your Express server:

```javascript
const cors = require('cors');
app.use(cors());
```

### Revenue Projections Show 0
**Solution:** Ensure offers have correct amount fields:

```javascript
// Fixed offer
{ 
  platform: 'Netflix',
  offer_type: 'fixed',
  fixed_amount: 400  // ✅ Must be present for fixed
}

// MG + RevShare offer
{
  platform: 'Amazon Prime',
  offer_type: 'mg_plus_revshare',
  mg_amount: 300,              // ✅ Must be present
  revenue_share_percentage: 30  // ✅ Must be present
}
```

---

## 🚀 Future Enhancements

### Phase 1: Basic Improvements
- [ ] Add database persistence for evaluations
- [ ] User dashboard showing evaluation history
- [ ] Export recommendations as PDF
- [ ] Email notifications on new offers

### Phase 2: Advanced Features
- [ ] Compare multiple scenarios side-by-side
- [ ] Integrate real-time platform data APIs
- [ ] Automated offer tracking and updates
- [ ] Competitive analysis (what similar films earned)

### Phase 3: ML Enhancements
- [ ] Train production sentiment model on Indian film comments
- [ ] Time-series forecasting for buzz trends
- [ ] Personalized recommendations based on producer history
- [ ] Platform-specific deal pattern recognition

---

## 📞 Support & Feedback

For questions or issues:
1. Check tests: `npm test tests/ottDeal.test.js`
2. Review API examples: `curl http://localhost:5000/api/ott-assistant/examples`
3. Examine decision logic in `src/services/ottDeal.service.js`

**Happy OTT deal-making! 🎬💰**
