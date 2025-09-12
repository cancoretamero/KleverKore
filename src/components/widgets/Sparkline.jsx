import React from 'react';

export default function Sparkline({ data = [2, 3, 4, 3, 5, 6, 5, 7], width = 120, height = 36, color = '#67e8f9' }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((value, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((value - min) / ((max - min) || 1)) * height;
    return [x, y];
  });
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  return (
    <svg width={width} height={height}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}
