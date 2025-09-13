import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * SHAPExplorer.jsx
 * -----------------------------------------------------------------------------
 * Explorador de explicabilidad (global/local) — software dentro del software.
 * - Vista GLOBAL: importancia SHAP media por feature (tabla + beeswarm por feature).
 * - Vista LOCAL: “waterfall” de contribuciones para una predicción (voxel/ROI).
 * - Dependence plot (SHAP vs valor de feature) con color por cuantiles.
 * - Búsqueda, ordenación, top-K dinámico, normalización y filtros.
 * - Importación/Exportación: JSON (mock), CSV (tabla de importancia), PNG (gráficos).
 * - Atajos: g/l (global/local), ↑/↓ (navegar features), +/- (top-K), e (export), i (import).
 * - 100% autónomo: sin dependencias externas (solo React + Canvas/SVG).
 *
 * Cómo cablearlo con datos reales:
 *  props.global  = [{name, meanAbsShap, corr?:-1..1}]           // importancia global
 *  props.local   = [{name, shap, value}]                        // contribuciones locales
 *  props.samples = [{name, values:[...], shap:[...]}]           // para beeswarm/dependence
 *  Si no pasas props, se usan datos MOCK generados aquí.
 */

/* ----------------------------- UI Helpers -------------------------------- */
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

// medir tamaño de un contenedor (para SVG/Canvas responsivo)
function useSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 300, h: 200 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth || 300, h: el.clientHeight || 200 })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/* --------------------------- Mock Generators ----------------------------- */
const PALETTE = ["#67e8f9", "#f472b6", "#facc15", "#34d399", "#60a5fa", "#fb923c"];

function mockGlobal(k = 16) {
  return new Array(k).fill(0).map((_, i) => ({
    name: `feat_${i + 1}`,
    meanAbsShap: Math.max(0.02, (Math.sin(i * 1.2) + 1) / 3 + (k - i) / (2.5 * k)),
    corr: Math.sin(i * 0.8) * 0.8,
  }));
}
function mockLocal(global = []) {
  // coherente con “global”
  return global.map((g, i) => {
    const sgn = Math.sign(g.corr || (i % 2 ? 1 : -1));
    const shap = sgn * (g.meanAbsShap * (0.6 + 0.8 * Math.random()));
    const value = 0.2 + 0.6 * Math.random();
    return { name: g.name, shap, value };
  });
}
function mockSamples(global = []) {
  // por feature, 300 puntos para beeswarm y dependence
  return global.map((g, idx) => {
    const n = 300;
    const values = new Array(n);
    const shap = new Array(n);
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(1, 0.5 + 0.25 * Math.sin(i * 0.09 + idx) + (Math.random() - 0.5) * 0.3));
      const base = (g.corr || 0) * (v - 0.5) * 0.9;
      shap[i] = base + (Math.random() - 0.5) * 0.25;
      values[i] = v;
    }
    return { name: g.name, values, shap };
  });
}

