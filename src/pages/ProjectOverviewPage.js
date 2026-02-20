import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import TagChip from '../components/TagChip';
import { projectService } from '../services/api.service';
import './ProjectOverviewPage.css';

const MetaRow = ({ label, value }) =>
  value ? (
    <div className="meta-row">
      <span className="meta-label">{label}</span>
      <span className="meta-value">{value}</span>
    </div>
  ) : null;

const ProjectOverviewPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await projectService.getProject(projectId);
        setProject(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  if (loading) return <ProjectLayout><div className="loading-screen"><div className="loading-spinner" /></div></ProjectLayout>;
  if (!project) return <ProjectLayout><p style={{ color: 'rgba(255,255,255,0.4)' }}>Project not found.</p></ProjectLayout>;

  const m = project.project_metadata || {};

  return (
    <ProjectLayout>
      <div className="overview-page">
        <div className="overview-header">
          <div>
            <h1 className="page-title">{project.title}</h1>
            <p className="page-subtitle">Project overview</p>
          </div>
          <TagChip
            label={project.status?.replace('_', ' ') || 'draft'}
            color={project.status === 'analysis_ready' ? 'green' : project.status === 'persona_locked' ? 'blue' : 'gray'}
            size="lg"
          />
        </div>

        <div className="overview-grid">
          <Card className="overview-card">
            <h3 className="section-title">Film Details</h3>
            <MetaRow label="Language"   value={m.language} />
            <MetaRow label="Region"     value={m.region_primary} />
            <MetaRow label="Genre"      value={[m.genre, m.subgenre].filter(Boolean).join(' / ')} />
            <MetaRow label="Tone"       value={m.tone} />
            <MetaRow label="Pace"       value={m.pace} />
            <MetaRow label="Rating"     value={m.rating} />
            <MetaRow label="Runtime"    value={m.runtime_minutes ? `${m.runtime_minutes} min` : ''} />
            <MetaRow label="Platform"   value={m.platform_strategy} />
            <MetaRow label="Budget"     value={m.budget_band} />
            <MetaRow label="Star Power" value={m.star_power_band} />
          </Card>

          <Card className="overview-card">
            <h3 className="section-title">Cast</h3>
            <MetaRow label="Hero"     value={m.hero_name} />
            <MetaRow label="Heroine"  value={m.heroine_name} />
            <MetaRow label="Known faces" value={m.known_faces} />
            {m.themes?.length > 0 && (
              <div className="meta-themes">
                <span className="meta-label">Themes</span>
                <div className="meta-chips">
                  {m.themes.map(t => <TagChip key={t} label={t} size="sm" />)}
                </div>
              </div>
            )}
          </Card>

          {m.logline && (
            <Card className="overview-card overview-card--wide">
              <h3 className="section-title">Logline</h3>
              <p className="overview-logline">{m.logline}</p>
              {m.interesting_hook && (
                <>
                  <h3 className="section-title" style={{ marginTop: 16 }}>Interesting Hook</h3>
                  <p className="overview-logline">{m.interesting_hook}</p>
                </>
              )}
            </Card>
          )}
        </div>

        <div className="overview-actions">
          <button className="btn-primary-green" onClick={() => navigate(`/projects/${projectId}/persona`)}>Edit Persona →</button>
          <button className="btn-ghost" onClick={() => navigate(`/projects/${projectId}/buzz`)}>Buzz Score</button>
          <button className="btn-ghost" onClick={() => navigate(`/projects/${projectId}/release-window`)}>Release Window</button>
          <button className="btn-ghost" onClick={() => navigate(`/projects/${projectId}/campaign`)}>Campaign</button>
        </div>
      </div>
    </ProjectLayout>
  );
};

export default ProjectOverviewPage;
