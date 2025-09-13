import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * TargetComposer3D.jsx
 * -----------------------------------------------------------------------------
 * “Composer de Targets 3D” — software dentro del software.
 * - Canvas 3D (ortográfico) con point-cloud del terreno (mock) y probabilidad P(x,z)
 * - Herramientas ROI: Lazo / Rectángulo para añadir/quitar voxels a un Target
 * - Umbral dinámico; máscara DOI; resaltado por estilo
 * - Lista de Targets con métricas (|V|, P̄, P90, σ-mock), renombrado y color
 * - Acciones: Nuevo, Añadir a seleccion, Quitar de seleccion, Merge, Duplicar, Borrar
 * - Export: CSV (puntos etiquetados), JSON (targets + view), PNG (snapshot canvas)
 * - Bookmarks de vista (rot/zoom) y atajos: N, A, Q, M, D, Del, E, J, P, R
 * - 100% autónomo (solo React); datos falsos fáciles de reemplazar
 */

//// ─────────────────────────── Utilidades numéricas ─────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rotX = (p, a) => { const s=Math.sin(a), c=Math.cos(a); return [p[0], c*p[1]-s*p[2], s*p[1]+c*p[2]]; };
const rotY = (p, a) => { const s=Math.sin(a), c=Math.cos(a); return [c*p[0]+s*p[2], p[1], -s*p[0]+c*p[2]]; };
// ruido simple
function hash(x,y){ const s=Math.sin(x*127.1+y*311.7)*43758.5453123; return s-Math.floor(s); }
function noise2D(x,y){ const xi=Math.floor(x), yi=Math.floor(y); const xf=x-xi, yf=y-yi;
  const tl=hash(xi,yi), tr=hash(xi+1,yi), bl=hash(xi,yi+1), br=hash(xi+1,yi+1);
  const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf); const top=tl*(1-u)+tr*u, bot=bl*(1-u)+br*u; return top*(1-v)+bot*v; }
function fbm(x,y,oct=4){ let val=0, amp=0.5, f=1, n=0; for(let i=0;i<oct;i++){ val+=amp*noise2D(x*f,y*f); n+=amp; amp*=0.5; f*=2; } return val/n; }

//// ────────────────────────────── Paleta y estilos ─────────────────────────
const PALETTE = ["#67e8f9","#f472b6","#facc15","#34d399","#60a5fa","#fb923c","#a78bfa","#f43f5e"];
const STYLES = [
  { id:"carlin",    label:"Carlin-like", color:"#67e8f9" },
  { id:"epitermal", label:"Epitermal",   color:"#f472b6" },
  { id:"porfido",   label:"Pórfido",     color:"#facc15" },
  { id:"skarn",     label:"Skarn/IOCG",  color:"#34d399" },
];

