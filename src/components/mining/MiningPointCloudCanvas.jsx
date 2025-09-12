import React, { useEffect, useRef, useState, useMemo } from 'react';

/**
 * MINEX VISION — Executive Fake UI (RESTORED + BUGFIXED)
 * - Puntos BLANCOS + blobs de color (8 detecciones por defecto)
 * - HUD completo: barra superior, KPIs izquierda, leyenda inferior, panel de “Capas” a la derecha
 * - Controles: Umbral (slider), toggles (Nube/Blobs/Anillos/Etiquetas), Exportar PNG
 * - Órbita (arrastrar) y zoom (rueda)
 *
 * BUGFIX (previo): "Cannot read properties of undefined (reading '0')"
 *  • Grilla determinista con ROWS/COLS via useMemo -> existe antes del primer frame.
 *  • Proyección en dos pasadas con arrays planos projX/projY de longitud N=ROWS*COLS.
 *  • Bucle de dibujo itera exactamente N.
 *
 * FIX ResizeObserver: observar contenedor + RAF; sin ciclos.
 */

// ---------- Utilidades ----------
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function noise2D(x, y) {
  const xi = Math.floor(x),
    yi = Math.floor(y);
  const xf = x - xi,
    yf = y - yi;
  const tl = hash(xi, yi),
    tr = hash(xi + 1, yi),
    bl = hash(xi, yi + 1),
    br = hash(xi + 1, yi + 1);
  const u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf);
  const top = tl * (1 - u) + tr * u,
    bot = bl * (1 - u) + br * u;
  return top * (1 - v) + bot * v;
}
function fbm(x, y, oct = 4) {
  let value = 0,
    amp = 0.5,
    f = 1,
    n = 0;
  for (let i = 0; i < oct; i++) {
    value += amp * noise2D(x * f, y * f);
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return value / n;
}
function rotateX(p, a) {
  const s = Math.sin(a),
    c = Math.cos(a);
  return [p[0], c * p[1] - s * p[2], s * p[1] + c * p[2]];
}
function rotateY(p, a) {
  const s = Math.sin(a),
    c = Math.cos(a);
  return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]];
}

