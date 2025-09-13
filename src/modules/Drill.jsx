import React, { useState } from 'react';
import NeonGridPanel from '../components/neon/NeonGridPanel';
import GlassCard from '../components/common/GlassCard';
import { useToasts } from '../components/common/Toaster';

export default function Drill() {
  const [lambda, setLambda] = useState(0.5);
  const [threshold, setThreshold] = useState(0.75);
  const { push, UI: ToastUI } = useToasts();

  // Ejemplo de candidatos automáticos (mock)
  const candidates = [
    { id: 1, pad: 'C12', az: 320, plunge: 65, length: 320, EI: 0.76, PI: 0.82 },
    { id: 2, pad: 'C15', az: 270, plunge: 60, length: 250, EI: 0.74, PI: 0.79 },
    { id: 3, pad: 'C20', az: 315, plunge: 70, length: 300, EI: 0.72, PI: 0.76 },
  ];

  function handleCalculate() {
    push('Plan de pozos recalculado (simulado)');
  }

  return (
    <div className="grid xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2">
        <NeonGridPanel title="Candidatos de collar y orientación (mock)" height={420} />
      </div>
      <GlassCard className="p-4 space-y-3">
        <div className="text-white/80 font-medium">Optimización</div>
        <div className="text-white/60 text-xs">
          Σ(EI - λ·L) con restricciones (presupuesto, nº pozos)
        </div>
        <label className="flex items-center justify-between text-sm">
          <span className="text-white/80">λ (costo/metro)</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={lambda}
            onChange={(e) => setLambda(parseFloat(e.target.value))}
            className="accent-cyan-300"
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span className="text-white/80">Umbral P</span>
          <input
            type="range"
            min={0.3}
            max={0.95}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="accent-cyan-300"
          />
        </label>
        <button
          className="mt-2 bg-white/10 hover:bg-white/20 transition px-3 py-2 rounded-xl"
          onClick={handleCalculate}
        >
          Calcular Plan 1–3–1
        </button>
        <div className="mt-4">
          <div className="text-white/80 font-medium mb-2">Propuesta de pozos</div>
          <table className="w-full text-xs">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="text-left px-2 py-1">Pad</th>
                <th className="text-left px-2 py-1">Az (°)</th>
                <th className="text-left px-2 py-1">Plunge (°)</th>
                <th className="text-left px-2 py-1">L (m)</th>
                <th className="text-left px-2 py-1">EI</th>
                <th className="text-left px-2 py-1">PI</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-2 py-1 text-white/80">{c.pad}</td>
                  <td className="px-2 py-1 text-white/80">{c.az}</td>
                  <td className="px-2 py-1 text-white/80">{c.plunge}</td>
                  <td className="px-2 py-1 text-white/80">{c.length}</td>
                  <td className="px-2 py-1 text-white/80">{c.EI.toFixed(2)}</td>
                  <td className="px-2 py-1 text-white/80">{c.PI.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
      {ToastUI}
    </div>
  );
}
