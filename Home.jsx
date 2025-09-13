import React, { useState, useEffect, useRef, useMemo } from 'react';
// Import the interactive 3D canvas component. This component renders a point
// cloud terrain with colour coded anomalies and an overlay HUD. It is used
// below to give the home page a truly immersive volume view in the geospatial
// band. If you modify or move this component, update the import path
// accordingly. See `src/components/mining/MiningPointCloudCanvas.jsx`.
import MiningPointCloudCanvas from '../components/mining/MiningPointCloudCanvas';

/*
 * KleverKore — Home dashboard (next‑generation)
 *
 * This module implements an immersive, data‑rich landing page for the mining AI platform.
 * The design follows a five‑band layout inspired by mission control: a header with global
 * context and KPIs; a geospatial canvas combining 2D and 3D views; an evidence panel
 * showing signals, explanations, calibration and DOI coverage; an actions band for
 * operators and AI; and a timeline band tracking gates and key events. All widgets
 * live inside glassmorphism containers with a dark, anthracite backdrop and subtle
 * neon highlights. Dummy values are provided throughout; replace them with real
 * data sources when connecting to back‑end services. The code is self‑contained,
 * defining helper components such as GlassCard, Sparkline, RadialGauge and a
 * NeonGridPanel so it does not rely on external component files.
 */

/* --------------------------------------------------------------------------
 * Helper components
 *
 * These generic components implement common UI primitives used throughout
 * the dashboard: glass panels, tiny line charts, circular gauges, heatmap
 * canvases and distribution bars. They could be extracted into a common
 * components library if desired.
 */

// A translucent container with rounded corners, border and blur. Accepts
// arbitrary children and an optional additional className. Tailwind utility
// classes are used for styling.
function GlassCard({ children, className = '' }) {
  return (
    <div
      className={
        'rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-lg ' +
        className
      }
    >
      {children}
    </div>
  );
}

// Simple sparkline chart drawn as an SVG polyline. Accepts an array of
// numbers and optional width/height/stroke colour. Values are normalised
// into the available height.
function Sparkline({ data = [2, 3, 4, 3, 5, 6, 5, 7], width = 140, height = 36, stroke = '#67e8f9' }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / ((max - min) || 1)) * height;
    return [x, y];
  });
  const d = points
    .map((p, i) => {
      return i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

// Circular radial gauge. Renders an underlying grey ring and a coloured arc
// representing the percentage (0–1). Includes a centre label for the value
// and a secondary label underneath. Accepts optional size and gradient colours.
function RadialGauge({ value = 0.5, label = '', size = 120, startColor = '#67e8f9', endColor = '#ff9a62' }) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const dash = `${C * pct} ${C * (1 - pct)}`;
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="url(#gaugeGrad)"
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={dash}
          transform={`rotate(-90 ${cx} ${cy})`}
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold text-white">{(pct * 100).toFixed(0)}%</div>
        {label && <div className="text-white/60 text-xs mt-1">{label}</div>}
      </div>
    </div>
  );
}

