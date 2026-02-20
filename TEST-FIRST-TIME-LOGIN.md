# Testing First-Time Login Flow

## Option 1: Test with New Google Account
1. Sign out current user
2. Clear browser cache/cookies
3. Sign in with a NEW Google account (never used before)
4. ✅ Should see Role Selection screen automatically

## Option 2: Clear Existing User's Role in Database
1. Go to Supabase Dashboard → Table Editor
2. Open `user_profiles` table
3. Find your test user row
4. Set `role` column to `NULL`
5. Click Save
6. Sign out and sign in again
7. ✅ Should see Role Selection screen automatically

## Option 3: Test in Incognito/Private Window
1. Open new Incognito/Private browser window
2. Go to your app
3. Sign in with NEW Google account
4. ✅ Should see Role Selection screen automatically

## What You Should See:

### First-Time User (role = NULL):
```
1. Click "Sign in with Google"
2. Google OAuth popup
3. [AUTOMATIC] → Full-screen Role Selection page appears
4. Select role (e.g., "Director")
5. Click "Continue to Dashboard"
6. [AUTOMATIC] → Dashboard appears
7. Now Profile button is visible in header
8. Click Profile → See role displayed (read-only)
```

### Returning User (role exists):
```
1. Click "Sign in with Google"
2. Google OAuth popup  
3. [AUTOMATIC] → Dashboard appears directly (no role selection)
4. Profile button visible
5. Click Profile → See role displayed (read-only)
```

## Console Logs to Watch:
Open browser DevTools (F12) → Console tab:

**First-time login (null role):**
- `⚠️ User profile exists but role is null/empty`
- `⚠️ User has no role - redirecting to /select-role`
- `📝 Showing role selection screen - user has no role`
- `✅ Role saved successfully to database!`
- `🔄 Refreshing user profile...`
- `✅ User has role: Director`

**Returning user (has role):**
- `✅ User has role: Director`
- `✅ User has completed onboarding - showing protected content`
