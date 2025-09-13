import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * CalibrationReliabilityLab.jsx
 * ---------------------------------------------------------------------------
 * Laboratorio de Calibración & Fiabilidad — software dentro del software.
 * - Dataset MOCK por estilo y pliegue (predicciones vs etiquetas)
 * - PR Curve con PR-AUC, umbral interactivo y baseline
 * - Reliability diagram (calibration curve) con histograma de confianza
 * - Métricas: PR-AUC, Brier score, ECE, F1, Acc, matriz de confusión
 * - Temperature scaling (T) en vivo: p' = σ(logit(p)/T)
 * - Selectores: Estilo, Pliegue, Umbral, Nº bins; atajos de teclado
 * - Export: PNG de gráficos, CSV de tabla de calibración, snapshot JSON
 * - 100% autónomo (solo React); datos fáciles de sustituir por reales
 *
 * Atajos:  +/- umbral  ·  [ ] bins  ·  t reset T=1  ·  p export PR  ·  c export calib CSV
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

/* ------------------------------- Utils ---------------------------------- */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const logit = (p) => Math.log(p / (1 - p));
function tempScale(p, T) {
  p = clamp(p, 1e-6, 1 - 1e-6);
  return sigmoid(logit(p) / T);
}
function randn(seed) {
  // Box-Muller con semilla simple
  const s1 = Math.sin((seed * 9301 + 49297) % 233280) * 0.5 + 0.5;
  const s2 = Math.sin((seed * 233280 + 9301) % 49297) * 0.5 + 0.5;
  const u1 = Math.max(1e-9, s1);
  const u2 = s2;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/* ---------------------- Dataset MOCK (por estilo/fold) ------------------- */
const STYLES = [
  { id: "carlin", label: "Carlin-like", color: "#67e8f9" },
  { id: "epitermal", label: "Epitermal", color: "#f472b6" },
  { id: "porfido", label: "Pórfido", color: "#facc15" },
  { id: "skarn", label: "Skarn/IOCG", color: "#34d399" },
];

function generateMock(styleId = "carlin", fold = 0, N = 5000) {
  // Distintas mezclas para simular separabilidad por estilo
  const mix = {
    carlin: { posMu: 0.75, posSig: 0.12, negMu: 0.25, negSig: 0.12, pi: 0.28 },
    epitermal: { posMu: 0.70, posSig: 0.15, negMu: 0.30, negSig: 0.15, pi: 0.22 },
    porfido: { posMu: 0.65, posSig: 0.18, negMu: 0.35, negSig: 0.18, pi: 0.20 },
    skarn: { posMu: 0.60, posSig: 0.20, negMu: 0.40, negSig: 0.20, pi: 0.18 },
  }[styleId] || mix.carlin;

  const rng = (i) => randn((fold + 1) * (i + 11) * 13.37);
  const data = new Array(N);
  for (let i = 0; i < N; i++) {
    const y = Math.random() < mix.pi ? 1 : 0;
    const mu = y ? mix.posMu : mix.negMu;
    const sig = y ? mix.posSig : mix.negSig;
    let p = mu + sig * rng(i);
    p = clamp(p, 0.001, 0.999);
    data[i] = { p, y };
  }
  return data;
}

/* --------------------------- Métricas & curvas --------------------------- */
function prCurve(points) {
  // puntos = array de {p, y} -> orden desc por p; devuelve {prec, rec, auc}
  const sorted = [...points].sort((a, b) => b.p - a.p);
  let tp = 0,
    fp = 0;
  const P = points.reduce((s, d) => s + (d.y ? 1 : 0), 0);
  const N = points.length - P;
  const prec = [],
    rec = [];
  let lastP = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (lastP !== sorted[i].p) {
      const r = P ? tp / P : 0;
      const p = tp + fp ? tp / (tp + fp) : 1;
      prec.push(p);
      rec.push(r);
      lastP = sorted[i].p;
    }
    if (sorted[i].y) tp++;
    else fp++;
  }
  prec.push(prec[prec.length - 1] || 1);
  rec.push(1);
  // AUC por trapecios
  let auc = 0;
  for (let i = 1; i < prec.length; i++) {
    const dx = rec[i] - rec[i - 1];
    const m = (prec[i] + prec[i - 1]) / 2;
    auc += dx * m;
  }
  return { prec, rec, auc, P, N };
}

