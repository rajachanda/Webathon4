/**
 * Example BuzzPage Integration
 * This file shows how to integrate AutoBuzzMetrics and BuzzConfiguration
 * You can copy this code into your existing BuzzPage.js
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import BuzzConfiguration from '../components/BuzzConfiguration';
import AutoBuzzMetrics from '../components/AutoBuzzMetrics';
import GaugeMeter from '../components/GaugeMeter';
import SparklineChart from '../components/SparklineChart';
import { supabase } from '../supabaseClient';
import './BuzzPage.css';

function BuzzPageWithAutoMetrics() {
  const { projectId } = useParams();
  
  // State for configuration
  const [config, setConfig] = useState({
    youtubeUrls: [],
    instagramHandle: '',
    filmName: '',
  });

  // State for buzz history (for sparkline)
  const [history, setHistory] = useState([]);
  const [currentBuzzScore, setCurrentBuzzScore] = useState(0);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
    loadHistory();
  }, [projectId]);

  const loadConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('buzz_config')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (data) {
        setConfig({
          youtubeUrls: data.youtube_urls || [],
          instagramHandle: data.instagram_handle || '',
          filmName: data.film_name || '',
        });
      }
    } catch (err) {
      console.log('No configuration found yet');
    }
  };

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('buzz_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        setHistory(data);
        setCurrentBuzzScore(data[0].buzz_score);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const handleConfigUpdate = (newConfig) => {
    setConfig(newConfig);
  };

  const handleMetricsUpdate = (buzzScore) => {
    setCurrentBuzzScore(buzzScore);
    // Reload history to show new snapshot
    loadHistory();
  };

  // Prepare data for sparkline (last 7 snapshots)
  const sparklineData = history
    .slice(0, 7)
    .reverse()
    .map(h => h.buzz_score);

  return (
    <ProjectLayout>
      <div className="buzz-page">
        <div className="buzz-page-header">
          <h1>🔥 Buzz Score</h1>
          <p className="buzz-page-subtitle">
            Track your film's online momentum with automated metrics
          </p>
        </div>

        {/* Configuration Section */}
        <section className="buzz-section">
          <BuzzConfiguration 
            projectId={projectId}
            onConfigUpdate={handleConfigUpdate}
          />
        </section>

        {/* Auto-Calculated Metrics Section */}
        <section className="buzz-section">
          <AutoBuzzMetrics
            projectId={projectId}
            youtubeUrls={config.youtubeUrls}
            instagramHandle={config.instagramHandle}
            filmName={config.filmName}
          />
        </section>

        {/* Visualizations Section */}
        {currentBuzzScore > 0 && (
          <section className="buzz-section">
            <h2>Visualizations</h2>
            <div className="buzz-visualizations">
              <div className="buzz-viz-card">
                <h3>Current Score</h3>
                <GaugeMeter value={currentBuzzScore} max={100} />
              </div>
              
              {sparklineData.length > 1 && (
                <div className="buzz-viz-card">
                  <h3>Trend (Last 7 Snapshots)</h3>
                  <SparklineChart 
                    data={sparklineData}
                    color="#00ff88"
                    height={120}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* History Table */}
        {history.length > 0 && (
          <section className="buzz-section">
            <h2>Snapshot History</h2>
            <div className="buzz-history-table-container">
              <table className="buzz-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Buzz Score</th>
                    <th>Watch Time</th>
                    <th>Share Rate</th>
                    <th>Sentiment</th>
                    <th>Search Growth</th>
                    <th>Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((snapshot) => (
                    <tr key={snapshot.id}>
                      <td>{new Date(snapshot.created_at).toLocaleDateString()}</td>
                      <td className="buzz-score-cell">{snapshot.buzz_score.toFixed(1)}</td>
                      <td>{snapshot.watch_time_norm.toFixed(2)}</td>
                      <td>{snapshot.share_rate_norm.toFixed(2)}</td>
                      <td>{snapshot.sentiment_score_norm.toFixed(2)}</td>
                      <td>{snapshot.search_growth_norm.toFixed(2)}</td>
                      <td>{snapshot.engagement_rate_norm.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Help Section */}
        <section className="buzz-section buzz-help">
          <h3>ℹ️ How Buzz Score Works</h3>
          <div className="buzz-help-grid">
            <div className="buzz-help-card">
              <h4>📊 Data Sources</h4>
              <ul>
                <li>YouTube video analytics</li>
                <li>Sentiment analysis reports</li>
                <li>Instagram engagement metrics</li>
              </ul>
            </div>
            <div className="buzz-help-card">
              <h4>🔢 Calculation</h4>
              <ul>
                <li>Watch Time: 25%</li>
                <li>Share Rate: 20%</li>
                <li>Sentiment: 20%</li>
                <li>Search Growth: 15%</li>
                <li>Engagement: 20%</li>
              </ul>
            </div>
            <div className="buzz-help-card">
              <h4>🎯 Tips</h4>
              <ul>
                <li>Add all promotional videos</li>
                <li>Run sentiment analysis first</li>
                <li>Refresh weekly to track trends</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </ProjectLayout>
  );
}

export default BuzzPageWithAutoMetrics;
