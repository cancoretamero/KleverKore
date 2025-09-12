import React, { useState } from 'react';
import NeonGridPanel from '../components/neon/NeonGridPanel';
import GlassCard from '../components/common/GlassCard';

export default function Maps2D() {
  const [layers, setLayers] = useState({
    prospectividad: true,
    'K–eU–eTh': false,
    lineamientos: false,
    'Máscara DOI': true,
  });

  function toggleLayer(key) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="grid xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2">
        <NeonGridPanel title="Mapa 2D (mock COG + capas)" height={420} />
      </div>
      <GlassCard className="p-4 space-y-3">
        <div className="text-white/80 font-medium">Leyenda & Estilo</div>
        {Object.keys(layers).map((key, i) => (
          <label key={i} className="flex items-center justify-between text-sm">
            <span className="text-white/80">{key}</span>
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={() => toggleLayer(key)}
              className="accent-cyan-300"
            />
          </label>
        ))}
        <div className="mt-3">
          {Object.entries(layers).map(([k, v], i) => (
            <div key={i} className="flex items-center justify-between text-xs text-white/60">
              <span>{k}</span>
              <span>{v ? 'On' : 'Off'}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