// Animated neon heatmap canvas. Uses a canvas to draw a grid with subtle
// pulsing blobs. Accepts a title and height. Implements auto‑resize using
// a resize observer to maintain crisp rendering on retina displays. This
// component is reused for both 2D and 3D previews.
function NeonGridPanel({ title = 'Mapa/Volumen (mock)', height = 360 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    // Resize canvas to device pixel ratio
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    function draw(t) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      // Draw a dark grid
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
      const time = (t || 0) * 0.001;
      // Draw pulsing blobs
      const centers = [
        [w * 0.25, h * 0.5],
        [w * 0.6, h * 0.4],
        [w * 0.75, h * 0.65],
        [w * 0.4, h * 0.75],
      ];
      centers.forEach((c0, i) => {
        const radius = 80 + 20 * Math.sin(time * 2 + i);
        const [x0, y0] = c0;
        const grad = ctx.createRadialGradient(x0, y0, 0, x0, y0, radius);
        grad.addColorStop(0.0, 'rgba(255,150,80,0.9)');
        grad.addColorStop(0.5, 'rgba(255,150,80,0.4)');
        grad.addColorStop(0.8, 'rgba(90,170,255,0.2)');
        grad.addColorStop(1.0, 'rgba(90,170,255,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x0, y0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      });
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return (
    <GlassCard>
      <div className="px-3 py-2 text-xs text-white/80 flex items-center justify-between border-b border-white/10">
        {title}
      </div>
      <div style={{ height }} className="relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute bottom-2 right-2 text-[10px] text-white/60 bg-black/30 backdrop-blur px-2 py-1 rounded">
          Arrastra • Zoom
        </div>
      </div>
    </GlassCard>
  );
}

// Horizontal stacked bar used for distributions (e.g. deposit styles, ingestion status).
function StackedBar({ data = [] }) {
  const total = data.reduce((sum, seg) => sum + seg.value, 0);
  return (
    <div className="w-full h-3 flex rounded-full overflow-hidden">
      {data.map((seg, idx) => (
        <div
          key={idx}
          style={{ flex: seg.value || 0, backgroundColor: seg.color }}
          className="h-full"
        />
      ))}
    </div>
  );
}

// List of KPIs; each entry shows a coloured bullet, label and value.
function KPIList({ items = [] }) {
  return (
    <ul className="space-y-1">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-center text-[11px] text-white/80">
          <span
            className="inline-block w-2 h-2 mr-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="mr-auto">{item.label}</span>
          <span className="font-semibold text-white">{item.value}</span>
          {item.suffix && <span className="ml-1 text-white/60">{item.suffix}</span>}
        </li>
      ))}
    </ul>
  );
}

// Panel summarising multiple signal measurements using radial gauges. Accepts
// an array of signals where each element has { label, value, startColor, endColor }.
function SignalsPanel({ signals = [] }) {
  return (
    <GlassCard className="p-4 space-y-4">
      <div className="text-white/80 font-medium mb-2">Señal del subsuelo</div>
      <div className="grid grid-cols-2 gap-4">
        {signals.map((sig, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <RadialGauge
              value={sig.value}
              label={sig.label}
              size={80}
              startColor={sig.startColor}
              endColor={sig.endColor}
            />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// Panel visualising SHAP‑like feature contributions. Bars extend left/right
// depending on sign. Accepts an array of { name, value, color }. Positive values
// push probability upwards; negatives reduce it.
function ExplanationPanel({ features = [] }) {
  // Compute max absolute value for normalisation
  const maxAbs = Math.max(...features.map((f) => Math.abs(f.value)), 1);
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-white/80 font-medium mb-1">Explicación local (SHAP)</div>
      {features.map((f, idx) => {
        const widthPct = (Math.abs(f.value) / maxAbs) * 100;
        return (
          <div key={idx} className="flex items-center space-x-2 text-xs text-white/80">
            <span className="w-20 truncate">{f.name}</span>
            <div className="flex-1 h-2 relative bg-white/10 rounded">
              <div
                className={`absolute top-0 h-full rounded ${f.value >= 0 ? 'bg-amber-500/60' : 'bg-sky-500/60'}`}
                style={{ left: f.value < 0 ? `${50 - widthPct}%` : '50%', width: `${widthPct}%`, transform: f.value < 0 ? 'translateX(0)' : 'translateX(0)' }}
              ></div>
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20"></div>
            </div>
            <span className="w-10 text-right font-mono text-white">{(f.value * 100).toFixed(0)}%</span>
          </div>
        );
      })}
    </GlassCard>
  );
}

// Panel for calibration and reliability metrics. Shows radial gauges for PR‑AUC,
// inverted Brier score and reliability (1 – ECE). Also includes a mini sparkline
// to illustrate calibration variation.
function CalibrationPanel({ quality }) {
  const { prAuc = 0.92, brier = 0.08, ece = 0.05 } = quality || {};
  return (
    <GlassCard className="p-4 space-y-4">
      <div className="text-white/80 font-medium mb-1">Calidad del modelo</div>
      <div className="grid grid-cols-3 gap-2">
        <RadialGauge value={prAuc} label="PR-AUC" size={70} startColor="#10b981" endColor="#4ade80" />
        <RadialGauge value={1 - brier} label="1 - Brier" size={70} startColor="#f97316" endColor="#fb923c" />
        <RadialGauge value={1 - ece} label="Fiabilidad" size={70} startColor="#60a5fa" endColor="#3b82f6" />
      </div>
      <div className="text-[10px] text-white/60">ECE: {(ece * 100).toFixed(1)}% &nbsp;·&nbsp; Brier: {(brier * 100).toFixed(1)}%</div>
    </GlassCard>
  );
}

// Panel for DOI coverage: shows coverage per method using radial gauges.
function DOIPanel({ doiData = [] }) {
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-white/80 font-medium mb-1">Cobertura DOI</div>
      <div className="grid grid-cols-2 gap-3">
        {doiData.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <RadialGauge
              value={item.coverage}
              label={item.label}
              size={70}
              startColor="#a855f7"
              endColor="#c084fc"
            />
            <div className="text-[10px] text-white/60 mt-1">{Math.round(item.coverage * 100)}% dentro</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Advanced dashboard widgets
//
// The following widgets elevate the home page into a futuristic command
// centre. They display coverage alongside signal‑to‑noise ratios, aggregate
// prospectivity and its uncertainty, environmental impact metrics and a
// breakdown of targets and wells. Each card is built on a GlassCard and
// accepts simple props so that real data can be wired in later.

// Coverage & SNR card: lists each geophysical method with its coverage and
// signal‑to‑noise ratio. Two mini bars are shown per method: the left bar
// reflects the proportion of the district covered by the method; the right
// bar reflects the median SNR for that method. Colours are inherited from
// the data definition. Replace the data or augment with tooltips as needed.
function CoverageSNRCard({ data = [] }) {
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Cobertura &amp; SNR</div>
      <ul className="space-y-2 text-xs text-white/80">
        {data.map((item, idx) => (
          <li key={idx} className="flex items-center">
            <span className="w-20 truncate">{item.label}</span>
            <div className="flex-1 flex items-center space-x-1 ml-2">
              <div className="relative h-1 w-full bg-white/10 rounded">
                <div
                  className="absolute top-0 left-0 h-full rounded"
                  style={{ width: `${item.value * 100}%`, backgroundColor: item.color }}
                ></div>
              </div>
              <div className="relative h-1 w-full bg-white/10 rounded">
                <div
                  className="absolute top-0 left-0 h-full rounded"
                  style={{ width: `${item.snr * 100}%`, backgroundColor: item.color }}
                ></div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="text-[9px] text-white/50 mt-1 flex justify-between">
        <span>Cobertura</span>
        <span>SNR</span>
      </div>
    </GlassCard>
  );
}

// Prospectivity & Uncertainty card: shows the mean prospectivity as a radial
// gauge and the uncertainty as a vertical bar. This widget helps highlight
// areas where the model is confident and where more data is needed.
function ProspectivityCard({ mean = 0.74, sigma = 0.2 }) {
  return (
    <GlassCard className="p-4 flex flex-col justify-between">
      <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Prospectividad &amp; Incertidumbre</div>
      <div className="flex items-center justify-between mt-2">
        <RadialGauge value={mean} label="P (media)" size={70} startColor="#34d399" endColor="#10b981" />
        <div className="flex flex-col items-center ml-4">
          <div className="w-1.5 h-20 rounded-full bg-white/10 relative">
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t"
              style={{ height: `${Math.min(sigma, 1) * 100}%`, backgroundColor: '#60a5fa' }}
            ></div>
          </div>
          <div className="text-[10px] text-white/60 mt-1">σ {(sigma * 100).toFixed(1)}%</div>
        </div>
      </div>
    </GlassCard>
  );
}

// Impact card: summarises the environmental and operational benefits of the
// exploration programme. Displays counters for metres saved, pads avoided
// and CO₂ saved. Add more metrics or spark lines as required.
function ImpactCard({ impact = {} }) {
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Impacto</div>
      <div className="space-y-1 text-sm text-white/80">
        <div>Metros ahorrados: <span className="font-semibold text-white">{impact.metersSaved}</span></div>
        <div>Pads evitados: <span className="font-semibold text-white">{impact.padsSaved}</span></div>
        <div>CO₂ evitado: <span className="font-semibold text-white">{impact.co2Saved}</span> kg</div>
      </div>
    </GlassCard>
  );
}

// Targets and wells card: provides a quick overview of target classes and
// drilling progress. Uses stacked bars for class distribution and wells
// status. The numbers are displayed below the bars for context.
function TargetsCard({ targets = {}, wells = {} }) {
  const totalTargets = (targets.A || 0) + (targets.B || 0) + (targets.C || 0);
  const barTargets = [
    { value: targets.A || 0, color: '#34d399' },
    { value: targets.B || 0, color: '#f97316' },
    { value: targets.C || 0, color: '#60a5fa' },
  ];
  const executed = wells.executed || 0;
  const proposed = wells.proposed || 0;
  const pending = Math.max(proposed - executed, 0);
  const barWells = [
    { value: executed, color: '#6ee7b7' },
    { value: pending, color: '#a78bfa' },
  ];
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Targets &amp; Pozos</div>
      <div className="text-sm text-white/80">Total targets: <span className="font-semibold text-white">{totalTargets}</span></div>
      <StackedBar data={barTargets} />
      <div className="mt-1 flex justify-between text-[11px] text-white/60">
        <span>A: {targets.A}</span>
        <span>B: {targets.B}</span>
        <span>C: {targets.C}</span>
      </div>
      <div className="mt-2 text-sm text-white/80">Pozos: <span className="font-semibold text-white">{proposed}</span> (Ejecutados: {executed}, Pendientes: {pending})</div>
      <StackedBar data={barWells} />
      <div className="mt-1 flex justify-between text-[11px] text-white/60">
        <span>Ejecutados: {executed}</span>
        <span>Pendientes: {pending}</span>
      </div>
    </GlassCard>
  );
}

// Panel listing actions (human or AI). Each item shows an icon and text.
function ActionsPanel({ title, actions = [] }) {
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-white/80 font-medium mb-1">{title}</div>
      <ul className="space-y-1 text-white/80 text-sm">
        {actions.map((act, idx) => (
          <li key={idx} className="flex items-start space-x-2">
            <span className="text-lg leading-none">{act.icon}</span>
            <span className="flex-1">{act.text}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

// Timeline of events. Each event shows a date, title, description and a coloured
// status chip. Status values: 'completado' (green), 'en curso' (amber), 'pendiente' (red).
function TimelinePanel({ events = [] }) {
  const statusColor = {
    completado: 'bg-emerald-500/20 text-emerald-300',
    'en curso': 'bg-yellow-500/20 text-yellow-300',
    pendiente: 'bg-rose-500/20 text-rose-300',
  };
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-white/80 font-medium mb-1">Timeline &amp; Gate</div>
      <ul className="space-y-3 text-xs text-white/80">
        {events.map((ev, idx) => (
          <li key={idx} className="flex items-start space-x-3">
            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-white/40"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white/90">{ev.title}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] capitalize ${statusColor[ev.status] || ''}`}
                >
                  {ev.status}
                </span>
              </div>
              <div className="text-white/60 text-[10px]">{ev.date}</div>
              <div className="text-white/70 text-[11px] mt-0.5">{ev.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

/* --------------------------------------------------------------------------
 * Home component
 *
 * The main React function for the home page. Defines sample data for all
 * widgets and composes the layout using CSS Grid. Replace the dummy numbers
 * with live metrics once connected to your backend.
 */
export default function Home() {
  // Global context
  const version = 'v1.4_gate3';
  const filters = { depth: 50, styles: ['Carlin', 'Epitermal', 'Pórfido'], subzone: 'Corredor A' };

  // Coverage by method (dummy values between 0–1)
  const coverage = [
    { label: 'Magnetometría', value: 1.0, color: '#f97316' },
    { label: 'Radiometría', value: 0.95, color: '#ef4444' },
    { label: 'AEM/ZTEM', value: 0.92, color: '#34d399' },
    { label: 'MT/CSAMT', value: 0.68, color: '#60a5fa' },
    { label: 'IP/Resistividad', value: 0.72, color: '#9333ea' },
    { label: 'HSI satelital', value: 0.98, color: '#fde047' },
    { label: 'ANT sísmica', value: 0.85, color: '#f472b6' },
  ];
  // For each method, define a dummy signal-to-noise ratio (SNR). This dataset
  // is used in the Coverage & SNR card below. Adjust these values to reflect
  // the median SNR per method.
  const coverageSnr = [
    { label: 'Magnetometría', value: 1.0, snr: 0.80, color: '#f97316' },
    { label: 'Radiometría', value: 0.95, snr: 0.78, color: '#ef4444' },
    { label: 'AEM/ZTEM', value: 0.92, snr: 0.82, color: '#34d399' },
    { label: 'MT/CSAMT', value: 0.68, snr: 0.60, color: '#60a5fa' },
    { label: 'IP/Resistividad', value: 0.72, snr: 0.65, color: '#9333ea' },
    { label: 'HSI satelital', value: 0.98, snr: 0.92, color: '#fde047' },
    { label: 'ANT sísmica', value: 0.85, snr: 0.75, color: '#f472b6' },
  ];
  // Model quality metrics (PR-AUC global, Brier, ECE, reliability). Values 0–1
  const modelQuality = { prAuc: 0.92, brier: 0.08, ece: 0.05 };
  // Decision inventory and impact metrics
  const inventory = { targets: { A: 12, B: 23, C: 48 }, wellsProposed: 10, wellsExecuted: 4 };
  const impact = { padsSaved: 8, co2Saved: 3200, metersSaved: 1200 };
  // Distribution of deposit styles
  const styleDistribution = [
    { label: 'Carlin', value: 35, color: '#67e8f9' },
    { label: 'Epitermal', value: 25, color: '#f472b6' },
    { label: 'Pórfido', value: 25, color: '#facc15' },
    { label: 'Skarn/IOCG', value: 15, color: '#60a5fa' },
  ];
  // Ingestion and quality statuses
  const ingestionStatus = [
    { label: 'Completado', value: 60, color: '#4ade80' },
    { label: 'Validando', value: 25, color: '#facc15' },
    { label: 'Pendiente', value: 10, color: '#f87171' },
    { label: 'Rechazado', value: 5, color: '#9ca3af' },
  ];
  // Signals for evidence panel
  const signals = [
    { label: 'Resistividad σ', value: 0.7, startColor: '#67e8f9', endColor: '#3b82f6' },
    { label: 'Cargabilidad η', value: 0.6, startColor: '#f97316', endColor: '#fb923c' },
    { label: 'Densidad ρ', value: 0.5, startColor: '#10b981', endColor: '#6ee7b7' },
    { label: 'Magnetismo χ', value: 0.4, startColor: '#9333ea', endColor: '#d8b4fe' },
  ];
  // SHAP feature contributions
  const shapFeatures = [
    { name: 'η alta', value: 0.35 },
    { name: 'σ baja', value: 0.25 },
    { name: 'illita presente', value: 0.2 },
    { name: 'distancia a F2', value: -0.15 },
    { name: 'Vs bajo', value: -0.1 },
  ];
  // DOI coverage per method
  const doiCoverage = [
    { label: 'Mag', coverage: 0.96 },
    { label: 'AEM', coverage: 0.88 },
    { label: 'IP', coverage: 0.74 },
    { label: 'HSI', coverage: 0.99 },
  ];
  // Timeline events
  const timeline = [
    {
      date: '2025-01-10',
      title: 'Ingesta EMIT L1C',
      description: 'Se cargaron 85 tiles; SNR medio 32 dB',
      status: 'completado',
    },
    {
      date: '2025-02-14',
      title: 'Inversión AEM+ZTEM',
      description: 'Cubo ρ/σ v1.3 con DOI 93%',
      status: 'completado',
    },
    {
      date: '2025-03-28',
      title: 'Gate 3',
      description: 'Revisión y decisión final de Gate 3 (4 targets A)',
      status: 'completado',
    },
    {
      date: '2025-04-05',
      title: 'Plan de pozos Gate 3',
      description: 'Se aprobaron 5 pozos (3 scout, 1 step‑out, 1 deep)',
      status: 'completado',
    },
    {
      date: '2025-05-10',
      title: 'Ingesta IP/Res',
      description: 'Lote 2025‑05 (30 km) validado; QF OK',
      status: 'en curso',
    },
    {
      date: '2025-06-15',
      title: 'Inversión MT/CSAMT',
      description: 'Procesando inversión v1.4 (estimado 2 semanas)',
      status: 'pendiente',
    },
    {
      date: '2025-07-20',
      title: 'Gate 4',
      description: 'Preparación para Gate 4 (actual)',
      status: 'pendiente',
    },
  ];
  // Human and AI actions lists
  const humanActions = [
    { icon: '🎯', text: 'Promover a Target: define umbral y segmenta el cuerpo' },
    { icon: '📈', text: 'Solicitar densificación (CSAMT/IP/HSI-UAV) con parámetros predefinidos' },
    { icon: '⚙️', text: 'Ajustar pesos de estilo y visualizar impacto' },
    { icon: '🧪', text: 'Cargar lote de laboratorio con validación QA/QC' },
    { icon: '✍️', text: 'Firmar decisiones y exportar informe QP‑ready' },
  ];
  const aiActions = [
    { icon: '🤖', text: 'Generar plan de pozos (EI/PI) respetando restricciones' },
    { icon: '📊', text: 'Calibrar modelo y publicar nueva versión' },
    { icon: '✨', text: 'Sugerir siguiente mejor acción basado en impacto/costo' },
    { icon: '🧠', text: 'Re‑entrenar modelo con nuevos datos (active learning)' },
    { icon: '📤', text: 'Compilar informe QP‑ready con anexos automáticos' },
  ];
  // Top anomalies for ranking
  const anomalies = [
    { id: 'A1', score: 0.91 },
    { id: 'A2', score: 0.84 },
    { id: 'A3', score: 0.78 },
    { id: 'B1', score: 0.70 },
    { id: 'C1', score: 0.65 },
  ];

  // Mean prospectivity and uncertainty for the district. These values are
  // placeholders and should be computed from the underlying probabilistic
  // model once available. The ProspectivityCard uses them to display a gauge
  // and a vertical uncertainty bar.
  const meanProspectivity = 0.74;
  const meanUncertainty = 0.18;

  // Compute coverage summary (average coverage)
  const averageCoverage = useMemo(() => {
    const sum = coverage.reduce((acc, m) => acc + m.value, 0);
    return sum / coverage.length;
  }, [coverage]);

  // Build KPI items for deposit styles and ingestion status (for KPIList)
  const styleKpis = styleDistribution.map((d) => ({ label: d.label, value: `${d.value}%`, color: d.color }));
  const ingestionKpis = ingestionStatus.map((d) => ({ label: d.label, value: `${d.value}%`, color: d.color }));

  return (
    <div className="flex flex-col gap-6">
      {/* Band 1: Header and high‑level KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Version and filters card */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Versión</div>
            <div className="text-lg font-semibold text-white mb-2">{version}</div>
            <div className="text-xs text-white/60 mb-1">Filtros</div>
            <div className="space-y-1 text-[11px] text-white/80">
              <div>Profundidad: <span className="font-semibold text-white">{filters.depth} m</span></div>
              <div>Estilos: <span className="font-semibold text-white">{filters.styles.join(', ')}</span></div>
              <div>Subzona: <span className="font-semibold text-white">{filters.subzone}</span></div>
            </div>
          </div>
            <div className="mt-4">
              <button className="text-xs px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl mr-2 mb-1">Cambiar versión</button>
              <button className="text-xs px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl mb-1">Exportar Deck</button>
            </div>
        </GlassCard>
        {/* Coverage card */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Cobertura datos (métodos)</div>
            <div className="text-3xl font-semibold text-white">{Math.round(averageCoverage * 100)}%</div>
            <div className="mt-1 text-xs text-white/60">Promedio</div>
          </div>
          <div className="mt-4">
            <KPIList items={coverage.map((m) => ({ label: m.label, value: `${Math.round(m.value * 100)}%`, color: m.color }))} />
          </div>
        </GlassCard>
        {/* Model quality card */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Calidad global</div>
          <div className="flex items-center space-x-4">
            <RadialGauge value={modelQuality.prAuc} label="PR-AUC" size={70} startColor="#10b981" endColor="#4ade80" />
            <RadialGauge value={1 - modelQuality.brier} label="1 - Brier" size={70} startColor="#f97316" endColor="#fb923c" />
            <RadialGauge value={1 - modelQuality.ece} label="Fiabilidad" size={70} startColor="#60a5fa" endColor="#3b82f6" />
          </div>
          <div className="mt-2 text-[10px] text-white/60">Brier: {(modelQuality.brier * 100).toFixed(1)}% &nbsp;·&nbsp; ECE: {(modelQuality.ece * 100).toFixed(1)}%</div>
        </GlassCard>
        {/* Inventory & impact card */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Inventario & Impacto</div>
          <div className="space-y-1 text-sm text-white/80">
            <div>Targets: <span className="font-semibold text-white">{inventory.targets.A + inventory.targets.B + inventory.targets.C}</span> (A: {inventory.targets.A}, B: {inventory.targets.B}, C: {inventory.targets.C})</div>
            <div>Pozos propuestos: <span className="font-semibold text-white">{inventory.wellsProposed}</span> &nbsp;·&nbsp; Ejecutados: <span className="font-semibold text-white">{inventory.wellsExecuted}</span></div>
            <div>Metros ahorrados: <span className="font-semibold text-white">{impact.metersSaved}</span></div>
            <div>Pads evitados: <span className="font-semibold text-white">{impact.padsSaved}</span></div>
            <div>CO₂ evitado: <span className="font-semibold text-white">{impact.co2Saved}</span> kg</div>
          </div>
        </GlassCard>
      </div>

      {/* Band 2: Geospatial canvas (2D and 3D) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NeonGridPanel title="Mapa prospectividad (0–100 m)" height={360} />
        <NeonGridPanel title="Volumen 3D prospectividad" height={360} />
      </div>

      {/* Band 3: Evidence and explanation panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SignalsPanel signals={signals} />
        <ExplanationPanel features={shapFeatures} />
        <CalibrationPanel quality={modelQuality} />
        <DOIPanel doiData={doiCoverage} />
      </div>

      {/* Band 4: Actions (human vs AI) and style/ingestion distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Human actions */}
        <ActionsPanel title="Acciones humanas" actions={humanActions} />
        {/* AI actions */}
        <ActionsPanel title="Acciones IA" actions={aiActions} />
        {/* Style & ingestion distributions */}
        <GlassCard className="p-4 space-y-4">
          <div>
            <div className="text-white/80 font-medium mb-1">Distribución de estilos</div>
            <StackedBar data={styleDistribution.map((d) => ({ value: d.value, color: d.color }))} />
            <div className="mt-2">
              <KPIList items={styleKpis} />
            </div>
          </div>
          <div>
            <div className="text-white/80 font-medium mt-4 mb-1">Estado de ingesta</div>
            <StackedBar data={ingestionStatus.map((d) => ({ value: d.value, color: d.color }))} />
            <div className="mt-2">
              <KPIList items={ingestionKpis} />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Band 5: Top anomalies and timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-4 space-y-3">
          <div className="text-white/80 font-medium mb-1">Top anomalías</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {anomalies.map((a) => (
              <div key={a.id} className="flex flex-col items-center p-2 rounded-lg bg-white/5">
                <RadialGauge value={a.score} label={a.id} size={70} startColor="#f97316" endColor="#fcd34d" />
                <div className="text-[10px] text-white/60 mt-1">Score {(a.score * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </GlassCard>
        <TimelinePanel events={timeline} />
      </div>
    </div>
  );
}
