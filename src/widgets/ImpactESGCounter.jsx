import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ImpactESGCounter.jsx
 * -----------------------------------------------------------------------------
 * “Impact ESG Counter & Optimizer” — software dentro del software.
 * - KPI cards: Metros ahorrados, Pads evitados, CO₂ evitado (t), Ahorro $ (mock)
 * - Parámetros editables: baseline/plan, factores de emisión y costos
 * - Sensibilidad: sliders y presets; objetivo CO₂ (t) y optimizador (plan)
 * - Curva de eficiencia marginal (kg CO₂ / metro) y cascada de contribuciones
 * - Export: PNG (gráficos), CSV (resumen), JSON (snapshot)
 * - Atajos:  +/- metros plan  ·  [ ] objetivo CO₂  ·  r reset  ·  e PNG  ·  c CSV  ·  j JSON
 *
 * NOTA: Todos los datos son MOCK; sustitúyelos por reales al cablear backend.
 */

/* ---------------------------- GlassCard local ---------------------------- */
function GlassCard({ className = "", children }) {
  return (
    <div
      className={
        "rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-lg " +
        className
      }
    >
      {children}
    </div>
  );
}

/* ------------------------------- Sparkline ------------------------------- */
function Sparkline({ data = [10, 14, 13, 17, 20, 22, 18], w = 120, h = 36, color = "#67e8f9" }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / ((max - min) || 1)) * h]);
  const d = pts.map((p, i) => (i ? `L${p[0]},${p[1]}` : `M${p[0]},${p[1]}`)).join(" ");
  return (
    <svg width={w} height={h} aria-label="sparkline">
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

/* ------------------------------- Radial KPI ------------------------------ */
function RadialKPI({ value = 0.75, label = "", size = 96, grad = ["#10b981", "#34d399"], fmt = "pct" }) {
  const r = size * 0.36, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value)); const dash = `${C * pct} ${C * (1 - pct)}`;
  const format = (v) => fmt === "pct" ? `${(v * 100).toFixed(0)}%` :
                      fmt === "t"   ? `${v.toFixed(1)} t` :
                      fmt === "$"   ? `$${v.toLocaleString()}` : `${v.toFixed(0)}`;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="kpi" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={grad[0]} /><stop offset="100%" stopColor={grad[1]} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="10" fill="none" />
        <circle cx={cx} cy={cy} r={r} stroke="url(#kpi)" strokeLinecap="round" strokeWidth="10"
                strokeDasharray={dash} transform={`rotate(-90 ${cx} ${cy})`} fill="none" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-white text-lg font-semibold">{format(value)}</div>
        <div className="text-white/70 text-[10px]">{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------ Mini waterfall --------------------------- */
function MiniWaterfall({ items = [] }) {
  // items: [{label, value, color}] (kg CO2 o $ positivos = evitan)
  const max = Math.max(...items.map((x) => Math.abs(x.value)), 1);
  return (
    <div className="space-y-1">
      {items.map((x, i) => {
        const w = (Math.abs(x.value) / max) * 100;
        const pos = x.value >= 0;
        return (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="w-28 truncate text-white/80">{x.label}</span>
            <div className="flex-1 h-2 bg-white/10 rounded relative">
              <div
                className="absolute h-2 rounded"
                style={{
                  left: pos ? "50%" : `${50 - w}%`,
                  width: `${w}%`,
                  background: x.color || (pos ? "#34d399" : "#f87171"),
                }}
              />
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/20" />
            </div>
            <span className="w-16 text-right text-white">{x.value >= 1000 ? `${(x.value/1000).toFixed(1)}k` : x.value.toFixed(0)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Marginal curve --------------------------- */
function MarginalCurve({ data = [], height = 180 }) {
  // data: [{x: metros acumulados, y: kgCO2/metro}]
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const render = () => {
      const w = c.clientWidth, h = height;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; for (let gx = 0; gx <= w; gx += Math.max(32, w / 10)) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
      for (let gy = 0; gy <= h; gy += Math.max(24, h / 6)) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
      if (!data.length) return;
      const maxX = Math.max(...data.map(d => d.x), 1);
      const maxY = Math.max(...data.map(d => d.y), 1);
      ctx.strokeStyle = "#67e8f9"; ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = (d.x / maxX) * (w - 40) + 20;
        const y = h - (d.y / maxY) * (h - 30) - 10;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "12px ui-sans-serif, system-ui";
      ctx.fillText("kg CO₂ / metro", 8, 14);
    };
    const ro = new ResizeObserver(render); ro.observe(c); render();
    return () => ro.disconnect();
  }, [data, height]);
  return <canvas ref={ref} className="w-full block rounded" style={{ height }} />;
}

/* -------------------------------- Widget --------------------------------- */
export default function ImpactESGCounter({
  // Baseline vs plan (mock)
  baseline = { meters: 8000, pads: 18 },
  plan     = { meters: 6200, pads: 10 },
  // Factores y costos (mock)
  factors = {
    kgCO2_per_meter: 35,   // perforación (kg CO₂ / m)
    kgCO2_per_pad: 12000,  // construcción plataforma (kg CO₂ / pad)
    usd_per_meter: 45,     // costo directo por metro
    usd_per_pad: 15000,    // costo por pad
    shadow_price_tCO2: 55, // $/tCO₂
  },
  // Objetivo de CO2 (t) a no exceder (mock)
  target_tCO2 = 180,
}) {
  const [B, setB] = useState(baseline);
  const [P, setP] = useState(plan);
  const [F, setF] = useState(factors);
  const [goal, setGoal] = useState(target_tCO2);
  const [trend, setTrend] = useState([120, 135, 128, 140, 133, 125, 119]); // tCO2 mes a mes (mock)
  const [note, setNote] = useState("Plan Gate 4 · Distrito Gualcamayo");
  const [suggest, setSuggest] = useState(null);

  // Atajos
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "+") setP((p) => ({ ...p, meters: p.meters + 100 }));
      if (e.key === "-") setP((p) => ({ ...p, meters: Math.max(0, p.meters - 100) }));
      if (e.key === "[") setGoal((g) => Math.max(0, g - 5));
      if (e.key === "]") setGoal((g) => g + 5);
      if (e.key.toLowerCase() === "r") { setB(baseline); setP(plan); setF(factors); setGoal(target_tCO2); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [baseline, plan, factors, target_tCO2]);

  /* --------------------------- Cálculos clave --------------------------- */
  const metrics = useMemo(() => {
    const mSaved = Math.max(0, B.meters - P.meters);
    const padsSaved = Math.max(0, B.pads - P.pads);
    const co2_saved_kg = mSaved * F.kgCO2_per_meter + padsSaved * F.kgCO2_per_pad;
    const co2_saved_t  = co2_saved_kg / 1000;
    const cost_saved   = mSaved * F.usd_per_meter + padsSaved * F.usd_per_pad;
    const social_saved = co2_saved_t * F.shadow_price_tCO2;
    const co2_plan_kg  = P.meters * F.kgCO2_per_meter + P.pads * F.kgCO2_per_pad;
    const co2_plan_t   = co2_plan_kg / 1000;
    const gap_t        = Math.max(0, co2_plan_t - goal);
    return {
      mSaved, padsSaved, co2_saved_t, cost_saved, social_saved, co2_plan_t, gap_t
    };
  }, [B, P, F, goal]);

  // Cascada de contribuciones
  const waterfall = useMemo(() => ([
    { label: "Metros ahorrados", value: metrics.mSaved * F.kgCO2_per_meter, color: "#34d399" },
    { label: "Pads evitados",    value: metrics.padsSaved * F.kgCO2_per_pad, color: "#60a5fa" },
    { label: "Eficiencia equipo",value: 4200, color: "#facc15" }, // mock
    { label: "Logística optimizada", value: 1800, color: "#f472b6" }, // mock
  ]), [metrics, F]);

  // Curva marginal (mock): cada 500 m recortados => kgCO2/metro decreciente
  const marginal = useMemo(() => {
    const points = [];
    const maxCut = Math.max(0, B.meters - 1000); // no sugiere cortar por debajo de 1000 m
    for (let cut = 0; cut <= Math.min(B.meters - P.meters + 2000, maxCut); cut += 500) {
      const kgPerM = F.kgCO2_per_meter * (1 - 0.35 * (cut / (B.meters || 1))); // eficiencia marginal
      points.push({ x: cut, y: Math.max(5, kgPerM) });
    }
    return points;
  }, [B.meters, P.meters, F.kgCO2_per_meter]);

  /* ----------------------------- Optimizador ----------------------------- */
  function optimizeToGoal() {
    // Ajusta P.meters y opcionalmente P.pads para cumplir objetivo de tCO2 con heurística simple
    let meters = P.meters, pads = P.pads;
    let t = (meters * F.kgCO2_per_meter + pads * F.kgCO2_per_pad) / 1000;
    let iter = 0;
    while (t > goal && iter < 200) {
      // reducir metros primero (pasos de 50 m), luego pads si muy lejos
      if (t - goal > 10 && pads > 0 && iter % 5 === 0) pads = Math.max(0, pads - 1);
      meters = Math.max(0, meters - 50);
      t = (meters * F.kgCO2_per_meter + pads * F.kgCO2_per_pad) / 1000;
      iter++;
    }
    setP({ meters, pads });
    setSuggest({ meters, pads, iter });
  }

  /* ------------------------------- Export -------------------------------- */
  function exportPNG(ref) {
    const a = document.createElement("a");
    a.href = ref.current.toDataURL("image/png");
    a.download = `impact_esg_${Date.now()}.png`;
    a.click();
  }
  function exportCSV() {
    const head = [
      "baseline_m","baseline_pads","plan_m","plan_pads",
      "kgCO2/m","kgCO2/pad","usd/m","usd/pad","$/tCO2","goal_tCO2",
      "m_saved","pads_saved","co2_saved_t","cost_saved_usd","social_saved_usd","plan_tCO2"
    ].join(",");
    const row = [
      B.meters,B.pads,P.meters,P.pads,F.kgCO2_per_meter,F.kgCO2_per_pad,F.usd_per_meter,F.usd_per_pad,F.shadow_price_tCO2,goal,
      metrics.mSaved,metrics.padsSaved,metrics.co2_saved_t,metrics.cost_saved,metrics.social_saved,metrics.co2_plan_t
    ].join(",");
    const blob = new Blob([[head,row].join("\n")],{type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `impact_esg_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  async function copyJSON() {
    const payload = { baseline:B, plan:P, factors:F, goal, metrics, note, ts:new Date().toISOString() };
    try { await navigator.clipboard.writeText(JSON.stringify(payload,null,2)); } catch {}
  }

  /* ------------------------------- Canvases ------------------------------- */
  const curveRef = useRef(null);  // marginal
  const kpiRef   = useRef(null);  // snapshot KPIs (PNG export)

  useEffect(() => {
    // Dibuja “snapshot” KPIs en kpiRef para export rápida (no visible)
    const cv = kpiRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); const dpr = Math.min(window.devicePixelRatio||1,2);
    const w = 600, h = 220; cv.width = w*dpr; cv.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle = "#0b0d0e"; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "14px ui-sans-serif";
    ctx.fillText("Impact ESG — Snapshot", 16, 22);
    ctx.font = "12px ui-sans-serif"; ctx.fillStyle="rgba(255,255,255,0.75)";
    ctx.fillText(note, 16, 40);
    const lines = [
      `Metros ahorrados: ${metrics.mSaved}`,
      `Pads evitados: ${metrics.padsSaved}`,
      `CO₂ evitado: ${metrics.co2_saved_t.toFixed(1)} t`,
      `Ahorro directo: $${metrics.cost_saved.toLocaleString()}`,
      `Valor social (SCC): $${metrics.social_saved.toLocaleString()}`,
      `tCO₂ plan: ${metrics.co2_plan_t.toFixed(1)}  ·  Objetivo: ${goal}`
    ];
    lines.forEach((s,i)=> ctx.fillText(s, 16, 72 + 18*i));
  }, [metrics, goal, note]);

  /* --------------------------------- UI ---------------------------------- */
  return (
    <GlassCard className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-white/80 font-medium">Impact ESG Counter & Optimizer</div>
          <div className="text-[11px] text-white/60">Ajusta supuestos, explora sensibilidad y cumple objetivos de CO₂.</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>exportPNG(curveRef)} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Export PNG</button>
          <button onClick={exportCSV}             className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Export CSV</button>
          <button onClick={copyJSON}              className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Copiar JSON</button>
        </div>
      </div>

      {/* KPI Top Row */}
      <div className="grid md:grid-cols-4 gap-3">
        <GlassCard className="p-3 flex items-center gap-3">
          <RadialKPI value={(metrics.mSaved / Math.max(1, B.meters))} label="Metros ahorrados / baseline" size={84} grad={["#38bdf8","#67e8f9"]}/>
          <div className="flex-1 text-sm text-white/80">
            <div>Metros ahorrados</div>
            <div className="text-white font-semibold text-lg">{metrics.mSaved}</div>
            <div className="text-[10px] text-white/60">baseline {B.meters} · plan {P.meters}</div>
          </div>
        </GlassCard>
        <GlassCard className="p-3 flex items-center gap-3">
          <RadialKPI value={(metrics.padsSaved / Math.max(1, B.pads))} label="Pads evitados / baseline" size={84} grad={["#a78bfa","#c4b5fd"]}/>
          <div className="flex-1 text-sm text-white/80">
            <div>Pads evitados</div>
            <div className="text-white font-semibold text-lg">{metrics.padsSaved}</div>
            <div className="text-[10px] text-white/60">baseline {B.pads} · plan {P.pads}</div>
          </div>
        </GlassCard>
        <GlassCard className="p-3 flex items-center gap-3">
          <RadialKPI value={Math.min(metrics.co2_saved_t / Math.max(1, goal), 1)} label="CO₂ evitado vs objetivo" size={84} grad={["#10b981","#34d399"]} fmt="pct"/>
          <div className="flex-1 text-sm text-white/80">
            <div>CO₂ evitado</div>
            <div className="text-white font-semibold text-lg">{metrics.co2_saved_t.toFixed(1)} t</div>
            <div className="text-[10px] text-white/60">objetivo {goal} t</div>
          </div>
        </GlassCard>
        <GlassCard className="p-3 flex items-center gap-3">
          <RadialKPI value={Math.min(metrics.cost_saved / 250000, 1)} label="Ahorro directo (mock)" size={84} grad={["#f59e0b","#fbbf24"]} fmt="$"/>
          <div className="flex-1 text-sm text-white/80">
            <div>Ahorro directo</div>
            <div className="text-white font-semibold text-lg">${metrics.cost_saved.toLocaleString()}</div>
            <div className="text-[10px] text-white/60">SCC: ${metrics.social_saved.toLocaleString()}</div>
          </div>
        </GlassCard>
      </div>

      {/* Controls Row */}
      <GlassCard className="p-3">
        <div className="grid xl:grid-cols-4 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-black/20 rounded-xl p-3">
            <div className="text-xs text-white/70 mb-1">Baseline</div>
            <label className="flex items-center justify-between text-xs"><span className="text-white/80">Metros</span>
              <input type="number" className="bg-white/10 rounded px-2 py-1 w-28 outline-none" value={B.meters}
                     onChange={(e)=>setB({...B, meters: Math.max(0, parseInt(e.target.value||0,10))})}/>
            </label>
            <label className="flex items-center justify-between text-xs mt-2"><span className="text-white/80">Pads</span>
              <input type="number" className="bg-white/10 rounded px-2 py-1 w-28 outline-none" value={B.pads}
                     onChange={(e)=>setB({...B, pads: Math.max(0, parseInt(e.target.value||0,10))})}/>
            </label>
          </div>
          <div className="bg-black/20 rounded-xl p-3">
            <div className="text-xs text-white/70 mb-1">Plan</div>
            <label className="flex items-center justify-between text-xs"><span className="text-white/80">Metros</span>
              <input type="number" className="bg-white/10 rounded px-2 py-1 w-28 outline-none" value={P.meters}
                     onChange={(e)=>setP({...P, meters: Math.max(0, parseInt(e.target.value||0,10))})}/>
            </label>
            <label className="flex items-center justify-between text-xs mt-2"><span className="text-white/80">Pads</span>
              <input type="number" className="bg-white/10 rounded px-2 py-1 w-28 outline-none" value={P.pads}
                     onChange={(e)=>setP({...P, pads: Math.max(0, parseInt(e.target.value||0,10))})}/>
            </label>
            <div className="mt-3 flex items-center gap-2">
              <button className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20" onClick={()=>setP(p=>({...p, meters: Math.max(0, p.meters-100)}))}>-100 m</button>
              <button className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20" onClick={()=>setP(p=>({...p, meters: p.meters+100}))}>+100 m</button>
            </div>
          </div>
          <div className="bg-black/20 rounded-xl p-3">
            <div className="text-xs text-white/70 mb-1">Factores</div>
            {[
              ["kgCO2_per_meter","kg CO₂ / m"],
              ["kgCO2_per_pad","kg CO₂ / pad"],
              ["usd_per_meter","$ / m"],
              ["usd_per_pad","$ / pad"],
              ["shadow_price_tCO2","$ / tCO₂"],
            ].map(([k,lab])=>(
              <label key={k} className="flex items-center justify-between text-xs mt-2 first:mt-0">
                <span className="text-white/80">{lab}</span>
                <input type="number" className="bg-white/10 rounded px-2 py-1 w-28 outline-none"
                       value={F[k]} onChange={(e)=>setF({...F, [k]: Math.max(0, parseFloat(e.target.value||0))})}/>
              </label>
            ))}
          </div>
          <div className="bg-black/20 rounded-xl p-3">
            <div className="text-xs text-white/70 mb-1">Objetivo CO₂ (t)</div>
            <input type="range" min={0} max={500} step={1} value={goal} onChange={(e)=>setGoal(parseInt(e.target.value,10))}
                   className="w-full accent-cyan-300"/>
            <div className="text-[11px] text-cyan-200">{goal} t</div>
            <div className="mt-3">
              <button className="text-xs px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100"
                      onClick={optimizeToGoal}>Optimizar plan → objetivo</button>
            </div>
            {suggest && <div className="text-[11px] text-white/70 mt-2">
              Sugerencia: plan {suggest.meters} m · {suggest.pads} pads (iter {suggest.iter})
            </div>}
          </div>
        </div>
      </GlassCard>

      {/* Curva de eficiencia marginal + cascada contribuciones */}
      <div className="grid md:grid-cols-2 gap-3">
        <GlassCard className="p-3">
          <div className="text-white/80 text-sm mb-2">Curva de eficiencia marginal (kg CO₂ / metro)</div>
          <MarginalCurve data={marginal} height={180} refCanvas={curveRef}/>
          <div className="mt-2 text-[11px] text-white/60">
            La eficiencia marginal decrece al recortar metros: prioriza los primeros recortes para máximo impacto.
          </div>
        </GlassCard>
        <GlassCard className="p-3">
          <div className="text-white/80 text-sm mb-2">Cascada de contribuciones (kg CO₂ evitados)</div>
          <MiniWaterfall items={waterfall}/>
        </GlassCard>
      </div>

      {/* Serie temporal (tCO₂ plan) + nota */}
      <GlassCard className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-white/80 text-sm">Serie tCO₂ (plan)</div>
          <div className="text-[10px] text-white/60">Nota</div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Sparkline data={trend} />
          <input value={note} onChange={(e)=>setNote(e.target.value)} className="bg-white/10 rounded px-2 py-1 text-[12px] outline-none w-1/2"
                 placeholder="Anota supuestos/modelo…"/>
        </div>
      </GlassCard>

      {/* Canvas oculto para export rápido */}
      <canvas ref={kpiRef} className="hidden" width={600} height={220} />

      {/* Footer ayuda */}
      <div className="text-[10px] text-white/50">
        Atajos: <b>+</b>/<b>-</b> metros plan · <b>[</b>/<b>]</b> objetivo · <b>r</b> reset · <b>e</b> PNG · <b>c</b> CSV · <b>j</b> JSON
      </div>
    </GlassCard>
  );
}
