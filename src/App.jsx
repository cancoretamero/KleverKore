import React, { useState } from 'react';
import { brand } from './theme/brand';
import { cx } from './lib/cx.js';
import Sidebar from './layout/Sidebar.jsx';
import Topbar from './layout/Topbar.jsx';
import Home from './modules/Home.jsx';
import DataIngesta from './modules/DataIngesta.jsx';

export default function App() {
  const [scenario, setScenario] = useState('v1.2_gate4');
  const [moduleId, setModuleId] = useState('home');

  const modules = [
    { id: 'home', label: 'Inicio', icon: '🏠' },
    { id: 'data', label: 'Datos & Ingesta', icon: '🗂️' },
    // seguiremos añadiendo módulos aquí
  ];

  const Content = () => {
    if (moduleId === 'home') return <Home />;
    if (moduleId === 'data') return <DataIngesta />;
    return null;
  };

  return (
    <div className="relative w-full h-[100vh]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto' }}>
      {/* Fondo antracita + Liquid Glass sutil SIEMPRE */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: brand.bg }} />
        <div className="absolute inset-0 overflow-hidden">
          <svg className="absolute inset-0 w-[140%] h-[140%] -top-20 -left-20 opacity-30">
            <defs>
              <filter id="blur-60">
                <feGaussianBlur stdDeviation="60" />
              </filter>
            </defs>
            <g filter="url(#blur-60)">
              <circle cx="20%" cy="30%" r="180" fill="#0ea5e9" />
              <circle cx="65%" cy="25%" r="160" fill="#22d3ee" />
              <circle cx="45%" cy="65%" r="190" fill="#f97316" />
              <circle cx="80%" cy="70%" r="140" fill="#06b6d4" />
            </g>
          </svg>
          <div className="absolute inset-0 bg-[radial-gradient(1000px_600px_at_20%_10%,rgba(255,255,255,0.04),transparent),radial-gradient(1000px_600px_at_80%_90%,rgba(255,255,255,0.04),transparent)]" />
        </div>
      </div>

      <div className="absolute inset-0 grid grid-cols-[240px_1fr] text-white">
        <Sidebar modules={modules} moduleId={moduleId} setModuleId={setModuleId} />
        <main className="h-full grid grid-rows-[56px_1fr]">
          <Topbar scenario={scenario} setScenario={setScenario} />
          <div className="overflow-auto">
            <Content />
          </div>
        </main>
      </div>
    </div>
  );
}
