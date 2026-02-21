<div align="center">

# 🎬 CinYstore

### *Paora Filmy Hai Boss..!*

**The Ultimate AI-Powered Film Distribution & Marketing Intelligence Platform**

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Python](https://img.shields.io/badge/Python-ML_Models-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)

</div>

---

## 🎯 What is CinYstore?

CinYstore is a **next-generation film distribution and marketing intelligence platform** that empowers filmmakers, distributors, and marketing professionals to make data-driven decisions throughout the entire film release lifecycle. From strategic planning to OTT deal negotiations, CinYstore is your all-in-one command center for cinematic success.

### 🚀 Why CinYstore?

In today's competitive film industry, success isn't just about making great content—it's about **strategic release planning**, **audience targeting**, **competition analysis**, and **data-driven marketing**. CinYstore brings together powerful AI/ML capabilities, real-time analytics, and industry intelligence to give you the edge.

---

## ✨ Core Features

### 🎭 **Project Onboarding & Management**
- Create and manage multiple film projects
- Role-based access control (Director, Producer, Distributor, Marketing Manager)
- Team collaboration with shareable POV forms
- Comprehensive project metadata tracking

### 🎨 **AI-Powered Poster Analysis**
- **"3-Second Rule" ML Model** using ResNet18 architecture
- Analyzes poster visual appeal and stopping power
- Provides actionable feedback for design improvements
- Batch processing support for A/B testing multiple designs

### 👥 **Audience Persona Intelligence**
- Target audience segmentation and clustering
- Demographic and psychographic profiling
- Genre-specific audience insights
- Custom persona builder with AI recommendations

### 📅 **Release Window Analyzer**
- **Competition heatmap calendar** visualization
- Strategic release date recommendations
- Real-time box office intelligence
- Holiday and festival impact analysis
- Identifies optimal release windows based on competition density

### 📊 **Buzz Score Metrics**
- **Real-time buzz tracking** from YouTube & social media
- Automated metrics calculation (60% YouTube + 40% Google Trends)
- Historical buzz tracking with sparkline charts
- Configurable data sources (YouTube URLs, Instagram handles)

### 🎯 **Campaign Management**
- **30-Day Pre-Release Campaign Blueprints**
- Day-by-day action plans with progress tracking
- Platform-specific strategies (YouTube, Instagram, Twitter)
- Budget allocation recommendations
- AI-generated campaign suggestions

### 💭 **Sentiment Analysis**
- **AI-powered comment sentiment analysis** using Gemini 1.5
- YouTube, Instagram, and Twitter comment aggregation
- Real-time sentiment scoring and categorization
- Topic clustering and keyword extraction
- Visual sentiment breakdown with emotional insights

### 📊 **Distributor Analyzer**
- **CSV-based distributor database** with 10,000+ entries
- Filter by region, city, medium, and screens
- Export capabilities for targeted outreach
- Contact information management

### 🏆 **Competition Intelligence**
- Track competing releases in your window
- Genre-wise competition analysis
- Box office prediction and impact assessment
- Strategic repositioning recommendations

### 🎬 **OTT Deal Assistant**
- **AI-driven OTT platform recommendations**
- Deal valuation estimator based on:
  - Genre performance on platforms
  - Star cast box office history
  - Historical OTT acquisition trends
- Platform-specific insights (Netflix, Amazon Prime, Disney+ Hotstar, etc.)
- Deal negotiation guidance

### 🌟 **Influencer Recommendations**
- Genre-specific influencer database
- Reach and engagement metrics
- Contact information and collaboration history
- Budget-based filtering

---

## 🛠️ Tech Stack

### **Frontend**
- **React 18.2** - Modern UI with hooks and context API
- **React Router v6** - Client-side routing and navigation
- **CSS3** - Custom styling with gradients and animations
- **React Icons** - Extensive icon library

### **Backend**
- **Node.js & Express** - REST API server
- **Multer** - File upload handling for poster analysis
- **CORS** - Cross-origin resource sharing

### **Database & Auth**
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Row Level Security (RLS)** - Secure data access policies
- **Google OAuth** - Seamless authentication via Supabase Auth

### **AI & Machine Learning**
- **Python 3.x** - ML model serving
- **PyTorch** - Deep learning framework
- **ResNet18** - Pre-trained CNN for poster analysis
- **Google Gemini 1.5 Flash** - LLM for sentiment analysis and recommendations
- **YouTube Data API v3** - Video metrics and comments
- **Google Trends API** - Search interest tracking

### **Integration & APIs**
- **YouTube Data API** - Video analytics and engagement
- **Instagram Graph API** - Social media metrics
- **Multiple Gemini API Keys** - Load balancing with automatic rotation
- **Custom ML Endpoints** - Poster scoring and analysis

---

## 📦 Installation Guide

### **Prerequisites**

- Node.js v16+ and npm
- Python 3.8+ (for ML model)
- Supabase account
- Google Cloud Console account (for OAuth & API keys)

### **Step 1: Clone & Install Dependencies**

```bash
# Clone the repository
git clone <your-repo-url>
cd Webathon4

# Install Node.js dependencies
npm install

# Install Python dependencies for poster analysis
cd poster_model
pip install -r requirements.txt
cd ..
```

### **Step 2: Database Setup**

1. **Create a Supabase Project**
   - Go to [Supabase Dashboard](https://app.supabase.com/)
   - Create a new project
   - Note down your `Project URL` and `Anon Key`

2. **Run SQL Migrations**
   Execute these SQL files in order in Supabase SQL Editor:
   ```sql
   supabase-setup.sql              -- Core user profiles
   complete-database-setup.sql     -- All project tables
   feature-expansion-migrations.sql -- Extended features
   buzz-config-setup.sql           -- Buzz tracking
   sentiment-analysis-setup.sql    -- Sentiment tables
   campaign-upgrade-migration.sql  -- Campaign features
   ```

3. **Enable Google OAuth**
   - Navigate to: `Authentication` → `Providers` → `Google`
   - Enable Google provider
   - Configure OAuth consent screen in Google Cloud Console
   - Add authorized redirect URIs

### **Step 3: Environment Variables**

Create a `.env` file in the root directory with the following configuration:

```env
# ============================================
# SUPABASE CONFIGURATION (Required)
# ============================================
# Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ============================================
# YOUTUBE DATA API v3 (Required for Buzz & Sentiment)
# ============================================
# Get from: https://console.cloud.google.com/apis/credentials
# Enable YouTube Data API v3 in Google Cloud Console
REACT_APP_YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ============================================
# GOOGLE GEMINI AI (Required for Sentiment Analysis & Recommendations)
# ============================================
# Get from: https://makersuite.google.com/app/apikey
# Use multiple keys (comma-separated) for automatic load balancing and rate limit handling
# Minimum 1 key, recommended 4 keys for best performance
GOOGLE_API_KEYS=AIzaSyXXX_key1,AIzaSyXXX_key2,AIzaSyXXX_key3,AIzaSyXXX_key4

# ============================================
# OPTIONAL CONFIGURATIONS
# ============================================
# Python command (use 'python' on Windows, 'python3' on Mac/Linux)
PYTHON_CMD=python

# Node.js server port (default: 3001)
PORT=3001

# ============================================
# ADDITIONAL API KEYS (Optional - for future features)
# ============================================
# Sports API for event tracking (optional)
REACT_APP_SPORTS_API_KEY=your_sports_api_key

# Google Calendar API for holiday tracking (optional)
REACT_APP_GOOGLE_CALENDAR_API_KEY=your_calendar_api_key

# Groq API for alternative LLM (optional)
REACT_APP_GROQ_API_KEYS=gsk_xxx,gsk_yyy,gsk_zzz
```

#### **How to Get Your API Keys:**

<details>
<summary><b>🔹 Supabase Configuration</b></summary>

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → `REACT_APP_SUPABASE_URL`
   - **Anon/Public Key** → `REACT_APP_SUPABASE_ANON_KEY`
</details>

<details>
<summary><b>🔹 YouTube Data API Key</b></summary>

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**:
   - Navigate to **APIs & Services** → **Library**
   - Search for "YouTube Data API v3"
   - Click **Enable**
4. Create credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **API Key**
   - Copy the generated key → `REACT_APP_YOUTUBE_API_KEY`
5. (Optional) Restrict the key to YouTube Data API v3 for security
</details>

<details>
<summary><b>🔹 Google Gemini AI Keys</b></summary>

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key
5. **For best performance**, create 4 separate keys for load balancing:
   - The app automatically rotates between keys to avoid rate limits
   - Format: comma-separated without spaces
   - Example: `key1,key2,key3,key4`
</details>

<details>
<summary><b>🔹 Google OAuth Setup</b></summary>

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **OAuth consent screen**
3. Configure consent screen (External/Internal)
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
7. Copy **Client ID** and **Client Secret**
8. In Supabase Dashboard:
   - Go to **Authentication** → **Providers**
   - Enable **Google**
   - Paste Client ID and Client Secret
   - Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`
</details>

#### **⚠️ Important Security Notes:**

- **Never commit `.env` file to GitHub** - already included in `.gitignore`
- Keep your API keys private and secure
- Rotate keys periodically for security
- Use environment-specific `.env` files for development/production
- For production deployment, set environment variables in your hosting platform (Vercel, Netlify, etc.)

#### **💡 Rate Limits & Performance:**

| Service | Free Tier Limit | Pro Tip |
|---------|----------------|---------|
| YouTube Data API | 10,000 units/day | One search = ~100 units, one video = 1 unit |
| Gemini AI | 60 requests/minute | Use 4 keys for 240 req/min effective limit |
| Supabase | 500MB database, 2GB bandwidth | Upgrade for larger projects |

### **Step 4: ML Model Setup**

```bash
cd poster_model

# Place your trained model file (three_second_rule.pth)
# If you don't have it, you'll need to train the ResNet18 model first

# Test the model
python cli_analyze.py "path/to/test/poster.jpg"
```

### **Step 5: Run the Application**

```bash
# Development mode (runs both frontend & backend)
npm run dev

# OR run separately:
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm start
```

The app will open at `http://localhost:3000` (frontend) and API at `http://localhost:3001` (backend).

---

## 🎮 Usage Guide

### **First Time Login**

1. Visit `http://localhost:3000`
2. Click **"Get Started"** or **"Login"**
3. Sign in with Google
4. Select your role (Director, Producer, Distributor, Marketing Manager)
5. You'll be redirected to your personalized dashboard

### **Creating Your First Project**

1. Click **"New Film +"** in the navigation
2. Fill in project details:
   - Film title and tagline
   - Genre, language, and budget
   - Target release date
   - Upload poster for AI analysis
3. Add initial media links (trailers/teasers)
4. Submit and navigate to your project overview

### **Key Workflows**

**🎯 Persona Building**
- Navigate to `Project → Persona`
- Define target demographics
- AI suggests relevant audience clusters
- Save and use for campaign targeting

**📅 Release Window Analysis**
- Go to `Project → Release Window`
- View competition heatmap calendar
- Analyze competing releases by date
- Get AI recommendations for optimal dates

**📊 Buzz Tracking**
- Visit `Project → Buzz`
- Add YouTube URLs and Instagram handles
- System auto-calculates real-time buzz scores
- Track historical trends with sparkline charts

**🎬 Campaign Planning**
- Access `Project → Campaign`
- View 30-day pre-release action blueprint
- Mark actions as completed
- Track progress with visual indicators

**💭 Sentiment Analysis**
- Go to `Project → Sentiment`
- Add video/social media URLs
- AI analyzes comments using Gemini
- View emotional breakdown and key topics

**🎬 OTT Deal Assistance**
- Navigate to `Project → OTT Deal`
- Input film genre, cast, budget
- Get platform-specific recommendations
- View estimated deal valuations

---

## 📁 Project Structure

```
📦 Webathon4/
├── 📂 public/                      # Static assets
│   ├── index.html
│   └── assets/
│       ├── csv.csv                 # Release intelligence data
│       ├── Influencer-Genre.csv    # Influencer database
│       └── posters/                # Sample posters
├── 📂 src/
│   ├── 📂 components/              # Reusable React components
│   │   ├── AutoBuzzMetrics.js      # Real-time buzz tracking
│   │   ├── BuzzConfiguration.js    # Buzz setup UI
│   │   ├── CalendarStrip.js        # Date selector
│   │   ├── HeatmapCalendar.js      # Competition heatmap
│   │   ├── GaugeMeter.js           # Score visualization
│   │   ├── Header.js               # Navigation
│   │   ├── MovieBackground.js      # Animated backdrop
│   │   └── ProjectLayout.js        # Project page wrapper
│   ├── 📂 pages/                   # Main application pages
│   │   ├── Login.js                # Authentication
│   │   ├── RoleSelection.js        # Onboarding
│   │   ├── DashboardPage.js        # User dashboard
│   │   ├── NewProjectOnboarding.js # Create new film
│   │   ├── ProjectOverviewPage.js  # Project home
│   │   ├── PersonaPage.js          # Audience targeting
│   │   ├── ReleaseWindowPage.js    # Competition analysis
│   │   ├── BuzzPage.js             # Buzz metrics
│   │   ├── CampaignPage.js         # Campaign plans
│   │   ├── SentimentAnalysisPage.js # Comment analysis
│   │   ├── DistributorAnalyzerPage.js # Distributor search
│   │   ├── CompetitionManager.js   # Competition tracking
│   │   └── OTTDealPage.js          # OTT recommendations
│   ├── 📂 services/                # API service layer
│   │   └── api.service.js          # Supabase queries
│   ├── 📂 utils/                   # Helper functions
│   ├── 📂 hooks/                   # Custom React hooks
│   ├── 📂 config/                  # Configuration files
│   │   ├── api.js                  # API endpoints & keys
│   │   ├── constants.js            # App constants
│   │   └── features.js             # Feature flags
│   ├── App.js                      # Main app component
│   ├── AuthContext.js              # Authentication context
│   └── supabaseClient.js           # Supabase client
├── 📂 poster_model/                # Python ML model
│   ├── app.py                      # Streamlit web UI
│   ├── predict.py                  # Batch scorer
│   ├── cli_analyze.py              # CLI wrapper (called by Node.js)
│   ├── test.py                     # Test cases
│   ├── three_second_rule.pth       # Trained PyTorch model
│   └── requirements.txt            # Python dependencies
├── 📂 routes/                      # Express API routes
│   └── ottDeal.routes.js           # OTT deal endpoints
├── 📂 ml_stubs/                    # ML scoring utilities
│   └── ott_scoring.py              # OTT deal valuation
├── 📂 tests/                       # Test files
│   └── ottDeal.test.js
├── 📄 server.js                    # Express backend server
├── 📄 package.json                 # Node.js dependencies
├── 📄 config-overrides.js          # Webpack customization
└── 📄 *.sql                        # Database migration files
```

---

## 🚀 Available Scripts

```bash
# Development (runs frontend + backend concurrently)
npm run dev

# Frontend only
npm start

# Backend only
npm run server

# Production build
npm run build

# Run tests
npm test

# Eject from Create React App (⚠️ one-way operation)
npm run eject
```

---

## 🔐 Security & Best Practices

- **Row Level Security (RLS)** enabled on all Supabase tables
- **User-scoped data access** - users can only see their own projects
- **Google OAuth** for secure authentication
- **Environment variables** for sensitive keys (never commit `.env`)
- **API key rotation** - Gemini keys rotate automatically to avoid rate limits
- **File upload validation** - only images allowed for poster analysis
- **SQL injection prevention** - using Supabase query builder

---

## 🎨 Key Highlights

✅ **Full-Stack Application** - React frontend, Node.js backend, Python ML services  
✅ **Real-Time Data** - Supabase real-time subscriptions for live updates  
✅ **AI-Powered Insights** - Multiple ML models and LLM integration  
✅ **Scalable Architecture** - Modular service layer, easy to extend  
✅ **Production-Ready** - RLS, authentication, error handling, and logging  
✅ **Beautiful UI** - Modern design with smooth animations and gradients  
✅ **Mobile Responsive** - Works seamlessly on all devices  

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is developed for educational purposes as part of a hackathon.

---

## 🙏 Acknowledgments

- **Supabase** for the amazing backend-as-a-service platform
- **Google Gemini** for powerful LLM capabilities
- **PyTorch** community for pre-trained models
- **React** team for the incredible UI framework

---

<div align="center">

### 🎬 Ready to revolutionize film distribution? Let's go! 🚀

**Made with ❤️ by the CinYstore Team**

*"Every great film deserves a great release strategy."*

</div>
