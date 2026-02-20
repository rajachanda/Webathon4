import React from 'react';
import Header from '../components/Header';
import './Home.css';

const Home = () => {
  return (
    <div className="content-overlay">
      <Header />
      <div className="hero-section">
        <h1 className="hero-title">
          Simplifying <span className="gradient-text">Movie Promotion</span> for the Digital Age
        </h1>
        <div className="hero-buttons">
          <button className="btn-secondary">Cinyverse</button>
          <button className="btn-accent">Keepitshort</button>
        </div>
      </div>
    </div>
  );
};

export default Home;
