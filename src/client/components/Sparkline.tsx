import React from 'react';

export function Sparkline(props: { data: number[]; width?: number; height?: number; color?: string }) {
  const { data, width = 60, height = 20, color = 'var(--text-color)' } = props;

  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line x1="0" y1={height} x2={width} y2={height} stroke={color} strokeWidth="1" opacity="0.3" />
      </svg>
    );
  }

  const max = Math.max(...data, 1); // Avoid division by zero
  const min = Math.min(...data, 0); // usually we want baseline 0
  const range = max - min;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width || 0;
      const y = height - ((val - min) / (range || 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="sparkline">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