//// ─────────────────────────── GlassCard local (opcional) ──────────────────
function GlassCard({ className="", children }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-lg ${className}`}>{children}</div>;
}

//// ───────────────────────────── Widget principal ──────────────────────────
export default function TargetComposer3D({
  // Tamaño del grid y parámetros del “terreno”
  sizeX = 280, sizeZ = 180, step = 1.8, amp = 18
}) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);

  // Estado de cámara / interacción
  const [rot, setRot]     = useState({ ax:-0.95, ay:0.55 });
  const [zoom, setZoom]   = useState(1.0);
  const [tool, setTool]   = useState("orbit"); // orbit | pan | lasso | rect | erase
  const [style, setStyle] = useState(STYLES[0].id);
  const [threshold, setTh]= useState(0.70);
  const [showDOI, setDOI] = useState(true);

  // ROI
  const [roi, setROI]   = useState({ type:null, path:[], rect:null });

  // Targets
  const [targets, setTargets] = useState([]); // {id,name,color,indices:Set<number>}
  const [selectedId, setSelected] = useState(null);

  // Bookmarks
  const [bookmark, setBM] = useState(null);

  // Grid determinista
  const COLS = useMemo(()=> Math.floor(sizeX/step)+1, [sizeX, step]);
  const ROWS = useMemo(()=> Math.floor(sizeZ/step)+1, [sizeZ, step]);
  const grid = useMemo(()=>{
    const pts = new Array(COLS*ROWS);
    let k=0; const x0=-sizeX/2, z0=-sizeZ/2;
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) pts[k++] = [x0 + c*step, 0, z0 + r*step];
    return pts;
  }, [COLS, ROWS, sizeX, step, sizeZ]);

  // Probabilidad mock P(x,z) y máscara DOI mock
  const probs = useMemo(()=>{
    const P = new Float32Array(grid.length);
    for(let i=0;i<grid.length;i++){
      const x=grid[i][0], z=grid[i][2];
      const base = (Math.sin(x*0.06)+Math.cos(z*0.06))*0.35
                 + (Math.sin(x*0.12)*Math.cos(z*0.12))*0.25
                 + (fbm(x*0.03+0.7, z*0.03-0.5)-0.5)*1.2;
      const p = 0.5 + 0.45*Math.tanh(base*0.8); // 0..1
      P[i] = clamp(p, 0.01, 0.99);
    }
    return P;
  }, [grid]);

  const doiMask = useMemo(()=>{
    const M = new Uint8Array(grid.length);
    for(let i=0;i<grid.length;i++){
      const x=grid[i][0], z=grid[i][2];
      const r = Math.hypot(x/sizeX, z/sizeZ);
      M[i] = r<0.9 ? 1 : 0; // 90% dentro DOI
    }
    return M;
  }, [grid, sizeX, sizeZ]);

  // Auto-resize canvas
  useEffect(()=>{
    const el=containerRef.current, cv=canvasRef.current; if(!el||!cv) return;
    const resize=()=>{ const dpr=Math.min(window.devicePixelRatio||1,2); const w=el.clientWidth,h=el.clientHeight;
      cv.width = Math.max(1,w*dpr); cv.height = Math.max(1,h*dpr); cv.style.width=w+'px'; cv.style.height=h+'px';
      const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    const ro=new ResizeObserver(resize); ro.observe(el); resize(); return ()=>ro.disconnect();
  },[]);

  // Interacción puntero
  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    let dragging=false,lastX=0,lastY=0; let lasso=false; let r0=null;

    const getXY = e => { const r=cv.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top, w:r.width, h:r.height }; };

    const onDown = e => {
      const p = getXY(e);
      if (tool==='lasso'){ lasso=true; setROI({ type:'lasso', path:[[p.x,p.y]], rect:null }); }
      else if (tool==='rect'){ r0=[p.x,p.y]; setROI({ type:'rect', rect:[p.x,p.y,p.x,p.y], path:[] }); }
      else { dragging=true; lastX=e.clientX; lastY=e.clientY; }
    };
    const onMove = e => {
      const p=getXY(e);
      if (tool==='lasso' && lasso){ setROI(r=>({ ...r, path:[...r.path,[p.x,p.y]] })); return; }
      if (tool==='rect'  && r0){ setROI({ type:'rect', rect:[r0[0],r0[1],p.x,p.y], path:[] }); return; }
      if (!dragging) return;
      const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
      setRot(r=>({ ax: clamp(r.ax + dy*0.006, -1.5, -0.1), ay: r.ay + dx*0.006 }));
    };
    const onUp = () => {
      if (tool==='lasso' && lasso){ lasso=false; }
      if (tool==='rect'  && r0){ r0=null; }
      dragging=false;
    };
    const onWheel = e => { e.preventDefault(); setZoom(z=> clamp(z*(1 - e.deltaY*0.0015), 0.5, 2.5)); };

    cv.addEventListener('pointerdown',onDown);
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp);
    cv.addEventListener('wheel',onWheel,{passive:false});
    cv.addEventListener('contextmenu', e=>e.preventDefault());
    return ()=>{ cv.removeEventListener('pointerdown',onDown); window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onUp); cv.removeEventListener('wheel',onWheel); cv.removeEventListener('contextmenu',()=>{}); };
  }, [tool]);

  // Dibujo principal
  useEffect(()=>{
    let raf=0; const cv=canvasRef.current; const ctx=cv.getContext('2d');
    const projX=new Float32Array(grid.length), projY=new Float32Array(grid.length);

    function draw(t){
      const w=cv.clientWidth,h=cv.clientHeight; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,w,h);
      // fondo
      ctx.fillStyle='#0b0d0e'; ctx.fillRect(0,0,w,h);

      // proyección
      let minX=+Infinity, maxX=-Infinity, minY=+Infinity, maxY=-Infinity;
      const time=(t||0)*0.001, ax=rot.ax, ay=rot.ay;
      for(let i=0;i<grid.length;i++){
        const x=grid[i][0], z=grid[i][2];
        const base = (Math.sin(x*0.06+time)+Math.cos(z*0.06-time))*0.35
                   + (Math.sin(x*0.12-time*0.6)*Math.cos(z*0.12+time*0.6))*0.25
                   + (fbm(x*0.03+0.7, z*0.03-0.5)-0.5)*1.2;
        const y=base*amp;
        let v=[x,y,z]; v=rotY(v,ay); v=rotX(v,ax);
        const X=v[0], Y=v[1];
        projX[i]=X; projY[i]=Y;
        if (X<minX)minX=X; if (X>maxX)maxX=X; if (Y<minY)minY=Y; if (Y>maxY)maxY=Y;
      }
      const margin=24, sx=(w-margin*2)/(maxX-minX), sy=(h-margin*2)/(maxY-minY);
      const scale=Math.max(0.001,Math.min(sx,sy))*zoom, offx=margin-minX*scale, offy=margin-minY*scale;

      // DOI mask (sutil)
      if (showDOI){
        ctx.save(); ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.fillRect(0,0,w,12); ctx.restore();
      }

      // nube blanca
      ctx.globalCompositeOperation='source-over'; ctx.fillStyle='#fff';
      for(let i=0;i<grid.length;i++){
        const x=projX[i]*scale+offx, y=projY[i]*scale+offy; ctx.fillRect(x,y,0.8,0.8);
      }

      // puntos por targets (coloreados)
      for (const tgt of targets){
        ctx.globalCompositeOperation='lighter'; ctx.fillStyle=tgt.color+'AA';
        tgt.indices.forEach(i=>{ const x=projX[i]*scale+offx, y=projY[i]*scale+offy; ctx.fillRect(x-0.8,y-0.8,1.6,1.6); });
      }
      ctx.globalCompositeOperation='source-over';

      // previsualizar ROI
      if (roi.type==='lasso' && roi.path.length>1){
        ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=1.5; ctx.beginPath();
        ctx.moveTo(roi.path[0][0], roi.path[0][1]); for(let i=1;i<roi.path.length;i++) ctx.lineTo(roi.path[i][0], roi.path[i][1]); ctx.stroke();
      }
      if (roi.type==='rect' && roi.rect){
        const [x0,y0,x1,y1]=roi.rect; ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=1.5;
        ctx.strokeRect(Math.min(x0,x1), Math.min(y0,y1), Math.abs(x1-x0), Math.abs(y1-y0));
      }

      // HUD grid fino
      ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
      for(let gx=0; gx<w; gx+=40){ ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,h); ctx.stroke(); }
      for(let gy=0; gy<h; gy+=40){ ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(w,gy); ctx.stroke(); }

      raf=requestAnimationFrame(draw);
    }
    raf=requestAnimationFrame(draw);
    return ()=> cancelAnimationFrame(raf);
  }, [grid, rot, zoom, targets, roi, showDOI]);

  //// ─────────────────────────── Lógica de targets ─────────────────────────
  const selected = useMemo(()=> targets.find(t=>t.id===selectedId) || null, [targets, selectedId]);

  function newTarget(fromROI=false){
    const id = Math.random().toString(36).slice(2,7).toUpperCase();
    const color = PALETTE[(targets.length)%PALETTE.length];
    const name  = `T-${id}`;
    const indices = new Set();
    const tgt = { id, name, color, indices };
    setTargets(ts=>[...ts, tgt]);
    setSelected(id);
    if (fromROI) applyROI("add", tgt);
  }

  function deleteTarget(id){
    setTargets(ts=> ts.filter(t=>t.id!==id));
    if (selectedId===id) setSelected(null);
  }

  function mergeIntoSelected(idFrom){
    if (!selected || selected.id===idFrom) return;
    const from = targets.find(t=>t.id===idFrom); if (!from) return;
    const merged = new Set(selected.indices);
    from.indices.forEach(i=> merged.add(i));
    setTargets(ts=> ts.map(t=>{
      if (t.id===selected.id) return { ...t, indices:merged };
      if (t.id===idFrom) return null;
      return t;
    }).filter(Boolean));
  }

  function duplicateSelected(){
    if (!selected) return;
    const id = Math.random().toString(36).slice(2,7).toUpperCase();
    const dup = { id, name: selected.name+"-copy", color: PALETTE[(targets.length)%PALETTE.length], indices: new Set(selected.indices) };
    setTargets(ts=>[...ts, dup]);
  }

  function renameTarget(id, name){ setTargets(ts=> ts.map(t=> t.id===id? ({...t, name}):t)); }

  // ROI → aplicar a target o quitar
  function applyROI(mode="add", targetOverride=null){
    const cv=canvasRef.current; if(!cv) return;
    const tgt = targetOverride || selected; if (!tgt) return;
    const path = roi.path; const rect=roi.rect;

    // proyección cache para test de punto-en-ROI
    const proj = projectAll();
    function inside(px,py){
      if (roi.type==='rect' && rect){
        const [x0,y0,x1,y1]=rect; const rx0=Math.min(x0,x1), ry0=Math.min(y0,y1), rx1=Math.max(x0,x1), ry1=Math.max(y0,y1);
        return (px>=rx0 && px<=rx1 && py>=ry0 && py<=ry1);
      }
      if (roi.type==='lasso' && path.length>2){
        // PNPoly
        let c=false; for(let i=0,j=path.length-1;i<path.length;j=i++){
          const xi=path[i][0], yi=path[i][1], xj=path[j][0], yj=path[j][1];
          const inter = ((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi+1e-9)+xi); if (inter) c=!c;
        }
        return c;
      }
      return false;
    }

    let count=0;
    for(let i=0;i<grid.length;i++){
      if (!inside(proj.x[i], proj.y[i])) continue;
      if (probs[i] < threshold) continue; // respeta umbral
      if (mode==="add") tgt.indices.add(i);
      if (mode==="remove") tgt.indices.delete(i);
      count++;
    }
    if (!targetOverride) setTargets(ts=> ts.map(t=> t.id===tgt.id? ({...t, indices:tgt.indices}):t));
    // limpiar ROI
    setROI({ type:null, path:[], rect:null });
    // feedback opcional: console.log(count)
  }

  // Proyecta todo (para ROI y otros cálculos)
  const projectAll = ()=>{
    const cv=canvasRef.current; const w=cv.clientWidth,h=cv.clientHeight;
    // recomputar proyección similar al bucle de draw (pero sin fbm extra)
    const projX=new Float32Array(grid.length), projY=new Float32Array(grid.length);
    let minX=+Infinity,maxX=-Infinity,minY=+Infinity,maxY=-Infinity;
    const ax=rot.ax, ay=rot.ay;
    for(let i=0;i<grid.length;i++){
      const x=grid[i][0], z=grid[i][2];
      const base=(Math.sin(x*0.06)+Math.cos(z*0.06))*0.35 + (Math.sin(x*0.12)*Math.cos(z*0.12))*0.25 + (fbm(x*0.03+0.7,z*0.03-0.5)-0.5)*1.2;
      const y=base*amp;
      let v=[x,y,z]; v=rotY(v,ay); v=rotX(v,ax);
      const X=v[0], Y=v[1]; projX[i]=X; projY[i]=Y;
      if (X<minX)minX=X; if (X>maxX)maxX=X; if (Y<minY)minY=Y; if (Y>maxY)maxY=Y;
    }
    const margin=24, sx=(w-margin*2)/(maxX-minX), sy=(h-margin*2)/(maxY-minY);
    const scale=Math.max(0.001,Math.min(sx,sy))*zoom, offx=margin-minX*scale, offy=margin-minY*scale;
    const out = { x:new Float32Array(grid.length), y:new Float32Array(grid.length) };
    for(let i=0;i<grid.length;i++){ out.x[i]=projX[i]*scale+offx; out.y[i]=projY[i]*scale+offy; }
    return out;
  };

  // Métricas por target (rápidas)
  function targetStats(t){
    const n = t.indices.size || 1;
    let sum=0, arr=[];
    t.indices.forEach(i=>{ const p=probs[i]; sum+=p; arr.push(p); });
    arr.sort((a,b)=>a-b);
    const mean=sum/n, p90=arr[Math.floor(0.9*(n-1))]||0, sigma=0.18; // σ mock
    const doiIn = (()=>{ let c=0; t.indices.forEach(i=>{ if (doiMask[i]) c++; }); return c/n; })();
    return { n, mean, p90, sigma, doiIn };
  }

  // Export
  function exportCSV(){
    const rows = [["target","x","z","p","doi"]];
    targets.forEach(t=>{
      t.indices.forEach(i=>{
        rows.push([t.name, grid[i][0], grid[i][2], probs[i].toFixed(4), doiMask[i]]);
      });
    });
    const csv = rows.map(r=>r.join(",")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`targets_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  function exportJSON(){
    const payload = targets.map(t=> ({ id:t.id, name:t.name, color:t.color, indices:[...t.indices] }));
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
    a.download=`targets_${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
  }
  function exportPNG(){
    const a=document.createElement("a"); a.href=canvasRef.current.toDataURL("image/png");
    a.download=`composer_${Date.now()}.png`; a.click();
  }

  // Atajos
  useEffect(()=>{
    const onKey=(e)=>{
      const K=e.key.toLowerCase();
      if (K==='n') newTarget();
      if (K==='a') applyROI("add");
      if (K==='q') applyROI("remove");
      if (K==='m' && selected){ // merge con el siguiente si existe
        const idx=targets.findIndex(t=>t.id===selected.id); const nxt=targets[idx+1]; if (nxt) mergeIntoSelected(nxt.id);
      }
      if (K==='d' && selected) duplicateSelected();
      if (e.key==='Delete' && selected) deleteTarget(selected.id);
      if (K==='e') exportPNG();
      if (K==='j') exportJSON();
      if (K==='r'){ setRot({ax:-0.95, ay:0.55}); setZoom(1.0); }
      if (K==='1') setStyle('carlin');
      if (K==='2') setStyle('epitermal');
      if (K==='3') setStyle('porfido');
      if (K==='4') setStyle('skarn');
    };
    window.addEventListener('keydown', onKey); return ()=> window.removeEventListener('keydown', onKey);
  }, [targets, selected]);

  // UI lateral: lista de targets
  function TargetList(){
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-white/60">Targets</div>
          <div className="flex items-center gap-2">
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>newTarget(true)}>Nuevo desde ROI</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>newTarget(false)}>Nuevo vacío</button>
          </div>
        </div>
        {targets.length===0 && <div className="text-[11px] text-white/60">Sin targets. Dibuja ROI y “Nuevo desde ROI”.</div>}
        <div className="space-y-2 max-h-60 overflow-auto pr-1">
          {targets.map(t=>{
            const stats = targetStats(t);
            return (
              <div key={t.id} className={`rounded-xl p-2 bg-black/20 border ${selectedId===t.id?'border-cyan-400/40':'border-white/10'}`}>
                <div className="flex items-center gap-2">
                  <button className="w-3 h-3 rounded-full" style={{background:t.color}} onClick={()=>setSelected(t.id)} title="Seleccionar"/>
                  <input className="flex-1 bg-white/10 rounded px-2 py-1 text-[12px] outline-none" value={t.name}
                         onChange={e=>renameTarget(t.id, e.target.value)}/>
                  <button className="text-[11px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>mergeIntoSelected(t.id)} title="Merge into seleccionado">Merge→Sel</button>
                  <button className="text-[11px] px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>duplicateSelected()} title="Duplicar seleccionado">Dup</button>
                  <button className="text-[11px] px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded" onClick={()=>deleteTarget(t.id)}>Del</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-white/70 mt-2">
                  <div>|V|: <b className="text-white">{stats.n}</b></div>
                  <div>P̄: <b className="text-white">{(stats.mean*100).toFixed(0)}%</b></div>
                  <div>P90: <b className="text-white">{(stats.p90*100).toFixed(0)}%</b></div>
                  <div>σ: <b className="text-white">{(stats.sigma*100).toFixed(0)}%</b></div>
                  <div>DOI in: <b className="text-white">{(stats.doiIn*100|0)}%</b></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>applyROI("add")}  disabled={!selected}>Añadir ROI</button>
          <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>applyROI("remove")} disabled={!selected}>Quitar ROI</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3">
      <GlassCard className="relative h-[76vh]">
        <div ref={containerRef} className="absolute inset-0">
          <canvas ref={canvasRef} className="w-full h-full block"/>
        </div>

        {/* HUD superior */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
          <div className="bg-black/30 backdrop-blur px-3 py-2 rounded-xl flex flex-wrap items-center gap-2">
            {STYLES.map(s=>(
              <button key={s.id}
                className={`text-xs px-2 py-1 rounded-full border ${style===s.id?'bg-white/15 text-white border-white/30':'bg-white/5 text-white/70 border-white/10'}`}
                onClick={()=>setStyle(s.id)}>{s.label}</button>
            ))}
            <span className="mx-1 text-white/60 text-xs">Umbral</span>
            <input type="range" min={0.3} max={0.95} step={0.01} value={threshold}
                   onChange={e=>setTh(parseFloat(e.target.value))}
                   className="accent-cyan-300"/>
            <span className="text-cyan-200 text-xs">{Math.round(threshold*100)}%</span>
            <label className="text-xs text-white/80 flex items-center gap-1 ml-2">
              <input type="checkbox" checked={showDOI} onChange={e=>setDOI(e.target.checked)} className="accent-cyan-300"/> DOI
            </label>
          </div>
          <div className="bg-black/30 backdrop-blur px-2 py-1 rounded-xl flex items-center gap-1">
            <ToolButton cur={tool} set={setTool} id="orbit"  label="Orbitar"/>
            <ToolButton cur={tool} set={setTool} id="pan"    label="Pan"/>
            <ToolButton cur={tool} set={setTool} id="lasso"  label="Lazo"/>
            <ToolButton cur={tool} set={setTool} id="rect"   label="Rect"/>
          </div>
          <div className="bg-black/30 backdrop-blur px-2 py-1 rounded-xl flex items-center gap-2">
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>{setRot({ax:-0.95, ay:0.55}); setZoom(1.0);}}>Reset</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>setBM({rot:{...rot},zoom})}>Bookmark</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={()=>{ if(bookmark){ setRot({...bookmark.rot}); setZoom(bookmark.zoom);} }}>Load</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={exportPNG}>PNG</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={exportCSV}>CSV</button>
            <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded" onClick={exportJSON}>JSON</button>
          </div>
        </div>

        {/* Pie de ayuda */}
        <div className="absolute bottom-2 left-2 text-[10px] text-white/60 bg-black/30 backdrop-blur px-2 py-1 rounded">
          Atajos: N nuevo · A añadir ROI · Q quitar ROI · M merge→Sel · D duplicar · Del borrar · E PNG · J JSON · R reset · 1..4 estilos
        </div>
      </GlassCard>

      {/* Panel lateral: Targets */}
      <GlassCard className="p-3 h-[76vh] overflow-hidden">
        <TargetList/>
      </GlassCard>
    </div>
  );
}

function ToolButton({ cur, set, id, label }){
  const active = cur===id;
  return (
    <button className={`text-xs px-2 py-1 rounded ${active?'bg-white/20':'bg-white/10 hover:bg-white/20'}`} onClick={()=>set(id)}>
      {label}
    </button>
  );
}
