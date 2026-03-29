'use client';

import { useTheme } from '@/lib/theme-context';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
      style={{
        background: 'var(--uber-surface)',
        border: '0.5px solid var(--uber-border)',
        color: 'var(--uber-text)',
      }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21.64 15.89l-2.06-2.06a7 7 0 10-9.86 9.86l2.06 2.06a10 10 0 0010-10zm-12 0a3 3 0 110-4.24 3 3 0 010 4.24z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