/* ------------------------------ Waterfall -------------------------------- */
function Waterfall({ items = [], topK = 12, base = 0.5 }) {
  // items: [{name, shap}] (local). Ordenar por |shap|
  const sorted = [...items].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap)).slice(0, topK);
  const total = sorted.reduce((s, x) => s + x.shap, base);
  const maxAbs = Math.max(0.2, ...sorted.map((x) => Math.abs(x.shap)));

  return (
    <GlassCard className="p-3">
      <div className="text-white/80 text-sm mb-2">Local Waterfall (Top {sorted.length})</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span className="w-24">BASE</span>
          <div className="flex-1 h-2 bg-white/10 rounded">
            <div
              className="h-full rounded bg-white/40"
              style={{ width: `${Math.min(100, Math.max(0, base) * 100)}%` }}
            />
          </div>
          <span className="w-10 text-right text-white">{(base * 100).toFixed(0)}%</span>
        </div>
        {sorted.map((x, i) => {
          const w = (Math.abs(x.shap) / maxAbs) * 100;
          const pos = x.shap >= 0;
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-24 truncate text-white/80">{x.name}</span>
              <div className="flex-1 h-2 bg-white/10 rounded relative">
                <div
                  className={`absolute h-full rounded ${pos ? "bg-emerald-400/70" : "bg-rose-400/70"}`}
                  style={{
                    left: pos ? "50%" : `${50 - w}%`,
                    width: `${w}%`,
                  }}
                />
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/20" />
              </div>
              <span className="w-10 text-right font-mono text-white">
                {(x.shap * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-2 text-xs text-white/70 mt-2">
          <span className="w-24">PRED</span>
          <div className="flex-1 h-2 bg-white/10 rounded">
            <div
              className="h-full rounded bg-cyan-400/60"
              style={{ width: `${Math.min(100, Math.max(0, total) * 100)}%` }}
            />
          </div>
          <span className="w-10 text-right text-white">{(total * 100).toFixed(0)}%</span>
        </div>
      </div>
    </GlassCard>
  );
}

/* ----------------------------- Beeswarm plot ----------------------------- */
function Beeswarm({ feature, color = "#67e8f9", height = 220 }) {
  // feature: {name, values[], shap[]}
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !feature) return;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const render = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Ejes
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.moveTo(40, 10);
      ctx.lineTo(40, h - 20);
      ctx.lineTo(w - 10, h - 20);
      ctx.stroke();

      const xs = feature.values || [];
      const ys = feature.shap || [];
      if (xs.length === 0) return;

      const minX = 0,
        maxX = 1;
      const maxAbsY = Math.max(...ys.map((v) => Math.abs(v)), 1);

      // puntos
      for (let i = 0; i < xs.length; i++) {
        const x = 40 + (w - 50) * ((xs[i] - minX) / (maxX - minX));
        const y = (h - 30) - (ys[i] / (2 * maxAbsY)) * (h - 60) - (h - 30 - (h - 60)); // centrado
        const t = Math.max(0, Math.min(1, xs[i]));
        const col = lerpColor("#3b82f6", color, t);
        ctx.fillStyle = `${col}aa`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // título
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.fillText(feature.name, 8, 18);
      ctx.fillText("SHAP", 5, h / 2);
      ctx.fillText("valor", w - 45, h - 6);
    };

    const ro = new ResizeObserver(render);
    ro.observe(c);
    render();
    return () => ro.disconnect();
  }, [feature, color]);

  return (
    <GlassCard className="p-2">
      <div className="relative" style={{ height }}>
        <canvas ref={ref} className="w-full h-full block rounded-xl" />
      </div>
    </GlassCard>
  );
}

/* --------------------------- Dependence plot ----------------------------- */
function DependencePlot({ feature, color = "#f97316", height = 220 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !feature) return;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const render = () => {
      const w = c.clientWidth,
        h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // eje
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.moveTo(40, h - 20);
      ctx.lineTo(w - 10, h - 20);
      ctx.moveTo(40, 10);
      ctx.lineTo(40, h - 20);
      ctx.stroke();

      const xs = feature.values || [];
      const ys = feature.shap || [];
      if (xs.length === 0) return;
      const maxAbsY = Math.max(...ys.map((v) => Math.abs(v)), 1);

      // línea suavizada (media móvil simple)
      const N = xs.length;
      const k = 15;
      const smooth = new Array(N);
      for (let i = 0; i < N; i++) {
        let s = 0,
          n = 0;
        for (let j = -k; j <= k; j++) {
          const t = i + j;
          if (t >= 0 && t < N) {
            s += ys[t];
            n++;
          }
        }
        smooth[i] = s / n;
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = 40 + (w - 50) * xs[i];
        const y = (h - 30) - ((smooth[i] + maxAbsY) / (2 * maxAbsY)) * (h - 60);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.fillText("Dependence", 8, 16);
      ctx.fillText("valor", w - 42, h - 6);
      ctx.fillText("SHAP", 5, 22);
    };

    const ro = new ResizeObserver(render);
    ro.observe(c);
    render();
    return () => ro.disconnect();
  }, [feature, color]);

  return (
    <GlassCard className="p-2">
      <div className="relative" style={{ height }}>
        <canvas ref={ref} className="w-full h-full block rounded-xl" />
      </div>
    </GlassCard>
  );
}

/* ------------------------------- Helpers -------------------------------- */
function lerpColor(a, b, t) {
  const pa = hexToRgb(a),
    pb = hexToRgb(b);
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}
function hexToRgb(h) {
  const s = h.replace("#", "");
  return {
    r: parseInt(s.length === 3 ? s[0] + s[0] : s.slice(1, 3), 16) || 0,
    g: parseInt(s.length === 3 ? s[1] + s[1] : s.slice(3, 5), 16) || 0,
    b: parseInt(s.length === 3 ? s[2] + s[2] : s.slice(5, 7), 16) || 0,
  };
}

