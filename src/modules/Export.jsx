import React from 'react';
import GlassCard from '../components/common/GlassCard';
import { useToasts } from '../components/common/Toaster';

export default function Export() {
  const { push } = useToasts();

  const onExport = (label) => {
    push(`Export iniciado: ${label}`);
  };

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[
        ['Volúmenes 3D', 'NetCDF/VTK/Zarr'],
        ['Mapas 2D', 'GeoTIFF/COG'],
        ['Modelo estructural', 'VTK/PLY'],
        ['Targets/pozos', 'GPKG/GeoJSON/CSV'],
        ['Informe QP-ready', 'PDF + QA/QC'],
      ].map((x, i) => (
        <GlassCard key={i} className="p-4">
          <div className="text-white/80 font-medium">{x[0]}</div>
          <div className="text-white/60 text-sm">{x[1]}</div>
          <button
            onClick={() => onExport(x[0])}
            className="mt-3 bg-white/10 hover:bg-white/20 transition px-3 py-2 rounded-xl"
          >
            Exportar
          </button>
        </GlassCard>
      ))}
    </div>
  );
}
