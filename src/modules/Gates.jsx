import React from 'react';
import GlassCard from '../components/common/GlassCard';
import Table from './_parts/Table';

export default function Gates() {
  // Datos de prueba: cada pozo con criterios y recomendación (S/N/REV)
  const rows = [
    { pozo: 'H-041', geo: 'S', gf: 'S', eco: 'S', pos: 'S', rec: 'GO' },
    { pozo: 'H-042', geo: 'S', gf: 'N', eco: 'S', pos: 'S', rec: 'REV' },
    { pozo: 'H-043', geo: 'S', gf: 'S', eco: 'N', pos: 'S', rec: 'NO-GO' },
    { pozo: 'H-044', geo: 'S', gf: 'S', eco: 'S', pos: 'N', rec: 'REV' },
  ];

  // Funciones para mostrar etiquetas de color
  function ok() {
    return (
      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
        OK
      </span>
    );
  }
  function no() {
    return (
      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs">
        NO
      </span>
    );
  }
  function rec(v) {
    return v === 'GO' ? (
      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
        GO
      </span>
    ) : v === 'REV' ? (
      <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs">
        REVISAR
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs">
        NO-GO
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="text-white/80 font-medium">Gate — Checklist viva</div>
        <div className="text-white/60 text-sm mt-1">
          Matriz de criterios por pozo (geología, geofísica, económico, posición)
          con chips S/N y recomendación (go/revisar/no-go).
        </div>
      </GlassCard>
      <Table
        columns={[
          'Pozo',
          'Geología',
          'Geofísica',
          'Económico',
          'Posición',
          'Recomendación',
        ]}
        rows={rows.map((r) => [
          r.pozo,
          r.geo === 'S' ? ok() : no(),
          r.gf === 'S' ? ok() : no(),
          r.eco === 'S' ? ok() : no(),
          r.pos === 'S' ? ok() : no(),
          rec(r.rec),
        ])}
      />
    </div>
  );
}
