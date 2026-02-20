import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient';

export const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Check if user has a role (completed onboarding)
  const checkUserProfile = async (userId) => {
    if (!userId) {
      setHasCompletedOnboarding(false);
      setUserProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle missing rows

      // Check if role exists and is not null
      if (!error && data) {
        setUserProfile(data);
        // Role must exist and not be null/undefined/empty
        if (data.role && data.role.trim() !== '') {
          console.log('✅ User has role:', data.role);
          setHasCompletedOnboarding(true);
        } else {
          console.log('⚠️ User profile exists but role is null/empty');
          setHasCompletedOnboarding(false);
        }
      } else if (error) {
        console.log('⚠️ Error fetching user profile:', error.message);
        setUserProfile(null);
        setHasCompletedOnboarding(false);
      } else {
        console.log('⚠️ No user profile found - new user');
        setUserProfile(null);
        setHasCompletedOnboarding(false);
      }
    } catch (err) {
      console.log('⚠️ Exception checking user profile:', err.message);
      setUserProfile(null);
      setHasCompletedOnboarding(false);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkUserProfile(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkUserProfile(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error('Error signing in with Google:', error);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    setHasCompletedOnboarding(false);
  };

  const refreshUserProfile = () => {
    if (user) {
      return checkUserProfile(user.id);
    }
  };

  const value = {
    user,
    loading,
    userProfile,
    hasCompletedOnboarding,
    signInWithGoogle,
    signOut,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
