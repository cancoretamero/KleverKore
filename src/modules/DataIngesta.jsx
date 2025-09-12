import React, { useState } from 'react';
import GlassCard from '../components/common/GlassCard';
import { useToasts } from '../components/common/Toaster';

export default function DataIngesta() {
  const [rows, setRows] = useState([
    { dataset: 'HSI — PRISMA L1', estado: 'validando', calidad: 'SNR 23 dB', version: 'v1.2', accion: 'Promover' },
    { dataset: 'AEM — SkyTEM', estado: 'listo', calidad: 'QF OK', version: 'v0.9', accion: 'Promover' },
    { dataset: 'Geoquímica — Lote 2025-08', estado: 'pendiente', calidad: '3/120 fallas', version: 'v1.0', accion: 'Rechazar' },
  ]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const { push, UI: ToastUI } = useToasts();

  const columns = ['Dataset', 'Estado', 'Calidad', 'Versión', 'Acción'];

  const displayRows = [...rows];
  if (sortColumn !== null) {
    // clave: obtener la propiedad correcta del objeto según el índice de la cabecera
    const keys = ['dataset','estado','calidad','version','accion'];
    const key = keys[sortColumn];
    displayRows.sort((a, b) => {
      const valA = a[key].toString();
      const valB = b[key].toString();
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  function handleSort(index) {
    if (sortColumn === index) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(index);
      setSortAsc(true);
    }
  }

  function handleAction(rowIndex) {
    const row = rows[rowIndex];
    const nuevo = row.accion === 'Promover' ? 'promovido' : 'rechazado';
    push(`Se ha marcado el dataset "${row.dataset}" como ${nuevo}.`);
    // Aquí podrías actualizar el estado de la fila si hiciera falta
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="text-white/80 font-medium">Catálogo (STAC/GeoSciML)</div>
        <div className="text-white/60 text-sm mt-1">Facetas: tipo, fecha, proveedor, SNR, tags</div>
      </GlassCard>
      <GlassCard>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={i}
                    className="text-left px-3 py-2 font-medium cursor-pointer select-none"
                    onClick={() => handleSort(i)}
                  >
                    {c}
                    {sortColumn === i && (sortAsc ? ' ▲' : ' ▼')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={i} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-3 py-2 text-white/80">{row.dataset}</td>
                  <td className="px-3 py-2 text-white/80">{row.estado}</td>
                  <td className="px-3 py-2 text-white/80">{row.calidad}</td>
                  <td className="px-3 py-2 text-white/80">{row.version}</td>
                  <td className="px-3 py-2 text-white/80">
                    <button
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs"
                      onClick={() => handleAction(i)}
                    >
                      {row.accion}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-center text-white/50">
                    Sin datos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
      {ToastUI}
    </div>
  );
}
