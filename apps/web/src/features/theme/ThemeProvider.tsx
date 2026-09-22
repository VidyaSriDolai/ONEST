import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'skillseal-theme';

interface ThemeContextValue {
  /** What the user chose, including "follow the system". */
  preference: ThemePreference;
  /** What is actually on screen once "system" is resolved. */
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Flips between light and dark, leaving "system" behind. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    // Private mode, or storage blocked. Falling back to the system preference
    // is better than failing to render.
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    readStored() === 'system' ? systemTheme() : (readStored() as ResolvedTheme),
  );

  // Apply to the document. The CSS keys off [data-theme], so this single
  // attribute re-colours the whole app.
  useEffect(() => {
    const next = preference === 'system' ? systemTheme() : preference;
    setResolved(next);
    document.documentElement.setAttribute('data-theme', next);

    // Keeps the browser chrome (form controls, scrollbars) in step.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#0a0f1e' : '#1e1b4b');
  }, [preference]);

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (preference !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = systemTheme();
      setResolved(next);
      document.documentElement.setAttribute('data-theme', next);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A blocked write just means the choice does not survive a reload.
    }
  }, []);

  const toggle = useCallback(() => {
    setPreference(
      (preference === 'system' ? systemTheme() : preference) === 'dark' ? 'light' : 'dark',
    );
  }, [preference, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme: resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
