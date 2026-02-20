# 🎬 CinYstore - User Profile Setup Guide

## Database Schema Overview

The application now includes a user profile system that stores:
- **id** (UUID) - Unique user identifier from Google Auth
- **email** (TEXT) - User's email address
- **name** (TEXT) - User's full name
- **role** (TEXT) - User's role in film production
- **avatar_url** (TEXT) - Profile picture from Google
- **phone** (TEXT) - Contact number (optional)
- **experience_years** (INTEGER) - Years of experience (optional)
- **bio** (TEXT) - User biography (optional)
- **company_name** (TEXT) - Production company name (optional)
- **created_at** (TIMESTAMP) - Account creation date
- **updated_at** (TIMESTAMP) - Last profile update

## User Flow

### New User Journey
1. User clicks **"Sign in with Google"** on the login page
2. User completes Google OAuth authentication
3. User is redirected to the **Role Selection** page
4. User selects their role from 17 film industry options (displayed as cards)
5. User clicks **"Continue to Dashboard"**
6. Profile is saved to database automatically
7. User is redirected to the Home dashboard
8. User can view their role in the **Profile** page anytime

### Returning User Journey
1. User clicks "Sign in with Google"
2. System checks if user has a role in the database
3. If role exists → User goes directly to Home dashboard
4. If no role → User is redirected to Role Selection page
5. User can access their profile by clicking the profile icon in the header

## Available Roles

The system supports 17 different film production roles:
1. Producer
2. Director
3. Assistant Director
4. Actor/Hero
5. Actress/Heroine
6. Cinematographer/Cameraman
7. Editor
8. Music Director
9. Art Director
10. Production Manager
11. Scriptwriter/Writer
12. Sound Designer
13. VFX Artist
14. Costume Designer
15. Makeup Artist
16. Stunt Coordinator
17. Casting Director

## Setup Instructions

### Step 1: Create Supabase Table

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **rvzdceoagbtmyodcfvwp**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open `supabase-setup.sql` file in this folder
6. Copy the entire SQL script
7. Paste it into the SQL Editor
8. Click **Run** button
9. Wait for success message

### Step 2: Verify Table Creation

1. Go to **Table Editor** in Supabase Dashboard
2. You should see `user_profiles` table listed
3. Click on it to verify columns are created correctly
4. Check that RLS (Row Level Security) is enabled

### Step 3: Test the Application

1. Make sure your `.env` file has the correct Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=https://rvzdceoagbtmyodcfvwp.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Test the complete flow:
   - Navigate to the login page
   - Click "Sign in with Google"
   - Complete Google authentication
   - You should be redirected to the Role Selection page
   - Select your role from the grid
   - Click "Continue to Dashboard"
   - You should be redirected to the home page
   - Click on your profile icon in the header
   - Select "My Profile" to see your role

### Step 4: Verify in Supabase

1. Go to Supabase Table Editor
2. Open the `user_profiles` table
3. You should see your profile with:
   - Your Google email
   - Your name
   - Selected role
   - Avatar URL
   - Timestamps

## How It Works

### Login Flow
1. User clicks "Sign in with Google" on `/login`
2. Google OAuth authenticates the user
3. `AuthContext` stores the user session
4. Login component redirects to `/select-role`

### Role Selection Flow
1. `RoleSelection` component checks if user already has a role
2. If yes → redirects to `/home`
3. If no → displays role selection grid
4. User selects role and clicks submit
5. Profile is saved to `user_profiles` table via Supabase
6. User is redirected to `/home`

### Profile Display
1. User clicks profile icon in header
2. Dropdown menu shows "My Profile" option
3. Clicking it navigates to `/profile`
4. `Profile` component fetches user data from `user_profiles` table
5. Displays role with custom icon, creation date, and other info

## Page Structure

### Routes
- **/** or **/home** - Landing/Dashboard page
- **/login** - Google OAuth login page
- **/select-role** - Role selection page (protected)
- **/profile** - User profile page (protected)

### Components
- **Login.js** - Simple Google sign-in (no role selection)
- **RoleSelection.js** - Post-login role selection with role checking
- **Profile.js** - Display user profile with role badge
- **Header.js** - Navigation with profile dropdown menu

## Security Features

- **Row Level Security (RLS)** is enabled on `user_profiles` table
- Users can only modify their own profiles
- All users can view other profiles (for collaboration features)
- Automatic timestamp updates on profile changes
- OAuth tokens handled securely by Supabase

## Troubleshooting

### Profile not saving?
- Check browser console for errors
- Verify Supabase table was created successfully
- Ensure `.env` file has correct credentials
- Check that Google OAuth is configured in Supabase Auth settings
- Verify RLS policies are created correctly

### Stuck on Role Selection page?
- Check browser console for Supabase errors
- Verify the `user_profiles` table exists
- Check that the user has proper permissions to insert data
- Clear browser cache and try again

### Can't see profile in dropdown?
- Verify PROFILE feature is enabled in `src/config/features.js`
- Check that user has a valid session
- Ensure Header component is imported correctly

### Role not displaying in profile?
- Go to Supabase Table Editor
- Check if profile exists in `user_profiles` table
- Verify that role field has a value
- Check browser console for fetch errors

## Next Steps

You can extend the user profile with additional features:

### Backend Extensions
- Add phone number field with validation
- Add years of experience tracking
- Add bio/description field
- Add company/production house affiliation
- Add social media links
- Add portfolio/showreel URLs
- Add profile completion percentage

### Frontend Enhancements
- Add profile editing functionality
- Add profile picture upload
- Add role change capability
- Add profile privacy settings
- Add search for other users by role
- Add connection/networking features

### To add new fields:
1. Update the SQL table in Supabase
2. Update the upsert logic in `RoleSelection.js`
3. Update the display in `Profile.js`
4. Add styling as needed

## Support

For issues or questions:
- Check the Supabase logs in the dashboard
- Review browser console errors
- Verify environment variables
- Check that all dependencies are installed with `npm install`
