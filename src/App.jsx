import React, { useEffect, useState } from 'react';
import { brand } from './theme/brand';
import Sidebar from './layout/Sidebar.jsx';
import Topbar from './layout/Topbar.jsx';
import Home from './modules/Home.jsx';
import DataIngesta from './modules/DataIngesta.jsx';
import Maps2D from './modules/Maps2D.jsx';
import Prospect3D from './modules/Prospect3D.jsx';
import Targets from './modules/Targets.jsx';
import Drill from './modules/Drill.jsx';
import Gates from './modules/Gates.jsx';
import QAQC from './modules/QAQC.jsx';
import MLOps from './modules/MLOps.jsx';
import Export from './modules/Export.jsx';
import Copilot from './modules/Copilot.jsx';
import Admin from './modules/Admin.jsx';
import CommandPalette from './components/common/CommandPalette.jsx';
import { useToasts } from './components/common/Toaster.jsx';

export default function App() {
  const [scenario, setScenario] = useState('v1.2_gate4');
  const [moduleId, setModuleId] = useState('home');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { push, UI: Toasts } = useToasts();

  // Teclas rápidas: Ctrl/Cmd+K abre paleta; g,t,d,2,3,r,e para módulos
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Módulos visibles en la barra lateral
  const modules = [
    { id: 'home', label: 'Inicio', icon: '🏠' },
    { id: 'data', label: 'Datos & Ingesta', icon: '🗂️' },
    { id: 'maps2d', label: 'Mapas 2D', icon: '🗺️' },
    { id: 'prospect3d', label: 'Prospectividad 3D', icon: '✨' },
    { id: 'targets', label: 'Targets & Ranking', icon: '🎯' },
    { id: 'drill', label: 'Drill Designer', icon: '🛠️' },
    { id: 'gates', label: 'Gates & Decisión', icon: '🚦' },
    { id: 'qaqc', label: 'QA/QC & Calibración', icon: '🧪' },
    { id: 'mlops', label: 'MLOps & Versionado', icon: '🧬' },
    { id: 'export', label: 'Entregables', icon: '📤' },
    { id: 'copilot', label: 'Copiloto (LLM)', icon: '🤖' },
    { id: 'admin', label: 'Administración', icon: '🛡️' },
  ];

  const Content = () => {
    if (moduleId === 'home') return <Home />;
    if (moduleId === 'data') return <DataIngesta />;
    if (moduleId === 'maps2d') return <Maps2D />;
    if (moduleId === 'prospect3d') return <Prospect3D />;
    if (moduleId === 'targets') return <Targets />;
    if (moduleId === 'drill') return <Drill />;
    if (moduleId === 'gates') return <Gates />;
    if (moduleId === 'qaqc') return <QAQC />;
    if (moduleId === 'mlops') return <MLOps />;
    if (moduleId === 'export') return <Export />;
    if (moduleId === 'copilot') return <Copilot />;
    if (moduleId === 'admin') return <Admin />;
    return null;
  };

  function onPaletteRun(cmd) {
    if (cmd === 'toggle') {
      setPaletteOpen((v) => !v);
      return;
    }
    if (cmd.startsWith('open:')) {
      const id = cmd.split(':')[1];
      setModuleId(id);
      setPaletteOpen(false);
      return;
    }
    if (cmd.startsWith('export:')) {
      push('Exportación iniciada (simulado)');
      setPaletteOpen(false);
      return;
    }
  }

  return (
    <div
      className="relative w-full h-[100vh]"
      style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto' }}
    >
      {/* Fondo antracita + Liquid Glass sutil */}
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

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onRun={onPaletteRun} />
      {Toasts}
    </div>
  );
}
