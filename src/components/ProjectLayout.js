import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import './ProjectLayout.css';

const NAV_LINKS = [
  { label: 'Overview',       path: '' },
  { label: 'Persona',        path: '/persona' },
  { label: 'Release Window', path: '/release-window' },
  { label: 'Buzz',           path: '/buzz' },
  { label: 'Campaign',       path: '/campaign' },
  { label: 'Sentiment',      path: '/sentiment' },
];

const ProjectLayout = ({ children }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const base = `/projects/${projectId}`;

  return (
    <div className="project-layout">
      <Header />
      <div className="project-layout__body">
        {/* Sidebar nav */}
        <nav className="project-sidenav">
          <p className="sidenav-label">Project</p>
          {NAV_LINKS.map(link => {
            const to = `${base}${link.path}`;
            const active = location.pathname === to || (link.path === '' && location.pathname === base);
            return (
              <button
                key={link.label}
                className={`sidenav-item ${active ? 'sidenav-item--active' : ''}`}
                onClick={() => navigate(to)}
              >
                {link.label}
              </button>
            );
          })}
          <button
            className="sidenav-back"
            onClick={() => navigate('/dashboard')}
          >
            ← Dashboard
          </button>
        </nav>
        {/* Main content */}
        <main className="project-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ProjectLayout;
