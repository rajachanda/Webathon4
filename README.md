# CinYstore - Movie Promotion Platform

A React-based movie promotion platform with Supabase authentication and Google OAuth integration.

## Features

- ✨ Google OAuth authentication via Supabase
- 🎬 Animated movie poster background
- 🔐 Protected routes (content only visible after login)
- 📱 Responsive design
- 🎨 Modern UI with gradient effects

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Configuration

The project is already configured with your Supabase credentials:
- **Project ID**: rvzdceoagbtmyodcfvwp
- **URL**: https://rvzdceoagbtmyodcfvwp.supabase.co

### 3. Configure Google OAuth in Supabase

Make sure you have enabled Google OAuth in your Supabase project:

1. Go to [Supabase Dashboard](https://app.supabase.com/project/rvzdceoagbtmyodcfvwp/auth/providers)
2. Enable Google provider
3. Add authorized redirect URLs:
   - `http://localhost:3000`
   - `http://localhost:3000/auth/callback` (if needed)
   - Your production URL (when deployed)

### 4. Start the Development Server

```bash
npm run dev
```

The server will start and show you the local link (e.g., http://localhost:3000)
Open the link in your browser manually.

## Project Structure

```
src/
├── components/
│   ├── Header.js              # Navigation header with conditional rendering
│   ├── Header.css
│   ├── MovieBackground.js     # Animated movie poster background
│   └── MovieBackground.css
├── pages/
│   ├── Home.js               # Main home page (protected)
│   ├── Home.css
│   ├── Login.js              # Login page with Google OAuth
│   └── Login.css
├── App.js                    # Main app with routing
├── App.css
├── AuthContext.js            # Authentication context provider
├── supabaseClient.js         # Supabase configuration
├── index.js                  # Entry point
└── index.css

assets/                       # Movie poster images
public/
└── index.html
```

## How It Works

### Authentication Flow

1. **Before Login**: Users see a landing page with "Get Started" and "Login" buttons in the header
2. **Login**: Clicking either button redirects to the login page with Google sign-in
3. **After Login**: Users are redirected to the home page with full navigation menu
4. **Protected Routes**: Home page and other content are only accessible after authentication

### Header Behavior

**Not Logged In:**
- Shows only: "Get Started" | "Login"

**Logged In:**
- Shows: Home | Product | Partners | Creator | Blogs | Team | Pricing | Sign Out

## Available Scripts

- `npm run dev` - Runs the app in development mode
- `npm start` - Alternative to run the app
- `npm run build` - Builds the app for production
- `npm test` - Runs tests
- `npm run eject` - Ejects from Create React App (one-way operation)

## Environment Variables

The `.env` file contains:
```
REACT_APP_SUPABASE_URL=https://rvzdceoagbtmyodcfvwp.supabase.co
REACT_APP_SUPABASE_ANON_KEY=[your-anon-key]
```

## Deployment

When deploying, make sure to:
1. Update the redirect URLs in Supabase to include your production domain
2. Set environment variables in your hosting platform
3. Build the project with `npm run build`

## Technologies Used

- **React 18** - UI framework
- **React Router v6** - Routing
- **Supabase** - Backend and authentication
- **Google OAuth** - Authentication provider
- **CSS3** - Styling with animations

## Tagline

"Paora Filmy hai Boss.."
