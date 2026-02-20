/**
 * Quick Demo Component - Test Release Intelligence
 * Add this to your app temporarily to see the output
 */

import React, { useState } from 'react';
import { getDaySummaries, findBestWindows } from './lib/releaseScoring';

const ReleaseIntelligenceDemo = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runDemo = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting Release Intelligence Analysis...');

      // Analyze March 2026 (Board Exam period)
      const analysis = await getDaySummaries(
        '2026-03-01',
        '2026-03-31',
        {
          targetAudience: ['urbanYouth', 'college', 'family'],
          targetRegion: 'Tamil Nadu',
          considerNearby: true,
          useSportsAPI: true,
          useGoogleCalendar: true, // Uses Indian holidays public calendar (API key)
        }
      );

      console.log('✅ Analysis Complete!', analysis);

      // Find best windows
      const windows = findBestWindows(analysis.daySummaries, 3);

      setResult({ analysis, windows });
    } catch (err) {
      console.error('❌ Analysis failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🎬 Release Timing Intelligence Demo</h1>
      <p>Testing the Multi-Source Scoring System</p>

      <button
        onClick={runDemo}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
        }}
      >
        {loading ? '⏳ Analyzing...' : '🚀 Run Analysis (March 2026)'}
      </button>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#991b1b',
          marginBottom: '20px',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div>
          {/* Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <StatCard
              label="Total Days"
              value={result.analysis.summary.total}
              color="#6b7280"
            />
            <StatCard
              label="Good Days"
              value={result.analysis.summary.good}
              color="#10b981"
            />
            <StatCard
              label="Okay Days"
              value={result.analysis.summary.okay}
              color="#f59e0b"
            />
            <StatCard
              label="Avoid Days"
              value={result.analysis.summary.avoid}
              color="#ef4444"
            />
            <StatCard
              label="Blocked Days"
              value={result.analysis.summary.blocked}
              color="#6b7280"
            />
          </div>

          {/* Best Date */}
          {result.analysis.summary.bestDate && (
            <div style={{
              padding: '20px',
              backgroundColor: '#d1fae5',
              border: '2px solid #10b981',
              borderRadius: '12px',
              marginBottom: '24px',
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#047857' }}>
                🏆 Best Release Date
              </h3>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#065f46' }}>
                {formatDate(result.analysis.summary.bestDate.dateISO)}
              </div>
              <div style={{ fontSize: '18px', color: '#047857', marginTop: '8px' }}>
                Score: {result.analysis.summary.bestDate.avgScore}/100
              </div>
            </div>
          )}

          {/* Best Windows */}
          {result.windows.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3>🎯 Best Release Windows (3+ consecutive days)</h3>
              {result.windows.slice(0, 3).map((window, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#166534' }}>
                    #{idx + 1}: {formatDate(window.startDate)} → {formatDate(window.endDate)}
                  </div>
                  <div style={{ color: '#15803d', marginTop: '4px' }}>
                    Duration: {window.days.length} days | Avg Score: {Math.round(window.avgScore)}/100
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Day-by-Day Breakdown */}
          <div>
            <h3>📅 Day-by-Day Analysis</h3>
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={headerStyle}>Date</th>
                    <th style={headerStyle}>Score</th>
                    <th style={headerStyle}>Status</th>
                    <th style={headerStyle}>Top Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analysis.daySummaries.map((day) => (
                    <tr key={day.date} style={{
                      backgroundColor: day.isBlocked ? '#f3f4f6' : 'white',
                    }}>
                      <td style={cellStyle}>{formatDate(day.date)}</td>
                      <td style={cellStyle}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          backgroundColor: getScoreColor(day.score, day.isBlocked),
                          color: 'white',
                          fontWeight: 'bold',
                        }}>
                          {day.score}
                        </span>
                      </td>
                      <td style={cellStyle}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: getRecommendationBg(day.recommendation),
                          color: getRecommendationColor(day.recommendation),
                        }}>
                          {day.isBlocked ? '🚫 BLOCKED' : day.recommendation}
                        </span>
                      </td>
                      <td style={cellStyle}>
                        {day.isBlocked ? (
                          <span style={{ color: '#6b7280', fontStyle: 'italic' }}>
                            {day.blockReason}
                          </span>
                        ) : day.reasons.length > 0 ? (
                          <span>
                            {day.reasons[0].reason}
                            <span style={{
                              marginLeft: '8px',
                              color: day.reasons[0].impact < 0 ? '#ef4444' : '#10b981',
                              fontWeight: 'bold',
                            }}>
                              {day.reasons[0].impact > 0 ? '+' : ''}{day.reasons[0].impact}
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>No major events</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Metadata */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#6b7280',
          }}>
            <div>📊 CSV Events: {result.analysis.metadata.csvEventsCount}</div>
            <div>🏏 Sports Events: {result.analysis.metadata.sportsEventsCount}</div>
            <div>📅 Calendar Events: {result.analysis.metadata.calendarEventsCount}</div>
            <div>⚡ Compute Time: {result.analysis.metadata.computeTimeMs}ms</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const StatCard = ({ label, value, color }) => (
  <div style={{
    padding: '16px',
    backgroundColor: 'white',
    border: `2px solid ${color}`,
    borderRadius: '8px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value}</div>
    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>{label}</div>
  </div>
);

// Helper Functions
const formatDate = (dateISO) => {
  const date = new Date(dateISO);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const getScoreColor = (score, isBlocked) => {
  if (isBlocked) return '#6b7280';
  if (score >= 65) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
};

const getRecommendationBg = (rec) => {
  const colors = {
    Good: '#d1fae5',
    Okay: '#fef3c7',
    Avoid: '#fee2e2',
    Blocked: '#f3f4f6',
  };
  return colors[rec] || '#f3f4f6';
};

const getRecommendationColor = (rec) => {
  const colors = {
    Good: '#065f46',
    Okay: '#92400e',
    Avoid: '#991b1b',
    Blocked: '#6b7280',
  };
  return colors[rec] || '#6b7280';
};

const headerStyle = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '2px solid #e5e7eb',
  fontWeight: '600',
  color: '#374151',
};

const cellStyle = {
  padding: '12px',
  borderBottom: '1px solid #e5e7eb',
};

export default ReleaseIntelligenceDemo;
