import React from 'react';
import GlassCard from '../components/common/GlassCard';
import Sparkline from '../components/widgets/Sparkline';
import RadialGauge from '../components/widgets/RadialGauge';
import NeonGridPanel from '../components/neon/NeonGridPanel';

export default function Home() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Cobertura geofísica</div>
        <div className="text-2xl font-semibold text-white">78%</div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-white/60 text-xs">mag/radio/AEM/MT/IP</span>
          <Sparkline />
        </div>
      </GlassCard>
      <RadialGauge value={0.84} label="PR-AUC (CV espacial)" />
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Targets A/B/C</div>
        <div className="text-2xl font-semibold text-white">12 / 23 / 48</div>
        <div className="mt-2 text-white/60 text-xs">Último gate: +3 A, +7 B</div>
      </GlassCard>
      <div className="xl:col-span-2">
        <NeonGridPanel title="Heatmap prospectividad (0–100 m)" height={300} />
      </div>
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Timeline de Gates</div>
        <div className="mt-3 space-y-3">
          {[
            { m: 'Preparación', s: 'verde' },
            { m: 'Revisión', s: 'ámbar' },
            { m: 'Decisión', s: 'rojo' },
          ].map((x, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="text-white/80">{x.m}</div>
              <span
                className={
                  'text-xs px-2 py-0.5 rounded-full ' +
                  (x.s === 'verde'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : x.s === 'ámbar'
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-red-500/20 text-red-300')
                }
              >
                {x.s.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
