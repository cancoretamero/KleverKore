import React from 'react';
import { brand } from '../../theme/brand';
import { cx } from '../../lib/cx.js';

export default function GlassCard({ children, className = '' }) {
  return (
    <div className={cx('rounded-2xl border shadow-xl', brand.glass, brand.border, className)}>
      {children}
    </div>
  );
}
