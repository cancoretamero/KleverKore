import React from 'react';
import GlassCard from '../components/common/GlassCard';
import Sparkline from '../components/widgets/Sparkline';

export default function QAQC() {
  return (
    <div className="grid xl:grid-cols-3 gap-4">
      {/* Tablero de geoquímica y QA/QC */}
      <GlassCard className="p-4 xl:col-span-2">
        <div className="text-white/80 font-medium">
          Geoquímica y campo — QA/QC
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
          <div>
            <div className="text-white/60">CRMs (bias/deriva)</div>
            <Sparkline data={[0.1, 0.15, 0.12, 0.2, 0.1, 0.08]} stroke="#fde68a" />
          </div>
          <div>
            <div className="text-white/60">RPD duplicados (%)</div>
            <Sparkline data={[6, 5, 7, 4, 6, 5, 3]} stroke="#86efac" />
          </div>
        </div>
      </GlassCard>
      {/* Calibración del modelo */}
      <GlassCard className="p-4">
        <div className="text-white/80 font-medium">Calibración del modelo</div>
        <div className="text-white/60 text-sm">
          PR-AUC, Brier, Reliability, ECE por bloque (mock).
        </div>
      </GlassCard>
    </div>
  );
}
