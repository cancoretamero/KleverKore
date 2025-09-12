import React from 'react';
import GlassCard from '../../components/common/GlassCard';

export default function Table({ columns = [], rows = [] }) {
  return (
    <GlassCard>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="text-left px-3 py-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-white/50">
                  Sin datos
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-white/10 hover:bg-white/5">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-white/80">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
