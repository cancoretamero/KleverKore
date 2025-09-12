import React, { useState } from 'react';
import { cx } from '../../lib/cx.js';
import { brand } from '../../theme/brand';

// Hook de toasts: devuelve push() para lanzar un toast y UI para insertarlo en tu app
export function useToasts() {
  const [items, setItems] = useState([]);
  const push = (msg) => {
    const id = Math.random().toString(36).slice(2);
    setItems((xs) => [...xs, { id, msg }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3000);
  };
  const UI = (
    <div className="fixed bottom-5 right-5 space-y-2 z-[60]">
      {items.map((t) => (
        <div key={t.id} className={cx('px-3 py-2 rounded-xl shadow-lg', brand.glass, brand.border)}>
          {t.msg}
        </div>
      ))}
    </div>
  );
  return { push, UI };
}
