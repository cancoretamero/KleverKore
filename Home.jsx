import React from 'react';
import GlassCard from '../components/common/GlassCard';
import Sparkline from '../components/widgets/Sparkline';
import RadialGauge from '../components/widgets/RadialGauge';
import NeonGridPanel from '../components/neon/NeonGridPanel';

// Home page revamped with modern, dark liquid-glass look and many widgets
// Shows multiple KPIs, distribution bars, status bars, anomaly rankings, and interactive map preview

// Helper component: horizontal bar showing distribution of deposit styles
function DistributionBar({ data }) {
  // data: array of { label, color, value } where value is a percentage (0–100)
  const total = data.reduce((sum, seg) => sum + seg.value, 0);
  return (
    <div className="w-full h-3 flex rounded-full overflow-hidden">
      {data.map((seg, idx) => (
        <div
          key={idx}
          style={{ flex: seg.value, backgroundColor: seg.color }}
          className="h-full"
        />
      ))}
    </div>
  );
}

// Helper component: simple horizontal status bar for ingestion statuses
function StatusBar({ data }) {
  return (
    <div className="w-full h-3 flex rounded-full overflow-hidden">
      {data.map((seg, idx) => (
        <div
          key={idx}
          style={{ flex: seg.value, backgroundColor: seg.color }}
          className="h-full"
        />
      ))}
    </div>
  );
}

export default function Home() {
  // Sample data for deposit styles distribution
  const depositDistribution = [
    { label: 'Carlin-like', value: 40, color: '#67e8f9' },
    { label: 'Pórfido', value: 35, color: '#ff9a62' },
    { label: 'Skarn/IOCG', value: 25, color: '#4ade80' },
  ];

  // Sample data for ingestion & quality statuses
  const ingestionStatuses = [
    { label: 'Completado', value: 60, color: '#4ade80' },
    { label: 'Validando', value: 25, color: '#facc15' },
    { label: 'Pendiente', value: 15, color: '#f87171' },
  ];

  // Sample top anomalies list for ranking
  const anomalies = [
    { id: 'A1', score: 0.91 },
    { id: 'A2', score: 0.84 },
    { id: 'A3', score: 0.77 },
    { id: 'A4', score: 0.72 },
    { id: 'B1', score: 0.69 },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-min">
      {/* Row 1: Key KPI cards */}
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Cobertura de datos</div>
        <div className="text-3xl font-semibold text-white">78%</div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-white/60 text-xs">mag/radio/AEM/MT/IP</span>
          <Sparkline />
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Índice prospectivo medio</div>
        <RadialGauge value={0.74} label="P (media)" />
      </GlassCard>

      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Targets detectados</div>
        <div className="text-3xl font-semibold text-white">83</div>
        <div className="mt-2 text-white/60 text-xs">A: 12 · B: 23 · C: 48</div>
        {/* mini distribution bar for classes */}
        <div className="mt-3">
          <DistributionBar
            data={[
              { label: 'A', value: 12, color: '#84cc16' },
              { label: 'B', value: 23, color: '#eab308' },
              { label: 'C', value: 48, color: '#f97316' },
            ]}
          />
          <div className="flex justify-between mt-1 text-[11px] text-white/60">
            <span>A</span>
            <span>B</span>
            <span>C</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Pozos (propuestos / ejecutados)</div>
        <div className="text-3xl font-semibold text-white">15 / 8</div>
        <div className="mt-2 text-white/60 text-xs">Plan 1–3–1 en curso</div>
        <div className="mt-3 w-full h-3 flex rounded-full overflow-hidden">
          <div style={{ flex: 8, backgroundColor: '#22c55e' }} className="h-full" />
          <div style={{ flex: 7, backgroundColor: '#1e40af' }} className="h-full" />
        </div>
        <div className="flex justify-between mt-1 text-[11px] text-white/60">
          <span>Ejecutados</span>
          <span>Propuestos</span>
        </div>
      </GlassCard>

      {/* Row 2: Large map preview and distribution/status cards */}
      <div className="lg:col-span-3 sm:col-span-2 col-span-1">
        <NeonGridPanel
          title="Mapa de prospectividad (0–100 m)"
          height={360}
        />
      </div>

      <GlassCard className="p-4 flex flex-col justify-between">
        <div>
          <div className="text-white/80 font-medium">Distribución de estilos</div>
          <DistributionBar data={depositDistribution} />
          <div className="mt-3 space-y-1 text-[11px] text-white/60">
            {depositDistribution.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span>{d.label}</span>
                <span className="ml-auto">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4 flex flex-col justify-between">
        <div>
          <div className="text-white/80 font-medium">Estado de ingesta & calidad</div>
          <StatusBar data={ingestionStatuses} />
          <div className="mt-3 space-y-1 text-[11px] text-white/60">
            {ingestionStatuses.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.label}</span>
                <span className="ml-auto">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Row 3: Anomalies ranking and timeline */}
      <GlassCard className="p-4 lg:col-span-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="text-white/80 font-medium mb-2">Top anomalías IA</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {anomalies.map((a) => (
                <div key={a.id} className="flex flex-col items-center">
                  <RadialGauge value={a.score} size={80} label={a.id} />
                  <div className="text-white/80 text-xs mt-1">P{Math.round(a.score * 100)}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-4">
            <div className="text-white/80 font-medium mb-2">Timeline de Gates</div>
            {[{ m: 'Preparación', s: 'verde' }, { m: 'Revisión', s: 'ámbar' }, { m: 'Decisión', s: 'rojo' }].map((x, i) => (
              <div key={i} className="flex items-center justify-between py-1">
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
        </div>
      </GlassCard>
    </div>
  );
}
