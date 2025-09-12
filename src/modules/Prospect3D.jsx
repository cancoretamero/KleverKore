import React, { useState } from 'react';
import NeonGridPanel from '../components/neon/NeonGridPanel';
import GlassCard from '../components/common/GlassCard';
import Sparkline from '../components/widgets/Sparkline';

export default function Prospect3D() {
  const [threshold, setThreshold] = useState(0.7);
  const [mask, setMask] = useState(true);

  return (
    <div className="space-y-4">
      <NeonGridPanel title="Prospectividad 3D — cuerpos segmentados (mock)" height={420} />
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex-1">
            <div className="text-white/80 font-medium">Umbral de probabilidad</div>
            <input
              type="range"
              min={0.3}
              max={0.95}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-cyan-300 mt-1"
            />
            <div className="text-white/60 text-xs">Actual: {threshold.toFixed(2)}</div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={mask}
                onChange={() => setMask((v) => !v)}
                className="accent-cyan-300"
              />
              Máscara DOI
            </label>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          <div>
            <div className="text-white/60">SHAP local (voxel)</div>
            <Sparkline data={[5, 6, 4, 7, 8, 7, 9]} />
          </div>
          <div>
            <div className="text-white/60">Calibración local (reliability)</div>
            <Sparkline data={[0.2, 0.4, 0.5, 0.6, 0.65, 0.7, 0.72]} color="#fca5a5" />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
