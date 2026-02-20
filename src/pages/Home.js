import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../AuthContext';
import './Home.css';

const Home = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect logged-in users to dashboard
  useEffect(() => {
    if (!loading && user) {
      console.log('🏠 User is logged in on Home page - redirecting to /dashboard');
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <div className="content-overlay">
      <Header />
      <div className="hero-section">
        <h1 className="hero-title">
          Simplifying <span className="gradient-text">Movie Promotion</span> for the Digital Age
        </h1>
        <p className="hero-subtitle">
          Your all-in-one platform to promote, analyse, and grow your film's reach.
        </p>
        {!user ? (
          <div className="hero-buttons">
            <button className="btn-accent" onClick={() => navigate('/login')}>
              Get Started <span className="btn-arrow">&#8594;</span>
            </button>
          </div>
        ) : (
          <div className="hero-buttons">
            <button className="btn-accent" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
            <button className="btn-secondary" onClick={() => navigate('/projects/new')}>
              + New Film
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