function calibrationBins(points, bins = 10) {
  // Devuelve tabla [{bin, conf, acc, n}] y ECE, Brier
  const B = Math.max(2, Math.min(50, Math.round(bins)));
  const acc = new Array(B).fill(0);
  const conf = new Array(B).fill(0);
  const cnt = new Array(B).fill(0);
  let brierSum = 0;
  for (const d of points) {
    const b = Math.min(B - 1, Math.floor(d.p * B));
    conf[b] += d.p;
    acc[b] += d.y;
    cnt[b] += 1;
    brierSum += (d.p - d.y) * (d.p - d.y);
  }
  const table = [];
  let ece = 0,
    total = points.length;
  for (let b = 0; b < B; b++) {
    if (cnt[b] === 0) {
      table.push({ bin: b, conf: 0, acc: 0, n: 0 });
      continue;
    }
    const meanConf = conf[b] / cnt[b];
    const meanAcc = acc[b] / cnt[b];
    table.push({ bin: b, conf: meanConf, acc: meanAcc, n: cnt[b] });
    ece += (cnt[b] / total) * Math.abs(meanAcc - meanConf);
  }
  const brier = brierSum / total;
  return { table, ece, brier, total };
}

function confusion(points, thr = 0.5) {
  let TP = 0,
    FP = 0,
    FN = 0,
    TN = 0;
  for (const d of points) {
    const pred = d.p >= thr ? 1 : 0;
    if (pred === 1 && d.y === 1) TP++;
    else if (pred === 1 && d.y === 0) FP++;
    else if (pred === 0 && d.y === 1) FN++;
    else TN++;
  }
  const prec = TP + FP ? TP / (TP + FP) : 0;
  const rec = TP + FN ? TP / (TP + FN) : 0;
  const f1 = prec + rec ? (2 * prec * rec) / (prec + rec) : 0;
  const acc = (TP + TN) / (TP + FP + FN + TN);
  return { TP, FP, FN, TN, prec, rec, f1, acc };
}

