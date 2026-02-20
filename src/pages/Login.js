import React from 'react';
import { useAuth } from '../AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const { user, signInWithGoogle, loading, hasCompletedOnboarding } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <div className="loading-content">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in, check if they have completed onboarding
  if (user) {
    console.log('🔑 User logged in, hasCompletedOnboarding:', hasCompletedOnboarding);
    // Redirect to dashboard - ProtectedRoute will redirect to /select-role if role is null
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <button className="back-button" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
          <div className="login-brand">
            <h1 className="login-logo">CinYstore</h1>
            <p className="login-tagline">Paora Filmy hai Boss..</p>
          </div>
          <div className="login-header">
            <h2>Welcome Back!</h2>
            <p>Sign in to continue your movie promotion journey</p>
          </div>
          
          <button onClick={signInWithGoogle} className="google-signin-btn">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.8055 10.2292C19.8055 9.55156 19.7501 8.86719 19.6323 8.19531H10.2002V12.0492H15.6014C15.3776 13.291 14.6567 14.3695 13.6028 15.0875V17.5867H16.8251C18.712 15.8449 19.8055 13.2723 19.8055 10.2292Z" fill="#4285F4"/>
              <path d="M10.2002 20C12.9502 20 15.2635 19.1045 16.8251 17.5867L13.6028 15.0875C12.7084 15.6972 11.5514 16.0429 10.2002 16.0429C7.54572 16.0429 5.29637 14.2828 4.5085 11.9098H1.18945V14.4921C2.78092 17.6562 6.29549 20 10.2002 20Z" fill="#34A853"/>
              <path d="M4.5085 11.9098C4.04892 10.6681 4.04892 9.3364 4.5085 8.09473V5.5125H1.18945C-0.394818 8.65254 -0.394818 12.3518 1.18945 15.4921L4.5085 11.9098Z" fill="#FBBC04"/>
              <path d="M10.2002 3.95707C11.6251 3.93566 13.0032 4.47223 14.0362 5.45817L16.8945 2.60004C15.179 0.99004 12.9362 0.100045 10.2002 0.12223C6.29549 0.12223 2.78092 2.466 1.18945 5.5125L4.5085 8.09473C5.29637 5.72168 7.54572 3.95707 10.2002 3.95707Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          <div className="login-footer">
            <p>By signing in, you agree to our Terms & Privacy Policy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
