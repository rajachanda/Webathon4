import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import MovieBackground from './components/MovieBackground';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import Home from './pages/Home';
import Profile from './pages/Profile';
import DashboardPage from './pages/DashboardPage';
import NewProjectOnboarding from './pages/NewProjectOnboarding';
import ProjectOverviewPage from './pages/ProjectOverviewPage';
import PersonaPage from './pages/PersonaPage';
import TeamPovFormPage from './pages/TeamPovFormPage';
import ReleaseWindowPage from './pages/ReleaseWindowPage';
import BuzzPage from './pages/BuzzPage';
import CampaignPage from './pages/CampaignPage';
import SentimentAnalysisPage from './pages/SentimentAnalysisPage';
import DistributorAnalyzerPage from './pages/DistributorAnalyzerPage';
import CompetitionManager from './pages/CompetitionManager';
import OTTDealPage from './pages/OTTDealPage';
import './App.css';

function AppContent() {
  return (
    <>
      <Routes>
        {/* Public routes — keep MovieBackground */}
        <Route path="/" element={<><MovieBackground /><Home /></>} />
        <Route path="/home" element={<><MovieBackground /><Home /></>} />
        <Route path="/login" element={<><MovieBackground /><Login /></>} />

        {/* Public team POV form (no login required) */}
        <Route path="/projects/:projectId/team-link/:token" element={<TeamPovFormPage />} />

        {/* Protected routes */}
        <Route path="/select-role"  element={<ProtectedRoute><RoleSelection /></ProtectedRoute>} />
        <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/dashboard"    element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/competition"  element={<ProtectedRoute><CompetitionManager /></ProtectedRoute>} />
        <Route path="/projects/new" element={<ProtectedRoute><NewProjectOnboarding /></ProtectedRoute>} />
        <Route path="/projects/:projectId"                element={<ProtectedRoute><ProjectOverviewPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/persona"        element={<ProtectedRoute><PersonaPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/release-window" element={<ProtectedRoute><ReleaseWindowPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/buzz"           element={<ProtectedRoute><BuzzPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/campaign"       element={<ProtectedRoute><CampaignPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/sentiment"      element={<ProtectedRoute><SentimentAnalysisPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/distributor-analyzer" element={<ProtectedRoute><DistributorAnalyzerPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/ott-deal"       element={<ProtectedRoute><OTTDealPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;

