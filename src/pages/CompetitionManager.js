import React, { useState, useEffect } from 'react';
import { 
  autoImportCompetitionData, 
  getCompetitionMovies,
  getHighBuzzCompetition 
} from '../services/competition.service';
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
    if (score >= 75) return '#10b981'; // Green
    if (score >= 55) return '#f59e0b'; // Orange
    return '#6b7280'; // Gray
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
    <div className="competition-manager">
      <div className="competition-header">
        <div>
          <h1>Competition Calendar</h1>
          <p className="subtitle">Upcoming movie releases with buzz tracking</p>
        </div>
        
        <button 
          onClick={handleImport} 
          disabled={importing}
          className="import-button"
        >
          {importing ? 'Importing...' : 'Import Movies from CSV'}
        </button>
      </div>
      
      {importResult && (
        <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
          <p>{importResult.message}</p>
          {importResult.success && (
            <p className="import-stats">
              ✓ {importResult.imported} imported • {importResult.skipped} skipped (duplicates)
            </p>
          )}
        </div>
      )}
      
      <div className="filter-tabs">
        <button 
          className={filter === 'upcoming' ? 'active' : ''}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming (6 months)
        </button>
        <button 
          className={filter === 'high-buzz' ? 'active' : ''}
          onClick={() => setFilter('high-buzz')}
        >
          High Buzz (≥70)
        </button>
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Movies (1 year)
        </button>
      </div>
      
      {loading ? (
        <div className="loading-state">Loading movies...</div>
      ) : (
        <div className="movies-grid">
          {movies.length === 0 ? (
            <div className="empty-state">
              <p>No movies found. Click "Import Movies from CSV" to load data.</p>
            </div>
          ) : (
            movies.map((movie, idx) => (
              <div key={idx} className="movie-card">
                <div className="movie-header">
                  <h3>{movie.title}</h3>
                  <span 
                    className="buzz-badge"
                    style={{ backgroundColor: getBuzzColor(movie.external_buzz_score) }}
                  >
                    {movie.external_buzz_score}
                  </span>
                </div>
                
                <div className="movie-meta">
                  <div className="meta-row">
                    <span className="label">Release:</span>
                    <span className="value">{formatDate(movie.release_date)}</span>
                  </div>
                  
                  <div className="meta-row">
                    <span className="label">Language:</span>
                    <span className="value">{movie.language}</span>
                  </div>
                  
                  <div className="meta-row">
                    <span className="label">Region:</span>
                    <span className="value">{movie.region_primary}</span>
                  </div>
                  
                  <div className="meta-row">
                    <span className="label">Scale:</span>
                    <span className="scale-badge">{getScaleLabel(movie.scale)}</span>
                  </div>
                  
                  {movie.genre && (
                    <div className="meta-row">
                      <span className="label">Genre:</span>
                      <span className="value">{movie.genre}</span>
                    </div>
                  )}
                  
                  {movie.target_clusters && movie.target_clusters.length > 0 && (
                    <div className="meta-row-full">
                      <span className="label">Target Audience:</span>
                      <div className="clusters-list">
                        {movie.target_clusters.map((cluster, cidx) => (
                          <span key={cidx} className="cluster-chip">{cluster.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {movie.notes && (
                  <div className="movie-notes">
                    <small>{movie.notes}</small>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      
      <div className="stats-footer">
        <p>Total movies: {movies.length}</p>
        {movies.length > 0 && (
          <p>
            Average buzz: {(movies.reduce((sum, m) => sum + (m.external_buzz_score || 0), 0) / movies.length).toFixed(1)}
          </p>
        )}
      </div>
    </div>
  );
}
