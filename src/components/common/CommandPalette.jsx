import React, { useState } from 'react';
import { cx } from '../../lib/cx.js';
import { brand } from '../../theme/brand';

export default function CommandPalette({ open, onClose, onRun }) {
  const [query, setQuery] = useState('');

  const actions = [
    { k: 'Ir a Inicio', cmd: 'open:home' },
    { k: 'Ir a Datos & Ingesta', cmd: 'open:data' },
    { k: 'Ir a Mapas 2D', cmd: 'open:maps2d' },
    { k: 'Ir a Prospectividad 3D', cmd: 'open:prospect3d' },
    { k: 'Ir a Targets & Ranking', cmd: 'open:targets' },
    { k: 'Ir a Drill Designer', cmd: 'open:drill' },
    { k: 'Ir a Gates & Decisión', cmd: 'open:gates' },
    { k: 'Ir a QA/QC & Calibración', cmd: 'open:qaqc' },
    { k: 'Ir a MLOps & Versionado', cmd: 'open:mlops' },
    { k: 'Ir a Entregables', cmd: 'open:export' },
    { k: 'Ir a Copiloto (LLM)', cmd: 'open:copilot' },
    { k: 'Ir a Administración', cmd: 'open:admin' },
    { k: 'Exportar deck', cmd: 'export:deck' },
  ];

  const filtered = actions.filter((a) => a.k.toLowerCase().includes(query.toLowerCase()));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-24" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className={cx('w-[680px] mx-4 rounded-2xl border', brand.glass, brand.border)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe un comando… (⌘/Ctrl+K)"
            className="w-full bg-white/10 rounded-xl px-3 py-2 outline-none"
          />
        </div>
        <div className="max-h-72 overflow-auto">
          {filtered.map((a, i) => (
            <button
              key={i}
              onClick={() => onRun(a.cmd)}
              className="w-full text-left px-4 py-2 hover:bg-white/10 text-white/90"
            >
              {a.k}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-white/60">Sin resultados</div>
          )}
        </div>
      </div>
    </div>
  );
}
