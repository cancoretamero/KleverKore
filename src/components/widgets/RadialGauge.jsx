import React from 'react';
import GlassCard from '../common/GlassCard';
import { brand } from '../../theme/brand';

export default function RadialGauge({ value = 0.76, size = 120, label = 'PR-AUC' }) {
  const radius = size * 0.38;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value));
  const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;

  return (
    <GlassCard className="p-4 relative">
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={brand.neonCyan} />
            <stop offset="100%" stopColor={brand.neonOrange} />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#gauge)"
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={dashArray}
          transform={`rotate(-90 ${center} ${center})`}
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold text-white">{pct.toFixed(2)}</div>
        <div className="text-white/60 text-xs mt-1">{label}</div>
      </div>
    </GlassCard>
  );
}
