import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * ProspectivityDecisionCube.jsx
 * ---------------------------------------------------------------------------
 * Widget autónomo (software dentro del software) para explorar prospectividad 3D.
 * - Canvas ortográfico 3D (point-cloud) con arcball/pan/zoom/pinch
 * - Estilos (Carlin/Epitermal/Pórfido/Skarn-IOCG), umbral, DOI, isos P=0.7/0.9
 * - Selección ROI (lazo/rectángulo) con estadísticas (|V|, P̄, σ) en vivo
 * - SHAP local (mock) que reacciona a hover/ROI
 * - Acciones: Promover Target, Densificar, Export PNG, Bookmark vista
 * - Atajos: 1..4 estilos, H toggles HUD, R reset, B bookmark, E export, ? ayuda
 * 
 * Todo es MOCK (fácil de sustituir). Sin dependencias externas (solo React).
 */

/* =============== Utilidades matemáticas & ruido ========================== */
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function noise2D(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const tl = hash(xi, yi), tr = hash(xi + 1, yi), bl = hash(xi, yi + 1), br = hash(xi + 1, yi + 1);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const top = tl * (1 - u) + tr * u, bot = bl * (1 - u) + br * u;
  return top * (1 - v) + bot * v;
}
function fbm(x, y, oct=4) {
  let val = 0, amp = 0.5, f=1, norm=0;
  for (let i=0;i<oct;i++){ val += amp*noise2D(x*f, y*f); norm += amp; amp*=0.5; f*=2; }
  return val / norm;
}
const rotX = (p,a)=>{ const s=Math.sin(a), c=Math.cos(a); return [p[0], c*p[1]-s*p[2], s*p[1]+c*p[2]]; };
const rotY = (p,a)=>{ const s=Math.sin(a), c=Math.cos(a); return [c*p[0]+s*p[2], p[1], -s*p[0]+c*p[2]]; };

/* =============== Estilos & Colores ======================================= */
const STYLES = [
  { id:'carlin',    label:'Carlin-like', color:'#67e8f9' },
  { id:'epitermal', label:'Epitermal',   color:'#f472b6' },
  { id:'porfido',   label:'Pórfido',     color:'#facc15' },
  { id:'skarn',     label:'Skarn/IOCG',  color:'#34d399' },
];

/* =============== SHAP mock =============================================== */
function mockShap(styleId, seed=0) {
  const F = [
    {name:'η alta', sign:+1, w:0.36},
    {name:'σ baja', sign:+1, w:0.28},
    {name:'illita', sign:+1, w:0.22},
    {name:'distancia a falla', sign:-1, w:0.18},
    {name:'Vs bajo', sign:-1, w:0.12},
  ];
  const jitter = (i)=> (Math.sin((i+1)*(seed+1)*1.73)+1)/50; // pequeño ruido
  return F.map((f,i)=> ({ name:f.name, value:f.sign*(f.w+jitter(i)) }));
}

/* =============== HUD helpers ============================================ */
const clamp = (v,lo,hi)=> Math.max(lo, Math.min(hi, v));
const lerp  = (a,b,t)=> a + (b-a)*t;

