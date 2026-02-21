/**
 * Buzz Configuration Component
 * Allows users to configure YouTube URLs and Instagram handle for buzz metrics
 */

import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { supabase } from '../supabaseClient';
import './BuzzConfiguration.css';

const BuzzConfiguration = ({ projectId, onConfigUpdate, initialConfig = null }) => {
  const [youtubeUrls, setYoutubeUrls] = useState(['']);
  const [instagramHandle, setInstagramHandle] = useState('');
  const [filmName, setFilmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [autoPopulated, setAutoPopulated] = useState(false);

  // Load existing configuration
  useEffect(() => {
    loadConfiguration();
  }, [projectId]);

  // Sync with parent config updates (from auto-search)
  useEffect(() => {
    if (initialConfig) {
      if (initialConfig.youtubeUrls && initialConfig.youtubeUrls.length > 0) {
        setYoutubeUrls(initialConfig.youtubeUrls);
        setAutoPopulated(true);
      }
      if (initialConfig.instagramHandle) {
        setInstagramHandle(initialConfig.instagramHandle);
      }
      if (initialConfig.filmName) {
        setFilmName(initialConfig.filmName);
      }
    }
  }, [initialConfig]);

  const loadConfiguration = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      // Try to load from buzz_config table (if it exists)
      const { data, error: fetchError } = await supabase
        .from('buzz_config')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (fetchError) {
        // Table might not exist yet, that's okay
        console.log('No existing configuration found');
      } else if (data) {
        setYoutubeUrls(data.youtube_urls || ['']);
        setInstagramHandle(data.instagram_handle || '');
        setFilmName(data.film_name || '');
      }
    } catch (err) {
      console.error('Error loading configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUrl = () => {
    setYoutubeUrls([...youtubeUrls, '']);
  };

  const handleRemoveUrl = (index) => {
    const newUrls = youtubeUrls.filter((_, i) => i !== index);
    setYoutubeUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const handleUrlChange = (index, value) => {
    const newUrls = [...youtubeUrls];
    newUrls[index] = value;
    setYoutubeUrls(newUrls);
  };

  const handleSave = async () => {
    if (!projectId) {
      setError('Project ID is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Filter out empty URLs
      const validUrls = youtubeUrls.filter(url => url.trim() !== '');

      const configData = {
        project_id: projectId,
        user_id: user.id,
        youtube_urls: validUrls,
        instagram_handle: instagramHandle.trim(),
        film_name: filmName.trim(),
        updated_at: new Date().toISOString(),
      };

      // Upsert configuration
      const { data, error: saveError } = await supabase
        .from('buzz_config')
        .upsert([configData], { onConflict: 'project_id' })
        .select()
        .single();

      if (saveError) throw saveError;

      setSuccess(true);
      
      // Notify parent component
      if (onConfigUpdate) {
        onConfigUpdate({
          youtubeUrls: validUrls,
          instagramHandle: instagramHandle.trim(),
          filmName: filmName.trim(),
        });
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save configuration');
      console.error('Error saving configuration:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="buzz-config">
      <div className="buzz-config-header">
        <h3><Icon name="chart" size={18} /> Buzz Metrics Configuration</h3>
        <p className="buzz-config-description">
          Configure YouTube videos for automatic buzz score calculation. Model: YouTube (60%) + Google Trends (40%).
        </p>
        {autoPopulated && (
          <div style={{ marginTop: 8, padding: 8, background: 'rgba(0, 255, 136, 0.15)', borderRadius: 6, fontSize: '0.85rem', color: '#00ff88' }}>
            <Icon name="sparkles" size={14} /> Auto-populated from search! Review and save below.
          </div>
        )}
      </div>

      {error && (
        <div className="buzz-config-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="buzz-config-success">
          <Icon name="check" size={14} /> Configuration saved successfully!
        </div>
      )}

      <div className="buzz-config-section">
        <label className="buzz-config-label">
          Film Name (Optional)
        </label>
        <input
          type="text"
          className="buzz-config-input"
          value={filmName}
          onChange={(e) => setFilmName(e.target.value)}
          placeholder="Enter your film name"
          disabled={loading}
        />
        <small className="buzz-config-hint">
          Used for Google Trends analysis
        </small>
      </div>

      <div className="buzz-config-section">
        <label className="buzz-config-label">
          YouTube Video URLs
        </label>
        {youtubeUrls.map((url, index) => (
          <div key={index} className="buzz-config-url-row">
            <input
              type="url"
              className="buzz-config-input"
              value={url}
              onChange={(e) => handleUrlChange(index, e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              disabled={loading}
            />
            {youtubeUrls.length > 1 && (
              <button
                className="buzz-config-remove-btn"
                onClick={() => handleRemoveUrl(index)}
                disabled={loading}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          className="buzz-config-add-btn"
          onClick={handleAddUrl}
          disabled={loading || youtubeUrls.length >= 10}
        >
          + Add Another URL
        </button>
        <small className="buzz-config-hint">
          Add trailers, teasers, interviews, or promotional videos (max 10)
        </small>
      </div>

      <div className="buzz-config-actions">
        <button
          className="buzz-config-save-btn"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? 'Saving...' : <><Icon name="save" size={14} /> Save Configuration</>}
        </button>
      </div>

      <div className="buzz-config-info">
        <strong><Icon name="info" size={14} /> How it works:</strong>
        <ul>
          <li>YouTube URLs are analyzed for views, likes, comments, watch time, and retention</li>
          <li>Sentiment analysis is fetched from your previous sentiment reports</li>
          <li>Instagram metrics are estimated based on correlations or fetched if available</li>
          <li>All metrics are normalized to 0-1 scale and combined into your Buzz Score</li>
        </ul>
      </div>
    </div>
  );
};

export default BuzzConfiguration;
