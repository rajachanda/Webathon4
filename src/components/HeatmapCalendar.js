import React from 'react';
import './HeatmapCalendar.css';

/**
 * Heatmap Calendar for Release Window Analysis
 * Displays dates with color-coded risk levels and hover tooltips
 */
const HeatmapCalendar = ({ dateAnalysis, onDateSelect }) => {
  if (!dateAnalysis || dateAnalysis.length === 0) {
    return (
      <div className="heatmap-empty">
        <p>Set date range and click "Analyze Windows" to see the heatmap.</p>
      </div>
    );
  }

  // Group dates by month for better display
  const groupedByMonth = dateAnalysis.reduce((acc, item) => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(item);
    return acc;
  }, {});

  return (
    <div className="heatmap-calendar">
      {Object.entries(groupedByMonth).map(([monthKey, dates]) => {
        const firstDate = new Date(dates[0].date);
        const monthName = firstDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        return (
          <div key={monthKey} className="heatmap-month">
            <h4 className="heatmap-month-title">{monthName}</h4>
            <div className="heatmap-grid">
              {dates.map((item) => (
                <HeatmapDateCell
                  key={item.date}
                  dateItem={item}
                  onSelect={onDateSelect}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HeatmapDateCell = ({ dateItem, onSelect }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const dateObj = new Date(dateItem.date);
  const dayNum = dateObj.getDate();

  const handleClick = () => {
    if (onSelect) {
      onSelect(dateItem);
    }
  };

  return (
    <div
      className={`heatmap-cell heatmap-cell--${dateItem.riskColor}`}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="heatmap-cell-day">{dayNum}</div>
      <div className="heatmap-cell-dow">{dateItem.dayOfWeek}</div>

      {showTooltip && (
        <div className="heatmap-tooltip">
          <div className="tooltip-header">
            <strong>{dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
            <span className={`tooltip-score tooltip-score--${dateItem.riskColor}`}>
              Score: {Math.round(dateItem.scoreNumeric)}/100
            </span>
          </div>

          {/* Competing Movies Section (from CSV) */}
          {dateItem.competingMovies && dateItem.competingMovies.length > 0 && (
            <div className="tooltip-section" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '8px' }}>
              <div className="tooltip-section-title" style={{ color: '#f59e0b', fontWeight: 600 }}>🎬 Competing Releases ({dateItem.competingMovies.length}):</div>
              <div style={{ marginTop: '6px' }}>
                {dateItem.competingMovies.map((movie, idx) => (
                  <div key={idx} style={{ 
                    padding: '6px 8px', 
                    marginBottom: '4px', 
                    background: 'rgba(0,0,0,0.3)', 
                    borderRadius: '4px',
                    borderLeft: movie.external_buzz_score > 65 ? '3px solid #ef4444' : '3px solid #6b7280'
                  }}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>
                      {movie.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Buzz: {movie.external_buzz_score || 'N/A'}</span>
                      <span>•</span>
                      <span>{movie.language || 'Unknown'}</span>
                      {movie.scale && (
                        <>
                          <span>•</span>
                          <span style={{ textTransform: 'capitalize' }}>{movie.scale}</span>
                        </>
                      )}
                      {movie.genre && (
                        <>
                          <span>•</span>
                          <span>{movie.genre}</span>
                        </>
                      )}
                    </div>
                    {movie.target_clusters && movie.target_clusters.length > 0 && (
                      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '3px' }}>
                        Target: {movie.target_clusters.join(', ').replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events/Holidays Section */}
          {dateItem.events && dateItem.events.length > 0 && (
            <div className="tooltip-section" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '8px' }}>
              <div className="tooltip-section-title" style={{ color: '#a78bfa', fontWeight: 600 }}>
                📅 Events & Holidays ({dateItem.events.length}):
              </div>
              <div style={{ marginTop: '6px' }}>
                {dateItem.events.map((event, idx) => {
                  const isPositive = dateItem.eventImpact > 0;
                  const isNegative = dateItem.eventImpact < 0;
                  const borderColor = isPositive ? '#4ade80' : isNegative ? '#ef4444' : '#6b7280';
                  const eventIcon = getEventIcon(event.type);
                  
                  return (
                    <div key={idx} style={{ 
                      padding: '6px 8px', 
                      marginBottom: '4px', 
                      background: 'rgba(0,0,0,0.3)', 
                      borderRadius: '4px',
                      borderLeft: `3px solid ${borderColor}`
                    }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>
                        {eventIcon} {event.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        <span style={{ textTransform: 'capitalize' }}>{event.type?.replace(/_/g, ' ')}</span>
                        {event.region && event.region !== 'National' && (
                          <>
                            <span> • </span>
                            <span>{event.region}</span>
                          </>
                        )}
                        {dateItem.eventImpact !== 0 && (
                          <>
                            <span> • </span>
                            <span style={{ color: isPositive ? '#4ade80' : isNegative ? '#ef4444' : '#9ca3af' }}>
                              {isPositive ? '+' : ''}{dateItem.eventImpact}% impact
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dateItem.pros && dateItem.pros.length > 0 && (
            <div className="tooltip-section">
              <div className="tooltip-section-title">✓ Pros:</div>
              <ul>
                {dateItem.pros.map((pro, idx) => (
                  <li key={idx}>{pro}</li>
                ))}
              </ul>
            </div>
          )}

          {dateItem.cons && dateItem.cons.length > 0 && (
            <div className="tooltip-section">
              <div className="tooltip-section-title">⚠ Cons:</div>
              <ul>
                {dateItem.cons.map((con, idx) => (
                  <li key={idx}>{con}</li>
                ))}
              </ul>
            </div>
          )}

          {dateItem.expectedBuzzDelta !== undefined && dateItem.expectedBuzzDelta !== 0 && (
            <div className="tooltip-buzz">
              <strong>Buzz:</strong> {dateItem.expectedBuzzDelta > 0 ? '+' : ''}{dateItem.expectedBuzzDelta}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Helper function to get icon for event type
 */
function getEventIcon(eventType) {
  const icons = {
    'HOLIDAY': '🏛️',
    'FESTIVAL': '🎉',
    'EXAM_FINAL': '📚',
    'BOARD_EXAM': '📝',
    'ENTRANCE_EXAM': '📖',
    'EXAM_PERIOD': '📚',
    'UNIVERSITY_EXAM': '🎓',
    'SPORTS': '🏏',
    'SCHOOL_VACATION': '🏖️',
    'SCHOOL_BREAK': '🏖️',
    'HARVEST': '🌾',
    'RURAL_FAIR': '🎪',
    'CORPORATE_BUSY': '💼',
    'CULTURAL': '🎭',
    'INFORMAL': '💝',
    'WEATHER': '🌧️',
  };
  return icons[eventType] || '📅';
}

export default HeatmapCalendar;
