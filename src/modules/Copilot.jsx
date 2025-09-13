import React, { useState } from 'react';
import GlassCard from '../components/common/GlassCard';

export default function Copilot() {
  const [q, setQ] = useState('');
  const [msgs, setMsgs] = useState([
    { role: 'system', text: 'Cita capas/SHAP/DOIs/calibración.' },
    { role: 'user', text: '¿Por qué el Target A-03 es A?' },
    {
      role: 'assistant',
      text: 'P=0.76, DOI 88%, SHAP: η↑, illita; calibración OK.',
    },
  ]);

  const send = () => {
    if (!q.trim()) return;
    setMsgs([...msgs, { role: 'user', text: q }]);
    setQ('');
  };

  return (
    <div className="grid xl:grid-cols-3 gap-4">
      <GlassCard className="p-4 xl:col-span-2">
        <div className="text-white/80 font-medium">Chat</div>
        <div className="mt-3 h-80 overflow-auto space-y-2">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={
                (m.role === 'assistant'
                  ? 'bg-cyan-500/10 text-cyan-100'
                  : m.role === 'user'
                  ? 'bg-white/10 text-white'
                  : 'bg-black/20 text-white/70') +
                ' px-3 py-2 rounded-xl max-w-[80%]'
              }
            >
              {m.text}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="/explicar A-03…"
            className="flex-1 bg-white/10 rounded-xl px-3 py-2 outline-none"
          />
          <button
            onClick={send}
            className="bg-white/10 hover:bg-white/20 transition px-3 py-2 rounded-xl"
          >
            Enviar
          </button>
        </div>
      </GlassCard>
      <GlassCard className="p-4">
        <div className="text-white/80 font-medium">Plantillas</div>
        <div className="text-white/60 text-sm">
          Memorandos, resúmenes, anexos QA/QC… (mock)
        </div>
      </GlassCard>
    </div>
  );
}
