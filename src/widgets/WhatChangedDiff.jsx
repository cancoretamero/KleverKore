import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * WhatChangedDiff.jsx
 * -----------------------------------------------------------------------------
 * Comparador de versiones/gates — “What Changed?” (software dentro del software)
 * - Dos versiones (A/B) side-by-side con swipe y mapa de DIFERENCIA (Δ = B − A).
 * - Estilo por depósito (Carlin/Epitermal/Pórfido/Skarn-IOCG).
 * - ROI: Lazo/Rect para calcular ΔP̄, Δσ (mock) y distribución (histograma).
 * - Resaltado de cambios |Δ| > umbral, modo absoluto/relativo.
 * - Acciones: Export PNG (diff), Copiar JSON (snapshot + stats), Reset, Ayuda.
 * - Atajos: ←/→ cambia versión B; ↑/↓ cambia versión A; [ ] umbral; l lazo; r rect; s swipe;
 *           d diff; e export; j JSON; ESC limpia ROI.
 * - 100% autónomo (solo React + Canvas). Datos MOCK fáciles de sustituir por reales.
 *
 * Cómo cablearlo después:
 *  - Reemplaza probField(version, style, x, y, w, h) por tu cubo de probabilidad calibrada.
 *  - Pasa las versiones reales como `versions` si quieres (string[]). Si no, usa las MOCK.
 */

/* ────────────────────────── Helpers / utilidades ───────────────────────── */
function GlassCard({ className = "", children }) {
  return (
    <div className={"rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-lg " + className}>
      {children}
    </div>
  );
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)  => a + (b - a) * t;

/* Pequeña PRNG determinista para MOCK */
function seedRand(seed) {
  let s = seed || 1234567;
  return () => (s = Math.imul(48271, s) % 0x7fffffff) / 0x7fffffff;
}

function fbmNoise(rand, x, y, oct = 4) {
  let v = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    const nx = x * f, ny = y * f;
    // pseudo-noise sin/cos + rand determinista para textura suave
    const m = Math.sin(nx * 1.7) * Math.cos(ny * 1.3) + (rand() - 0.5) * 0.15;
    v += a * m; n += a; a *= 0.5; f *= 2;
  }
  return v / n; // ~[-1,1]
}

/** MOCK: probabilidad P para (version, style) en pixel (x,y) de canvas w x h */
function probField(versionStr, styleId, x, y, w, h) {
  const vSeed = Math.abs([...versionStr].reduce((s, c) => s + c.charCodeAt(0), 0)) + 1;
  const sSeed = Math.abs([...styleId].reduce((s, c) => s + c.charCodeAt(0), 0)) + 100;
  const rand  = seedRand(vSeed * 1337 + sSeed * 77);
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const r  = Math.hypot(nx, ny);
  const base = fbmNoise(rand, nx * 2.5, ny * 2.5, 4);
  const ring = Math.cos(r * 3.2 + (vSeed % 10) * 0.2) * 0.25;
  const bias = (styleId === "carlin" ? 0.12 : styleId === "epitermal" ? 0.06 : styleId === "porfido" ? 0.0 : -0.03);
  const p = 0.5 + 0.35 * base + 0.2 * ring + bias;
  return clamp(p, 0.01, 0.99);
}

/* Colormap divergente para Δ: cian (negativo) ↔ gris ↔ naranja (positivo) */
function divergingColor(t) { // t in [-1,1]
  const k = clamp((t + 1) / 2, 0, 1);
  const c0 = [56, 189, 248];  // cian
  const c1 = [120, 120, 130]; // gris
  const c2 = [251, 146, 60];  // naranja
  const mid = k < 0.5 ? c0 : c2;
  const dst = k < 0.5 ? c1 : c2;
  const tt  = k < 0.5 ? k * 2 : (k - 0.5) * 2;
  const r = Math.round(lerp(k < 0.5 ? c0[0] : c1[0], k < 0.5 ? c1[0] : c2[0], tt));
  const g = Math.round(lerp(k < 0.5 ? c0[1] : c1[1], k < 0.5 ? c1[1] : c2[1], tt));
  const b = Math.round(lerp(k < 0.5 ? c0[2] : c1[2], k < 0.5 ? c1[2] : c2[2], tt));
  return `rgb(${r},${g},${b})`;
}

