import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading, hasCompletedOnboarding } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 No user - redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // If user hasn't selected a role yet (role is null), redirect to role selection
  // (except if they're already on the role selection page)
  if (!hasCompletedOnboarding && location.pathname !== '/select-role') {
    console.log('⚠️ User has no role - redirecting to /select-role');
    return <Navigate to="/select-role" replace />;
  }

  if (hasCompletedOnboarding) {
    console.log('✅ User has completed onboarding - showing protected content');
  }

  return children;
};

export default ProtectedRoute;
