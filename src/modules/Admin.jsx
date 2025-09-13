import React from 'react';
import GlassCard from '../components/common/GlassCard';
import Table from './_parts/Table';

export default function Admin() {
  const rows = [
    ['Inicio', 'Todos'],
    ['Datos & Ingesta', 'Geología / Geofísica / DatosIA / QP / Admin'],
    ['Mapas 2D', 'Todos'],
    ['Prospectividad 3D', 'Todos'],
    ['Targets & Ranking', 'Todos'],
    ['Drill Designer', 'Geología / Geofísica / DatosIA / QP / Admin'],
    ['Gates & Decisión', 'Todos'],
    ['QA/QC & Calibración', 'Todos'],
    ['MLOps & Versionado', 'DatosIA / QP / Admin'],
    ['Entregables', 'Todos'],
    ['Copiloto (LLM)', 'Todos'],
    ['Administración', 'Admin'],
  ];

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="text-white/80 font-medium">Roles & Permisos</div>
        <div className="text-white/60 text-sm">
          RBAC granular (dataset/run-level)
        </div>
      </GlassCard>
      <Table columns={['Módulo', 'Permisos (lectura)']} rows={rows} />
    </div>
  );
}
