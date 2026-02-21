import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import Icon from '../components/Icon';
import './Profile.css';

const Profile = () => {
  const { user, loading, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setLoadingProfile(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(); // Use maybeSingle to handle missing profiles gracefully

        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setUserProfile(data);
        } else {
          console.log('No profile found for user');
        }
      } catch (err) {
        console.error('Error in fetchUserProfile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  if (loading || loadingProfile) {
    return (
      <div className="content-overlay">
        <Header />
        <div className="profile-container">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!userProfile) {
    return <Navigate to="/select-role" />;
  }

  const getRoleIcon = (role) => {
    const roleIcons = {
      'Producer': 'film',
      'Director': 'video',
      'Assistant Director': 'clipboard',
      'Actor/Hero': 'user',
      'Actress/Heroine': 'award',
      'Cinematographer/Cameraman': 'video',
      'Editor': 'scissors',
      'Music Director': 'music',
      'Art Director': 'sparkles',
      'Production Manager': 'briefcase',
      'Scriptwriter/Writer': 'edit',
      'Sound Designer': 'volume',
      'VFX Artist': 'sparkles',
      'Costume Designer': 'user',
      'Makeup Artist': 'user',
      'Stunt Coordinator': 'activity',
      'Casting Director': 'target'
    };
    return roleIcons[role] || 'film';
  };

  return (
    <div className="content-overlay">
      <Header />
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {userProfile.avatar_url ? (
                <img src={userProfile.avatar_url} alt={userProfile.name} />
              ) : (
                <div className="avatar-placeholder">
                  {userProfile.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h1 className="profile-name">{userProfile.name}</h1>
            <p className="profile-email">{userProfile.email}</p>
          </div>

          <div className="profile-role-section">
            <div className="role-badge">
              <span className="role-icon-large"><Icon name={getRoleIcon(userProfile.role)} size={28} /></span>
              <div className="role-info">
                <p className="role-label">Your Role</p>
                <h2 className="role-title">{userProfile.role}</h2>
              </div>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-item">
              <span className="detail-label">Member Since</span>
              <span className="detail-value">
                {new Date(userProfile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last Updated</span>
              <span className="detail-value">
                {new Date(userProfile.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div className="profile-actions">
            <button className="btn-edit-profile">Edit Profile</button>
            <button className="btn-sign-out" onClick={signOut}>Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
