import React from 'react';

export default function Topbar({ scenario, setScenario }) {
  return (
    <div className="flex items-center justify-between px-4 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="text-xs text-white/60">Escenario</div>
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          className="bg-white/10 rounded-lg px-2 py-1 outline-none"
        >
          <option>v1.0_gate3</option>
          <option>v1.1_patch</option>
          <option>v1.2_gate4</option>
        </select>
      </div>
    </div>
  );
}
