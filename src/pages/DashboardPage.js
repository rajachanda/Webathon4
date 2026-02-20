import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Card from '../components/Card';
import TagChip from '../components/TagChip';
import { useAuth } from '../AuthContext';
import { projectService } from '../services/api.service';
import './DashboardPage.css';

const statusColor = (s) => {
  if (s === 'analysis_ready') return 'green';
  if (s === 'persona_locked') return 'blue';
  return 'gray';
};

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Producer';

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectService.listProjects(user.id);
        setProjects(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  return (
    <div className="dashboard-page">
      <Header />
      <div className="dashboard-body">
        {/* Hero greeting */}
        <div className="dashboard-hero">
          <h1 className="dashboard-greeting">
            Welcome back, <span className="gradient-text">{name}</span>
          </h1>
          <p className="dashboard-tagline">Paora Filmy hai Boss.. 🎬</p>
          <button
            className="btn-primary-green dashboard-cta"
            onClick={() => navigate('/projects/new')}
          >
            + Introduce your film
          </button>
        </div>

        {/* Projects list */}
        <div className="dashboard-section">
          <h2 className="section-title">Your Projects</h2>
          {loading ? (
            <p className="dashboard-empty">Loading…</p>
          ) : projects.length === 0 ? (
            <div className="dashboard-empty-state">
              <p>No film projects yet.</p>
              <button
                className="btn-primary-green"
                onClick={() => navigate('/projects/new')}
              >
                Start your first film
              </button>
            </div>
          ) : (
            <div className="project-cards-grid">
              {projects.map(p => (
                <Card key={p.id} className="project-card clickable" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="project-card-top">
                    <h3 className="project-card-title">{p.title}</h3>
                    <TagChip
                      label={p.status?.replace('_', ' ') || 'draft'}
                      color={statusColor(p.status)}
                    />
                  </div>
                  {p.project_metadata && (
                    <div className="project-card-meta">
                      <span>{p.project_metadata.language}</span>
                      <span>•</span>
                      <span>{p.project_metadata.genre}</span>
                      {p.project_metadata.budget_band && (
                        <><span>•</span><span>{p.project_metadata.budget_band} budget</span></>
                      )}
                    </div>
                  )}
                  <div className="project-card-links">
                    <button className="pcard-link" onClick={e => { e.stopPropagation(); navigate(`/projects/${p.id}`); }}>Overview</button>
                    <button className="pcard-link" onClick={e => { e.stopPropagation(); navigate(`/projects/${p.id}/persona`); }}>Persona</button>
                    <button className="pcard-link" onClick={e => { e.stopPropagation(); navigate(`/projects/${p.id}/release-window`); }}>Release</button>
                    <button className="pcard-link" onClick={e => { e.stopPropagation(); navigate(`/projects/${p.id}/buzz`); }}>Buzz</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
