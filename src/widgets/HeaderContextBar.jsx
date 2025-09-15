import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * HeaderContextBar.jsx
 * -----------------------------------------------------------------------------
 * “Header de Contexto” — software dentro del software (banda 1 de la home).
 *
 * Qué trae:
 * - Selector de VERSIÓN (A/B opcional) con presets (Scout, Delineación, ESG).
 * - Filtros globales: profundidad, estilos de depósito, subzona/corredor.
 * - KPIs vivos: cobertura por método, PR-AUC, Brier, ECE (mock).
 * - Acciones: Guardar/Restaurar Snapshot (clipboard JSON), Export CSV/PNG (resumen),
 *   Reset, Ayuda. Atajos: v/V cambio versión · +/- profundidad · 1..4 estilos · r reset · e csv · p png · j json.
 *
 * Mock-friendly:
 * - Si no pasas props controladas, usa datos falsos internos.
 * - Todos los callbacks son opcionales: onChangeVersion, onFiltersChange, onAction.
 * - No depende de ninguna otra librería (solo React); usa Tailwind para estilos.
 */

function GlassCard({ className = "", children }) {
  return (
    <div className={"rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-lg " + className}>
      {children}
    </div>
  );
}

/* ─────────────────────────── Datos MOCK por defecto ────────────────────── */
const DEFAULT_VERSIONS = ["v1.2_gate3", "v1.3_gate3", "v1.4_gate4"];
const DEFAULT_STYLES = [
  { id: "carlin", label: "Carlin-like", color: "#67e8f9" },
  { id: "epitermal", label: "Epitermal", color: "#f472b6" },
  { id: "porfido", label: "Pórfido", color: "#facc15" },
  { id: "skarn", label: "Skarn/IOCG", color: "#34d399" },
];
const DEFAULT_SUBZONES = ["Corredor A", "Corredor B", "Hotspot NE", "Hotspot SW"];

const METHODS = [
  { id: "mag", label: "Mag", cov: 1.0, color: "#f97316" },
  { id: "rad", label: "Rad", cov: 0.95, color: "#ef4444" },
  { id: "aem", label: "AEM", cov: 0.92, color: "#34d399" },
  { id: "mt",  label: "MT",  cov: 0.68, color: "#60a5fa" },
  { id: "ip",  label: "IP",  cov: 0.72, color: "#9333ea" },
  { id: "hsi", label: "HSI", cov: 0.98, color: "#fde047" },
  { id: "ant", label: "ANT", cov: 0.85, color: "#f472b6" },
];

