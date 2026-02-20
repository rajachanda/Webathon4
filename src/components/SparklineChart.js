import React from 'react';
import './SparklineChart.css';

const SparklineChart = ({ data = [], width = 200, height = 50, color = '#00ff88' }) => {
  if (!data || data.length < 2) {
    return <div className="sparkline-empty">No data</div>;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padX = 4;
  const padY = 4;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * (width - padX * 2);
    const y = height - padY - ((v - min) / range) * (height - padY * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Area fill
  const areaPoints =
    `${padX},${height - padY} ` + polyline + ` ${width - padX},${height - padY}`;

  return (
    <svg
      className="sparkline-svg"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default SparklineChart;
