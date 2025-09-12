import React, { useEffect, useRef } from 'react';
import GlassCard from '../common/GlassCard';
import { brand } from '../../theme/brand';

export default function NeonGridPanel({ title = 'Heatmap prospectividad (0–100 m)', height = 300 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    let anim;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(c);
    resize();

    function draw(time) {
      const w = c.clientWidth;
      const h = c.clientHeight;
      ctx.clearRect(0, 0, w, h);
      // cuadrícula
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      for (let gx = 0; gx <= w; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy <= h; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
      // blobs luminosos
      const t = (time || 0) * 0.001;
      const centers = [
        [w * 0.24, h * 0.48],
        [w * 0.52, h * 0.36],
        [w * 0.72, h * 0.52],
        [w * 0.46, h * 0.68],
      ];
      centers.forEach((c0, i) => {
        const radius = 56 + 10 * Math.sin(t * 2 + i);
        const [x0, y0] = c0;
        const g = ctx.createRadialGradient(x0, y0, 0, x0, y0, radius);
        g.addColorStop(0, 'rgba(255,150,80,0.95)');
        g.addColorStop(0.35, 'rgba(255,150,80,0.45)');
        g.addColorStop(0.8, 'rgba(90,170,255,0.2)');
        g.addColorStop(1, 'rgba(90,170,255,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x0, y0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      });

      anim = requestAnimationFrame(draw);
    }

    anim = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(anim);
      ro.disconnect();
    };
  }, []);

  return (
    <GlassCard>
      <div className="px-3 py-2 text-xs text-white/80 flex items-center justify-between border-b border-white/10">
        {title}
      </div>
      <div style={{ height }} className="relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute bottom-2 right-2 text-[11px] text-white/60 bg-black/30 backdrop-blur px-2 py-1 rounded">
          Arrastra • Zoom
        </div>
      </div>
    </GlassCard>
  );
}