export default function HeaderContextBar({
  versions = DEFAULT_VERSIONS,
  styles = DEFAULT_STYLES,
  subzones = DEFAULT_SUBZONES,
  // valores controlados opcionales
  valueVersion,
  valueDepth,
  valueStyles,
  valueSubzone,
  modelQuality = { prAuc: 0.92, brier: 0.08, ece: 0.05 },
  // callbacks opcionales
  onChangeVersion,
  onFiltersChange,
  onAction, // (name, payload)
}) {
  /* ------------------------------ Estado base ---------------------------- */
  const [ver, setVer] = useState(valueVersion || versions[versions.length - 1]);
  const [depth, setDepth] = useState(valueDepth ?? 0.5);
  const [selStyles, setSelStyles] = useState(
    valueStyles || styles.map((s) => s.id)
  );
  const [zone, setZone] = useState(valueSubzone || subzones[0]);
  const [help, setHelp] = useState(false);

  // KPIs mock derivados
  const avgCov = useMemo(
    () => METHODS.reduce((s, m) => s + m.cov, 0) / METHODS.length,
    []
  );

  // sincronización controlada
  useEffect(() => { if (valueVersion) setVer(valueVersion); }, [valueVersion]);
  useEffect(() => { if (valueDepth !== undefined) setDepth(valueDepth); }, [valueDepth]);
  useEffect(() => { if (valueStyles) setSelStyles(valueStyles); }, [valueStyles]);
  useEffect(() => { if (valueSubzone) setZone(valueSubzone); }, [valueSubzone]);

  // notificar cambios
  useEffect(() => {
    onFiltersChange?.({ version: ver, depth, styles: selStyles, subzone: zone });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ver, depth, selStyles, zone]);

  /* ------------------------------- Atajos -------------------------------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "v") {
        // siguiente versión
        const i = versions.indexOf(ver);
        const nxt = versions[Math.min(versions.length - 1, i + 1)] || ver;
        setVer(nxt); onChangeVersion?.(nxt);
      }
      if (e.key === "V") {
        // versión anterior
        const i = versions.indexOf(ver);
        const prv = versions[Math.max(0, i - 1)] || ver;
        setVer(prv); onChangeVersion?.(prv);
      }
      if (e.key === "+") setDepth((d) => Math.min(1, d + 0.02));
      if (e.key === "-") setDepth((d) => Math.max(0, d - 0.02));
      if (["1", "2", "3", "4"].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const style = styles[idx]?.id;
        if (style) toggleStyle(style);
      }
      if (e.key.toLowerCase() === "r") resetAll();
      if (e.key.toLowerCase() === "e") exportCSV();
      if (e.key.toLowerCase() === "p") exportPNG();
      if (e.key.toLowerCase() === "j") copySnapshot();
      if (e.key === "?") setHelp((h) => !h);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ver, depth, selStyles, zone]);

  /* ----------------------------- Acciones UI ----------------------------- */
  function toggleStyle(id) {
    setSelStyles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function applyPreset(name) {
    if (name === "scout") {
      setDepth(0.35);
      setSelStyles(["carlin", "epitermal"]);
      setZone(subzones[0]);
    }
    if (name === "deline") {
      setDepth(0.6);
      setSelStyles(["porfido", "skarn"]);
      setZone(subzones[1]);
    }
    if (name === "esg") {
      setDepth(0.4);
      setSelStyles(styles.map((s) => s.id)); // todo
      setZone(subzones[subzones.length - 1]);
    }
    onAction?.("preset", { name });
  }

  function resetAll() {
    setVer(versions[versions.length - 1]);
    setDepth(0.5);
    setSelStyles(styles.map((s) => s.id));
    setZone(subzones[0]);
    onAction?.("reset");
  }

  /* ----------------------------- Export/Import --------------------------- */
  async function copySnapshot() {
    const snap = {
      version: ver,
      depth,
      styles: selStyles,
      subzone: zone,
      modelQuality,
      ts: new Date().toISOString(),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(snap, null, 2));
      onAction?.("snapshot-copied", snap);
    } catch {}
  }

  function exportCSV() {
    const head = ["version", "depth", "styles", "subzone", "avg_cov", "pr_auc", "brier", "ece"].join(",");
    const row = [
      ver,
      depth.toFixed(2),
      selStyles.join("|"),
      zone,
      avgCov.toFixed(3),
      modelQuality.prAuc.toFixed(3),
      modelQuality.brier.toFixed(3),
      modelQuality.ece.toFixed(3),
    ].join(",");
    const blob = new Blob([[head, row].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `header_context_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    onAction?.("export-csv");
  }

  // Export PNG: generamos un snapshot simple de KPIs en un canvas offscreen
  const pngRef = useRef(null);
  useEffect(() => {
    const cv = pngRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = 820, h = 180;
    cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0b0d0e"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "14px ui-sans-serif";
    ctx.fillText("KleverKore — Header Snapshot", 16, 24);
    ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "12px ui-sans-serif";
    ctx.fillText(`Versión: ${ver}`, 16, 48);
    ctx.fillText(`Profundidad: ${(depth * 100).toFixed(0)}%`, 16, 66);
    ctx.fillText(`Estilos: ${selStyles.join(", ")}`, 16, 84);
    ctx.fillText(`Subzona: ${zone}`, 16, 102);
    ctx.fillText(`Avg.Cov: ${(avgCov * 100).toFixed(0)}%`, 16, 120);
    ctx.fillText(`PR-AUC: ${modelQuality.prAuc.toFixed(3)}  ·  Brier: ${modelQuality.brier.toFixed(3)}  ·  ECE: ${modelQuality.ece.toFixed(3)}`, 16, 138);
  }, [ver, depth, selStyles, zone, avgCov, modelQuality]);

  function exportPNG() {
    const a = document.createElement("a");
    a.href = pngRef.current.toDataURL("image/png");
    a.download = `header_context_${Date.now()}.png`;
    a.click();
    onAction?.("export-png");
  }

  /* --------------------------------- UI ---------------------------------- */
  return (
    <GlassCard className="p-4 space-y-4">
      {/* Línea superior: versión + presets + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xs text-white/60">Versión</div>
            <select
              value={ver}
              onChange={(e) => {
                setVer(e.target.value);
                onChangeVersion?.(e.target.value);
              }}
              className="bg-white/10 rounded px-2 py-1 outline-none text-sm"
            >
              {versions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => applyPreset("scout")}
              className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
              title="Preset: SCOUT"
            >
              SCOUT
            </button>
            <button
              onClick={() => applyPreset("deline")}
              className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
              title="Preset: DELINEACIÓN"
            >
              DELINEACIÓN
            </button>
            <button
              onClick={() => applyPreset("esg")}
              className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20"
              title="Preset: ESG"
            >
              ESG
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            Export CSV
          </button>
          <button onClick={exportPNG} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            Export PNG
          </button>
          <button onClick={copySnapshot} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            Copiar JSON
          </button>
          <button onClick={resetAll} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            Reset
          </button>
          <button onClick={() => setHelp((h) => !h)} className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            ?
          </button>
        </div>
      </div>

      {/* Filtros globales */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Profundidad</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={depth}
            onChange={(e) => setDepth(parseFloat(e.target.value))}
            className="w-full accent-cyan-300"
          />
          <div className="text-[11px] text-cyan-200">{Math.round(depth * 100)}%</div>
        </div>

        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Estilos</div>
          <div className="flex flex-wrap gap-2">
            {styles.map((s) => {
              const on = selStyles.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStyle(s.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${on ? "bg-white/15 text-white border-white/30" : "bg-white/5 text-white/70 border-white/10"}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: s.color }} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-xs text-white/70 mb-1">Subzona</div>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="bg-white/10 rounded px-2 py-1 outline-none w-full text-sm"
          >
            {subzones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-3">
        <GlassCard className="p-3">
          <div className="text-xs uppercase tracking-wider text-white/60">Cobertura media</div>
          <div className="text-2xl font-semibold text-white">{Math.round(avgCov * 100)}%</div>
          <div className="text-[11px] text-white/60 mt-1">Promedio de métodos activos</div>
        </GlassCard>
        <GlassCard className="p-3">
          <div className="text-xs uppercase tracking-wider text-white/60">PR-AUC (global)</div>
          <div className="text-2xl font-semibold text-white">{modelQuality.prAuc.toFixed(3)}</div>
          <div className="text-[11px] text-white/60 mt-1">Brier {modelQuality.brier.toFixed(3)} · ECE {modelQuality.ece.toFixed(3)}</div>
        </GlassCard>
        <GlassCard className="p-3">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-2">Cobertura por método</div>
          <ul className="grid grid-cols-2 gap-2 text-[11px] text-white/80">
            {METHODS.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: m.color }} />
                <span className="flex-1">{m.label}</span>
                <b className="text-white">{Math.round(m.cov * 100)}%</b>
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard className="p-3">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-2">Notas</div>
          <textarea className="w-full bg-white/10 rounded p-2 text-[12px] outline-none min-h-[76px]" placeholder="Anota supuestos, cambios de gate, etc." />
        </GlassCard>
      </div>

      {/* Ayuda */}
      {help && (
        <GlassCard className="p-3">
          <div className="text-white/80 font-medium mb-1">Atajos</div>
          <div className="text-[11px] text-white/70">
            v/V cambio versión · +/- profundidad · 1..4 estilos · r reset · e CSV · p PNG · j JSON · ? ayuda
          </div>
        </GlassCard>
      )}

      {/* Canvas oculto para export PNG */}
      <canvas ref={pngRef} className="hidden" width={820} height={180} />
    </GlassCard>
  );
}
