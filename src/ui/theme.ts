import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const key = 'wp-network-theme';

export function getTheme(): Theme {
  try { return localStorage.getItem(key) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}

export function setTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  try { localStorage.setItem(key, next); } catch { /* Storage can be unavailable in private mode. */ }
}

export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, update] = useState<Theme>(getTheme);
  useEffect(() => { setTheme(theme); }, [theme]);
  return [theme, update];
}
