import React, { useState, useEffect, useRef, useMemo } from 'react';

/* =========================================================================
   KleverKore — HOME (Mission Control · Liquid-Glass Dark)
   -------------------------------------------------------------------------
   • 5 bandas (Header • Lienzo 2D/3D • Evidencias • Acciones • Timeline)
   • Widgets incluidos en este mismo archivo (no dependencias externas)
   • Todos los datos son MOCK y fáciles de sustituir por reales
   • Estilo: glassmorphism oscuro + acentos neon (cian/naranja)
   ========================================================================= */

/* ------------------------------ GlassCard -------------------------------- */
function GlassCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-lg ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------ Sparkline -------------------------------- */
function Sparkline({ data = [2,3,4,3,5,6,5,7], width = 140, height = 36, stroke = '#67e8f9' }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v,i)=>[
    (i/(data.length-1))*width,
    height - ((v-min)/((max-min)||1))*height
  ]);
  const d = pts.map((p,i)=> i?`L${p[0]},${p[1]}`:`M${p[0]},${p[1]}`).join(' ');
  return <svg width={width} height={height}><path d={d} fill="none" stroke={stroke} strokeWidth="2"/></svg>;
}

/* ------------------------------ RadialGauge ------------------------------ */
function RadialGauge({ value=0.76, label='P', size=100, startColor='#67e8f9', endColor='#ff9a62' }) {
  const r = size*0.38, cx=size/2, cy=size/2, C=2*Math.PI*r;
  const pct = Math.max(0,Math.min(1,value));
  const dash = `${C*pct} ${C*(1-pct)}`;
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={startColor}/><stop offset="100%" stopColor={endColor}/>
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none"/>
        <circle cx={cx} cy={cy} r={r} stroke="url(#gauge)" strokeLinecap="round" strokeWidth="10"
                strokeDasharray={dash} transform={`rotate(-90 ${cx} ${cy})`} fill="none"/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-semibold text-white">{(pct*100).toFixed(0)}%</div>
        <div className="text-[10px] text-white/70">{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------ Heatmap 2D ------------------------------- */
function NeonGridPanel({ title='Mapa/Volumen (mock)', height=360 }) {
  const ref = useRef(null);
  useEffect(()=>{
    const c = ref.current, ctx = c.getContext('2d');
    let raf; const ro = new ResizeObserver(()=>{
      const dpr = window.devicePixelRatio||1; c.width=c.clientWidth*dpr; c.height=c.clientHeight*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    }); ro.observe(c);
    const draw = (t)=>{
      const w=c.clientWidth,h=c.clientHeight; ctx.clearRect(0,0,w,h);
      ctx.strokeStyle='rgba(255,255,255,0.08)'; for(let gx=0;gx<w;gx+=32){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,h);ctx.stroke()}
      for(let gy=0;gy<h;gy+=32){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(w,gy);ctx.stroke()}
      const time=(t||0)*0.001, centers=[[w*0.25,h*0.52],[w*0.60,h*0.42],[w*0.75,h*0.65],[w*0.40,h*0.72]];
      centers.forEach((p,i)=>{const R=70+18*Math.sin(time*2+i); const [x0,y0]=p; const g=ctx.createRadialGradient(x0,y0,0,x0,y0,R);
        g.addColorStop(0,'rgba(255,150,80,0.9)'); g.addColorStop(0.5,'rgba(255,150,80,0.45)'); g.addColorStop(0.8,'rgba(90,170,255,0.2)'); g.addColorStop(1,'rgba(90,170,255,0)');
        ctx.globalCompositeOperation='lighter'; ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x0,y0,R,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over';});
      raf=requestAnimationFrame(draw);
    }; raf=requestAnimationFrame(draw);
    return ()=>{ cancelAnimationFrame(raf); ro.disconnect(); };
  },[]);
  return (
    <GlassCard>
      <div className="px-3 py-2 text-xs text-white/80 flex items-center justify-between border-b border-white/10">{title}</div>
      <div style={{height}} className="relative">
        <canvas ref={ref} className="w-full h-full block"/>
        <div className="absolute bottom-2 right-2 text-[10px] text-white/60 bg-black/30 backdrop-blur px-2 py-1 rounded">Arrastra • Zoom</div>
      </div>
    </GlassCard>
  );
}

/* ------------------------------ StackedBar ------------------------------- */
function StackedBar({ data=[] }) {
  return (
    <div className="w-full h-3 flex rounded-full overflow-hidden">
      {data.map((seg,i)=><div key={i} style={{flex:seg.value, background:seg.color}} className="h-full"/>)}
    </div>
  );
}

/* ------------------------------ KPIList ---------------------------------- */
function KPIList({ items=[] }) {
  return (
    <ul className="space-y-1">
      {items.map((it,i)=>(
        <li key={i} className="flex items-center text-[11px] text-white/80">
          <span className="inline-block w-2 h-2 mr-2 rounded-full" style={{background:it.color}}/>
          <span className="mr-auto">{it.label}</span>
          <span className="font-semibold text-white">{it.value}</span>
          {it.suffix && <span className="ml-1 text-white/60">{it.suffix}</span>}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ Advanced Panels -------------------------- */
function SignalsPanel({ signals=[] }) {
  return (
    <GlassCard className="p-4 space-y-4">
      <div className="text-white/80 font-medium">Señal del subsuelo</div>
      <div className="grid grid-cols-2 gap-4">
        {signals.map((s,i)=>(
          <div key={i} className="flex flex-col items-center">
            <RadialGauge value={s.value} label={s.label} size={80} startColor={s.startColor} endColor={s.endColor}/>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function ExplanationPanel({ features=[] }) {
  const maxAbs = Math.max(...features.map(f=>Math.abs(f.value)),1);
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-white/80 font-medium mb-1">Explicación local (SHAP)</div>
      {features.map((f,i)=>{
        const w = (Math.abs(f.value)/maxAbs)*100;
        return (
          <div key={i} className="flex items-center space-x-2 text-xs text-white/80">
            <span className="w-20 truncate">{f.name}</span>
            <div className="flex-1 h-2 relative bg-white/10 rounded">
              <div className={`absolute top-0 h-full rounded ${f.value>=0?'bg-amber-500/60':'bg-sky-500/60'}`}
                   style={{left:f.value<0?`${50-w}%`:'50%', width:`${w}%`}}/>
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20"/>
            </div>
            <span className="w-10 text-right font-mono text-white">{(f.value*100).toFixed(0)}%</span>
          </div>
        );
      })}
    </GlassCard>
  );
}

function CalibrationPanel({ quality }) {
  const { prAuc=0.92, brier=0.08, ece=0.05 } = quality||{};
  return (
    <GlassCard className="p-4 space-y-3">
      <div className="text-white/80 font-medium">Calidad del modelo</div>
      <div className="grid grid-cols-3 gap-2">
        <RadialGauge value={prAuc} label="PR-AUC" size={70} startColor="#10b981" endColor="#4ade80"/>
        <RadialGauge value={1-brier} label="1 - Brier" size={70} startColor="#f97316" endColor="#fb923c"/>
        <RadialGauge value={1-ece} label="Fiabilidad" size={70} startColor="#60a5fa" endColor="#3b82f6"/>
      </div>
      <div className="text-[10px] text-white/60">ECE: {(ece*100).toFixed(1)}% · Brier: {(brier*100).toFixed(1)}%</div>
    </GlassCard>
  );
}

function DOIPanel({ doiData=[] }) {
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-white/80 font-medium mb-1">Cobertura DOI</div>
      <div className="grid grid-cols-2 gap-3">
        {doiData.map((d,i)=>(
          <div key={i} className="flex flex-col items-center">
            <RadialGauge value={d.coverage} label={d.label} size={70} startColor="#a855f7" endColor="#c084fc"/>
            <div className="text-[10px] text-white/60 mt-1">{Math.round(d.coverage*100)}% dentro</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function CoverageSNRCard({ data=[] }) {
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-xs uppercase tracking-wider text-white/60">Cobertura & SNR</div>
      <ul className="space-y-2 text-xs text-white/80 mt-2">
        {data.map((m,i)=>(
          <li key={i} className="flex items-center">
            <span className="w-24 truncate">{m.label}</span>
            <div className="flex-1 flex items-center space-x-1 ml-2">
              <div className="relative h-1 w-full bg-white/10 rounded"><div className="absolute top-0 left-0 h-full rounded" style={{width:`${m.value*100}%`, background:m.color}}/></div>
              <div className="relative h-1 w-full bg-white/10 rounded"><div className="absolute top-0 left-0 h-full rounded" style={{width:`${m.snr*100}%`, background:m.color}}/></div>
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

function ProspectivityCard({ mean=0.74, sigma=0.18 }) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Prospectividad & Incertidumbre</div>
      <div className="flex items-center justify-between">
        <RadialGauge value={mean} label="P media" size={76} startColor="#34d399" endColor="#10b981"/>
        <div className="flex flex-col items-center ml-4">
          <div className="w-1.5 h-20 rounded-full bg-white/10 relative">
            <div className="absolute bottom-0 left-0 right-0 rounded-t" style={{height:`${Math.min(sigma,1)*100}%`, background:'#60a5fa'}}/>
          </div>
          <div className="text-[10px] text-white/60 mt-1">σ {(sigma*100).toFixed(1)}%</div>
        </div>
      </div>
    </GlassCard>
  );
}

function ImpactCard({ impact }) {
  return (
    <GlassCard className="p-4 space-y-1">
      <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Impacto</div>
      <div className="text-sm text-white/80">Metros ahorrados: <span className="font-semibold text-white">{impact.metersSaved}</span></div>
      <div className="text-sm text-white/80">Pads evitados: <span className="font-semibold text-white">{impact.padsSaved}</span></div>
      <div className="text-sm text-white/80">CO₂ evitado: <span className="font-semibold text-white">{impact.co2Saved}</span> kg</div>
    </GlassCard>
  );
}

function TargetsCard({ targets, wells }) {
  const total = (targets.A||0)+(targets.B||0)+(targets.C||0);
  const barT = [{value:targets.A||0,color:'#34d399'},{value:targets.B||0,color:'#f97316'},{value:targets.C||0,color:'#60a5fa'}];
  const executed = wells.executed||0, proposed=wells.proposed||0, pending=Math.max(proposed-executed,0);
  const barW = [{value:executed,color:'#6ee7b7'},{value:pending,color:'#a78bfa'}];
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-xs uppercase tracking-wider text-white/60">Targets & Pozos</div>
      <div className="text-sm text-white/80">Total targets: <span className="font-semibold text-white">{total}</span></div>
      <StackedBar data={barT}/><div className="flex justify-between text-[11px] text-white/60 mt-1"><span>A:{targets.A}</span><span>B:{targets.B}</span><span>C:{targets.C}</span></div>
      <div className="text-sm text-white/80 mt-2">Pozos: <span className="font-semibold text-white">{proposed}</span> (Ejecutados: {executed}, Pendientes: {pending})</div>
      <StackedBar data={barW}/><div className="flex justify-between text-[11px] text-white/60 mt-1"><span>Ejecutados:{executed}</span><span>Pendientes:{pending}</span></div>
    </GlassCard>
  );
}

function ActionsPanel({ title, actions=[] }) {
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-white/80 font-medium">{title}</div>
      <ul className="space-y-1 text-white/80 text-sm">
        {actions.map((a,i)=>(<li key={i} className="flex items-start space-x-2"><span className="text-lg leading-none">{a.icon}</span><span className="flex-1">{a.text}</span></li>))}
      </ul>
    </GlassCard>
  );
}

function TimelinePanel({ events=[] }) {
  const palette={completado:'bg-emerald-500/20 text-emerald-300','en curso':'bg-yellow-500/20 text-yellow-300',pendiente:'bg-rose-500/20 text-rose-300'};
  return (
    <GlassCard className="p-4 space-y-2">
      <div className="text-white/80 font-medium">Timeline & Gate</div>
      <ul className="space-y-3 text-xs text-white/80">
        {events.map((ev,i)=>(
          <li key={i} className="flex items-start space-x-3">
            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-white/40"/>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white/90">{ev.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] capitalize ${palette[ev.status]||''}`}>{ev.status}</span>
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

/* ------------------------------ HOME ------------------------------------- */
export default function Home() {
  const version='v1.4_gate3';
  const filters={ depth:50, styles:['Carlin','Epitermal','Pórfido'], subzone:'Corredor A' };

  const coverage=[{label:'Magnetometría',value:1.0,color:'#f97316'},{label:'Radiometría',value:0.95,color:'#ef4444'},{label:'AEM/ZTEM',value:0.92,color:'#34d399'},{label:'MT/CSAMT',value:0.68,color:'#60a5fa'},{label:'IP/Res',value:0.72,color:'#9333ea'},{label:'HSI satelital',value:0.98,color:'#fde047'},{label:'ANT sísmica',value:0.85,color:'#f472b6'}];
  const coverageSnr=[{label:'Magnetometría',value:1.0,snr:0.80,color:'#f97316'},{label:'Radiometría',value:0.95,snr:0.78,color:'#ef4444'},{label:'AEM/ZTEM',value:0.92,snr:0.82,color:'#34d399'},{label:'MT/CSAMT',value:0.68,snr:0.60,color:'#60a5fa'},{label:'IP/Res',value:0.72,snr:0.65,color:'#9333ea'},{label:'HSI',value:0.98,snr:0.92,color:'#fde047'},{label:'ANT',value:0.85,snr:0.75,color:'#f472b6'}];
  const modelQuality={prAuc:0.92,brier:0.08,ece:0.05};
  const inventory={targets:{A:12,B:23,C:48},wellsProposed:10,wellsExecuted:4};
  const impact={metersSaved:1200,padsSaved:8,co2Saved:3200};
  const styleDistribution=[{label:'Carlin',value:35,color:'#67e8f9'},{label:'Epitermal',value:25,color:'#f472b6'},{label:'Pórfido',value:25,color:'#facc15'},{label:'Skarn/IOCG',value:15,color:'#60a5fa'}];
  const ingestionStatus=[{label:'Completado',value:60,color:'#4ade80'},{label:'Validando',value:25,color:'#facc15'},{label:'Pendiente',value:10,color:'#f87171'},{label:'Rechazado',value:5,color:'#9ca3af'}];
  const signals=[{label:'Resistividad σ',value:0.70,startColor:'#67e8f9',endColor:'#3b82f6'},{label:'Cargabilidad η',value:0.60,startColor:'#f97316',endColor:'#fb923c'},{label:'Densidad ρ',value:0.50,startColor:'#10b981',endColor:'#6ee7b7'},{label:'Magnetismo χ',value:0.40,startColor:'#9333ea',endColor:'#d8b4fe'}];
  const shapFeatures=[{name:'η alta',value:0.35},{name:'σ baja',value:0.25},{name:'illita presente',value:0.20},{name:'distancia a F2',value:-0.15},{name:'Vs bajo',value:-0.10}];
  const doiCoverage=[{label:'Mag',coverage:0.96},{label:'AEM',coverage:0.88},{label:'IP',coverage:0.74},{label:'HSI',coverage:0.99}];
  const timeline=[{date:'2025-01-10',title:'Ingesta EMIT L1C',description:'85 tiles; SNR medio 32 dB',status:'completado'},{date:'2025-02-14',title:'Inversión AEM+ZTEM',description:'Cubo ρ/σ v1.3 con DOI 93%',status:'completado'},{date:'2025-03-28',title:'Gate 3',description:'Decisión final (4 targets A)',status:'completado'},{date:'2025-04-05',title:'Plan de pozos Gate 3',description:'5 pozos (3 scout, 1 step-out, 1 deep)',status:'completado'},{date:'2025-05-10',title:'Ingesta IP/Res',description:'30 km validados; QF OK',status:'en curso'},{date:'2025-06-15',title:'Inversión MT/CSAMT',description:'v1.4 estimada 2 semanas',status:'pendiente'},{date:'2025-07-20',title:'Gate 4',description:'Preparación actual',status:'pendiente'}];
  const humanActions=[{icon:'🎯',text:'Promover a Target (segmentación por umbral)'},{icon:'📈',text:'Solicitar densificación CSAMT/IP/HSI-UAV'},{icon:'⚙️',text:'Ajustar pesos por estilo y ver impacto'},{icon:'🧪',text:'Cargar lote de laboratorio con QA/QC'},{icon:'✍️',text:'Firmar y exportar informe QP-ready'}];
  const aiActions=[{icon:'🤖',text:'Generar plan de pozos (EI/PI) con restricciones'},{icon:'📊',text:'Recalibrar y publicar modelo'},{icon:'✨',text:'Siguiente mejor acción (impacto vs costo)'},{icon:'🧠',text:'Re-entrenar con nuevos datos (active learning)'},{icon:'📤',text:'Compilar informe QP-ready con anexos'}];
  const anomalies=[{id:'A1',score:0.91},{id:'A2',score:0.84},{id:'A3',score:0.78},{id:'B1',score:0.70},{id:'C1',score:0.65}];

  const avgCov = useMemo(()=> coverage.reduce((a,m)=>a+m.value,0)/coverage.length, [coverage]);
  const styleKpis = styleDistribution.map(d=>({label:d.label,value:`${d.value}%`,color:d.color}));
  const ingestKpis = ingestionStatus.map(d=>({label:d.label,value:`${d.value}%`,color:d.color}));

  return (
    <div className="flex flex-col gap-6">

      {/* 1) HEADER */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Versión</div>
          <div className="text-lg font-semibold text-white mb-2">{version}</div>
          <div className="text-xs text-white/60 mb-1">Filtros</div>
          <div className="space-y-1 text-[11px] text-white/80">
            <div>Profundidad: <span className="font-semibold text-white">{filters.depth} m</span></div>
            <div>Estilos: <span className="font-semibold text-white">{filters.styles.join(', ')}</span></div>
            <div>Subzona: <span className="font-semibold text:white">{filters.subzone}</span></div>
          </div>
          <div className="mt-3"><button className="text-xs px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl mr-2">Cambiar versión</button><button className="text-xs px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl">Exportar Deck</button></div>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="text-xs uppercase tracking-wider text-white/60">Cobertura datos (métodos)</div>
          <div className="text-3xl font-semibold text-white">{Math.round(avgCov*100)}%</div>
          <div className="mt-2"><KPIList items={coverage.map(m=>({label:m.label,value:`${Math.round(m.value*100)}%`,color:m.color}))}/></div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-2">Calidad global</div>
          <div className="grid grid-cols-3 gap-3">
            <RadialGauge value={modelQuality.prAuc} label="PR-AUC" size={76} startColor="#10b981" endColor="#4ade80"/>
            <RadialGauge value={1-modelQuality.brier} label="1-Brier" size={76} startColor="#f97316" endColor="#fb923c"/>
            <RadialGauge value={1-modelQuality.ece} label="Fiabilidad" size={76} startColor="#60a5fa" endColor="#3b82f6"/>
          </div>
          <div className="text-[10px] text-white/60 mt-2">Brier {(modelQuality.brier*100).toFixed(1)}% · ECE {(modelQuality.ece*100).toFixed(1)}%</div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Inventario & Impacto</div>
          <div className="space-y-1 text-sm text-white/80">
            <div>Targets: <span className="font-semibold text-white">{inventory.targets.A+inventory.targets.B+inventory.targets.C}</span> (A:{inventory.targets.A}, B:{inventory.targets.B}, C:{inventory.targets.C})</div>
            <div>Pozos propuestos: <span className="font-semibold text-white">{inventory.wellsProposed}</span> · Ejecutados: <span className="font-semibold text-white">{inventory.wellsExecuted}</span></div>
            <div>Metros ahorrados: <span className="font-semibold text-white">{impact.metersSaved}</span></div>
            <div>Pads evitados: <span className="font-semibold text-white">{impact.padsSaved}</span></div>
            <div>CO₂ evitado: <span className="font-semibold text:white">{impact.co2Saved}</span> kg</div>
          </div>
        </GlassCard>
      </div>

      {/* 2) LIENZO GEOSPATIAL (2D + 2D mock de volumen) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NeonGridPanel title="Mapa prospectividad (0–100 m)" height={360}/>
        <NeonGridPanel title="Volumen 3D prospectividad (mock)" height={360}/>
      </div>

      {/* 3) EVIDENCIAS & EXPLICABILIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SignalsPanel signals={[{label:'Resistividad σ',value:0.70,startColor:'#67e8f9',endColor:'#3b82f6'},{label:'Cargabilidad η',value:0.60,startColor:'#f97316',endColor:'#fb923c'},{label:'Densidad ρ',value:0.50,startColor:'#10b981',endColor:'#6ee7b7'},{label:'Magnetismo χ',value:0.40,startColor:'#9333ea',endColor:'#d8b4fe'}]}/>
        <ExplanationPanel features={[{name:'η alta',value:0.35},{name:'σ baja',value:0.25},{name:'illita',value:0.20},{name:'distancia a F2',value:-0.15},{name:'Vs bajo',value:-0.10}]}/>
        <CalibrationPanel quality={modelQuality}/>
        <DOIPanel doiData={doiCoverage}/>
      </div>

      {/* 4) ACCIONES & DISTRIBUCIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ActionsPanel title="Acciones humanas" actions={[{icon:'🎯',text:'Promover a Target (segmentación por umbral)'},{icon:'📈',text:'Solicitar densificación CSAMT/IP/HSI-UAV'},{icon:'⚙️',text:'Ajustar pesos por estilo y ver impacto'},{icon:'🧪',text:'Cargar lote de laboratorio con QA/QC'},{icon:'✍️',text:'Firmar y exportar informe QP-ready'}]}/>
        <ActionsPanel title="Acciones IA" actions={[{icon:'🤖',text:'Generar plan de pozos (EI/PI) con restricciones'},{icon:'📊',text:'Recalibrar y publicar modelo'},{icon:'✨',text:'Siguiente mejor acción (impacto vs costo)'},{icon:'🧠',text:'Re-entrenar con nuevos datos (active learning)'},{icon:'📤',text:'Compilar informe QP-ready con anexos'}]}/>
        <GlassCard className="p-4 space-y-4">
          <div>
            <div className="text-white/80 font-medium mb-1">Distribución de estilos</div>
            <StackedBar data={styleDistribution.map(d=>({value:d.value,color:d.color}))}/>
            <div className="mt-2"><KPIList items={styleKpis}/></div>
          </div>
          <div>
            <div className="text-white/80 font-medium mt-2 mb-1">Estado de ingesta</div>
            <StackedBar data={ingestionStatus.map(d=>({value:d.value,color:d.color}))}/>
            <div className="mt-2"><KPIList items={ingestKpis}/></div>
          </div>
        </GlassCard>
      </div>

      {/* 5) ANOMALÍAS & TIMELINE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-4 space-y-3">
          <div className="text-white/80 font-medium mb-1">Top anomalías</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {anomalies.map(a=>(
              <div key={a.id} className="flex flex-col items-center p-2 rounded-lg bg-white/5">
                <RadialGauge value={a.score} label={a.id} size={76} startColor="#f97316" endColor="#fcd34d"/>
                <div className="text-[10px] text-white/60 mt-1">Score {(a.score*100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </GlassCard>
        <TimelinePanel events={timeline}/>
      </div>
    </div>
  );
}