// ---------- Resize sin bucles ----------
export function computeBackingStoreSize(clientWidth, clientHeight, dpr) {
  return {
    width: Math.max(1, Math.floor(clientWidth * dpr)),
    height: Math.max(1, Math.floor(clientHeight * dpr)),
  };
}
export function shouldResize(prev, next) {
  return prev.w !== next.w || prev.h !== next.h || prev.dpr !== next.dpr;
}
function useCanvasAutoResize(containerRef, canvasRef) {
  useEffect(() => {
    const container = containerRef.current,
      canvas = canvasRef.current;
    if (!container || !canvas) return;
    let state = { w: 0, h: 0, dpr: 0 },
      raf = 0;
    const doResize = (w, h) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const next = { w, h, dpr };
      if (!shouldResize(state, next)) return;
      state = next;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { width, height } = computeBackingStoreSize(
          state.w,
          state.h,
          state.dpr
        );
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${state.w}px`;
        canvas.style.height = `${state.h}px`;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      });
    };
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      const cr = e.contentBoxSize;
      let w = container.clientWidth,
        h = container.clientHeight;
      if (cr) {
        const b = Array.isArray(cr) ? cr[0] : cr;
        w = Math.round(b.inlineSize);
        h = Math.round(b.blockSize);
      }
      doResize(w, h);
    });
    ro.observe(container);
    let mq;
    const detach = (() => {
      try {
        mq = window.matchMedia(
          `(resolution: ${window.devicePixelRatio}dppx)`
        );
        const onChange = () =>
          doResize(container.clientWidth, container.clientHeight);
        mq.addEventListener
          ? mq.addEventListener('change', onChange)
          : mq.addListener(onChange);
        return () => {
          mq.removeEventListener
            ? mq.removeEventListener('change', onChange)
            : mq.removeListener(onChange);
        };
      } catch {
        return () => {};
      }
    })();
    doResize(container.clientWidth, container.clientHeight);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      detach();
    };
  }, [containerRef, canvasRef]);
}

// ---------- Ayudas visuales ----------
export function mapScoreToRadius(score, minDim) {
  const base = minDim * 0.08;
  return Math.max(minDim * 0.05, base + score * minDim * 0.12);
}
export function gaussian2D(dx, dz, sigma) {
  const r2 = dx * dx + dz * dz;
  return Math.exp(-r2 / (2 * sigma * sigma));
}

// Tests mínimos visibles en consola (no modificados) + extra
(function runTinyTests() {
  const r1 = computeBackingStoreSize(100, 50, 2);
  console.assert(
    r1.width === 200 && r1.height === 100,
    'computeBackingStoreSize básico'
  );
  console.assert(
    !shouldResize(
      { w: 100, h: 50, dpr: 2 },
      { w: 100, h: 50, dpr: 2 }
    ),
    'shouldResize: no cambia'
  );
  console.assert(
    shouldResize(
      { w: 100, h: 50, dpr: 2 },
      { w: 101, h: 50, dpr: 2 }
    ),
    'shouldResize: cambia w'
  );
  const g0 = gaussian2D(0, 0, 10),
    g1 = gaussian2D(10, 0, 10);
  console.assert(g0 > g1, 'gaussian falloff');
  console.assert(
    Math.round(mapScoreToRadius(0.5, 100)) >= 17,
    'mapScoreToRadius rango medio'
  );
})();

// ---------- Componente principal ----------
export default function MiningPointCloudCanvas() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  useCanvasAutoResize(containerRef, canvasRef);

  // Escena
  const sizeX = 260,
    sizeZ = 160,
    stepX = 1.2,
    stepZ = 1.2,
    amp = 18;
  const [rot, setRot] = useState({ ax: -0.95, ay: 0.55 });
  const [zoom, setZoom] = useState(1.0);

  // UI state
  const [showCloud, setShowCloud] = useState(true);
  const [showBlobs, setShowBlobs] = useState(true);
  const [showRings, setShowRings] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [threshold, setThreshold] = useState(0.6);

  // Conteos deterministas
  const COLS = useMemo(
    () => Math.floor(sizeX / stepX) + 1,
    []
  );
  const ROWS = useMemo(
    () => Math.floor(sizeZ / stepZ) + 1,
    []
  );

  // Grilla precalculada [x,z]
  const grid = useMemo(() => {
    const arr = new Array(ROWS * COLS);
    let i = 0;
    const x0 = -sizeX / 2,
      z0 = -sizeZ / 2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        arr[i++] = [x0 + c * stepX, z0 + r * stepZ];
      }
    }
    return arr;
  }, [COLS, ROWS]);

  // Tests extra
  (function tinyTests() {
    console.assert(COLS > 0 && ROWS > 0, 'ROWS/COLS > 0');
    console.assert(
      grid.length === ROWS * COLS,
      'grid length = ROWS*COLS'
    );
  })();

  // 8 detecciones (como antes)
  const detections = useRef([
    { id: 'A1', fx: -0.36, fz: -0.12, score: 0.91 },
    { id: 'A2', fx: -0.1, fz: 0.16, score: 0.84 },
    { id: 'A3', fx: 0.12, fz: -0.04, score: 0.77 },
    { id: 'A4', fx: 0.38, fz: 0.1, score: 0.72 },
    { id: 'B1', fx: -0.02, fz: -0.28, score: 0.69 },
    { id: 'B2', fx: 0.3, fz: -0.18, score: 0.66 },
    { id: 'B3', fx: -0.28, fz: 0.28, score: 0.62 },
    { id: 'C1', fx: 0.08, fz: 0.28, score: 0.58 },
  ]);

  const activeCount = useMemo(
    () =>
      detections.current.filter(
        (d) => d.score >= threshold
      ).length,
    [threshold]
  );

  // Interacción
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    let dragging = false,
      lastX = 0,
      lastY = 0;
    const onDown = (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX,
        dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      setRot((r) => ({
        ax: r.ax + dy * 0.005,
        ay: r.ay + dx * 0.005,
      }));
    };
    const onWheel = (e) => {
      e.preventDefault();
      setZoom((z) =>
        Math.max(
          0.6,
          Math.min(2.0, z + (e.deltaY > 0 ? -0.08 : 0.08))
        )
      );
    };
    c.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    c.addEventListener('wheel', onWheel, {
      passive: false,
    });
    return () => {
      c.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
      c.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Render principal
  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;

    const toWorld = (fx, fz) => [
      fx * sizeX * 0.9,
      fz * sizeZ * 0.9,
    ];
    const detWorld = detections.current.map((d) => {
      const [xw, zw] = toWorld(d.fx, d.fz);
      const sigma = 18 + 14 * d.score;
      const weight = 0.7 + 0.6 * d.score;
      return { ...d, xw, zw, sigma, weight };
    });

    const N = grid.length;
    const projX = new Float32Array(N);
    const projY = new Float32Array(N);

    function draw(t) {
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0f1112';
      ctx.fillRect(0, 0, w, h);
      const time = (t || 0) * 0.001;
      const ax = rot.ax,
        ay = rot.ay;

      // Pasada 1: proyección + bbox
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (let i = 0; i < N; i++) {
        const x = grid[i][0],
          z = grid[i][1];
        const y =
          (Math.sin(x * 0.06 + time) +
            Math.cos(z * 0.06 - time)) *
            0.35 +
          Math.sin(x * 0.12 - time * 0.6) *
            Math.cos(z * 0.12 + time * 0.6) *
            0.25 +
          (fbm(
            x * 0.03 + time * 0.7,
            z * 0.03 - time * 0.5
          ) -
            0.5) *
            1.2;
        const vy = y * amp;
        let v = [x, vy, z];
        v = rotateY(v, ay);
        v = rotateX(v, ax);
        const x2 = v[0],
          y2 = v[1];
        projX[i] = x2;
        projY[i] = y2;
        if (x2 < minX) minX = x2;
        if (x2 > maxX) maxX = x2;
        if (y2 < minY) minY = y2;
        if (y2 > maxY) maxY = y2;
      }
      const margin = 24;
      const sx = (w - margin * 2) / (maxX - minX);
      const sy = (h - margin * 2) / (maxY - minY);
      const scale = Math.max(
        0.001,
        Math.min(sx, sy)
      ) * zoom;
      const offx = margin - minX * scale;
      const offy = margin - minY * scale;

      // Nube de puntos BLANCA
      if (showCloud) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        const r = 1.1;
        for (let i = 0; i < N; i++) {
          const sx2 = projX[i] * scale + offx;
          const sy2 = projY[i] * scale + offy;
          ctx.beginPath();
          ctx.arc(sx2, sy2, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Blobs coloreados con anillos/etiquetas
      if (showBlobs) {
        ctx.globalCompositeOperation = 'lighter';
        const minDim = Math.min(w, h);
        detWorld
          .filter((d) => d.score >= threshold)
          .forEach((d, idx) => {
            const y =
              (Math.sin(d.xw * 0.06 + time) +
                Math.cos(d.zw * 0.06 - time)) *
                0.35 +
              Math.sin(
                d.xw * 0.12 - time * 0.6
              ) *
                Math.cos(
                  d.zw * 0.12 + time * 0.6
                ) *
                0.25 +
              (fbm(
                d.xw * 0.03 + time * 0.7,
                d.zw * 0.03 - time * 0.5
              ) -
                0.5) *
                1.2;
            const vy = y * amp + 6;
            let v = rotateY(
              rotateX([d.xw, vy, d.zw], ax),
              ay
            );
            const sx2 = v[0] * scale + offx;
            const sy2 = v[1] * scale + offy;
            const R = mapScoreToRadius(
              d.score,
              minDim
            );
            const grad = ctx.createRadialGradient(
              sx2,
              sy2,
              0,
              sx2,
              sy2,
              R
            );
            grad.addColorStop(
              0.0,
              'rgba(255,150,80,0.95)'
            );
            grad.addColorStop(
              0.35,
              'rgba(255,150,80,0.45)'
            );
            grad.addColorStop(
              0.72,
              'rgba(90,170,255,0.22)'
            );
            grad.addColorStop(
              1.0,
              'rgba(90,170,255,0.0)'
            );
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx2, sy2, R, 0, Math.PI * 2);
            ctx.fill();

            if (showRings) {
              const ring =
                R *
                (0.55 +
                  0.05 *
                    Math.sin(time * 6 + idx));
              ctx.strokeStyle =
                'rgba(120,200,255,0.6)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(sx2, sy2, ring, 0, Math.PI * 2);
              ctx.stroke();
            }

            if (showLabels) {
              ctx.globalCompositeOperation =
                'source-over';
              const label = `${d.id}  •  P${Math.round(
                d.score * 100
              )}`;
              ctx.font =
                '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
              const tw =
                ctx.measureText(label).width;
              const lx = sx2 + 10,
                ly =
                  sy2 -
                  R * 0.55 -
                  8;
              ctx.fillStyle =
                'rgba(2,10,16,0.9)';
              ctx.fillRect(
                lx - 6,
                ly - 12,
                tw + 12,
                18
              );
              ctx.strokeStyle =
                'rgba(120,200,255,0.5)';
              ctx.strokeRect(
                lx - 6,
                ly - 12,
                tw + 12,
                18
              );
              ctx.fillStyle =
                'rgba(220,240,255,0.95)';
              ctx.fillText(
                label,
                lx,
                ly + 2
              );
              ctx.globalCompositeOperation =
                'lighter';
            }
          });
        ctx.globalCompositeOperation =
          'source-over';
      }

      // Grid HUD fino
      ctx.strokeStyle =
        'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    rot,
    zoom,
    showCloud,
    showBlobs,
    showRings,
    showLabels,
    threshold,
    grid,
  ]);

  // Exportar PNG
  const exportPNG = () => {
    const canvas = canvasRef.current;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `minex-vision-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[80vh] bg-[#0b0d0e] rounded-2xl overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* HUD/Overlay */}
      <div className="absolute inset-0 text-white/90 pointer-events-none">
        {/* Barra superior */}
        <div className="pointer-events-auto w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-900/40 via-cyan-700/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="text-xs uppercase tracking-widest text-cyan-200/80">
              MINEX VISION
            </div>
            <div className="text-sm font-medium">
              Prospección asistida por IA
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full">
              DEMO
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs opacity-80">
            <div>
              Modelo:{' '}
              <span className="text-cyan-200">
                GeoNet v3
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>Umbral</span>
              <input
                className="accent-cyan-300"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={threshold}
                onChange={(e) =>
                  setThreshold(parseFloat(e.target.value))
                }
              />
              <span className="text-cyan-200">
                {Math.round(threshold * 100)}%
              </span>
            </div>
            <button
              onClick={exportPNG}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition"
            >
              Exportar PNG
            </button>
          </div>
        </div>

        {/* KPIs izquierda */}
        <div className="absolute left-4 top-16 space-y-2">
          <div className="backdrop-blur bg-black/30 rounded-xl px-3 py-2 text-xs">
            <div className="uppercase tracking-wider text-white/60">
              Índice Prospectivo (prom.)
            </div>
            <div className="text-2xl font-semibold leading-none">
              0.74
            </div>
          </div>
          <div className="backdrop-blur bg-black/30 rounded-xl px-3 py-2 text-xs">
            <div className="uppercase tracking-wider text-white/60">
              Anomalías activas
            </div>
            <div className="text-2xl font-semibold leading-none">
              {activeCount}
            </div>
          </div>
          <div className="backdrop-blur bg-black/30 rounded-xl px-3 py-2 text-xs">
            <div className="uppercase tracking-wider text-white/60">
              Confianza modelo
            </div>
            <div className="text-2xl font-semibold leading-none">
              ±6%
            </div>
          </div>
        </div>

        {/* Leyenda inferior */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-80 text-[11px]">
          <div className="backdrop-blur bg-black/30 rounded-xl px-3 py-2">
            <div className="mb-2 flex items-center justify-between text-white/70">
              <span>Baja</span>
              <span>Intensidad de anomalía</span>
              <span>Alta</span>
            </div>
            <div className="h-2 rounded-full bg-gradient-to-r from-sky-300 via-cyan-200 to-orange-400" />
          </div>
        </div>

        {/* Panel derecho: Capas */}
        <div className="pointer-events-auto absolute right-4 top-16 w-64 backdrop-blur bg-black/30 rounded-2xl p-3 space-y-3">
          <div className="text-xs uppercase tracking-wider text-white/70">
            Capas
          </div>
          <label className="flex items-center justify-between text-sm">
            <span className="text-white/80">
              Nube (blanco)
            </span>
            <input
              type="checkbox"
              checked={showCloud}
              onChange={(e) =>
                setShowCloud(e.target.checked)
              }
              className="accent-cyan-300"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="text-white/80">
              Blobs IA
            </span>
            <input
              type="checkbox"
              checked={showBlobs}
              onChange={(e) =>
                setShowBlobs(e.target.checked)
              }
              className="accent-cyan-300"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="text-white/80">
              Anillos de pulso
            </span>
            <input
              type="checkbox"
              checked={showRings}
              onChange={(e) =>
                setShowRings(e.target.checked)
              }
              className="accent-cyan-300"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="text-white/80">
              Etiquetas
            </span>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) =>
                setShowLabels(e.target.checked)
              }
              className="accent-cyan-300"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
