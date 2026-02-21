import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProjectLayout from '../components/ProjectLayout';
import Card from '../components/Card';
import Icon from '../components/Icon';
import { projectService } from '../services/api.service';
import { getDistributorRecommendations, getGenreInsights, getDistributorSpecialization } from '../services/distributor.service';
import './DistributorAnalyzerPage.css';

const DistributorAnalyzerPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('overview'); // overview, regional, all

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const projectData = await projectService.getProject(projectId);
      setProject(projectData);
      
      // Pass projectId for comprehensive analysis (buzz, sentiment, persona, competition)
      const distRecommendations = await getDistributorRecommendations(projectId);
      setRecommendations(distRecommendations);
    } catch (err) {
      console.error('Error loading distributor data:', err);
      setError('Failed to load distributor recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProjectLayout>
        <div className="distributor-loading">
          <div className="spinner"></div>
          <p>Analyzing distributors for your film...</p>
        </div>
      </ProjectLayout>
    );
  }

  if (error || !recommendations) {
    return (
      <ProjectLayout>
        <div className="distributor-error">
          <Icon name="warning" size={32} />
          <p>{error || 'No recommendations available'}</p>
        </div>
      </ProjectLayout>
    );
  }

  const genreInsight = getGenreInsights(project.genre, project.subgenre);

  return (
    <ProjectLayout>
      <div className="distributor-page">
        <div className="page-header">
          <h1>Distributor Analyzer</h1>
          <p className="page-subtitle">
            AI-powered distributor recommendations based on your film's characteristics and target regions
          </p>
        </div>

        {/* Film Context Card */}
        <Card style={{ marginBottom: 24, background: 'rgba(167,139,250,0.1)', borderLeft: '3px solid #a78bfa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Film</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{project.title}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Genre</div>
              <div style={{ fontSize: 14, color: '#a78bfa' }}>
                {project.genre} {project.subgenre && `/ ${project.subgenre}`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Language & Region</div>
              <div style={{ fontSize: 14, color: '#a78bfa' }}>
                {project.language} - {project.region_primary || 'Pan India'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Budget Band</div>
              <div style={{ fontSize: 14, color: '#a78bfa' }}>
                {project.budget_band || 'Not specified'}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(167,139,250,0.15)', borderRadius: 6, fontSize: 13 }}>
            <Icon name="lightbulb" size={14} /> <strong>Genre Strategy:</strong> {genreInsight}
          </div>
        </Card>

        {/* Analysis Summary (if AI was used) */}
        {recommendations.filmProfile && (
          <Card>
            <h3 className="section-title">
              <Icon name="robot" size={18} /> Analysis Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>BUZZ SCORE</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: recommendations.filmProfile.buzz.currentScore >= 70 ? '#10b981' : recommendations.filmProfile.buzz.currentScore >= 40 ? '#f59e0b' : '#888' }}>
                  {recommendations.filmProfile.buzz.currentScore}/100
                </div>
                <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                  {recommendations.filmProfile.buzz.trend === 'rising' && '📈 Trending up'}
                  {recommendations.filmProfile.buzz.trend === 'falling' && '📉 Declining'}
                  {recommendations.filmProfile.buzz.trend === 'stable' && '➡️ Stable'}
                  {recommendations.filmProfile.buzz.trend === 'unknown' && 'No history'}
                </div>
              </div>
              
              {recommendations.filmProfile.sentiment && (
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>SENTIMENT</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#10b981' }}>
                    {recommendations.filmProfile.sentiment.positive_percentage}% Positive
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                    {recommendations.filmProfile.sentiment.overall_sentiment} ({recommendations.filmProfile.sentiment.confidence_score}% confidence)
                  </div>
                </div>
              )}
              
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>COMPETITION</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#f59e0b' }}>
                  {recommendations.filmProfile.competition.totalFilms} films nearby
                </div>
                <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                  {recommendations.filmProfile.competition.highBuzzFilms} high-buzz competitors
                </div>
              </div>
              
              {recommendations.aiRecommendations && recommendations.aiRecommendations.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>AI ANALYSIS</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#10b981' }}>
                    ✓ Active
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                    {recommendations.aiRecommendations.length} AI-recommended distributors
                  </div>
                </div>
              )}
            </div>
            
            {(!recommendations.filmProfile.sentiment && recommendations.filmProfile.buzz.currentScore === 0) && (
              <div style={{ marginTop: 12, padding: 10, background: 'rgba(251,191,36,0.15)', borderRadius: 6, fontSize: 12, color: '#f59e0b' }}>
                <Icon name="info" size={12} /> Limited analysis data available. Complete buzz tracking and sentiment analysis for AI-powered recommendations.
              </div>
            )}
          </Card>
        )}

        {/* View Selector */}
        <div className="view-selector">
          <button 
            className={activeView === 'overview' ? 'active' : ''}
            onClick={() => setActiveView('overview')}
          >
            <Icon name="target" size={16} /> Overview
          </button>
          <button 
            className={activeView === 'regional' ? 'active' : ''}
            onClick={() => setActiveView('regional')}
          >
            <Icon name="chart" size={16} /> Regional Breakdown
          </button>
          <button 
            className={activeView === 'all' ? 'active' : ''}
            onClick={() => setActiveView('all')}
          >
            <Icon name="film" size={16} /> All Distributors
          </button>
        </div>

        {/* Overview View */}
        {activeView === 'overview' && (
          <>
            {/* Top Recommendations */}
            <Card style={{ marginBottom: 24 }}>
              <h3 className="section-title">
                <Icon name="rocket" size={18} /> Top Recommendations for {recommendations.region}
              </h3>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
                Based on coverage area, success rates, and regional alignment
              </p>
              
              <div className="top-distributors-grid">
                {recommendations.all.slice(0, 6).map((dist, idx) => (
                  <DistributorCard 
                    key={dist['Distributor ID']} 
                    distributor={dist} 
                    rank={idx + 1}
                    priority={idx < 2 ? 1 : idx < 4 ? 2 : 3}
                    genre={project.genre}
                  />
                ))}
              </div>
            </Card>

            {/* Coverage Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
              <Card>
                <h4 style={{ fontSize: 14, marginBottom: 16, color: '#fff' }}>
                  <Icon name="target" size={16} /> National Coverage
                </h4>
                {recommendations.national.slice(0, 3).map((dist, idx) => (
                  <DistributorListItem key={dist['Distributor ID']} distributor={dist} rank={idx + 1} />
                ))}
              </Card>

              <Card>
                <h4 style={{ fontSize: 14, marginBottom: 16, color: '#fff' }}>
                  <Icon name="chart" size={16} /> Regional Focus
                </h4>
                {recommendations.regional.slice(0, 3).map((dist, idx) => (
                  <DistributorListItem key={dist['Distributor ID']} distributor={dist} rank={idx + 1} />
                ))}
              </Card>

              <Card>
                <h4 style={{ fontSize: 14, marginBottom: 16, color: '#fff' }}>
                  <Icon name="film" size={16} /> International Reach
                </h4>
                {recommendations.international.slice(0, 3).map((dist, idx) => (
                  <DistributorListItem key={dist['Distributor ID']} distributor={dist} rank={idx + 1} />
                ))}
              </Card>
            </div>
          </>
        )}

        {/* Regional Breakdown View */}
        {activeView === 'regional' && (
          <RegionalBreakdown 
            region={recommendations.region} 
            byRegion={recommendations.byRegion}
            focusAreas={recommendations.focusAreas}
          />
        )}

        {/* All Distributors View */}
        {activeView === 'all' && (
          <Card>
            <h3 className="section-title">All Film Distributors (Ranked by Match Score)</h3>
            <div className="all-distributors-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Distributor</th>
                    <th>Coverage</th>
                    <th>Location</th>
                    <th>Match Score</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.all.map((dist, idx) => (
                    <tr key={dist['Distributor ID']} style={dist.aiRecommended ? { background: 'rgba(16, 185, 129, 0.05)' } : {}}>
                      <td>
                        <div className={`rank-badge priority-${idx < 3 ? 1 : idx < 8 ? 2 : 3}`}>
                          #{idx + 1}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{dist['Distributor Name']}</div>
                            <div style={{ fontSize: 11, color: '#888' }}>{dist['Distributor ID']}</div>
                          </div>
                          {dist.aiRecommended && (
                            <span style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#fff',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '3px 6px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}>
                              <Icon name="sparkles" size={9} /> AI PICK
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`coverage-badge ${dist['Coverage Area'].toLowerCase()}`}>
                          {dist['Coverage Area']}
                        </span>
                      </td>
                      <td>{dist['Headquarters City']}</td>
                      <td>
                        <div className="score-bar">
                          <div className="score-fill" style={{ width: `${dist.matchScore}%` }}></div>
                          <span>{dist.matchScore.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>{dist['Success Rate (%)']}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ProjectLayout>
  );
};

/* Distributor Card Component */
const DistributorCard = ({ distributor, rank, priority, genre }) => {
  const specialization = getDistributorSpecialization(distributor, genre);
  
  return (
    <div className={`distributor-card priority-${priority}`}>
      <div className="distributor-card-header">
        <div className={`priority-badge priority-${priority}`}>
          Priority {priority}
        </div>
        <div className="rank-number">#{rank}</div>
      </div>
      
      {distributor.aiRecommended && (
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: 4,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          <Icon name="sparkles" size={10} /> AI RECOMMENDED
        </div>
      )}
      
      <h4 className="distributor-name">{distributor['Distributor Name']}</h4>
      <div className="distributor-location">
        <Icon name="target" size={12} /> {distributor['Headquarters City']} 
        <span className={`coverage-tag ${distributor['Coverage Area'].toLowerCase()}`}>
          {distributor['Coverage Area']}
        </span>
      </div>

      <div className="distributor-scores">
        <div className="score-item">
          <div className="score-label">Match Score</div>
          <div className="score-value primary">{distributor.matchScore.toFixed(1)}%</div>
        </div>
        <div className="score-item">
          <div className="score-label">Success Rate</div>
          <div className="score-value">{distributor['Success Rate (%)']}%</div>
        </div>
        <div className="score-item">
          <div className="score-label">Reliability</div>
          <div className="score-value">{distributor['Reliability Score (%)']}%</div>
        </div>
      </div>

      <div className="distributor-pros">
        <div style={{ fontSize: 11, fontWeight: 600, color: '#4ade80', marginBottom: 4 }}>
          <Icon name="sparkles" size={12} /> Best For {genre}
        </div>
        <div style={{ fontSize: 11, color: '#bbb', lineHeight: 1.5 }}>
          {specialization}
        </div>
      </div>
      
      {distributor.aiRecommended && distributor.aiReason && (
        <div style={{
          marginTop: 12,
          padding: 8,
          background: 'rgba(16, 185, 129, 0.1)',
          borderLeft: '2px solid #10b981',
          borderRadius: 4
        }}>
          <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600, marginBottom: 2 }}>
            AI INSIGHT
          </div>
          <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.4 }}>
            {distributor.aiReason}
          </div>
        </div>
      )}
    </div>
  );
};

/* Distributor List Item Component */
const DistributorListItem = ({ distributor, rank }) => {
  return (
    <div className="distributor-list-item">
      <div className="list-rank">#{rank}</div>
      <div className="list-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="list-name">{distributor['Distributor Name']}</div>
          {distributor.aiRecommended && (
            <span style={{
              background: '#10b981',
              color: '#fff',
              fontSize: 8,
              fontWeight: 700,
              padding: '2px 4px',
              borderRadius: 3
            }}>AI</span>
          )}
        </div>
        <div className="list-meta">
          {distributor['Headquarters City']} • Match: {distributor.matchScore.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

/* Regional Breakdown Component */
const RegionalBreakdown = ({ region, byRegion, focusAreas }) => {
  if (!byRegion || Object.keys(byRegion).length === 0) {
    return (
      <Card>
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>
          <Icon name="info" size={24} />
          <br />No regional data available for {region}
        </p>
      </Card>
    );
  }

  // Render based on focus type
  if (focusAreas.type === 'states') {
    return (
      <div className="regional-breakdown">
        <h3 className="section-title">
          <Icon name="target" size={18} /> State-wise Distribution Strategy
        </h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
          Distributors organized by state presence for Pan India release
        </p>
        
        <div style={{ display: 'grid', gap: 16 }}>
          {Object.entries(byRegion).map(([state, priorities]) => (
            <Card key={state}>
              <h4 style={{ fontSize: 15, marginBottom: 12, color: '#00ff88' }}>{state}</h4>
              <PriorityDistributors priorities={priorities} />
            </Card>
          ))}
        </div>
      </div>
    );
  } else if (focusAreas.type === 'states_cities') {
    return (
      <div className="regional-breakdown">
        <h3 className="section-title">
          <Icon name="target" size={18} /> Southern States Distribution Strategy
        </h3>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
          State and city-level distributor recommendations for South India
        </p>
        
        {Object.entries(byRegion).map(([state, data]) => (
          <Card key={state} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, color: '#00ff88' }}>{state}</h3>
            
            <h4 style={{ fontSize: 14, marginBottom: 12, color: '#a78bfa' }}>State-Level Distributors</h4>
            <PriorityDistributors priorities={data.stateLevel} />
            
            {data.cities && Object.keys(data.cities).length > 0 && (
              <>
                <h4 style={{ fontSize: 14, marginTop: 20, marginBottom: 12, color: '#a78bfa' }}>City-Level Focus</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                  {Object.entries(data.cities).map(([city, priorities]) => (
                    <div key={city} className="city-distributors">
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#fff' }}>{city}</div>
                      <PriorityDistributors priorities={priorities} compact />
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    );
  } else if (focusAreas.type === 'cities') {
    return (
      <div className="regional-breakdown">
        <h3 className="section-title">
          <Icon name="target" size={18} /> City-wise Distribution Strategy for {region}
        </h3>
        
        {byRegion.primary && (
          <Card style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 15, marginBottom: 16, color: '#00ff88' }}>Primary Cities (Tier 1)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {Object.entries(byRegion.primary).map(([city, priorities]) => (
                <div key={city} className="city-section">
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#fff' }}>{city}</div>
                  <PriorityDistributors priorities={priorities} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {byRegion.secondary && Object.keys(byRegion.secondary).length > 0 && (
          <Card>
            <h4 style={{ fontSize: 15, marginBottom: 16, color: '#a78bfa' }}>Secondary Cities (Tier 2)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              {Object.entries(byRegion.secondary).map(([city, priorities]) => (
                <div key={city} className="city-section">
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#ccc' }}>{city}</div>
                  <PriorityDistributors priorities={priorities} compact />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  return null;
};

/* Priority Distributors Component */
const PriorityDistributors = ({ priorities, compact = false }) => {
  const renderPriority = (priority, distributors, label) => {
    if (!distributors || distributors.length === 0) return null;
    
    return (
      <div className={`priority-group ${compact ? 'compact' : ''}`}>
        <div className={`priority-label priority-${priority}`}>
          Priority {priority}
        </div>
        {distributors.map(dist => (
          <div key={dist['Distributor ID']} className="priority-distributor-item">
            <div className="priority-dist-name">{dist['Distributor Name']}</div>
            {!compact && (
              <div className="priority-dist-meta">
                <span>{dist['Headquarters City']}</span>
                <span>Match: {dist.matchScore.toFixed(1)}%</span>
                <span>Success: {dist['Success Rate (%)']}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="priority-distributors">
      {renderPriority(1, priorities.priority1, 'Priority 1')}
      {renderPriority(2, priorities.priority2, 'Priority 2')}
      {renderPriority(3, priorities.priority3, 'Priority 3')}
    </div>
  );
};

export default DistributorAnalyzerPage;
