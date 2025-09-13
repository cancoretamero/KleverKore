import React from 'react';

/* ========= WIDGETS AUTÓNOMOS (software dentro del software) ============= */
import ProspectivityDecisionCube from '../widgets/ProspectivityDecisionCube.jsx';
import CoverageSNRControl        from '../widgets/CoverageSNRControl.jsx';
import CalibrationReliabilityLab from '../widgets/CalibrationReliabilityLab.jsx';
import SHAPExplorer              from '../widgets/SHAPExplorer.jsx';
import TargetComposer3D          from '../widgets/TargetComposer3D.jsx';
import DOIViewerAdvanced         from '../widgets/DOIViewerAdvanced.jsx';
import WhatChangedDiff           from '../widgets/WhatChangedDiff.jsx';
import ImpactESGCounter          from '../widgets/ImpactESGCounter.jsx';

/* ============ Ayuda visual mínima para título de sección ================= */
function Section({ title, children, id }) {
  return (
    <section id={id} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white/90 font-semibold tracking-wide">{title}</h2>
        <a href={`#${id}`} className="text-[10px] text-white/50 hover:text-white/70">#{id}</a>
      </div>
      {children}
    </section>
  );
}

/* ============================== HOME ===================================== */
/**
 * Home: muestra TODOS los widgets en una parrilla pensada para “Mission Control”.
 * - 2 grandes “workbenches” (3D & Targets) a ancho completo
 * - 3 bloques de analítica (Cobertura/SNR, Calibración/Fiabilidad, SHAP)
 * - 3 utilidades de governance/operación (DOI, What-Changed, Impact ESG)
 *
 * Si todavía no has pegado alguno de los widgets en src/widgets/, comenta su <Componente />
 * hasta que lo añadas. Los datos de todos los widgets son MOCK y se pueden sustituir luego.
 */
export default function Home() {
  return (
    <div className="min-h-[100vh] p-4 space-y-10">

      {/* Banda 1 — Workbench 3D de Prospectividad (visión inmersiva) */}
      <Section title="Prospectividad 3D · Decision Cube" id="decision-cube">
        {/* Ancho completo para que respire */}
        <div className="grid grid-cols-1">
          <ProspectivityDecisionCube />
        </div>
      </Section>

      {/* Banda 2 — Estado de adquisición y calidad del modelo */}
      <Section title="Cobertura & SNR · Calidad & Fiabilidad del Modelo" id="coverage-calibration">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <CoverageSNRControl />
          <CalibrationReliabilityLab />
        </div>
      </Section>

      {/* Banda 3 — Explicabilidad avanzada */}
      <Section title="Explorador de Explicabilidad (SHAP)" id="shap-explainer">
        <div className="grid grid-cols-1">
          <SHAPExplorer />
        </div>
      </Section>

      {/* Banda 4 — Composición de targets 3D */}
      <Section title="Composer de Targets 3D" id="target-composer">
        <div className="grid grid-cols-1">
          <TargetComposer3D />
        </div>
      </Section>

      {/* Banda 5 — DOI y comparador de versiones/gates */}
      <Section title="DOI Viewer Avanzado · What Changed (Diff Gates)" id="doi-and-diff">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <DOIViewerAdvanced />
          <WhatChangedDiff />
        </div>
      </Section>

      {/* Banda 6 — Impacto ESG y economía del plan */}
      <Section title="Impact ESG Counter & Optimizer" id="impact-esg">
        <div className="grid grid-cols-1">
          <ImpactESGCounter />
        </div>
      </Section>

      {/* Pie: ayuda mínima de navegación */}
      <footer className="pt-4 border-t border-white/10 text-[11px] text-white/60">
        Accesos rápidos:{" "}
        <a className="hover:text-white/80" href="#decision-cube">Decision Cube</a> ·{" "}
        <a className="hover:text-white/80" href="#coverage-calibration">Coverage/SNR & Calibración</a> ·{" "}
        <a className="hover:text-white/80" href="#shap-explainer">SHAP Explorer</a> ·{" "}
        <a className="hover:text-white/80" href="#target-composer">Target Composer 3D</a> ·{" "}
        <a className="hover:text-white/80" href="#doi-and-diff">DOI & What-Changed</a> ·{" "}
        <a className="hover:text-white/80" href="#impact-esg">Impact ESG</a>
      </footer>
    </div>
  );
}
