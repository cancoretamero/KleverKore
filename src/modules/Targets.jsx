import React, { useState } from 'react';
import GlassCard from '../components/common/GlassCard';
import { useToasts } from '../components/common/Toaster';

export default function Targets() {
  // Lista inicial de targets con atributos
  const [targets, setTargets] = useState([
    { id: 'T-NE-04', clase: 'A', score: 0.76, p90: 0.62, doi: 0.88 },
    { id: 'T-W-09', clase: 'B', score: 0.63, p90: 0.48, doi: 0.71 },
    { id: 'T-S-12', clase: 'C', score: 0.54, p90: 0.36, doi: 0.60 },
    { id: 'T-E-01', clase: 'A', score: 0.82, p90: 0.68, doi: 0.90 },
    { id: 'T-NW-07', clase: 'B', score: 0.59, p90: 0.40, doi: 0.65 },
  ]);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filterClass, setFilterClass] = useState('all');
  const { push, UI: ToastUI } = useToasts();

  const columns = ['Target', 'Clase', 'Score', 'P90', 'DOI', 'Acción', 'Dossier'];

  // Ordenamiento y filtrado
  const displayTargets = [...targets]
    .filter((t) => filterClass === 'all' || t.clase === filterClass)
    .sort((a, b) => {
      if (sortColumn === null) return 0;
      const keys = ['id', 'clase', 'score', 'p90', 'doi', '', ''];
      const key = keys[sortColumn];
      if (!key) return 0;
      const valA = a[key].toString();
      const valB = b[key].toString();
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

  function handleSort(index) {
    if (sortColumn === index) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(index);
      setSortAsc(true);
    }
  }

  function handlePromote(index) {
    const t = displayTargets[index];
    if (t.clase === 'A') {
      push(`El target ${t.id} ya es clase A.`);
      return;
    }
    const newClass = t.clase === 'B' ? 'A' : 'B';
    setTargets((prev) =>
      prev.map((x) =>
        x.id === t.id ? { ...x, clase: newClass } : x
      )
    );
    push(`El target ${t.id} ha sido promovido a clase ${newClass}.`);
  }

  function handleFilter(clase) {
    setFilterClass(clase);
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 flex flex-col gap-3">
        <div className="text-white/80 font-medium">Ranking de Targets</div>
        <div className="flex flex-wrap gap-2 text-sm">
          {['all', 'A', 'B', 'C'].map((c) => (
            <button
              key={c}
              onClick={() => handleFilter(c)}
              className={`px-3 py-1 rounded-full ${
                filterClass === c
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {c === 'all' ? 'Todos' : `Clase ${c}`}
            </button>
          ))}
        </div>
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
              {displayTargets.map((t, i) => (
                <tr key={i} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-3 py-2 text-white/80">{t.id}</td>
                  <td className="px-3 py-2 text-white/80">{t.clase}</td>
                  <td className="px-3 py-2 text-white/80">{t.score.toFixed(2)}</td>
                  <td className="px-3 py-2 text-white/80">{t.p90.toFixed(2)}</td>
                  <td className="px-3 py-2 text-white/80">{Math.round(t.doi * 100)}%</td>
                  <td className="px-3 py-2 text-white/80">
                    <button
                      onClick={() => handlePromote(i)}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs"
                    >
                      {t.clase === 'C' ? 'Promover a B' : t.clase === 'B' ? 'Promover a A' : '—'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-white/80">
                    <button
                      onClick={() => push(`Abriendo dossier del ${t.id}…`)}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs"
                    >
                      Ver dossier
                    </button>
                  </td>
                </tr>
              ))}
              {displayTargets.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-center text-white/50">
                    No hay targets que coincidan con el filtro.
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