/* =============== Widget =================================================== */
export default function ProspectivityDecisionCube({
  // Parámetros físicos del grid (mock)
  sizeX = 280, sizeZ = 180, step = 1.6, amp = 18,
}) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);

  /* ---------- Estado de interacción ---------- */
  const [style, setStyle]     = useState(STYLES[0].id);
  const [threshold, setTh]    = useState(0.70);
  const [showDOI, setDOI]     = useState(true);
  const [iso07, setIso07]     = useState(true);
  const [iso09, setIso09]     = useState(true);
  const [rot, setRot]         = useState({ ax:-0.95, ay:0.55 });
  const [zoom, setZoom]       = useState(1.0);
  const [hud, setHUD]         = useState(true);
  const [tool, setTool]       = useState('orbit'); // orbit | pan | lasso | rect
  const [roi, setROI]         = useState({ type:null, path:[], rect:null, stats:null });
  const [bookmark, setBM]     = useState(null);
  const [hoverInfo, setHover] = useState(null);

  /* ---------- Grid determinista ---------- */
  const COLS = useMemo(()=> Math.floor(sizeX/step)+1, [sizeX, step]);
  const ROWS = useMemo(()=> Math.floor(sizeZ/step)+1, [sizeZ, step]);

  const grid = useMemo(()=>{
    const pts = new Array(COLS*ROWS);
    let k=0; const x0=-sizeX/2, z0=-sizeZ/2;
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) pts[k++] = [x0 + c*step, 0, z0 + r*step];
    return pts;
  }, [COLS, ROWS, sizeX, step, sizeZ]);

  /* ---------- Auto-resize canvas ---------- */
  useEffect(()=>{
    const el = containerRef.current, cv = canvasRef.current;
    if(!el || !cv) return;
    let raf=0;
    const doResize=()=>{
      const dpr = Math.min(window.devicePixelRatio||1, 2);
      const w = el.clientWidth, h = el.clientHeight;
      cv.width = Math.max(1,w*dpr); cv.height = Math.max(1,h*dpr);
      cv.style.width = w+'px'; cv.style.height = h+'px';
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    const ro = new ResizeObserver(()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(doResize); });
    ro.observe(el); doResize();
    return ()=>{ ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  /* ---------- Entrada de ratón/trackpad ---------- */
  useEffect(()=>{
    const cv = canvasRef.current; if(!cv) return;
    let dragging=false, lastX=0,lastY=0;
    let lassoActive=false; let rectStart=null;

    const getXY = e => {
      const r=cv.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top, w:r.width, h:r.height };
    };

    const onDown = e => {
      const p = getXY(e);
      if (tool==='lasso'){ lassoActive = true; setROI(r=>({ ...r, type:'lasso', path:[[p.x,p.y]] })); }
      else if (tool==='rect'){ rectStart = [p.x,p.y]; setROI({ type:'rect', rect:[p.x,p.y,p.x,p.y], path:[], stats:null }); }
      else { dragging=true; lastX=e.clientX; lastY=e.clientY; }
    };

    const onMove = e => {
      const p = getXY(e);
      // Hover -> actualiza shap mock/tooltip
      setHover({ x:p.x, y:p.y });

      if (tool==='lasso' && lassoActive){
        setROI(r=>({ ...r, path:[...r.path,[p.x,p.y]] }));
        return;
      }
      if (tool==='rect' && rectStart){
        setROI(r=>({ type:'rect', rect:[rectStart[0],rectStart[1], p.x, p.y], path:[], stats:null }));
        return;
      }
      if (!dragging) return;
      const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
      if (e.buttons===2 || tool==='pan'){ setRot(r=>({ ...r })); setZoom(z=>z); /* pan opcional si aplicas offset world */ }
      else setRot(r=>({ ax: clamp(r.ax + dy*0.006, -1.5, -0.1), ay: r.ay + dx*0.006 }));
    };

    const onUp = e => {
      if (tool==='lasso' && lassoActive){ lassoActive=false; computeROIStats(); }
      if (tool==='rect' && rectStart){ rectStart=null; computeROIStats(); }
      dragging=false;
    };

    const onWheel = e => { e.preventDefault(); setZoom(z=> clamp(z*(1 - e.deltaY*0.0015), 0.5, 2.5)); };

    cv.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    cv.addEventListener('wheel', onWheel, { passive:false });
    cv.addEventListener('contextmenu', e=>e.preventDefault());
    return ()=>{ cv.removeEventListener('pointerdown',onDown); window.removeEventListener('pointermove',onMove); window.removeEventListener('pointerup',onUp); cv.removeEventListener('wheel',onWheel); cv.removeEventListener('contextmenu',()=>{}); };
  }, [tool]);

  /* ---------- Motor de dibujo ---------- */
  useEffect(()=>{
    let raf=0; const cv=canvasRef.current; const ctx=cv.getContext('2d');

    const projX = new Float32Array(grid.length);
    const projY = new Float32Array(grid.length);

    function draw(t){
      const w = cv.clientWidth, h=cv.clientHeight;
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,w,h);
      // fondo
      ctx.fillStyle='#0b0d0e'; ctx.fillRect(0,0,w,h);

      /* ---- 1) Altura pseudo-geológica + proyección ortográfica ---- */
      let minX=+Infinity, maxX=-Infinity, minY=+Infinity, maxY=-Infinity;
      const time = (t||0)*0.001, ax=rot.ax, ay=rot.ay;
      for(let i=0;i<grid.length;i++){
        const x=grid[i][0], z=grid[i][2];
        const base = (Math.sin(x*0.06+time)+Math.cos(z*0.06-time))*0.35
                   + (Math.sin(x*0.12-time*0.6)*Math.cos(z*0.12+time*0.6))*0.25
                   + (fbm(x*0.03+time*0.7, z*0.03-time*0.5)-0.5)*1.2;
        const y = base*amp;
        let v = [x,y,z]; v = rotY(v, ay); v = rotX(v, ax);
        const X = v[0], Y = v[1];
        projX[i]=X; projY[i]=Y;
        if (X<minX)minX=X; if (X>maxX)maxX=X;
        if (Y<minY)minY=Y; if (Y>maxY)maxY=Y;
      }
      const margin=24;
      const sx=(w - margin*2) / (maxX-minX);
      const sy=(h - margin*2) / (maxY-minY);
      const scale = Math.max(0.001, Math.min(sx, sy)) * zoom;
      const offx  = margin - minX*scale;
      const offy  = margin - minY*scale;

      /* ---- 2) DOI mask (opcional) ---- */
      if (showDOI){
        ctx.save();
        const grd = ctx.createLinearGradient(0,0,0,h);
        grd.addColorStop(0,'rgba(255,255,255,0.03)');
        grd.addColorStop(1,'rgba(255,255,255,0.00)');
        ctx.fillStyle=grd; ctx.fillRect(0,0,w,16);
        ctx.restore();
      }

      /* ---- 3) Nube de puntos blanca ---- */
      ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='#ffffff'; const r=0.9;
      for(let i=0;i<grid.length;i++){
        const x = projX[i]*scale + offx;
        const y = projY[i]*scale + offy;
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      }

      /* ---- 4) Isos (mock) según threshold/estilo ---- */
      const styleColor = STYLES.find(s=>s.id===style)?.color || '#67e8f9';
      function drawIso(k, alpha){
        ctx.globalCompositeOperation='lighter';
        ctx.strokeStyle=`${styleColor}80`; ctx.lineWidth=2;
        for(let i=0;i<grid.length;i+=Math.max(1,Math.floor(8/k))){
          const x = projX[i]*scale + offx; const y = projY[i]*scale + offy;
          const g = ctx.createRadialGradient(x,y,0,x,y,18*k);
          g.addColorStop(0, styleColor + (alpha?'cc':'99'));
          g.addColorStop(1, styleColor + '00');
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,18*k,0,Math.PI*2); ctx.fill();
        }
        ctx.globalCompositeOperation='source-over';
      }
      if (iso07) drawIso(0.7, true);
      if (iso09) drawIso(1.0, true);

      /* ---- 5) ROI overlay ---- */
      if (roi.type==='lasso' && roi.path.length>1){
        ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(roi.path[0][0], roi.path[0][1]);
        for(let i=1;i<roi.path.length;i++) ctx.lineTo(roi.path[i][0], roi.path[i][1]);
        ctx.stroke();
      }
      if (roi.type==='rect' && roi.rect){
        const [x0,y0,x1,y1]=roi.rect;
        ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1.5;
        ctx.strokeRect(Math.min(x0,x1), Math.min(y0,y1), Math.abs(x1-x0), Math.abs(y1-y0));
      }

      /* ---- 6) Hover indicator ---- */
      if (hoverInfo){
        ctx.fillStyle='rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(hoverInfo.x, hoverInfo.y, 8, 0, Math.PI*2); ctx.fill();
      }

      /* ---- 7) Grid HUD fino ---- */
      ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
      for(let gx=0; gx<w; gx+=40){ ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,h); ctx.stroke(); }
      for(let gy=0; gy<h; gy+=40){ ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(w,gy); ctx.stroke(); }

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return ()=> cancelAnimationFrame(raf);
  }, [grid, rot, zoom, style, threshold, showDOI, iso07, iso09, hoverInfo]);

  /* ---------- ROI stats (mock) ---------- */
  function computeROIStats(){
    // MOCK: calcula métricas simples basadas en área/umbral, para feedback inmediato.
    let vox = 0, mean = 0.72, sigma = 0.18;
    if (roi.type==='lasso' && roi.path.length>2) vox = Math.round(roi.path.length/2);
    if (roi.type==='rect' && roi.rect){ const [x0,y0,x1,y1] = roi.rect; vox = Math.round(Math.abs(x1-x0)*Math.abs(y1-y0)/150); }
    setROI(r=>({ ...r, stats:{ voxels:vox, mean:mean, sigma:sigma } }));
  }

  /* ---------- Acciones ---------- */
  function exportPNG(){
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = `decision-cube-${Date.now()}.png`; a.click();
  }
  function saveBookmark(){ setBM({ rot:{...rot}, zoom }); }
  function loadBookmark(){ if (!bookmark) return; setRot({ ...bookmark.rot }); setZoom(bookmark.zoom); }

  /* ---------- Ayuda/atajos ---------- */
  useEffect(()=>{
    const onKey=(e)=>{
      if (e.key==='?'){ setHUD(h=>!h); }
      if (e.key==='1') setStyle('carlin');
      if (e.key==='2') setStyle('epitermal');
      if (e.key==='3') setStyle('porfido');
      if (e.key==='4') setStyle('skarn');
      if (e.key==='h' || e.key==='H') setHUD(h=>!h);
      if (e.key==='r' || e.key==='R'){ setRot({ax:-0.95, ay:0.55}); setZoom(1.0); }
      if (e.key==='b' || e.key==='B') saveBookmark();
      if (e.key==='l' || e.key==='L') loadBookmark();
      if (e.key==='e' || e.key==='E') exportPNG();
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [bookmark, rot, zoom]);

  /* ---------- UI (HUD y paneles) ---------- */
  const shap = useMemo(()=> mockShap(style, hoverInfo?.x || 0), [style, hoverInfo]);

  return (
    <div className="relative w-full h-[82vh] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      {/* Canvas */}
      <div ref={containerRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* HUD superior */}
      {hud && (
        <div className="pointer-events-none absolute top-0 left-0 right-0 p-3 flex items-center justify-between gap-3">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 bg-black/30 backdrop-blur px-3 py-2 rounded-xl">
            {STYLES.map(s => (
              <button key={s.id}
                className={`text-xs px-2 py-1 rounded-full border ${s.id===style?'bg-white/15 text-white border-white/30':'bg-white/5 text-white/70 border-white/10'}`}
                onClick={()=>setStyle(s.id)}>{s.label}</button>
            ))}
            <div className="mx-2 h-4 w-px bg-white/20" />
            <span className="text-xs text-white/70 mr-1">Umbral</span>
            <input type="range" min={0.3} max={0.95} step={0.01} value={threshold}
                   onChange={e=>setTh(parseFloat(e.target.value))}
                   className="accent-cyan-300"/>
            <span className="text-xs text-cyan-200">{Math.round(threshold*100)}%</span>
            <div className="mx-2 h-4 w-px bg-white/20" />
            <label className="text-xs text-white/80 flex items-center gap-1">
              <input type="checkbox" checked={showDOI} onChange={e=>setDOI(e.target.checked)} className="accent-cyan-300"/> DOI
            </label>
            <label className="text-xs text-white/80 flex items-center gap-1">
              <input type="checkbox" checked={iso07} onChange={e=>setIso07(e.target.checked)} className="accent-cyan-300"/> Iso 0.7
            </label>
            <label className="text-xs text-white/80 flex items-center gap-1">
              <input type="checkbox" checked={iso09} onChange={e=>setIso09(e.target.checked)} className="accent-cyan-300"/> Iso 0.9
            </label>
          </div>

          <div className="pointer-events-auto flex items-center gap-2 bg-black/30 backdrop-blur px-3 py-2 rounded-xl">
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>setTool('orbit')}>Orbitar</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>setTool('pan')}>Pan</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>setTool('lasso')}>Lazo</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>setTool('rect')}>Rect</button>
            <div className="mx-2 h-4 w-px bg-white/20" />
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={exportPNG}>Export PNG</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={saveBookmark}>Bookmark</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>{setRot({ax:-0.95, ay:0.55}); setZoom(1.0);}}>Reset</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>setHUD(h=>!h)}>HUD {hud?'ON':'OFF'}</button>
          </div>
        </div>
      )}

      {/* Panel lateral derecho: ROI + SHAP */}
      {hud && (
        <div className="pointer-events-none absolute top-16 right-3 w-72 space-y-3">
          <div className="pointer-events-auto bg-black/30 backdrop-blur rounded-xl p-3">
            <div className="text-xs uppercase tracking-wider text-white/60 mb-1">ROI</div>
            <div className="text-[11px] text-white/80">
              {roi.stats
                ? <>Voxels: <b className="text-white">{roi.stats.voxels}</b> · P̄ <b className="text-white">{(roi.stats.mean*100).toFixed(0)}%</b> · σ <b className="text-white">{(roi.stats.sigma*100).toFixed(0)}%</b></>
                : <>Usa <b>lazo</b> o <b>rect</b> para seleccionar una región.</>}
            </div>
            <div className="mt-2 flex gap-2">
              <button className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-200 rounded">Promover Target</button>
              <button className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-200 rounded">Densificar</button>
            </div>
          </div>
          <div className="pointer-events-auto bg-black/30 backdrop-blur rounded-xl p-3">
            <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Explicación local</div>
            {shap.map((f,i)=>(
              <div key={i} className="flex items-center space-x-2 text-[11px] text-white/80 mb-1">
                <span className="w-24 truncate">{f.name}</span>
                <div className="flex-1 h-2 relative bg-white/10 rounded">
                  <div className={`${f.value>=0?'bg-amber-500/70':'bg-sky-500/70'} absolute top-0 h-full rounded`}
                       style={{ left: f.value<0? `${50 - Math.abs(f.value)*100}%` : '50%',
                                width: `${Math.abs(f.value)*100}%` }} />
                  <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/20"/>
                </div>
                <span className="w-10 text-right font-mono text-white">{(f.value*100|0)}%</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-auto bg-black/30 backdrop-blur rounded-xl p-3 text-[11px] text-white/70">
            <b>Atajos</b>: 1..4 estilos · H HUD · R reset · B bookmark · L load · E export · ? ayuda
          </div>
        </div>
      )}
    </div>
  );
}
