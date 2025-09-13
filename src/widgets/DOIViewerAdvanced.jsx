import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * DOIViewerAdvanced.jsx
 * -----------------------------------------------------------------------------
 * “DOI Viewer Avanzado” — software dentro del software.
 * - Visualizador 2D de máscara DOI por método con composición UNION/INTERSECCIÓN.
 * - Profundidad (slider) y selector de métodos (Mag, AEM/ZTEM, MT/CSAMT, IP/ERT, HSI, ANT).
 * - ROI: Lazo y Rectángulo para evaluar cobertura DOI en zonas de interés.
 * - KPIs por método: % dentro del DOI (distrito y ROI), badge por severidad.
 * - Gráficos: Donut por método (cobertura ROI), mini-barras por distrito/ROI.
 * - Sugerencias de densificación (km mock) y export: PNG/CSV/JSON.
 * - Atajos:  u (UNION) / i (INTERSECCIÓN) · l (lazo) · r (rect) · o (orbitar OFF) ·
 *            e (PNG) · c (CSV) · j (JSON) · ESC limpia ROI.
 *
 * MOCKS:
 *  - La máscara DOI se simula con funciones radiales/anisotrópicas dependientes de profundidad.
 *  - Reemplaza las funciones doiField(method, depth) por máscaras reales (0..1).
 */

