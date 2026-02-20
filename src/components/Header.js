import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiSettings, FiHelpCircle, FiLogOut } from 'react-icons/fi';
import { NAVIGATION_ITEMS, PROFILE_MENU_ITEMS, APP_CONFIG } from '../config/constants';
import { isFeatureEnabled } from '../config/features';
import './Header.css';

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSignOut = async () => {
    await signOut();
    setShowProfileMenu(false);
  };

  const handleMenuItemClick = (item) => {
    if (item.route) {
      navigate(item.route);
    }
    setShowProfileMenu(false);
  };

  const getInitials = (email) => {
    return email ? email.charAt(0).toUpperCase() : 'U';
  };

  const getMenuIcon = (itemId) => {
    const iconMap = {
      profile: <FiUser />,
      settings: <FiSettings />,
      help: <FiHelpCircle />,
    };
    return iconMap[itemId] || null;
  };

  // Filter profile menu items based on feature flags
  const enabledMenuItems = PROFILE_MENU_ITEMS.filter(item => 
    !item.feature || isFeatureEnabled(item.feature)
  );

  return (
    <header className="header">
      <div className="logo">
        <h1>{APP_CONFIG.name}</h1>
        <p className="tagline">{APP_CONFIG.tagline}</p>
      </div>
      <nav className="navbar">
        {NAVIGATION_ITEMS.map((item) => (
          <a key={item.id} href={item.href}>{item.label}</a>
        ))}
        <a href="#pricing" className="btn-outline">Pricing</a>
        {user ? (
          <div className="profile-container" ref={dropdownRef}>
            <button 
              className="profile-button" 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="Profile menu"
            >
              <span className="profile-text">Profile</span>
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
                {enabledMenuItems.map((item) => (
                  <button 
                    key={item.id}
                    className="profile-menu-item" 
                    onClick={() => handleMenuItemClick(item)}
                  >
                    <span className="menu-icon">{getMenuIcon(item.id)}</span>
                    {item.label}
                  </button>
                ))}
                <div className="profile-divider"></div>
                <button className="profile-menu-item sign-out" onClick={handleSignOut}>
                  <span className="menu-icon"><FiLogOut /></span>
                  Sign Out
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
