import React from 'react'
import { brand } from './theme/brand'
import { cx } from './lib/cx'

export default function App() {
  return (
    <div className="relative w-full h-[100vh] text-white"
         style={{fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'}}>
      {/* Fondo antracita + Liquid Glass sutil SIEMPRE */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{background: brand.bg}}/>
        <div className="absolute inset-0 overflow-hidden">
          <svg className="absolute inset-0 w-[140%] h-[140%] -top-20 -left-20 opacity-30">
            <defs><filter id="blur-60"><feGaussianBlur stdDeviation="60"/></filter></defs>
            <g filter="url(#blur-60)">
              <circle cx="20%" cy="30%" r="180" fill="#0ea5e9"/>
              <circle cx="65%" cy="25%" r="160" fill="#22d3ee"/>
              <circle cx="45%" cy="65%" r="190" fill="#f97316"/>
              <circle cx="80%" cy="70%" r="140" fill="#06b6d4"/>
            </g>
          </svg>
          <div className="absolute inset-0
            bg-[radial-gradient(1000px_600px_at_20%_10%,rgba(255,255,255,0.04),transparent),
                radial-gradient(1000px_600px_at_80%_90%,rgba(255,255,255,0.04),transparent)]"/>
        </div>
      </div>

      {/* Shell minimal — verificamos que todo compila */}
      <div className={cx('max-w-6xl mx-auto px-4 py-8 space-y-4')}>
        <h1 className="text-2xl font-semibold">KleverKore Dashboard · Shell</h1>
        <p className={brand.dim}>
          Si ves este título con fondo negro antracita y brillos “líquidos”, la base está OK.
          En el siguiente paso añadimos **sidebar**, **topbar** y los primeros **widgets**.
        </p>
        <div className={cx('rounded-2xl border p-6', brand.glass, brand.border)}>
          <div className="text-white/80">Panel de prueba</div>
          <div className="text-white/60 text-sm">Aquí irán los componentes del dashboard.</div>
        </div>
      </div>
    </div>
  )
}
