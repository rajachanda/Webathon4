import React from 'react';
import './GaugeMeter.css';

const getLabel = (score) => {
  if (score >= 70) return { text: 'High', color: '#00ff88' };
  if (score >= 40) return { text: 'Medium', color: '#ffa028' };
  return { text: 'Low', color: '#ff5050' };
};

const GaugeMeter = ({ score = 0 }) => {
  const clamped = Math.max(0, Math.min(100, score));
  const { text, color } = getLabel(clamped);

  // SVG arc math
  const radius = 60;
  const cx = 80;
  const cy = 80;
  const startAngle = 210;   // degrees
  // endAngle = 330 implied by 210 + 300 sweep
  const sweep = (clamped / 100) * 300;

  const toRad = (d) => (d * Math.PI) / 180;
  const arcPoint = (angle) => ({
    x: cx + radius * Math.cos(toRad(angle)),
    y: cy + radius * Math.sin(toRad(angle)),
  });

  const start = arcPoint(startAngle);
  const endFull = arcPoint(startAngle + 300);
  const endFill = arcPoint(startAngle + sweep);

  const bgArc   = `M ${start.x} ${start.y} A ${radius} ${radius} 0 1 1 ${endFull.x} ${endFull.y}`;
  const fillArc = sweep > 0
    ? `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${sweep > 150 ? 1 : 0} 1 ${endFill.x} ${endFill.y}`
    : '';

  return (
    <div className="gauge-wrapper">
      <svg className="gauge-svg" viewBox="0 0 160 120">
        {/* Track */}
        <path d={bgArc} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
        {/* Fill */}
        {fillArc && (
          <path d={fillArc} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
        )}
      </svg>
      <div className="gauge-label">
        <span className="gauge-score" style={{ color }}>{clamped}</span>
        <span className="gauge-max">/ 100</span>
        <span className="gauge-text" style={{ color }}>{text}</span>
      </div>
    </div>
  );
};

export default GaugeMeter;