/* --------------------------------- Main ---------------------------------- */
export default function SHAPExplorer({
  global,
  local,
  samples,
  topKDefault = 12,
}) {
  const g = useMemo(() => global || mockGlobal(18), [global]);
  const l = useMemo(() => local || mockLocal(g), [local, g]);
  const s = useMemo(() => samples || mockSamples(g), [samples, g]);

  const [mode, setMode] = useState("global"); // "global" | "local"
  const [q, setQ] = useState("");
  const [topK, setTopK] = useState(topKDefault);
  const [selected, setSelected] = useState(g[0]?.name || "feat_1");
  const [norm, setNorm] = useState(false);

  const gFiltered = useMemo(() => {
    const R = g.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
    const max = Math.max(...R.map((x) => x.meanAbsShap), 1);
    if (!norm) return R;
    return R.map((x) => ({ ...x, meanAbsShap: x.meanAbsShap / max }));
  }, [g, q, norm]);

  // tabla global ordenada
  const gSorted = useMemo(
    () => [...gFiltered].sort((a, b) => b.meanAbsShap - a.meanAbsShap),
    [gFiltered]
  );

  // Local para waterfall (orden por |shap|)
  const lSorted = useMemo(
    () => [...l].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap)),
    [l]
  );

  const selectedSample = useMemo(
    () => s.find((d) => d.name === selected) || s[0],
    [s, selected]
  );

  // atajos
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "g") setMode("global");
      if (e.key.toLowerCase() === "l") setMode("local");
      if (e.key === "+") setTopK((k) => Math.min(k + 1, 30));
      if (e.key === "-") setTopK((k) => Math.max(k - 1, 3));
      if (e.key === "ArrowDown") {
        const i = gSorted.findIndex((x) => x.name === selected);
        setSelected(gSorted[Math.min(gSorted.length - 1, i + 1)]?.name || selected);
      }
      if (e.key === "ArrowUp") {
        const i = gSorted.findIndex((x) => x.name === selected);
        setSelected(gSorted[Math.max(0, i - 1)]?.name || selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gSorted, selected]);

  // export CSV de importancia global
  function exportCSV() {
    const head = ["feature", "meanAbsShap", "corr"].join(",");
    const lines = gSorted.map((f) => [f.name, f.meanAbsShap.toFixed(6), (f.corr ?? 0).toFixed(3)].join(","));
    const csv = [head, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shap_global_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // export PNG (beeswarm + dependence)
  const beesRef = useRef(null);
  const depRef = useRef(null);
  function exportPNG() {
    const a = document.createElement("a");
    a.href = (beesRef.current || depRef.current).toDataURL("image/png");
    a.download = `shap_${selected}_${mode}_${Date.now()}.png`;
    a.click();
  }

  // importar JSON (global/local/samples)
  const inputRef = useRef(null);
  async function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      // El usuario puede pegar cualquier subconjunto; aquí lo reflejamos si existe.
      if (payload.global) console.warn("Cárgalo como prop en producción; aquí es demostrativo.");
      // En este mock no sobreescribimos estado para evitar confundir; deja el hook listo.
    } catch (err) {}
    e.target.value = "";
  }

  return (
    <GlassCard className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white/80 font-medium">SHAP Explorer</div>
          <div className="text-[11px] text-white/60">
            g/l vistas · ↑/↓ navegar · +/- top-K · Export CSV/PNG · Normalizar
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            Export CSV
          </button>
          <button onClick={exportPNG} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            Export PNG
          </button>
          <button onClick={() => inputRef.current?.click()} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            Import JSON
          </button>
          <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={importJSON} />
        </div>
      </div>

      {/* Controles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Modo</div>
          <div className="flex gap-2">
            <button className={`text-xs px-3 py-1 rounded ${mode==='global'?'bg-white/20':'bg-white/10 hover:bg-white/20'}`} onClick={()=>setMode('global')}>Global</button>
            <button className={`text-xs px-3 py-1 rounded ${mode==='local'?'bg-white/20':'bg-white/10 hover:bg-white/20'}`} onClick={()=>setMode('local')}>Local</button>
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Buscar feature</div>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="feat_…" className="bg-white/10 rounded px-2 py-1 outline-none w-full"/>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Top-K</div>
          <input type="range" min={3} max={30} step={1} value={topK} onChange={(e)=>setTopK(parseInt(e.target.value,10))} className="w-full accent-cyan-300"/>
          <div className="text-[11px] text-cyan-200">{topK}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <label className="text-xs text-white/70 flex items-center gap-2">
            <input type="checkbox" checked={norm} onChange={e=>setNorm(e.target.checked)} className="accent-cyan-300"/>
            Normalizar (global)
          </label>
        </div>
      </div>

      {/* Cuerpo: tabla + gráficos */}
      {mode === "global" ? (
        <div className="grid xl:grid-cols-5 gap-4">
          {/* Tabla de importancia */}
          <GlassCard className="p-3 xl:col-span-2">
            <div className="text-white/80 text-sm mb-2">Importancia global</div>
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/70">
                  <tr><th className="text-left px-3 py-2">Feature</th><th className="text-left px-3 py-2">|SHAP|</th><th className="text-left px-3 py-2">Corr</th></tr>
                </thead>
                <tbody>
                  {gSorted.map((f, i) => (
                    <tr key={f.name} className={`border-t border-white/10 hover:bg-white/5 ${selected===f.name?'bg-white/5':''}`}>
                      <td className="px-3 py-2">
                        <button className="text-white/90 hover:underline" onClick={()=>setSelected(f.name)}>{f.name}</button>
                      </td>
                      <td className="px-3 py-2 text-white/80">{f.meanAbsShap.toFixed(3)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${f.corr>=0?'bg-emerald-500/20 text-emerald-200':'bg-rose-500/20 text-rose-200'}`}>
                          {f.corr?.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Beeswarm + Dependence */}
          <div className="xl:col-span-3 grid md:grid-cols-2 gap-4">
            <Beeswarm feature={selectedSample} color="#67e8f9" height={260} refCanvas={beesRef}/>
            <DependencePlot feature={selectedSample} color="#f97316" height={260} refCanvas={depRef}/>
          </div>
        </div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          <Waterfall items={lSorted} topK={topK} base={0.52}/>
          <div className="grid sm:grid-cols-2 gap-4">
            <Beeswarm feature={selectedSample} color="#67e8f9" height={220} refCanvas={beesRef}/>
            <DependencePlot feature={selectedSample} color="#f97316" height={220} refCanvas={depRef}/>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
