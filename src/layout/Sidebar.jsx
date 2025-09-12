import React from 'react';
import { cx } from '../lib/cx.js';
import { brand } from '../theme/brand';

export default function Sidebar({ modules, moduleId, setModuleId }) {
  return (
    <aside className="h-full p-3 border-r border-white/10">
      <div className="px-2 py-2 mb-3 text-white/90 font-semibold tracking-wide">
        KleverKore
      </div>
      <nav className="space-y-1 overflow-auto">
        {modules.map((m) => (
          <button
            key={m.id}
            onClick={() => setModuleId(m.id)}
            className={
              moduleId === m.id
                ? cx('w-full text-left px-3 py-2 rounded-xl', 'bg-white/10', brand.border, 'text-cyan-100')
                : cx('w-full text-left px-3 py-2 rounded-xl hover:bg-white/10', brand.border, 'border-transparent', 'text-white/80')
            }
          >
            {m.icon} <span className="ml-2">{m.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
