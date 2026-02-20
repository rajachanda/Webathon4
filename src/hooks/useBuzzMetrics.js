/**
 * React Hook for Buzz Metrics
 * Provides automatic buzz metrics calculation and management
 */

import { useState, useEffect, useCallback } from 'react';
import { calculateBuzzMetrics, saveBuzzSnapshot, getBuzzHistory } from '../services/buzz-metrics.service';

/**
 * Custom hook to manage buzz metrics for a project
 */
export const useBuzzMetrics = (projectId, options = {}) => {
  const {
    youtubeVideoUrls = [],
    instagramHandle = '',
    filmName = '',
    autoFetch = true,
    autoSave = false,
  } = options;

  const [metrics, setMetrics] = useState({
    watch_time_norm: 0,
    share_rate_norm: 0,
    sentiment_score_norm: 0,
    search_growth_norm: 0,
    engagement_rate_norm: 0,
  });

  const [buzzScore, setBuzzScore] = useState(0);
  const [componentScores, setComponentScores] = useState({
    youtube: 0,
    googleTrends: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawMetrics, setRawMetrics] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [history, setHistory] = useState([]);

  /**
   * Fetch and calculate buzz metrics
   */
  const fetchMetrics = useCallback(async () => {
    if (!projectId) {
      setError('Project ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await calculateBuzzMetrics(projectId, {
        youtubeVideoUrls,
        instagramHandle,
        filmName,
      });

      if (result.success) {
        setMetrics(result.normalizedMetrics);
        setBuzzScore(result.buzzScore);
        setComponentScores(result.componentScores || { youtube: 0, googleTrends: 0, instagram: 0 });
        setRawMetrics(result.rawMetrics);
        setMetadata(result.metadata);

        // Auto-save if enabled
        if (autoSave) {
          await saveBuzzSnapshot(projectId, result);
        }
      } else {
        setError(result.error || 'Failed to calculate metrics');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('Error fetching buzz metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, youtubeVideoUrls, instagramHandle, filmName, autoSave]);

  /**
   * Load buzz history
   */
  const loadHistory = useCallback(async (limit = 10) => {
    if (!projectId) return;

    try {
      const result = await getBuzzHistory(projectId, limit);
      if (result.success) {
        setHistory(result.data);
      }
    } catch (err) {
      console.error('Error loading buzz history:', err);
    }
  }, [projectId]);

  /**
   * Manually save current metrics as snapshot
   */
  const saveSnapshot = useCallback(async () => {
    if (!projectId || !metadata) {
      setError('No metrics to save');
      return { success: false };
    }

    try {
      const result = await saveBuzzSnapshot(projectId, {
        normalizedMetrics: metrics,
        buzzScore,
        metadata,
        rawMetrics,
      });

      if (result.success) {
        // Reload history to show new snapshot
        await loadHistory();
      }

      return result;
    } catch (err) {
      console.error('Error saving snapshot:', err);
      return { success: false, error: err.message };
    }
  }, [projectId, metrics, buzzScore, metadata, rawMetrics, loadHistory]);

  /**
   * Refresh metrics (manual trigger)
   */
  const refresh = useCallback(() => {
    return fetchMetrics();
  }, [fetchMetrics]);

  /**
   * Auto-fetch on mount if enabled
   */
  useEffect(() => {
    if (autoFetch && projectId) {
      fetchMetrics();
      loadHistory();
    }
  }, [autoFetch, projectId, fetchMetrics, loadHistory]);

  return {
    // Metrics
    metrics,
    buzzScore,
    componentScores,
    rawMetrics,
    metadata,
    history,
    
    // State
    loading,
    error,
    
    // Actions
    refresh,
    saveSnapshot,
    loadHistory,
  };
};

export default useBuzzMetrics;
