import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import GaugeMeter from '../components/GaugeMeter';
import SparklineChart from '../components/SparklineChart';
import BuzzConfiguration from '../components/BuzzConfiguration';
import AutoBuzzMetrics from '../components/AutoBuzzMetrics';
import Icon from '../components/Icon';
import { projectService } from '../services/api.service';
import { searchFilmVideos } from '../services/youtube-search.service';
import { supabase } from '../supabaseClient';
import './BuzzPage.css';

const BuzzPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [config, setConfig] = useState({
    youtubeUrls: [],
    instagramHandle: '',
    filmName: '',
  });
  const [autoSearching, setAutoSearching] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    const load = async () => {
      try {
        // Load project details to get film name and initial media links
        const projectData = await projectService.getProject(projectId);
        setProject(projectData);
        
        // Load buzz snapshots
        const data = await projectService.getBuzzSnapshots(projectId);
        setSnapshots(data || []);
        
        // Check if configuration exists
        const { data: existingConfig } = await supabase
          .from('buzz_config')
          .select('*')
          .eq('project_id', projectId)
          .single();
        
        if (existingConfig && existingConfig.youtube_urls?.length > 0) {
          // Load existing config
          setConfig({
            youtubeUrls: existingConfig.youtube_urls || [],
            instagramHandle: existingConfig.instagram_handle || '',
            filmName: existingConfig.film_name || projectData?.title || '',
          });
        } else {
          // No config exists - check for initial_media_links from onboarding
          const initialMediaLinks = projectData?.project_metadata?.initial_media_links;
          
          if (initialMediaLinks) {
            // Use media links from onboarding
            const urls = [];
            if (initialMediaLinks.primary_trailer_url) {
              urls.push(initialMediaLinks.primary_trailer_url);
            }
            if (initialMediaLinks.secondary_videos) {
              urls.push(...initialMediaLinks.secondary_videos);
            }
            
            if (urls.length > 0) {
              // Pre-populate config with onboarding media links
              const newConfig = {
                youtubeUrls: urls,
                instagramHandle: '',
                filmName: projectData?.title || '',
              };
              setConfig(newConfig);
              
              // Auto-save initial config
              await saveConfigToDatabase(newConfig);
              showToast(<><Icon name="check" size={14} /> Pre-populated {urls.length} video(s) from onboarding</>);
            }
          } else if (projectData?.title) {
            // Fallback: Auto-populate film name and trigger auto-search
            setConfig(prev => ({ ...prev, filmName: projectData.title }));
            // Auto-search after component mounts (silent mode)
            setTimeout(() => {
              if (projectData?.title) {
                handleAutoSearchAndConfigure(true);
              }
            }, 1500);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handleConfigUpdate = (newConfig) => {
    setConfig(newConfig);
  };

  const reloadSnapshots = async () => {
    try {
      const data = await projectService.getBuzzSnapshots(projectId);
      setSnapshots(data || []);
    } catch (e) {
      console.error('Failed to reload snapshots:', e);
    }
  };

  const handleAutoSearchAndConfigure = async (silent = false) => {
    if (!project?.title) {
      if (!silent) showToast('Movie name not found. Please update project details.');
      return;
    }

    setAutoSearching(true);
    try {
      if (!silent) showToast(<><Icon name="search" size={14} /> Searching YouTube for "{project.title}"...</>);
      
      // Auto-search YouTube for top videos
      const videoUrls = await searchFilmVideos(project.title, 5);
      
      console.log('YouTube Search Results:', videoUrls);
      
      // Update config with YouTube videos only
      const updatedConfig = {
        youtubeUrls: videoUrls,
        instagramHandle: config.instagramHandle || '',
        filmName: project.title,
      };
      
      setConfig(updatedConfig);
      
      // Auto-save to database
      await saveConfigToDatabase(updatedConfig);
      
      if (!silent) {
        if (videoUrls.length > 0) {
          showToast(<><Icon name="checkCircle" size={14} /> Found {videoUrls.length} YouTube videos!</>);
        } else {
          showToast(<><Icon name="warning" size={14} /> No YouTube videos found. You can add URLs manually.</>);
        }
      }
      
    } catch (error) {
      console.error('Auto-search error:', error);
      if (!silent) {
        showToast(<><Icon name="warning" size={14} /> {error.message || 'Search failed. Please try manually.'}</>);
      }
    } finally {
      setAutoSearching(false);
    }
  };

  const saveConfigToDatabase = async (configData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('buzz_config')
        .upsert([{
          project_id: projectId,
          user_id: user.id,
          youtube_urls: configData.youtubeUrls,
          instagram_handle: configData.instagramHandle,
          film_name: configData.filmName,
        }], { onConflict: 'project_id' });

      if (error) console.error('Error saving config:', error);
    } catch (err) {
      console.error('Save config error:', err);
    }
  };

  const handleSnapshotSaved = () => {
    // Reload snapshots when a new one is saved
    const reload = async () => {
      try {
        const data = await projectService.getBuzzSnapshots(projectId);
        setSnapshots(data || []);
      } catch (e) {
        console.error(e);
      }
    };
    reload();
  };

  const latest = snapshots[snapshots.length - 1];
  const prev    = snapshots[snapshots.length - 2];
  const buzzScores = snapshots.map(s => s.buzz_score);
  const trend   = latest && prev
    ? ((latest.buzz_score - prev.buzz_score) / (prev.buzz_score || 1) * 100).toFixed(1)
    : null;

  if (loading) return <ProjectLayout><div className="loading-screen"><div className="loading-spinner" /></div></ProjectLayout>;

  return (
    <ProjectLayout>
      {toast && <div className="toast">{toast}</div>}
      <div className="buzz-page">
        <h1 className="page-title">Buzz Score & Trend</h1>
        <p className="page-subtitle">
          We combine watch time, shares, sentiment, search growth, and engagement into a single Buzz Score
          to indicate how hot your film's online presence is right now.
        </p>

        <div className="buzz-grid">
          {/* Score card */}
          <Card className="buzz-score-card">
            {latest ? (
              <>
                <GaugeMeter score={latest.buzz_score} />
                <p className="buzz-date">Last updated: {latest.created_at ? new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}</p>
                {trend !== null && (
                  <p className={`buzz-trend ${parseFloat(trend) >= 0 ? 'buzz-trend--up' : 'buzz-trend--down'}`}>
                    <Icon name={parseFloat(trend) >= 0 ? "arrowUp" : "arrowDown"} size={12} /> {Math.abs(trend)}% vs last snapshot
                  </p>
                )}
                {buzzScores.length > 1 && (
                  <div className="buzz-sparkline">
                    <SparklineChart data={buzzScores} width={180} height={48} />
                  </div>
                )}
              </>
            ) : (
              <div className="buzz-no-data">
                <p>No buzz data yet.</p>
                <p className="buzz-no-data-sub">Configure and analyze below to get started.</p>
              </div>
            )}
          </Card>

          {/* Quick Auto-Search Button */}
          <Card>
            <h3 className="section-title"><Icon name="rocket" size={18} /> Quick Start</h3>
            <p className="buzz-form-hint">
              Automatically find YouTube videos for your film
            </p>
            <div style={{ marginTop: 16 }}>
              <button 
                className="auto-search-btn"
                onClick={() => handleAutoSearchAndConfigure(false)}
                disabled={autoSearching || !project?.title}
              >
                {autoSearching ? <><Icon name="search" size={14} /> Searching...</> : <><Icon name="sparkles" size={14} /> Auto-Find Content</>}
              </button>
              {project?.title && (
                <p style={{ marginTop: 12, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                  Film: <strong style={{ color: '#00ff88' }}>{project.title}</strong>
                </p>
              )}
            </div>
            {config.youtubeUrls?.length > 0 && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(0, 255, 136, 0.1)', borderRadius: 8, border: '1px solid rgba(0, 255, 136, 0.3)' }}>
                <p style={{ fontSize: '0.85rem', color: '#00ff88', margin: 0 }}>
                  <Icon name="check" size={14} /> Found {config.youtubeUrls.length} YouTube video{config.youtubeUrls.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
            <p className="buzz-api-note" style={{ marginTop: 16 }}>
              <Icon name="lightbulb" size={14} /> Auto-searches YouTube for "{project?.title}" videos. Google Trends data auto-generated based on film characteristics.
            </p>
          </Card>
        </div>

        {/* Configuration Section */}
        <div style={{ marginTop: 24 }}>
          <BuzzConfiguration 
            projectId={projectId}
            onConfigUpdate={handleConfigUpdate}
            initialConfig={config}
          />
        </div>

        {/* Auto-Calculated Metrics */}
        <div style={{ marginTop: 24 }}>
          <AutoBuzzMetrics
            projectId={projectId}
            youtubeUrls={config.youtubeUrls}
            instagramHandle={config.instagramHandle}
            filmName={config.filmName || project?.title}
            onSnapshotSaved={reloadSnapshots}
            hasSnapshots={snapshots.length > 0}
          />
        </div>

        {/* History */}
        {snapshots.length > 0 && (
          <Card style={{ marginTop: 24 }}>
            <h3 className="section-title">Snapshot History</h3>
            <div className="buzz-history-table">
              <div className="bht-head">
                <span>Date</span><span>Buzz</span><span>Watch</span><span>Share</span><span>Sentiment</span><span>Search</span><span>Engage</span>
              </div>
              {[...snapshots].reverse().map((s, i) => (
                <div key={s.id || i} className="bht-row">
                  <span>{s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                  <span className="bht-score">{s.buzz_score}</span>
                  <span>{s.watch_time_norm?.toFixed(2)}</span>
                  <span>{s.share_rate_norm?.toFixed(2)}</span>
                  <span>{s.sentiment_score_norm?.toFixed(2)}</span>
                  <span>{s.search_growth_norm?.toFixed(2)}</span>
                  <span>{s.engagement_rate_norm?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </ProjectLayout>
  );
};

export default BuzzPage;
