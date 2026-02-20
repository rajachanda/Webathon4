import React from 'react';
import './CalendarStrip.css';

const riskMeta = {
  Favorable: { color: '#00ff88', bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.3)' },
  Neutral:   { color: '#ffa028', bg: 'rgba(255,160,40,0.1)', border: 'rgba(255,160,40,0.3)' },
  Risky:     { color: '#ff5050', bg: 'rgba(255,80,80,0.1)',  border: 'rgba(255,80,80,0.3)' },
};

const CalendarStrip = ({ windows = [] }) => {
  if (!windows.length) {
    return <p className="calendar-empty">No release windows analysed yet.</p>;
  }

  return (
    <div className="calendar-strip">
      {windows.map((w, i) => {
        const meta = riskMeta[w.risk_level] || riskMeta.Neutral;
        return (
          <div
            key={w.id || i}
            className="calendar-row"
            style={{ borderLeft: `4px solid ${meta.color}`, background: meta.bg }}
          >
            <div className="calendar-label" style={{ color: meta.color }}>
              {w.label} — <span style={{ color: meta.color }}>{w.risk_level}</span>
            </div>
            <div className="calendar-dates">
              {w.start_date} → {w.end_date}
            </div>
            {(w.pros || w.cons) && (
              <div className="calendar-detail">
                {w.pros && <span className="cal-pros">✓ {w.pros}</span>}
                {w.cons && <span className="cal-cons">✗ {w.cons}</span>}
              </div>
            )}
            {w.explanation && (
              <p className="calendar-explanation">{w.explanation}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CalendarStrip;
