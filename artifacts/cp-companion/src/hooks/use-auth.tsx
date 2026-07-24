import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const BASE = import.meta.env.VITE_API_URL ?? '';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  weeklyGoal: number;
  theme: 'light' | 'dark';
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthCtx extends AuthState {
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<AuthUser, 'name' | 'email' | 'weeklyGoal' | 'theme'>>) => Promise<AuthUser>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

const TOKEN_KEY = 'cp-jwt';

export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: getStoredToken(),
    loading: true,
  });

  // On mount: verify stored token
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    apiFetch<AuthUser>('/auth/me', {}, token)
      .then((user) => setState({ user, token, loading: false }))
      .catch(() => {
        setStoredToken(null);
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const data = await apiFetch<{ token: string; user: AuthUser }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    setStoredToken(data.token);
    setState({ user: data.user, token: data.token, loading: false });
    return data.user;
  };

  const register = async (name: string, email: string, password: string): Promise<AuthUser> => {
    const data = await apiFetch<{ token: string; user: AuthUser }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ name, email, password }) },
    );
    setStoredToken(data.token);
    setState({ user: data.user, token: data.token, loading: false });
    return data.user;
  };

  const logout = async (): Promise<void> => {
    await apiFetch('/auth/logout', { method: 'POST' }, state.token).catch(() => {});
    setStoredToken(null);
    setState({ user: null, token: null, loading: false });
  };

  const updateProfile = async (
    data: Partial<Pick<AuthUser, 'name' | 'email' | 'weeklyGoal' | 'theme'>>,
  ): Promise<AuthUser> => {
    const updated = await apiFetch<AuthUser>(
      '/auth/profile',
      { method: 'PUT', body: JSON.stringify(data) },
      state.token,
    );
    setState((s) => ({ ...s, user: updated }));
    return updated;
  };

  const refresh = async (): Promise<void> => {
    if (!state.token) return;
    const user = await apiFetch<AuthUser>('/auth/me', {}, state.token);
    setState((s) => ({ ...s, user }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateProfile, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
