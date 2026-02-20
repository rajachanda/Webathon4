import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './RoleSelection.css';

const RoleSelection = () => {
  const { user, loading, hasCompletedOnboarding, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('');
  const [saving, setSaving] = useState(false);

  const roles = [
    'Producer',
    'Director',
    'Assistant Director',
    'Actor/Hero',
    'Actress/Heroine',
    'Cinematographer/Cameraman',
    'Editor',
    'Music Director',
    'Art Director',
    'Production Manager',
    'Scriptwriter/Writer',
    'Sound Designer',
    'VFX Artist',
    'Costume Designer',
    'Makeup Artist',
    'Stunt Coordinator',
    'Casting Director'
  ];

  if (loading) {
    return (
      <div className="role-selection-page">
        <div className="role-selection-container">
          <div className="role-selection-card">
            <div className="loading-content">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 No user in RoleSelection - redirecting to /login');
    return <Navigate to="/login" />;
  }

  // If user already has a role, redirect to dashboard
  if (hasCompletedOnboarding) {
    console.log('✅ User already has role - redirecting to /dashboard');
    return <Navigate to="/dashboard" />;
  }

  console.log('📝 Showing role selection screen - user has no role');

  const handleRoleSubmit = async () => {
    if (!selectedRole) {
      alert('Please select your role!');
      return;
    }

    setSaving(true);
    console.log('Saving role to database...', {
      userId: user.id,
      email: user.email,
      role: selectedRole
    });

    try {
      const profileData = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: selectedRole,
        avatar_url: user.user_metadata?.avatar_url || null,
        updated_at: new Date().toISOString()
      };

      console.log('Profile data to save:', profileData);

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(profileData, {
          onConflict: 'id'
        });

      if (error) {
        console.error('❌ Error saving role to database:', error);
        alert(`Failed to save role: ${error.message}`);
        setSaving(false);
      } else {
        console.log('✅ Role saved successfully to database!', data);
        console.log('🔄 Refreshing user profile...');
        // Refresh user profile in AuthContext
        await refreshUserProfile();
        console.log('✅ Profile refreshed - redirecting to /dashboard');
        // Navigate to dashboard after successful save
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('❌ Exception in handleRoleSubmit:', err);
      alert('An error occurred. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="role-selection-page">
      <div className="role-selection-container">
        <div className="role-selection-card">
          <div className="role-selection-header">
            <h1>Welcome to CinYstore! 🎬</h1>
            <p className="welcome-message">
              Hi <strong>{user.user_metadata?.full_name || user.email}</strong>!
            </p>
            <p className="instruction-text">
              Please select your role in the film industry to personalize your experience
            </p>
          </div>

          <div className="role-grid">
            {roles.map((role) => (
              <div
                key={role}
                className={`role-card ${selectedRole === role ? 'selected' : ''}`}
                onClick={() => setSelectedRole(role)}
              >
                <div className="role-icon">🎭</div>
                <div className="role-name">{role}</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleRoleSubmit}
            disabled={!selectedRole || saving}
            className="continue-btn"
          >
            {saving ? 'Saving...' : 'Continue to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
