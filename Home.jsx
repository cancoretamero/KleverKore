import React from 'react';
import GlassCard from '../components/common/GlassCard';
import Sparkline from '../components/widgets/Sparkline';
import RadialGauge from '../components/widgets/RadialGauge';
import NeonGridPanel from '../components/neon/NeonGridPanel';

/*
 * Home — KleverKore Dashboard (Ultra Edition)
 *
 * Esta pantalla de inicio lleva la estética del cristal líquido y la
 * interactividad al extremo. Está pensada como la carta de
 * presentación del futuro de la minería: un interfaz oscuro,
 * futurista y repleto de métricas y utilidades. Todos los datos
 * mostrados a continuación son ficticios y están declarados al
 * comienzo del componente, de modo que puedan ser sustituidos
 * fácilmente por datos reales provenientes de la API de KleverKore.
 *
 * La estructura se divide en varias filas y columnas para lograr
 * un diseño responsive. Cada tarjeta utiliza componentes de alto
 * nivel (Gauge, Sparkline, Barras) para ofrecer una gran densidad
 * informativa sin sacrificar legibilidad. Los colores se basan en
 * la paleta cian/naranja y se combinan con fondos translúcidos
 * para simular el efecto glassmorphism oscuro.
 */

// Barras apiladas para representar distribuciones. Recibe un array de
// objetos con label, value y color. Calcula el ancho proporcional.
function StackedBar({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  return (
    <div className="w-full h-3 flex overflow-hidden rounded-full bg-white/5">
      {data.map((d, i) => (
        <div
          key={i}
          style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }}
        />
      ))}
    </div>
  );
}

