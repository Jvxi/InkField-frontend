import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { fetchAuthMe, login as apiLogin, logout as apiLogout, register as apiRegister } from "../api";
import { clearAuthToken, getAuthToken, setAuthToken } from "../utils/authStorage";

interface AuthUser {
  userId: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, emailCode: string) => Promise<{ devMailMode: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async (): Promise<void> => {
    if (!getAuthToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await fetchAuthMe();
      setUser({ userId: me.userId, email: me.email });
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await apiLogin(email, password);
    setAuthToken(result.token);
    setUser({ userId: result.userId, email: result.email });
  }, []);

  const register = useCallback(
    async (email: string, password: string, emailCode: string): Promise<{ devMailMode: boolean }> => {
      const result = await apiRegister(email, password, emailCode);
      if (!result.token) {
        throw new Error("注册成功但未返回登录凭证，请尝试直接登录。");
      }
      setAuthToken(result.token);
      setUser({ userId: result.userId, email: result.email });
      return { devMailMode: result.devMailMode };
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiLogout();
    } finally {
      clearAuthToken();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      register,
      logout
    }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
