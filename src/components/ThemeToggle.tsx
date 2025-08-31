"use client";
import React from 'react';

const ThemeToggle: React.FC = () => {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme-mode') as 'dark' | 'light') || 'dark';
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      if (theme === 'dark') html.classList.add('dark'); else html.classList.remove('dark');
      html.setAttribute('data-theme', theme);
      localStorage.setItem('theme-mode', theme);
    }
  }, [theme]);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <div className="fixed top-2 right-2 z-50 flex items-center gap-2">
      <button
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        className="px-2 py-1 rounded text-xs bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 border border-zinc-600 dark:border-zinc-400"
        aria-label="Toggle color theme"
      >
        {theme === 'dark' ? 'Light' : 'Dark'} Mode
      </button>
    </div>
  );
};

export default ThemeToggle;