// Lista de KPIs con barra de progreso. Cada elemento lleva su color.
function KPIList({ items }) {
  return (
    <div className="space-y-2 mt-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between text-xs text-white/70">
          <span className="whitespace-nowrap mr-2">{item.label}</span>
          <div className="flex-1 h-2 ml-2 bg-white/10 rounded-full overflow-hidden">
            <div
              style={{ width: `${item.value * 100}%`, backgroundColor: item.color }}
              className="h-full"
            />
          </div>
          <span className="ml-2 text-white/60">{Math.round(item.value * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

// Lista de anomalías destacadas. Muestra un gauge miniatura y el estilo.
function TopAnomalies({ anomalies }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      {anomalies.map((a) => (
        <GlassCard key={a.id} className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/60 uppercase tracking-wider">
                {a.id}
              </div>
              <div className="text-lg font-semibold text-white">
                {Math.round(a.score * 100)}%
              </div>
            </div>
            <RadialGauge value={a.score} size={60} label="" />
          </div>
          <div className="mt-1 text-xs text-white/50">
            Estilo: {a.style}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// Botones de acciones rápidas. Pueden ser emojis o iconos SVG.
function QuickActions({ actions }) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      {actions.map((act, i) => (
        <button
          key={i}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 bg-white/10 hover:bg-white/20 rounded-xl transition"
        >
          <span className="text-lg">{act.icon}</span>
          <span>{act.label}</span>
        </button>
      ))}
    </div>
  );
}

// Tarjeta para mostrar tendencias en forma de mini gráficos de líneas. Recibe
// título, datos y un color opcional para el sparkline.
function TrendCard({ title, data1, data2, label1, label2, color1, color2 }) {
  return (
    <GlassCard className="p-4">
      <div className="text-white/60 text-xs uppercase tracking-wider">{title}</div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <Sparkline data={data1} stroke={color1} />
          <div className="text-xs text-white/50 mt-1">{label1}</div>
        </div>
        <div>
          <Sparkline data={data2} stroke={color2} />
          <div className="text-xs text-white/50 mt-1">{label2}</div>
        </div>
      </div>
    </GlassCard>
  );
}

// Tarjeta para mostrar eventos o notificaciones recientes.
function NotificationsCard({ events }) {
  return (
    <GlassCard className="p-4">
      <div className="text-white/60 text-xs uppercase tracking-wider">Notificaciones recientes</div>
      <div className="mt-3 space-y-3">
        {events.map((e, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-white/80">
            <div className="text-lg leading-none">{e.icon}</div>
            <div className="flex-1">
              <div className="font-medium text-white/80">{e.title}</div>
              <div className="text-white/60 text-xs">{e.desc}</div>
            </div>
            <div className="text-white/50 text-xs whitespace-nowrap">{e.time}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// Tarjeta para mostrar datasets recientes. Recibe un array de objetos con name,
// status, quality y date.
function RecentDataCard({ datasets }) {
  return (
    <GlassCard className="p-4">
      <div className="text-white/60 text-xs uppercase tracking-wider">Últimos datasets</div>
      <table className="w-full text-sm text-white/80 mt-3">
        <thead className="text-white/50">
          <tr>
            <th className="py-1 text-left">Nombre</th>
            <th className="py-1 text-left">Estado</th>
            <th className="py-1 text-left">Calidad</th>
            <th className="py-1 text-left">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((d, i) => (
            <tr key={i} className="border-t border-white/10 hover:bg-white/5">
              <td className="py-1">{d.name}</td>
              <td className="py-1">{d.status}</td>
              <td className="py-1">{d.quality}</td>
              <td className="py-1 whitespace-nowrap">{d.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
}

// Tarjeta para mostrar pozo y ranking: targets, wells and plan vs execution.
function TargetsWellsCard({ targets, wells }) {
  const totalTargets = targets.A + targets.B + targets.C;
  const targetsData = [
    { label: 'A', value: targets.A, color: '#38bdf8' },
    { label: 'B', value: targets.B, color: '#fbbf24' },
    { label: 'C', value: targets.C, color: '#ef4444' },
  ];
  const wellsData = [
    { label: 'Propuestos', value: wells.proposed, color: '#38bdf8' },
    { label: 'Ejecutados', value: wells.executed, color: '#4ade80' },
    { label: 'Pendientes', value: wells.pending, color: '#f97316' },
  ];
  const wellsTotal = wells.proposed + wells.executed + wells.pending;
  return (
    <GlassCard className="p-4">
      <div className="text-white/60 text-xs uppercase tracking-wider">Targets y pozos</div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <div className="text-white/80 text-sm font-medium">Total Targets: {totalTargets}</div>
          <StackedBar data={targetsData.map(d => ({ value: d.value, color: d.color }))} />
          <div className="mt-2 flex justify-between text-xs text-white/60">
            {targetsData.map((d, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.label}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-white/80 text-sm font-medium">Pozos</div>
          <StackedBar data={wellsData.map(d => ({ value: d.value, color: d.color }))} />
          <div className="mt-2 flex justify-between text-xs text-white/60">
            {wellsData.map((d, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// Componente principal de la pantalla de inicio
export default function Home() {
  /**
   * Declaración de datos ficticios. Estos objetos pueden reemplazarse
   * fácilmente por datos reales obtenidos desde APIs internas. Las
   * estructuras se agrupan lógicamente para que sea sencillo
   * alimentarlas con nuevos valores.
   */
  const kpi = {
    coverage: 0.95,
    avgProspectivity: 0.78,
    targets: { A: 14, B: 28, C: 41 },
    wells: { proposed: 12, executed: 5, pending: 3 },
    prAUC: 0.87,
    brier: 0.11,
    reliability: 0.93,
  };
  const coverageBreakdown = [
    { label: 'Mag', value: 0.9, color: '#38bdf8' },
    { label: 'Rad', value: 0.85, color: '#67e8f9' },
    { label: 'AEM', value: 0.8, color: '#a78bfa' },
    { label: 'IP', value: 0.78, color: '#fb7185' },
    { label: 'HSI', value: 0.68, color: '#fcd34d' },
  ];
  const styleDistribution = [
    { label: 'Carlin', value: 0.32, color: '#38bdf8' },
    { label: 'Epithermal', value: 0.28, color: '#a5b4fc' },
    { label: 'Porphyry', value: 0.25, color: '#fbbf24' },
    { label: 'Skarn/IOCG', value: 0.15, color: '#ec4899' },
  ];
  const ingestionStatus = [
    { label: 'Listo', value: 0.55, color: '#4ade80' },
    { label: 'Validando', value: 0.25, color: '#fcd34d' },
    { label: 'Pendiente', value: 0.15, color: '#f97316' },
    { label: 'Error', value: 0.05, color: '#ef4444' },
  ];
  const anomalies = [
    { id: 'A1', score: 0.91, style: 'Carlin' },
    { id: 'A2', score: 0.84, style: 'Epithermal' },
    { id: 'B1', score: 0.76, style: 'Porphyry' },
    { id: 'B2', score: 0.69, style: 'Skarn/IOCG' },
    { id: 'C1', score: 0.63, style: 'Carlin' },
  ];
  const quickActions = [
    { icon: '📂', label: 'Cargar datos' },
    { icon: '🗺️', label: 'Mapa 2D' },
    { icon: '📦', label: 'Volúmenes 3D' },
    { icon: '✨', label: 'Prospectividad 3D' },
    { icon: '🎯', label: 'Targets' },
    { icon: '🛠️', label: 'Diseñar pozos' },
    { icon: '🚦', label: 'Gate actual' },
    { icon: '📤', label: 'Exportar' },
  ];
  const recentDatasets = [
    { name: 'HSI—EMIT L2', status: 'Listo', quality: 'SNR 29 dB', date: '2025-09-10' },
    { name: 'Mag—AGG', status: 'Validando', quality: 'QF OK', date: '2025-09-09' },
    { name: 'AEM—SkyTEM', status: 'Pendiente', quality: '4/120 fallas', date: '2025-09-08' },
    { name: 'Geoquímica—Lote 09', status: 'Listo', quality: 'Pass', date: '2025-09-05' },
    { name: 'IP—Time-domain', status: 'Error', quality: 'SNR < 10 dB', date: '2025-09-02' },
  ];
  const events = [
    { icon: '🟢', title: 'Ingesta completada', desc: 'HSI—EMIT L2', time: 'hace 1h' },
    { icon: '🟡', title: 'Validando dataset', desc: 'Mag—AGG', time: 'hace 3h' },
    { icon: '🔴', title: 'Error de calidad', desc: 'IP—Time-domain', time: 'ayer' },
    { icon: '🟠', title: 'Nuevo target', desc: 'T-NE-08 añadido', time: 'hace 2d' },
  ];
  const trendData1 = [0.7, 0.72, 0.74, 0.75, 0.77, 0.78, 0.76, 0.79, 0.81, 0.82];
  const trendData2 = [1.2, 1.35, 1.28, 1.45, 1.5, 1.56, 1.6, 1.58, 1.62, 1.65];

  // Render principal
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Fila 1: panel panorámico con mapa y KPIs resumidos */}
      <GlassCard className="p-5 xl:col-span-3">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="col-span-2 relative">
            <NeonGridPanel title="Mapa de prospectividad (0–100 m)" height={260} />
            <div className="absolute bottom-3 right-3 backdrop-blur bg-black/40 text-white text-xs px-3 py-2 rounded-lg">
              <div className="font-semibold text-lg">1.5M t</div>
              <div className="text-[10px] text-white/70">Recurso estimado</div>
            </div>
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <div className="text-xs text-white/60 uppercase">Modelo actual</div>
              <div className="text-lg text-white font-semibold">GeoNet v3.3</div>
            </div>
            <div>
              <div className="text-xs text-white/60 uppercase">Gate activo</div>
              <div className="text-lg text-white font-semibold">Gate 5</div>
            </div>
            <div>
              <div className="text-xs text-white/60 uppercase">Cobertura total</div>
              <div className="text-lg text-white font-semibold">{Math.round(kpi.coverage * 100)}%</div>
            </div>
            <div>
              <div className="text-xs text-white/60 uppercase">Anomalías activas</div>
              <div className="text-lg text-white font-semibold">{anomalies.filter(a => a.score >= 0.6).length}</div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Fila 2: tarjetas de cobertura/modelo/performance */}
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Cobertura de datos</div>
        <div className="mt-3 flex items-end gap-4">
          <RadialGauge value={kpi.coverage} size={100} label="Cobertura" />
          <div className="flex-1">
            <KPIList items={coverageBreakdown} />
          </div>
        </div>
      </GlassCard>
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Índice prospectivo medio</div>
        <div className="flex items-center gap-4 mt-3">
          <RadialGauge value={kpi.avgProspectivity} size={100} label="Avg PI" />
          <div className="flex flex-col gap-2 text-xs text-white/60">
            <div>PI Actual: {(kpi.avgProspectivity * 100).toFixed(1)}%</div>
            <div>PI Objetivo: 85%</div>
            <div>Desviación: -7%</div>
          </div>
        </div>
      </GlassCard>
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Performance del modelo</div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div className="flex flex-col items-center">
            <RadialGauge value={kpi.prAUC} size={80} label="PR-AUC" />
            <div className="text-xs text-white/60 mt-1">0.90 Meta</div>
          </div>
          <div className="flex flex-col items-center">
            <RadialGauge value={1 - kpi.brier} size={80} label="1-Brier" />
            <div className="text-xs text-white/60 mt-1">Brier: {kpi.brier.toFixed(2)}</div>
          </div>
          <div className="flex flex-col items-center">
            <RadialGauge value={kpi.reliability} size={80} label="Reliability" />
            <div className="text-xs text-white/60 mt-1">Meta ≥0.95</div>
          </div>
        </div>
      </GlassCard>

      {/* Fila 3: tarjetas de distribución, tendencia y notificaciones */}
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Distribución de estilos</div>
        <StackedBar data={styleDistribution.map(d => ({ value: d.value, color: d.color }))} />
        <div className="flex justify-between mt-3 text-xs text-white/60">
          {styleDistribution.map((d, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </div>
          ))}
        </div>
      </GlassCard>
      <TrendCard
        title="Tendencias de prospectividad y recurso"
        data1={trendData1}
        data2={trendData2}
        label1="Prospectividad media (PI)"
        label2="Volumen estimado (Mt)"
        color1="#38bdf8"
        color2="#fb7185"
      />
      <NotificationsCard events={events} />

      {/* Fila 4: tarjetas de targets/wells, anomalías y quick actions, datasets recientes */}
      <TargetsWellsCard targets={kpi.targets} wells={kpi.wells} />
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Anomalías principales</div>
        <TopAnomalies anomalies={anomalies.slice(0, 4)} />
      </GlassCard>
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Acciones rápidas</div>
        <QuickActions actions={quickActions} />
      </GlassCard>
      {/* Fila 5: datasets recientes y estado de ingesta */}
      <GlassCard className="p-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Estado de ingesta</div>
        <StackedBar data={ingestionStatus.map(d => ({ value: d.value, color: d.color }))} />
        <div className="flex justify-between mt-3 text-xs text-white/60">
          {ingestionStatus.map((d, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </div>
          ))}
        </div>
      </GlassCard>
      <RecentDataCard datasets={recentDatasets} />
    </div>
  );
}
