import React from 'react';
import GlassCard from '../components/common/GlassCard';
import Table from './_parts/Table';

export default function DataIngesta() {
  const rows = [
    ['HSI — PRISMA L1', 'validando', 'SNR 23 dB', 'v1.2', 'Promover'],
    ['AEM — SkyTEM', 'listo', 'QF OK', 'v0.9', 'Promover'],
    ['Geoquímica — Lote 2025-08', 'pendiente', '3/120 fallas', 'v1.0', 'Rechazar'],
  ];

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="text-white/80 font-medium">Catálogo (STAC/GeoSciML)</div>
        <div className="text-white/60 text-sm mt-1">Facetas: tipo, fecha, proveedor, SNR, tags</div>
      </GlassCard>
      <Table columns={['Dataset', 'Estado', 'Calidad', 'Versión', 'Acción']} rows={rows} />
    </div>
  );
}