/* ----------------------------- Canvas charts ----------------------------- */
function drawPR(canvas, rec, prec, auc, theme = "#67e8f9") {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  for (let gx = 0; gx <= w; gx += Math.max(32, w / 10)) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy <= h; gy += Math.max(32, h / 8)) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // baseline (precision = P/(P+N) ≈ media de y) aproximada por el primer punto
  const base = prec.length ? Math.max(0, Math.min(1, prec[1] || prec[0] || 0.5)) : 0.5;
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(0, h * (1 - base));
  ctx.lineTo(w, h * (1 - base));
  ctx.stroke();
  ctx.setLineDash([]);

  // PR curve
  ctx.strokeStyle = theme;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < prec.length; i++) {
    const x = w * rec[i];
    const y = h * (1 - prec[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // AUC label
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(`PR-AUC: ${auc.toFixed(3)}`, 8, 16);
}

function drawReliability(canvas, table, bins, theme = "#f97316") {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  const step = Math.max(32, w / 10);
  for (let gx = 0; gx <= w; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy <= h; gy += step) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // diagonal perfecta
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w, 0);
  ctx.stroke();

  // histograma (barras en la base)
  const maxN = Math.max(...table.map((r) => r.n), 1);
  const bw = w / bins;
  ctx.fillStyle = "rgba(102, 204, 255, 0.18)";
  table.forEach((r, i) => {
    const barH = (r.n / maxN) * (h * 0.25);
    ctx.fillRect(i * bw + 1, h - barH, bw - 2, barH);
  });

  // reliability curve
  ctx.strokeStyle = theme;
  ctx.lineWidth = 2;
  ctx.beginPath();
  table.forEach((r, i) => {
    const x = r.conf * w;
    const y = (1 - r.acc) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

/* -------------------------------- Widget --------------------------------- */
export default function CalibrationReliabilityLab() {
  const [styleId, setStyleId] = useState("carlin");
  const [fold, setFold] = useState(0);
  const [thr, setThr] = useState(0.5);
  const [bins, setBins] = useState(10);
  const [T, setT] = useState(1.0);

  // Atajos
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "+") setThr((t) => clamp(t + 0.02, 0.05, 0.95));
      if (e.key === "-") setThr((t) => clamp(t - 0.02, 0.05, 0.95));
      if (e.key === "[") setBins((b) => clamp(b - 1, 5, 30));
      if (e.key === "]") setBins((b) => clamp(b + 1, 5, 30));
      if (e.key.toLowerCase() === "t") setT(1.0);
      if (e.key.toLowerCase() === "p") exportPNG(prRef, "pr_curve");
      if (e.key.toLowerCase() === "c") exportCalibrationCSV();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Dataset mock
  const raw = useMemo(() => generateMock(styleId, fold, 6000), [styleId, fold]);

  // Temperature scaling + copias derivadas
  const data = useMemo(() => raw.map((d) => ({ y: d.y, p: tempScale(d.p, T) })), [raw, T]);

  // PR curve & metrics
  const pr = useMemo(() => prCurve(data), [data]);

  // Calibration
  const calib = useMemo(() => calibrationBins(data, bins), [data, bins]);

  // Confusion & F1/Acc
  const cm = useMemo(() => confusion(data, thr), [data, thr]);

  // Refs lienzos
  const prRef = useRef(null);
  const relRef = useRef(null);

  // Render canvas
  useEffect(() => {
    if (prRef.current) drawPR(prRef.current, pr.rec, pr.prec, pr.auc, STYLES.find(s=>s.id===styleId)?.color);
  }, [pr, styleId]);
  useEffect(() => {
    if (relRef.current) drawReliability(relRef.current, calib.table, bins, "#f97316");
  }, [calib, bins]);

  /* --------------------------- Export helpers --------------------------- */
  function exportPNG(ref, name) {
    const a = document.createElement("a");
    a.href = ref.current.toDataURL("image/png");
    a.download = `${name}_${styleId}_fold${fold}.png`;
    a.click();
  }
  function exportCalibrationCSV() {
    const head = ["bin", "conf", "acc", "n"].join(",");
    const lines = calib.table.map((r) => [r.bin, r.conf.toFixed(4), r.acc.toFixed(4), r.n].join(","));
    const csv = [head, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `calibration_${styleId}_fold${fold}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function copySnapshotJSON() {
    const snap = {
      styleId,
      fold,
      T,
      thr,
      bins,
      prAuc: pr.auc,
      ece: calib.ece,
      brier: calib.brier,
      confusion: cm,
      ts: new Date().toISOString(),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(snap, null, 2));
    } catch {}
  }

  /* -------------------------------- UI ---------------------------------- */
  return (
    <GlassCard className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white/80 font-medium">Calibration & Reliability Lab</div>
          <div className="text-[11px] text-white/60">
            Ajusta T, umbral y bins. Exporta PNG/CSV o copia el snapshot JSON. Atajos: +/- [ ] t p c
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportPNG(prRef, "pr_curve")}
            className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
          >
            Export PR
          </button>
          <button
            onClick={exportCalibrationCSV}
            className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
          >
            CSV Calib
          </button>
          <button
            onClick={copySnapshotJSON}
            className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
          >
            Copiar JSON
          </button>
        </div>
      </div>

      {/* Controles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Estilo</div>
          <select
            value={styleId}
            onChange={(e) => setStyleId(e.target.value)}
            className="bg-white/10 rounded px-2 py-1 outline-none w-full"
          >
            {STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Pliegue (CV)</div>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={fold}
            onChange={(e) => setFold(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-300"
          />
          <div className="text-[11px] text-cyan-200">fold {fold + 1}/5</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Temperature (T)</div>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.01}
            value={T}
            onChange={(e) => setT(parseFloat(e.target.value))}
            className="w-full accent-cyan-300"
          />
          <div className="text-[11px] text-cyan-200">T = {T.toFixed(2)}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Umbral decisión</div>
          <input
            type="range"
            min={0.2}
            max={0.95}
            step={0.01}
            value={thr}
            onChange={(e) => setThr(parseFloat(e.target.value))}
            className="w-full accent-cyan-300"
          />
          <div className="text-[11px] text-cyan-200">{(thr * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3 sm:col-span-2 lg:col-span-1">
          <div className="text-xs text-white/70 mb-1">Bins (calibración)</div>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={bins}
            onChange={(e) => setBins(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-300"
          />
          <div className="text-[11px] text-cyan-200">{bins} bins</div>
        </div>
        {/* Métricas clave */}
        <div className="bg-black/20 rounded-xl p-3 grid grid-cols-3 gap-2 sm:col-span-2 lg:col-span-2">
          <Metric label="PR-AUC" value={pr.auc} fmt="pct" />
          <Metric label="Brier" value={calib.brier} fmt="dec3" />
          <Metric label="ECE" value={calib.ece} fmt="dec3" />
          <Metric label="F1" value={cm.f1} fmt="dec2" />
          <Metric label="Acc" value={cm.acc} fmt="dec2" />
          <Metric label="Prec/Rec" value={cm.prec} secondary={cm.rec} fmt="pair" />
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard className="p-3">
          <div className="text-white/80 text-sm mb-2">PR Curve</div>
          <div className="relative h-[260px]">
            <canvas ref={prRef} className="w-full h-full block rounded-xl" />
          </div>
        </GlassCard>
        <GlassCard className="p-3">
          <div className="text-white/80 text-sm mb-2">Reliability Diagram</div>
          <div className="relative h-[260px]">
            <canvas ref={relRef} className="w-full h-full block rounded-xl" />
          </div>
        </GlassCard>
      </div>

      {/* Matriz de confusión */}
      <GlassCard className="p-4">
        <div className="text-white/80 font-medium mb-2">Matriz de confusión @ {Math.round(thr*100)}%</div>
        <ConfusionMatrix {...cm} />
      </GlassCard>

      {/* Footer ayuda */}
      <div className="text-[10px] text-white/50">
        Atajos: <b>+</b>/<b>-</b> umbral · <b>[</b>/<b>]</b> bins · <b>t</b> reset T=1 · <b>p</b> export PR · <b>c</b> CSV calib
      </div>
    </GlassCard>
  );
}

/* ----------------------------- Metric chip ------------------------------- */
function Metric({ label, value, fmt = "dec2", secondary }) {
  const format = (v) =>
    fmt === "pct" ? `${(v * 100).toFixed(1)}%` : fmt === "dec3" ? v.toFixed(3) : fmt === "pair" ? `${(value * 100).toFixed(0)}% / ${(secondary * 100).toFixed(0)}%` : v.toFixed(2);
  return (
    <div className="bg-black/20 rounded-xl p-2 text-center">
      <div className="text-[10px] text-white/60">{label}</div>
      <div className="text-white font-semibold">{format(value)}</div>
    </div>
  );
}

/* --------------------------- Confusion matrix ---------------------------- */
function ConfusionMatrix({ TP, FP, FN, TN }) {
  const total = TP + FP + FN + TN || 1;
  const cells = [
    { k: "TP", v: TP, c: "bg-emerald-500/20" },
    { k: "FP", v: FP, c: "bg-rose-500/20" },
    { k: "FN", v: FN, c: "bg-amber-500/20" },
    { k: "TN", v: TN, c: "bg-sky-500/20" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {cells.map((c) => (
        <div key={c.k} className={`rounded-xl p-3 ${c.c}`}>
          <div className="text-white/70">{c.k}</div>
          <div className="text-white font-semibold">{c.v} <span className="text-white/60 text-xs">({Math.round((c.v/total)*100)}%)</span></div>
        </div>
      ))}
    </div>
  );
}
