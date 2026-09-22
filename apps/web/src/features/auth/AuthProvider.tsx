import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { LoginInput, PublicUser, RegisterInput } from '@skillseal/shared';
import { setAccessToken, setUnauthorizedHandler } from '@/lib/api-client';
import { authApi } from './auth-api';

interface AuthContextValue {
  user: PublicUser | null;
  /** True until the initial refresh attempt settles, so guards can wait. */
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<PublicUser>;
  register: (input: RegisterInput) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  /**
   * Renews the access token shortly before it expires, so an idle tab does not
   * hit a 401 on the user's next click.
   */
  const scheduleRefresh = useCallback(
    (expiresIn: number) => {
      clearRefreshTimer();
      const leadTime = Math.max(expiresIn - 60, 30) * 1000;

      refreshTimer.current = setTimeout(() => {
        void authApi
          .refresh()
          .then((session) => {
            setAccessToken(session.accessToken);
            setUser(session.user);
            scheduleRefresh(session.expiresIn);
          })
          .catch(() => {
            setAccessToken(null);
            setUser(null);
          });
      }, leadTime);
    },
    [clearRefreshTimer],
  );

  // On boot, try to trade the httpOnly refresh cookie for a live session.
  // Failure is the normal signed-out case, not an error worth surfacing.
  useEffect(() => {
    let cancelled = false;

    authApi
      .refresh()
      .then((session) => {
        if (cancelled) return;
        setAccessToken(session.accessToken);
        setUser(session.user);
        scheduleRefresh(session.expiresIn);
      })
      .catch(() => {
        if (!cancelled) setAccessToken(null);
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scheduleRefresh]);

  // The API client calls this when a refresh attempt fails mid-session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearRefreshTimer();
      setUser(null);
    });
  }, [clearRefreshTimer]);

  useEffect(() => clearRefreshTimer, [clearRefreshTimer]);

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await authApi.login(input);
      setAccessToken(session.accessToken);
      setUser(session.user);
      scheduleRefresh(session.expiresIn);
      return session.user;
    },
    [scheduleRefresh],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const session = await authApi.register(input);
      setAccessToken(session.accessToken);
      setUser(session.user);
      scheduleRefresh(session.expiresIn);
      return session.user;
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    clearRefreshTimer();
    try {
      await authApi.logout();
    } finally {
      // Sign out locally even if the network call failed.
      setAccessToken(null);
      setUser(null);
    }
  }, [clearRefreshTimer]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
    }),
    [user, isBootstrapping, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
