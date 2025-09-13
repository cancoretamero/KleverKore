import React from 'react';
import GlassCard from '../components/common/GlassCard';
import Table from './_parts/Table';

export default function MLOps() {
  const runs = [
    { id: 'run_3021', user: 'ana', auc: 0.842, date: '2025-08-19' },
    { id: 'run_3018', user: 'leo', auc: 0.833, date: '2025-08-15' },
    { id: 'run_2999', user: 'sol', auc: 0.824, date: '2025-08-02' },
  ];

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="text-white/80 font-medium">Runs (MLflow)</div>
      </GlassCard>
      <Table
        columns={['Run', 'Usuario', 'PR-AUC', 'Fecha', 'Estado']}
        rows={runs.map((r) => [r.id, r.user, r.auc.toFixed(3), r.date, 'Staging'])}
      />
      <GlassCard className="p-4">
        <div className="text-white/80 font-medium">Model Registry</div>
        <div className="text-white/60 text-sm">
          Staging / Production • Canary • Roll-back (simulado)
        </div>
      </GlassCard>
    </div>
  );
}
