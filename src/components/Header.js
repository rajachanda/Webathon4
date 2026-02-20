import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSignOut = async () => {
    await signOut();
    setShowProfileMenu(false);
  };

  const getInitials = (email) => {
    return email ? email.charAt(0).toUpperCase() : 'U';
  };

  return (
    <header className="header">
      <div className="logo">
        <h1>CinYstore</h1>
        <p className="tagline">Paora Filmy hai Boss..</p>
      </div>
      <nav className="navbar">
        <a href="#home">Home</a>
        <a href="#product">Product</a>
        <a href="#partners">Partners</a>
        <a href="#creator">Creator</a>
        <a href="#blogs">Blogs</a>
        <a href="#team">Team</a>
        <a href="#pricing" className="btn-outline">Pricing</a>
        {user ? (
          <div className="profile-container">
            <button 
              className="profile-button" 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="profile-avatar">{getInitials(user.email)}</div>
              <span className="profile-arrow">▼</span>
            </button>
            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <div className="profile-avatar-large">{getInitials(user.email)}</div>
                  <div className="profile-info">
                    <div className="profile-name">{user.user_metadata?.name || 'User'}</div>
                    <div className="profile-email">{user.email}</div>
                  </div>
                </div>
                <div className="profile-divider"></div>
                <button className="profile-menu-item" onClick={() => alert('Profile coming soon!')}>
                  <span>👤</span> My Profile
                </button>
                <button className="profile-menu-item" onClick={() => alert('Settings coming soon!')}>
                  <span>⚙️</span> Settings
                </button>
                <button className="profile-menu-item" onClick={() => alert('Help coming soon!')}>
                  <span>❓</span> Help & Support
                </button>
                <div className="profile-divider"></div>
                <button className="profile-menu-item sign-out" onClick={handleSignOut}>
                  <span>🚪</span> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={handleLogin} className="btn-primary">Login / Sign Up</button>
        )}
      </nav>
    </header>
  );
};

export default Header;