/* ─────────────────────────── Histograma pequeño ────────────────────────── */
function MiniHist({ bins = 21, values = [] }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    if (!values.length) return;
    const min = Math.min(...values), max = Math.max(...values);
    const bw  = w / bins;
    const hist = new Array(bins).fill(0);
    for (const v of values) {
      const t = (v - min) / (max - min + 1e-9);
      const b = Math.min(bins - 1, Math.floor(t * bins));
      hist[b]++;
    }
    const m = Math.max(...hist, 1);
    for (let i = 0; i < bins; i++) {
      const hh = (hist[i] / m) * h;
      ctx.globalAlpha = 0.7; ctx.fillRect(i*bw + 1, h - hh, bw - 2, hh);
    }
    // eje 0
    ctx.globalAlpha = 0.25; ctx.fillRect(0, h-1, w, 1);
  }, [bins, values]);
  return <canvas ref={ref} className="w-full h-16 block rounded" />;
}

/* ─────────────────────────────── Widget ────────────────────────────────── */
export default function WhatChangedDiff({
  versions = ["v1.2_gate3", "v1.3_gate3", "v1.4_gate4"],
  styles   = [
    { id: "carlin",    label: "Carlin-like" },
    { id: "epitermal", label: "Epitermal"   },
    { id: "porfido",   label: "Pórfido"     },
    { id: "skarn",     label: "Skarn/IOCG"  },
  ],
  preferredWidth  = 980,
  preferredHeight = 560,
}) {
  const containerRef = useRef(null);
  const leftRef  = useRef(null);   // mapa versión A
  const rightRef = useRef(null);   // mapa versión B (overlay con swipe)
  const diffRef  = useRef(null);   // mapa Δ
  const [versionA, setA]     = useState(versions[0]);
  const [versionB, setB]     = useState(versions[versions.length - 1]);
  const [styleId, setStyle]  = useState(styles[0].id);
  const [threshold, setTh]   = useState(0.12);   // |Δ| > umbral
  const [relative, setRel]   = useState(false);  // Δrel = (B - A) / (A + eps)
  const [swipe, setSwipe]    = useState(0.5);    // 0..1
  const [tool, setTool]      = useState("swipe");// swipe | lasso | rect
  const [roi, setROI]        = useState({ type: null, path: [], rect: null });
  const [stats, setStats]    = useState(null);
  const [hist, setHist]      = useState([]);
  const [help, setHelp]      = useState(false);

  /* Auto-resize */
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cvs = [leftRef.current, rightRef.current, diffRef.current];
      const w = el.clientWidth || preferredWidth, h = el.clientHeight || preferredHeight;
      cvs.forEach(cv => {
        if (!cv) return;
        cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr);
        cv.style.width = w + "px"; cv.style.height = h + "px";
        cv.getContext("2d").setTransform(dpr,0,0,dpr,0,0);
      });
      drawAll();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Redibujar al cambiar parámetros */
  useEffect(() => { drawAll(); /* eslint-disable react-hooks/exhaustive-deps */ }, [versionA, versionB, styleId, threshold, relative, swipe]);

  /* Interacción ROI */
  useEffect(() => {
    const cv = diffRef.current; if (!cv) return;
    let lasso = false; let r0 = null;
    const getP = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onDown = e => {
      const p = getP(e);
      if (tool === "lasso") { lasso = true; setROI({ type: "lasso", path: [[p.x, p.y]], rect: null }); }
      else if (tool === "rect") { r0 = [p.x, p.y]; setROI({ type: "rect", rect: [p.x, p.y, p.x, p.y], path: [] }); }
    };
    const onMove = e => {
      const p = getP(e);
      if (tool === "lasso" && lasso) { setROI(r => ({ ...r, path: [...r.path, [p.x, p.y]] })); return; }
      if (tool === "rect" && r0)     { setROI({ type: "rect", rect: [r0[0], r0[1], p.x, p.y], path: [] }); return; }
      if (tool === "swipe") {
        // arrastra swipe si haces drag con botón izq
        if (e.buttons & 1) {
          const t = clamp(p.x / (cv.clientWidth || 1), 0, 1);
          setSwipe(t);
        }
      }
    };
    const onUp = () => { if (tool === "lasso" && lasso) lasso = false; if (tool === "rect" && r0) r0 = null; computeStats(); };
    const onKey = e => {
      if (e.key === "Escape") { setROI({ type: null, path: [], rect: null }); setStats(null); setHist([]); }
      if (e.key === "[") setTh(t => clamp(t - 0.02, 0.02, 0.6));
      if (e.key === "]") setTh(t => clamp(t + 0.02, 0.02, 0.6));
      if (e.key.toLowerCase() === "l") setTool("lasso");
      if (e.key.toLowerCase() === "r") setTool("rect");
      if (e.key.toLowerCase() === "s") setTool("swipe");
      if (e.key === "ArrowRight") {
        const i = versions.indexOf(versionB); setB(versions[Math.min(versions.length - 1, i + 1)] || versionB);
      }
      if (e.key === "ArrowLeft") {
        const i = versions.indexOf(versionB); setB(versions[Math.max(0, i - 1)] || versionB);
      }
      if (e.key === "ArrowUp") {
        const i = versions.indexOf(versionA); setA(versions[Math.min(versions.length - 1, i + 1)] || versionA);
      }
      if (e.key === "ArrowDown") {
        const i = versions.indexOf(versionA); setA(versions[Math.max(0, i - 1)] || versionA);
      }
      if (e.key.toLowerCase() === "e") exportPNG();
      if (e.key.toLowerCase() === "j") copyJSON();
      if (e.key === "?") setHelp(h => !h);
    };

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
  }, [tool, versionA, versionB, styleId, threshold, relative, swipe]);

  /* ─────────────────────────── Renderización ───────────────────────────── */
  function drawAll() {
    const left  = leftRef.current, right = rightRef.current, diff = diffRef.current;
    if (!left || !right || !diff) return;
    drawMap(left, versionA, styleId);
    drawMap(right, versionB, styleId);
    drawSwipeOverlay(right, swipe); // recorta para swipe
    drawDiff(diff, versionA, versionB, styleId, threshold, relative, roi);
  }

  function drawMap(canvas, version, style) {
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const img = ctx.getImageData(0, 0, w, h);
    const buf = img.data;
    const step = 2; // muestreo para velocidad
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const p = probField(version, style, x, y, w, h); // 0..1
        const c = Math.round(255 * p);
        for (let dy = 0; dy < step; dy++) {
          for (let dx = 0; dx < step; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            buf[idx] = c; buf[idx+1] = c; buf[idx+2] = c; buf[idx+3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    // marco y etiqueta
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(0,0,w,h);
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "12px ui-sans-serif, system-ui";
    ctx.fillText(version, 8, 16);
  }

  function drawSwipeOverlay(canvas, t) {
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth, h = canvas.clientHeight;
    // máscara: solo muestra [0 .. t*w]
    const xCut = Math.floor(w * t);
    const img  = ctx.getImageData(0, 0, w, h);
    const buf  = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = xCut; x < w; x++) {
        const idx = (y * w + x) * 4;
        buf[idx + 3] = 40; // transparencia en la derecha
      }
    }
    ctx.putImageData(img, 0, 0);
    // línea de swipe
    ctx.strokeStyle = "rgba(99,102,241,0.7)";
    ctx.beginPath(); ctx.moveTo(xCut + 0.5, 0); ctx.lineTo(xCut + 0.5, h); ctx.stroke();
  }

  function drawDiff(canvas, verA, verB, style, thr, rel, roi) {
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const img = ctx.getImageData(0, 0, w, h);
    const buf = img.data;
    const step = 2;
    const deltas = []; // para histograma ROI
    const inROI = mkInROI(roi);
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const a = probField(verA, style, x, y, w, h);
        const b = probField(verB, style, x, y, w, h);
        const d = rel ? (b - a) / (a + 1e-3) : (b - a); // Δ
        const t = clamp(d / 0.5, -1, 1); // normaliza para color
        // destaca si |Δ| > thr
        const strong = Math.abs(d) > thr;
        const col = divergingColor(t);
        const [r,g,b3] = col.match(/\d+/g).map(Number);
        const A = strong ? 255 : 160;
        for (let dy = 0; dy < step; dy++) {
          for (let dx = 0; dx < step; dx++) {
            const idx = ((y + dy) * w + (x + dx)) * 4;
            buf[idx]   = r; buf[idx+1] = g; buf[idx+2] = b3; buf[idx+3] = A;
          }
        }
        if (inROI(x, y)) deltas.push(d);
      }
    }
    ctx.putImageData(img, 0, 0);

    // ROI overlay
    ctx.globalCompositeOperation = "source-over";
    if (roi.type === "lasso" && roi.path.length > 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(roi.path[0][0], roi.path[0][1]);
      for (let i = 1; i < roi.path.length; i++) ctx.lineTo(roi.path[i][0], roi.path[i][1]);
      ctx.stroke();
    }
    if (roi.type === "rect" && roi.rect) {
      const [x0, y0, x1, y1] = roi.rect;
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5;
      ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    }

    // actualiza histograma
    setHist(deltas);
  }

  function mkInROI(roi) {
    if (!roi || !roi.type) return () => false;
    if (roi.type === "rect" && roi.rect) {
      const [x0, y0, x1, y1] = roi.rect;
      const rx0 = Math.min(x0, x1), ry0 = Math.min(y0, y1), rx1 = Math.max(x0, x1), ry1 = Math.max(y0, y1);
      return (x,y) => x >= rx0 && x <= rx1 && y >= ry0 && y <= ry1;
    }
    if (roi.type === "lasso" && roi.path.length > 2) {
      const path = roi.path;
      return (x,y) => {
        // PNPoly
        let c=false; for(let i=0,j=path.length-1;i<path.length;j=i++){
          const xi=path[i][0], yi=path[i][1], xj=path[j][0], yj=path[j][1];
          const inter = ((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/((yj-yi)||1e-9) + xi);
          if (inter) c=!c;
        }
        return c;
      };
    }
    return () => false;
  }

  /* ───────────────────────────── Stats (ROI) ───────────────────────────── */
  function computeStats() {
    const cv = diffRef.current; if (!cv || !roi.type) { setStats(null); setHist([]); return; }
    const w = cv.clientWidth, h = cv.clientHeight;
    const inROI = mkInROI(roi);
    const step = 4;
    let n = 0, sumA = 0, sumB = 0, sumD = 0, arr = [];
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (!inROI(x, y)) continue;
        const a = probField(versionA, styleId, x, y, w, h);
        const b = probField(versionB, styleId, x, y, w, h);
        const d = relative ? (b - a) / (a + 1e-3) : (b - a);
        n++; sumA += a; sumB += b; sumD += d; arr.push(d);
      }
    }
    const mean = v => (arr.length ? arr.reduce((s,x)=>s+x,0)/arr.length : 0);
    const sigma= v => {
      if (!arr.length) return 0;
      const m = mean(arr); return Math.sqrt(arr.reduce((s,x)=>s+(x-m)*(x-m),0)/arr.length);
    };
    setStats({
      n, meanA: n? sumA/n : 0, meanB: n? sumB/n : 0, meanD: n? sumD/n : 0, sigmaD: sigma(arr)
    });
    setHist(arr);
  }

  /* ───────────────────────────── Export ────────────────────────────────── */
  function exportPNG() {
    const a = document.createElement("a");
    a.href = diffRef.current.toDataURL("image/png");
    a.download = `what_changed_${styleId}_${versionA}_vs_${versionB}.png`;
    a.click();
  }
  async function copyJSON() {
    const payload = {
      styleId, versionA, versionB, threshold, relative, swipe, roi, stats, hist,
      ts: new Date().toISOString(),
    };
    try { await navigator.clipboard.writeText(JSON.stringify(payload, null, 2)); } catch {}
  }

  /* ─────────────────────────────── UI ──────────────────────────────────── */
  return (
    <GlassCard className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-white/80 font-medium">What-Changed Diff · Comparador de Gates</div>
          <div className="text-[11px] text-white/60">
            Swipe, ROI y diff Δ{relative ? "rel" : "abs"} · Atajos: ←/→ B · ↑/↓ A · [ ] umbral · l/r ROI · s swipe · e PNG · j JSON · ? ayuda
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPNG} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Export PNG</button>
          <button onClick={copyJSON} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Copiar JSON</button>
          <button onClick={()=>{ setROI({type:null,path:[],rect:null}); setStats(null); setHist([]); }} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">Limpiar ROI</button>
          <button onClick={()=>setHelp(h=>!h)} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">?</button>
        </div>
      </div>

      {/* Controles */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Versión A</div>
          <select value={versionA} onChange={e=>setA(e.target.value)} className="bg-white/10 rounded px-2 py-1 outline-none w-full">
            {versions.map(v=> <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Versión B</div>
          <select value={versionB} onChange={e=>setB(e.target.value)} className="bg-white/10 rounded px-2 py-1 outline-none w-full">
            {versions.map(v=> <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Estilo</div>
          <select value={styleId} onChange={e=>setStyle(e.target.value)} className="bg-white/10 rounded px-2 py-1 outline-none w-full">
            {styles.map(s=> <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Umbral de resaltado |Δ|</div>
          <input type="range" min={0.02} max={0.6} step={0.01} value={threshold} onChange={e=>setTh(parseFloat(e.target.value))} className="w-full accent-cyan-300"/>
          <div className="text-[11px] text-cyan-200">{(threshold*100).toFixed(0)}%</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <label className="text-xs text-white/70 flex items-center gap-2">
            <input type="checkbox" checked={relative} onChange={e=>setRel(e.target.checked)} className="accent-cyan-300"/>
            Δ relativo ((B-A)/A)
          </label>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Herramienta</div>
          <div className="flex gap-2">
            <button onClick={()=>setTool("swipe")} className={`text-xs px-3 py-1 rounded ${tool==='swipe'?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>Swipe</button>
            <button onClick={()=>setTool("lasso")} className={`text-xs px-3 py-1 rounded ${tool==='lasso'?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>Lazo</button>
            <button onClick={()=>setTool("rect")}  className={`text-xs px-3 py-1 rounded ${tool==='rect' ?'bg-white/20':'bg-white/10 hover:bg-white/20'}`}>Rect</button>
          </div>
        </div>
      </div>

      {/* Canvas principal: A/B (swipe) + Diff */}
      <GlassCard className="p-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="relative" style={{ height: 300 }}>
            <div className="absolute inset-0 grid grid-cols-1">
              <canvas ref={leftRef}  className="w-full h-full block rounded" />
              <canvas ref={rightRef} className="w-full h-full block rounded absolute inset-0 pointer-events-none" />
            </div>
            <div className="absolute bottom-2 left-2 text-[10px] text-white/60 bg-black/30 backdrop-blur px-2 py-1 rounded">
              Arrastra en modo <b>Swipe</b> para comparar A/B · {versionA} ↔ {versionB}
            </div>
          </div>
          <div className="relative" style={{ height: 300 }}>
            <canvas ref={diffRef} className="w-full h-full block rounded" />
            <div className="absolute bottom-2 left-2 text-[10px] text-white/60 bg-black/30 backdrop-blur px-2 py-1 rounded">
              Mapa Δ {relative ? "relativo" : "absoluto"} (B − A). Dibuja ROI con <b>lazo</b> o <b>rect</b>.
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Stats ROI + Histograma */}
      <div className="grid md:grid-cols-2 gap-3">
        <GlassCard className="p-3">
          <div className="text-white/80 font-medium mb-2">Estadísticas ROI</div>
          <div className="text-[12px] text-white/80 space-y-1">
            {stats ? (
              <>
                <div>|ROI| px: <b className="text-white">{stats.n}</b></div>
                <div>P̄ A: <b className="text-white">{(stats.meanA*100).toFixed(1)}%</b> · P̄ B: <b className="text-white">{(stats.meanB*100).toFixed(1)}%</b></div>
                <div>Δ̄: <b className="text-white">{(stats.meanD*100).toFixed(1)}%</b> · σ(Δ): <b className="text-white">{(stats.sigmaD*100).toFixed(1)}%</b></div>
              </>
            ) : (
              <>Dibuja un ROI (lazo o rectángulo) en el mapa Δ para ver estadísticas.</>
            )}
          </div>
        </GlassCard>
        <GlassCard className="p-3">
          <div className="text-white/80 font-medium mb-2">Distribución de cambios (ROI)</div>
          <MiniHist bins={21} values={hist} />
        </GlassCard>
      </div>

      {/* Ayuda */}
      {help && (
        <GlassCard className="p-3">
          <div className="text-white/80 font-medium mb-1">Ayuda rápida</div>
          <div className="text-[11px] text-white/70">
            ←/→ cambia versión B · ↑/↓ cambia versión A · [ ] ajusta umbral · l/r ROI · s Swipe · e PNG · j JSON · ESC limpia ROI.
          </div>
        </GlassCard>
      )}
    </GlassCard>
  );
}
