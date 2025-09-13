import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * CoverageSNRControl.jsx
 * ---------------------------------------------------------------------------
 * "Centro de Control de Cobertura & SNR" — software dentro del software.
 * - Tablero operativo por método (Mag, Radio, AEM/ZTEM, MT/CSAMT, IP/ERT, HSI, ANT)
 * - KPIs por método: Cobertura %, SNR mediano, DOI in %, última actualización, proveedor
 * - Objetivos globales editables (coverage target, SNR target) con cálculo de GAP
 * - Filtros: búsqueda, min coverage, min SNR, sort por cualquier métrica
 * - Acciones: plan de densificación (mock, km sugeridos), copiar CSV, copiar JSON
 * - Micrográficos: mini gauge (SVG), barras dobles (coverage/SNR), sparkline histórico
 * - Atajos: "/" buscar • "s" alterna orden • "e" export CSV • "r" reset filtros
 * - 100% mock (datos falsos fácilmente sustituibles)
 * - Sin dependencias externas (solo React)
 */

/* ============================== Helpers UI =============================== */

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

function Sparkline({ data = [10, 12, 15, 14, 18, 19, 16], w = 120, h = 36, color = "#67e8f9" }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / ((max - min) || 1)) * h,
  ]);
  const d = pts.map((p, i) => (i ? `L${p[0]},${p[1]}` : `M${p[0]},${p[1]}`)).join(" ");
  return (
    <svg width={w} height={h} aria-label="sparkline">
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function MiniGauge({ value = 0.72, size = 56, grad = ["#67e8f9", "#ff9a62"], label = "" }) {
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const dash = `${C * pct} ${C * (1 - pct)}`;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="mg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={grad[0]} />
            <stop offset="100%" stopColor={grad[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="url(#mg)"
          strokeLinecap="round"
          strokeWidth="8"
          strokeDasharray={dash}
          transform={`rotate(-90 ${cx} ${cy})`}
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[12px] font-semibold text-white">
          {(pct * 100).toFixed(0)}%
        </div>
        {label && <div className="text-[9px] text-white/70">{label}</div>}
      </div>
    </div>
  );
}

function DualBar({ left = 0.7, right = 0.6, color = "#67e8f9" }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative h-2 flex-1 bg-white/10 rounded">
        <div
          className="absolute h-full rounded"
          style={{ width: `${Math.max(0, Math.min(left, 1)) * 100}%`, background: color }}
        />
      </div>
      <div className="relative h-2 flex-1 bg-white/10 rounded">
        <div
          className="absolute h-full rounded"
          style={{ width: `${Math.max(0, Math.min(right, 1)) * 100}%`, background: color }}
        />
      </div>
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
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] ${map[tone] || map.info}`}>
      {text}
    </span>
  );
}

/* =============================== Widget ================================== */

export default function CoverageSNRControl({
  /** Datos por método (puedes sustituirlos por reales) */
  methods = [
    {
      id: "mag",
      label: "Magnetometría",
      coverage: 1.0,
      snr: 0.80,
      doiIn: 0.96,
      provider: "GeoAir",
      lastUpdate: "2025-07-12",
      history: [60, 70, 72, 78, 83, 95, 100],
      color: "#f97316",
    },
    {
      id: "rad",
      label: "Radiometría",
      coverage: 0.95,
      snr: 0.78,
      doiIn: 0.91,
      provider: "AviMap",
      lastUpdate: "2025-05-02",
      history: [40, 55, 65, 75, 86, 92, 95],
      color: "#ef4444",
    },
    {
      id: "aem",
      label: "AEM/ZTEM",
      coverage: 0.92,
      snr: 0.82,
      doiIn: 0.88,
      provider: "AeroEM",
      lastUpdate: "2025-06-20",
      history: [20, 35, 55, 62, 74, 88, 92],
      color: "#34d399",
    },
    {
      id: "mt",
      label: "MT/CSAMT",
      coverage: 0.68,
      snr: 0.60,
      doiIn: 0.75,
      provider: "DeepEM",
      lastUpdate: "2025-07-30",
      history: [5, 10, 20, 35, 50, 60, 68],
      color: "#60a5fa",
    },
    {
      id: "ip",
      label: "IP/Resistividad",
      coverage: 0.72,
      snr: 0.65,
      doiIn: 0.74,
      provider: "TerraIP",
      lastUpdate: "2025-07-28",
      history: [12, 18, 28, 40, 58, 67, 72],
      color: "#9333ea",
    },
    {
      id: "hsi",
      label: "HSI satelital",
      coverage: 0.98,
      snr: 0.92,
      doiIn: 0.99,
      provider: "EMIT/PRISMA",
      lastUpdate: "2025-08-03",
      history: [75, 80, 86, 90, 94, 96, 98],
      color: "#fde047",
    },
    {
      id: "ant",
      label: "ANT sísmica",
      coverage: 0.85,
      snr: 0.75,
      doiIn: 0.82,
      provider: "SeisPassive",
      lastUpdate: "2025-07-05",
      history: [10, 20, 35, 48, 66, 78, 85],
      color: "#f472b6",
    },
  ],
  /** Objetivos globales */
  defaultTargets = { coverage: 0.9, snr: 0.7, doi: 0.9 },
}) {
  const [query, setQuery] = useState("");
  const [minCov, setMinCov] = useState(0);
  const [minSnr, setMinSnr] = useState(0);
  const [sortKey, setSortKey] = useState("gap"); // coverage | snr | doi | gap | label
  const [sortAsc, setSortAsc] = useState(false);

  const [targets, setTargets] = useState(defaultTargets);
  const [plan, setPlan] = useState([]); // plan de densificación mock

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/") {
        e.preventDefault();
        const el = document.getElementById("coverage-search");
        el && el.focus();
      }
      if (e.key.toLowerCase() === "s") setSortAsc((v) => !v);
      if (e.key.toLowerCase() === "e") exportCSV();
      if (e.key.toLowerCase() === "r") {
        setQuery("");
        setMinCov(0);
        setMinSnr(0);
        setSortKey("gap");
        setSortAsc(false);
        setTargets(defaultTargets);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [defaultTargets]);

  // Filtro + sort + métricas derivadas (GAP)
  const rows = useMemo(() => {
    const filtered = methods
      .filter((m) => m.label.toLowerCase().includes(query.toLowerCase()))
      .filter((m) => m.coverage >= minCov && m.snr >= minSnr)
      .map((m) => {
        const gapCov = Math.max(0, targets.coverage - m.coverage);
        const gapSnr = Math.max(0, targets.snr - m.snr);
        const gapDoi = Math.max(0, targets.doi - m.doiIn);
        const gap = gapCov + gapSnr * 0.7 + gapDoi * 0.5; // ponderación simple
        return { ...m, gap, gapCov, gapSnr, gapDoi };
      });

    const sorted = [...filtered].sort((a, b) => {
      const A = a[sortKey] ?? a.label;
      const B = b[sortKey] ?? b.label;
      if (typeof A === "string") return sortAsc ? A.localeCompare(B) : B.localeCompare(A);
      return sortAsc ? A - B : B - A;
    });

    return sorted;
  }, [methods, query, minCov, minSnr, sortKey, sortAsc, targets]);

  // Plan de densificación (mock): km sugeridos ~ gapCov * área distrito (fijo)
  function suggestDensification(m) {
    const KM_PER_UNIT = 120; // mock: 120 km para cerrar 100% de cobertura del distrito
    const km = Math.max(0, Math.round(m.gapCov * KM_PER_UNIT));
    const item = {
      id: m.id,
      method: m.label,
      kmSuggested: km,
      comment: `Elevar cobertura de ${(m.coverage * 100).toFixed(0)}% a ${(targets.coverage * 100).toFixed(0)}%`,
      date: new Date().toISOString().slice(0, 10),
    };
    setPlan((p) => {
      const without = p.filter((x) => x.id !== m.id);
      return [...without, item];
    });
  }

  // Export: CSV del plan + estado
  function exportCSV() {
    const head = ["method", "kmSuggested", "comment", "date"].join(",");
    const lines = plan.map((p) => [p.method, p.kmSuggested, `"${p.comment}"`, p.date].join(","));
    const csv = [head, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coverage_snr_plan_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Copiar JSON al portapapeles (plan + objetivos + snapshot con gaps)
  async function copyJSON() {
    const snapshot = rows.map(({ id, label, coverage, snr, doiIn, gap, gapCov, gapSnr, gapDoi }) => ({
      id,
      label,
      coverage,
      snr,
      doiIn,
      gap,
      gapCov,
      gapSnr,
      gapDoi,
    }));
    const payload = { targets, plan, snapshot, ts: new Date().toISOString() };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {}
  }

  return (
    <GlassCard className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-white/80 font-medium">Cobertura & SNR · Control Center</div>
          <div className="text-[11px] text-white/60">
            Filtra, ajusta objetivos y genera un plan de densificación (mock).
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
            title="Exportar plan a CSV (e)"
          >
            Export CSV
          </button>
          <button
            onClick={copyJSON}
            className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
            title="Copiar snapshot JSON"
          >
            Copiar JSON
          </button>
        </div>
      </div>

      {/* Targets globales */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Objetivo de cobertura</div>
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.01}
            value={targets.coverage}
            onChange={(e) => setTargets({ ...targets, coverage: parseFloat(e.target.value) })}
            className="w-full accent-cyan-300"
          />
          <div className="text-[11px] text-cyan-200">{Math.round(targets.coverage * 100)}%</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Objetivo de SNR</div>
          <input
            type="range"
            min={0.4}
            max={0.95}
            step={0.01}
            value={targets.snr}
            onChange={(e) => setTargets({ ...targets, snr: parseFloat(e.target.value) })}
            className="w-full accent-cyan-300"
          />
          <div className="text-[11px] text-cyan-200">{Math.round(targets.snr * 100)}%</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Objetivo DOI (dentro)</div>
          <input
            type="range"
            min={0.6}
            max={1}
            step={0.01}
            value={targets.doi}
            onChange={(e) => setTargets({ ...targets, doi: parseFloat(e.target.value) })}
            className="w-full accent-cyan-300"
          />
          <div className="text-[11px] text-cyan-200">{Math.round(targets.doi * 100)}%</div>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="coverage-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar método… (/)"
          className="bg-white/10 rounded-xl px-3 py-2 outline-none text-sm w-64"
        />
        <label className="text-xs text-white/70 flex items-center gap-2">
          Min. cobertura
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={minCov}
            onChange={(e) => setMinCov(parseFloat(e.target.value || 0))}
            className="bg-white/10 rounded px-2 py-1 w-20 outline-none"
          />
        </label>
        <label className="text-xs text-white/70 flex items-center gap-2">
          Min. SNR
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={minSnr}
            onChange={(e) => setMinSnr(parseFloat(e.target.value || 0))}
            className="bg-white/10 rounded px-2 py-1 w-20 outline-none"
          />
        </label>
        <label className="text-xs text-white/70 flex items-center gap-2">
          Orden
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="bg-white/10 rounded px-2 py-1 outline-none"
            title="(s) alterna asc/desc"
          >
            <option value="gap">GAP</option>
            <option value="coverage">Cobertura</option>
            <option value="snr">SNR</option>
            <option value="doi">DOI</option>
            <option value="label">Nombre</option>
          </select>
          <button
            title="Alternar asc/desc (s)"
            onClick={() => setSortAsc((v) => !v)}
            className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded"
          >
            {sortAsc ? "ASC" : "DESC"}
          </button>
        </label>
      </div>

      {/* Tabla operativa */}
      <div className="overflow-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="text-left px-3 py-2">Método</th>
              <th className="text-left px-3 py-2">Cobertura / SNR</th>
              <th className="text-left px-3 py-2">DOI</th>
              <th className="text-left px-3 py-2">Histórico</th>
              <th className="text-left px-3 py-2">Proveedor</th>
              <th className="text-left px-3 py-2">Última</th>
              <th className="text-left px-3 py-2">GAP</th>
              <th className="text-left px-3 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              // Severidad visual del GAP
              const tone =
                m.gap < 0.1 ? "ok" : m.gap < 0.25 ? "warn" : "bad";
              return (
                <tr key={m.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ background: m.color }}
                      />
                      <div className="text-white/90">{m.label}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <DualBar left={m.coverage} right={m.snr} color={m.color} />
                    <div className="text-[10px] text-white/60 mt-1">
                      Cov: {(m.coverage * 100).toFixed(0)}% &nbsp;·&nbsp; SNR:{" "}
                      {(m.snr * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <MiniGauge value={m.doiIn} size={56} grad={[m.color, "#ffffff"]} label="DOI" />
                  </td>
                  <td className="px-3 py-2">
                    <Sparkline data={m.history} />
                  </td>
                  <td className="px-3 py-2 text-white/80">{m.provider}</td>
                  <td className="px-3 py-2 text-white/60 text-[12px]">
                    {m.lastUpdate}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      text={m.gap < 0.1 ? "Bajo" : m.gap < 0.25 ? "Medio" : "Alto"}
                      tone={tone}
                    />
                    <div className="text-[10px] text-white/60 mt-1">
                      ΔCov {(m.gapCov * 100).toFixed(0)}% · ΔSNR{" "}
                      {(m.gapSnr * 100).toFixed(0)}% · ΔDOI {(m.gapDoi * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => suggestDensification(m)}
                      className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
                    >
                      Planificar
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-white/50">
                  Sin métodos que cumplan los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Resumen del plan */}
      <div className="bg-black/20 rounded-xl p-3">
        <div className="text-white/80 font-medium mb-1">Plan de densificación (mock)</div>
        {plan.length === 0 ? (
          <div className="text-white/60 text-[12px]">No hay elementos en el plan. Selecciona “Planificar”.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="text-left px-2 py-1">Método</th>
                  <th className="text-left px-2 py-1">Km sugeridos</th>
                  <th className="text-left px-2 py-1">Comentario</th>
                  <th className="text-left px-2 py-1">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((p) => (
                  <tr key={p.id} className="border-t border-white/10">
                    <td className="px-2 py-1 text-white/80">{p.method}</td>
                    <td className="px-2 py-1 text-white">{p.kmSuggested}</td>
                    <td className="px-2 py-1 text-white/70">{p.comment}</td>
                    <td className="px-2 py-1 text-white/60">{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ayuda y atajos */}
      <div className="text-[10px] text-white/50">
        Atajos: <b>/</b> buscar · <b>s</b> asc/desc · <b>e</b> export CSV · <b>r</b> reset filtros
      </div>
    </GlassCard>
  );
}
