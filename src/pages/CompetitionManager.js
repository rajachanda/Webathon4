import React, { useState, useEffect } from 'react';
import { 
  autoImportCompetitionData, 
  getCompetitionMovies,
  getHighBuzzCompetition 
} from '../services/competition.service';
import Header from '../components/Header';
import {
  FiUploadCloud,
  FiCalendar,
  FiTrendingUp,
  FiList,
  FiGlobe,
  FiMapPin,
  FiTag,
  FiFilm,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import './CompetitionManager.css';

/**
 * Competition Manager Page
 * Allows importing and viewing competition movie data
 */
export default function CompetitionManager() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'high-buzz', 'all'
  
  useEffect(() => {
    loadMovies();
  }, [filter]);
  
  async function loadMovies() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
      const endDate = sixMonthsLater.toISOString().split('T')[0];
      
      let data;
      if (filter === 'high-buzz') {
        data = await getHighBuzzCompetition(today, endDate);
      } else if (filter === 'upcoming') {
        data = await getCompetitionMovies(today, endDate);
      } else {
        // All movies (extend range)
        const yearLater = new Date();
        yearLater.setFullYear(yearLater.getFullYear() + 1);
        data = await getCompetitionMovies(today, yearLater.toISOString().split('T')[0]);
      }
      
      setMovies(data);
    } catch (error) {
      console.error('Error loading movies:', error);
      alert('Error loading competition data');
    } finally {
      setLoading(false);
    }
  }
  
  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    
    try {
      const result = await autoImportCompetitionData();
      setImportResult(result);
      
      // Reload movies after import
      await loadMovies();
    } catch (error) {
      console.error('Error importing:', error);
      setImportResult({ 
        success: false, 
        message: error.message || 'Import failed' 
      });
    } finally {
      setImporting(false);
    }
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  }
  
  function getBuzzColor(score) {
    if (score >= 75) return '#4ade80'; // bright green
    if (score >= 55) return '#fbbf24'; // amber
    return '#6b7280';                  // gray
  }
  
  function getScaleLabel(scale) {
    const labels = {
      'big': 'Big',
      'mid': 'Mid',
      'small': 'Small'
    };
    return labels[scale] || scale;
  }
  
  return (
    <div className="comp-page">
      <Header />
      <div className="comp-body">

        {/* Page hero */}
        <div className="comp-hero">
          <div>
            <h1 className="comp-title">Competition Calendar</h1>
            <p className="comp-subtitle">Upcoming releases tracked by buzz score, language &amp; scale</p>
          </div>
          <button onClick={handleImport} disabled={importing} className="comp-import-btn">
            {importing ? <><span className="comp-spinner" /> Importing…</> : <><FiUploadCloud size={17} /> Import from CSV</>}
          </button>
        </div>

        {/* Import result */}
        {importResult && (
          <div className={`comp-alert ${importResult.success ? 'comp-alert--ok' : 'comp-alert--err'}`}>
            <span className="comp-alert-icon">{importResult.success ? <FiCheck size={18} /> : <FiX size={18} />}</span>
            <div>
              <p>{importResult.message}</p>
              {importResult.success && (
                <p className="comp-alert-sub">{importResult.imported} imported · {importResult.skipped} skipped</p>
              )}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="comp-filters">
          {[
            { key: 'upcoming', icon: <FiCalendar size={14}/>, label: 'Next 6 Months' },
            { key: 'high-buzz', icon: <FiTrendingUp size={14}/>, label: 'High Buzz (≥70)' },
            { key: 'all',       icon: <FiList size={14}/>,      label: 'All (1 Year)' },
          ].map(({ key, icon, label }) => (
            <button
              key={key}
              className={`comp-filter-btn${filter === key ? ' comp-filter-btn--active' : ''}`}
              onClick={() => setFilter(key)}
            >{icon} {label}</button>
          ))}
          <span className="comp-count">{movies.length} films</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="comp-loading"><span className="comp-spinner-lg" /> Loading movies…</div>
        ) : movies.length === 0 ? (
          <div className="comp-empty">
            <div className="comp-empty-icon"><FiFilm size={48} /></div>
            <p>No movies found. Import from CSV to get started.</p>
          </div>
        ) : (
          <div className="comp-grid">
            {movies.map((movie, idx) => {
              const buzz = movie.external_buzz_score || 0;
              const buzzColor = getBuzzColor(buzz);
              return (
                <div key={idx} className="comp-card">
                  <div className="comp-card-bar" style={{ background: buzzColor }} />
                  <div className="comp-card-top">
                    <h3 className="comp-movie-title">{movie.title}</h3>
                    <div className="comp-buzz-ring" style={{ borderColor: buzzColor, color: buzzColor }}>
                      <span className="comp-buzz-num">{buzz}</span>
                      <span className="comp-buzz-lbl">buzz</span>
                    </div>
                  </div>
                  <div className="comp-card-meta">
                    <div className="comp-meta-row"><span className="comp-meta-icon"><FiCalendar size={13}/></span><span className="comp-meta-val">{formatDate(movie.release_date)}</span></div>
                    <div className="comp-meta-row"><span className="comp-meta-icon"><FiGlobe size={13}/></span><span className="comp-meta-val">{movie.language}</span></div>
                    {movie.region_primary && <div className="comp-meta-row"><span className="comp-meta-icon"><FiMapPin size={13}/></span><span className="comp-meta-val">{movie.region_primary}</span></div>}
                    {movie.genre && <div className="comp-meta-row"><span className="comp-meta-icon"><FiTag size={13}/></span><span className="comp-meta-val">{movie.genre}</span></div>}
                  </div>
                  <div className="comp-card-footer">
                    <span className={`comp-scale-badge comp-scale-badge--${movie.scale}`}>{getScaleLabel(movie.scale)}</span>
                    {movie.target_clusters && movie.target_clusters.length > 0 && (
                      <div className="comp-clusters">
                        {movie.target_clusters.slice(0, 2).map((c, ci) => (
                          <span key={ci} className="comp-cluster">{c.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {movie.notes && <p className="comp-notes">{movie.notes}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Stats bar */}
        {movies.length > 0 && (
          <div className="comp-stats-bar">
            <div className="comp-stat">
              <span className="comp-stat-num">{movies.length}</span>
              <span className="comp-stat-lbl">Total Films</span>
            </div>
            <div className="comp-stat">
              <span className="comp-stat-num" style={{ color: '#fbbf24' }}>
                {(movies.reduce((s, m) => s + (m.external_buzz_score || 0), 0) / movies.length).toFixed(1)}
              </span>
              <span className="comp-stat-lbl">Avg Buzz</span>
            </div>
            <div className="comp-stat">
              <span className="comp-stat-num" style={{ color: '#4ade80' }}>
                {movies.filter(m => (m.external_buzz_score || 0) >= 70).length}
              </span>
              <span className="comp-stat-lbl">High Buzz</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