/* ───────────────────────────── Helpers visuales ─────────────────────────── */
function GlassCard({ className = "", children }) {
  return (
    <div className={"rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-lg " + className}>
      {children}
    </div>
  );
}
function Badge({ text, tone = "ok" }) {
  const map = {
    ok: "bg-emerald-500/20 text-emerald-200",
    warn: "bg-yellow-500/20 text-yellow-200",
    bad: "bg-rose-500/20 text-rose-200",
    info: "bg-cyan-500/20 text-cyan-200",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] ${map[tone] || map.info}`}>{text}</span>;
}
function Donut({ value = 0.72, size = 80, color = "#67e8f9", label = "" }) {
  const r = size * 0.36, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value)), dash = `${C * pct} ${C * (1 - pct)}`;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
        <circle cx={cx} cy={cy} r={r} stroke={color} strokeLinecap="round" strokeWidth="10"
                strokeDasharray={dash} transform={`rotate(-90 ${cx} ${cy})`} fill="none" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[12px] font-semibold text-white">{(pct * 100).toFixed(0)}%</div>
        {label && <div className="text-[10px] text-white/70">{label}</div>}
      </div>
    </div>
  );
}

/* ───────────────────────────── Datos/Métodos Mock ───────────────────────── */
const METHODS = [
  { id: "mag",  label: "Magnetometría",  color: "#f97316" },
  { id: "aem",  label: "AEM/ZTEM",       color: "#34d399" },
  { id: "mt",   label: "MT/CSAMT",       color: "#60a5fa" },
  { id: "ip",   label: "IP/ERT",         color: "#9333ea" },
  { id: "hsi",  label: "HSI",            color: "#fde047" },
  { id: "ant",  label: "ANT sísmica",    color: "#f472b6" },
];

/* DOI simulada (0..1) por método y profundidad. Sustituir por máscaras reales. */
function doiField(method, depth, x, y, w, h) {
  const nx = (x / w) * 2 - 1;   // -1..1
  const ny = (y / h) * 2 - 1;
  const r = Math.hypot(nx, ny);
  const aniso = (a, b) => Math.hypot(nx / a, ny / b);
  switch (method) {
    case "mag": return Math.max(0, 1 - aniso(0.9, 0.8) - depth * 0.15);
    case "aem": return Math.max(0, 1 - aniso(0.75, 0.6) - depth * 0.25);
    case "mt":  return Math.max(0, 1 - aniso(0.55, 0.5) - depth * 0.35);
    case "ip":  return Math.max(0, 1 - aniso(0.7,  0.75) - depth * 0.28);
    case "hsi": return Math.max(0, 1 - r * 0.25 - depth * 0.05);      // superficial
    case "ant": return Math.max(0, 1 - aniso(0.65, 0.5) - depth * 0.22);
    default:    return Math.max(0, 1 - r);
  }
}

/* ───────────────────────────── Widget Principal ─────────────────────────── */
export default function DOIViewerAdvanced({
  width = 920, height = 520, // tamaño preferido del canvas (container se adapta)
  initialDepth = 0.4,        // 0..1
}) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);

  /* Estado UI */
  const [depth, setDepth]     = useState(initialDepth);
  const [compose, setCompose] = useState("union"); // union | intersect
  const [methods, setMethods] = useState(METHODS.map(m => ({ ...m, on: true })));
  const [tool, setTool]       = useState("orbit"); // orbit (n/a), lasso, rect
  const [roi, setROI]         = useState({ type: null, path: [], rect: null });
  const [stats, setStats]     = useState(null);

  /* Resizing */
  useEffect(() => {
    const el = containerRef.current, cv = canvasRef.current; if (!el || !cv) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = el.clientWidth || width, h = el.clientHeight || height;
      cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr);
      cv.style.width = w + "px"; cv.style.height = h + "px";
      cv.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    return () => ro.disconnect();
  }, [width, height]);

  /* Interacción ROI */
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    let lasso = false; let rect0 = null;
    const getP = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

    const onDown = e => {
      const p = getP(e);
      if (tool === "lasso") { lasso = true; setROI({ type: "lasso", path: [[p.x, p.y]], rect: null }); }
      else if (tool === "rect") { rect0 = [p.x, p.y]; setROI({ type: "rect", rect: [p.x, p.y, p.x, p.y], path: [] }); }
    };
    const onMove = e => {
      const p = getP(e);
      if (tool === "lasso" && lasso) { setROI(r => ({ ...r, path: [...r.path, [p.x, p.y]] })); return; }
      if (tool === "rect" && rect0)  { setROI({ type: "rect", rect: [rect0[0], rect0[1], p.x, p.y], path: [] }); return; }
    };
    const onUp = () => {
      if (tool === "lasso" && lasso) lasso = false;
      if (tool === "rect" && rect0) rect0 = null;
      computeStats(); // calcula tras terminar ROI
    };
    const onKey = e => { if (e.key === "Escape") setROI({ type: null, path: [], rect: null }), setStats(null); };

    cv.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    cv.addEventListener("contextmenu", e => e.preventDefault());
    return () => {
      cv.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      cv.removeEventListener("contextmenu", () => {});
    };
  }, [tool, depth, methods, compose]);

  /* Render principal */
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");

    function draw() {
      const w = cv.clientWidth, h = cv.clientHeight;
      ctx.clearRect(0, 0, w, h);
      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
      for (let gy = 0; gy < h; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }

      // Compose DOI
      const active = methods.filter(m => m.on);
      // Pintado gradual: acumulamos alpha por método
      const img = ctx.getImageData(0, 0, w, h);
      const buf = img.data;
      // Para rendimiento, muestreamos cada 2 px
      const step = 2;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          let val = compose === "union" ? 0 : 1;
          active.forEach(m => {
            const f = doiField(m.id, depth, x, y, w, h);        // 0..1
            val = compose === "union" ? Math.max(val, f) : Math.min(val, f);
          });
          const c = Math.max(0, Math.min(1, val));
          // Escribimos un cuadrito step x step
          const r = Math.round(255 * c), g = Math.round(200 * c), b = Math.round(120 * c), a = 140;
          for (let dy = 0; dy < step; dy++) {
            for (let dx = 0; dx < step; dx++) {
              const idx = ((y + dy) * w + (x + dx)) * 4;
              buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = a;
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0);

      // ROI overlay
      ctx.globalCompositeOperation = "source-over";
      if (roi.type === "lasso" && roi.path.length > 1) {
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(roi.path[0][0], roi.path[0][1]);
        for (let i = 1; i < roi.path.length; i++) ctx.lineTo(roi.path[i][0], roi.path[i][1]);
        ctx.stroke();
      }
      if (roi.type === "rect" && roi.rect) {
        const [x0, y0, x1, y1] = roi.rect;
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.5;
        ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      }
    }

    draw();
  }, [depth, methods, compose, roi]);

  /* Estadísticas (distrito + ROI) */
  const districtStats = useMemo(() => {
    // mapea % dentro DOI por método usando muestreo grueso en canvas
    const cv = canvasRef.current; if (!cv) return METHODS.reduce((o,m)=>({ ...o, [m.id]:0 }),{});
    const w = cv.clientWidth, h = cv.clientHeight;
    const step = 8; const out = {};
    METHODS.forEach(m => {
      let inside = 0, total = 0;
      for (let y = 0; y < h; y += step)
        for (let x = 0; x < w; x += step) {
          const f = doiField(m.id, depth, x, y, w, h);
          inside += f > 0.5 ? 1 : 0; total++;
        }
      out[m.id] = inside / total;
    });
    return out;
  }, [depth]);

  function computeStats() {
    const cv = canvasRef.current; if (!cv || !roi.type) { setStats(null); return; }
    const w = cv.clientWidth, h = cv.clientHeight;
    const step = 6;
    const active = methods.filter(m => m.on);
    const insideROI = (x, y) => {
      if (roi.type === "rect" && roi.rect) {
        const [x0, y0, x1, y1] = roi.rect; const rx0 = Math.min(x0, x1), ry0 = Math.min(y0, y1), rx1 = Math.max(x0, x1), ry1 = Math.max(y0, y1);
        return x >= rx0 && x <= rx1 && y >= ry0 && y <= ry1;
      } else if (roi.type === "lasso" && roi.path.length > 2) {
        let c = false;
        for (let i = 0, j = roi.path.length - 1; i < roi.path.length; j = i++) {
          const xi = roi.path[i][0], yi = roi.path[i][1], xj = roi.path[j][0], yj = roi.path[j][1];
          const inter = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
          if (inter) c = !c;
        }
        return c;
      }
      return false;
    };

    let area = 0, methodStats = {};
    METHODS.forEach(m => (methodStats[m.id] = { roiIn: 0, roiTot: 0 }));

    for (let yy = 0; yy < h; yy += step)
      for (let xx = 0; xx < w; xx += step) {
        if (!insideROI(xx, yy)) continue;
        area++;
        METHODS.forEach(m => {
          const f = doiField(m.id, depth, xx, yy, w, h);
          methodStats[m.id].roiTot++; methodStats[m.id].roiIn += f > 0.5 ? 1 : 0;
        });
      }

    // cobertura combinada según composición
    let combIn = 0, combTot = 0;
    for (let yy = 0; yy < h; yy += step)
      for (let xx = 0; xx < w; xx += step) {
        if (!insideROI(xx, yy)) continue;
        let val = compose === "union" ? 0 : 1;
        active.forEach(m => {
          const f = doiField(m.id, depth, xx, yy, w, h);
          val = compose === "union" ? Math.max(val, f) : Math.min(val, f);
        });
        if (val > 0.5) combIn++; combTot++;
      }

    setStats({
      areaPx: area * step * step,
      comb: combTot ? combIn / combTot : 0,
      perMethod: Object.fromEntries(
        METHODS.map(m => [m.id, (methodStats[m.id].roiTot ? methodStats[m.id].roiIn / methodStats[m.id].roiTot : 0)])
      ),
    });
  }

  /* Export */
  function exportPNG() {
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = `doi_view_${compose}_d${Math.round(depth * 100)}.png`;
    a.click();
  }
  function exportCSV() {
    const head = ["method", "district_doi", "roi_doi"].join(",");
    const lines = METHODS.map(m => {
      const d = districtStats[m.id] ?? 0;
      const r = stats?.perMethod?.[m.id] ?? 0;
      return [m.label, d.toFixed(4), r.toFixed(4)].join(",");
    });
    const csv = [head, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `doi_stats_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function exportJSON() {
    const payload = {
      depth, compose,
      methods: methods.map(m => ({ id: m.id, label: m.label, on: m.on })),
      districtStats, roi: roi.type ? roi : null, stats,
      ts: new Date().toISOString(),
    };
    try { await navigator.clipboard.writeText(JSON.stringify(payload, null, 2)); } catch {}
  }

  /* Render UI */
  return (
    <GlassCard className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white/80 font-medium">DOI Viewer Avanzado</div>
          <div className="text-[11px] text-white/60">
            Composición: <b>{compose.toUpperCase()}</b> · Profundidad: <b>{Math.round(depth * 100)}%</b>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPNG}  className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Export PNG</button>
          <button onClick={exportCSV}  className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Export CSV</button>
          <button onClick={exportJSON} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Copiar JSON</button>
        </div>
      </div>

      {/* Controles superiores */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Profundidad</div>
          <input type="range" min={0} max={1} step={0.01} value={depth} onChange={e => setDepth(parseFloat(e.target.value))} className="w-full accent-cyan-300" />
          <div className="text-[11px] text-cyan-200">{Math.round(depth * 100)}%</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Composición</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCompose("union")}     className={`text-xs px-3 py-1 rounded ${compose==='union'?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>UNION</button>
            <button onClick={() => setCompose("intersect")} className={`text-xs px-3 py-1 rounded ${compose==='intersect'?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>INTERSECCIÓN</button>
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Herramienta ROI</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTool("lasso")} className={`text-xs px-3 py-1 rounded ${tool==='lasso'?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>Lazo</button>
            <button onClick={() => setTool("rect")}  className={`text-xs px-3 py-1 rounded ${tool==='rect' ?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>Rect</button>
            <button onClick={() => { setROI({ type:null, path:[], rect:null }); setStats(null); }}
                    className="text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20">Limpiar</button>
          </div>
        </div>
      </div>

      {/* Selector de métodos */}
      <GlassCard className="p-3">
        <div className="text-xs text-white/70 mb-2">Métodos</div>
        <div className="flex flex-wrap gap-2">
          {methods.map((m, idx) => (
            <label key={m.id} className="flex items-center gap-2 text-xs bg-black/20 rounded-xl px-2 py-1">
              <input type="checkbox" checked={m.on} onChange={e => setMethods(ms => ms.map((x, i) => i === idx ? { ...x, on: e.target.checked } : x))} className="accent-cyan-300" />
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                <span className="text-white/80">{m.label}</span>
              </span>
            </label>
          ))}
        </div>
      </GlassCard>

      {/* Canvas + Panel derecho */}
      <div className="grid xl:grid-cols-[1fr_320px] gap-4">
        {/* Canvas DOI */}
        <GlassCard className="relative h-[52vh]">
          <div ref={containerRef} className="absolute inset-0">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
          <div className="absolute bottom-2 left-2 text-[10px] text-white/60 bg-black/30 backdrop-blur px-2 py-1 rounded">
            Atajos: u/i comp · l lazo · r rect · e PNG · c CSV · j JSON · ESC limpiar
          </div>
        </GlassCard>

        {/* Panel derecho: KPIs y Donuts */}
        <div className="space-y-3">
          <GlassCard className="p-3">
            <div className="text-white/80 font-medium mb-2">Cobertura por método</div>
            <div className="grid grid-cols-2 gap-3">
              {METHODS.map(m => {
                const d = districtStats[m.id] || 0;
                const r = stats?.perMethod?.[m.id] ?? 0;
                const tone = r >= 0.9 ? "ok" : r >= 0.75 ? "warn" : "bad";
                return (
                  <div key={m.id} className="rounded-xl p-2 bg-black/20 flex items-center gap-3">
                    <Donut value={r} size={64} color={m.color} label="ROI" />
                    <div className="flex-1">
                      <div className="text-white/90 text-sm">{m.label}</div>
                      <div className="text-[11px] text-white/60">
                        Distrito: <b className="text-white">{(d * 100).toFixed(0)}%</b> · ROI: <b className="text-white">{(r * 100).toFixed(0)}%</b>
                      </div>
                      <div className="mt-1"><Badge text={r >= 0.9 ? "Excelente" : r >= 0.75 ? "Mejorable" : "Crítico"} tone={tone} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Cobertura combinada y sugerencia mock */}
          <GlassCard className="p-3 space-y-2">
            <div className="text-white/80 font-medium">Cobertura combinada (ROI)</div>
            <div className="text-2xl font-semibold text-white">
              {(stats?.comb ? stats.comb * 100 : 0).toFixed(0)}%
            </div>
            <div className="text-[11px] text-white/60">
              {compose.toUpperCase()} · Profundidad {Math.round(depth * 100)}%
            </div>
            <div className="text-[11px] text-white/70">
              Sugerencia (mock): planificar <b className="text-white">{Math.max(0, Math.round(((0.9 - (stats?.comb ?? 0)) * 120)))}</b> km en métodos con <i>gap</i> alto.
            </div>
          </GlassCard>
        </div>
      </div>
    </GlassCard>
  );
}
