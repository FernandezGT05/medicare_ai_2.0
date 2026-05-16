import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { exchangeGoogleAuth, fetchAuthMe } from "../api/client";
import {
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from "../lib/authStorage";
import type { AuthUser } from "../types/auth";

const STORAGE_KEY = "medicareai_auth_user";

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  authReady: boolean;
  isSigningOut: boolean;
  signInWithGoogleCredential: (credential: string) => Promise<void>;
  signOut: () => void;
  setUserFromProfile: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      setAuthReady(true);
      return;
    }
    fetchAuthMe()
      .then(({ user: nextUser }) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
      })
      .catch(() => {
        clearSessionToken();
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      })
      .finally(() => setAuthReady(true));
  }, []);

  const signInWithGoogleCredential = useCallback(async (credential: string) => {
    const { token, user: nextUser } = await exchangeGoogleAuth(credential);
    setSessionToken(token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const setUserFromProfile = useCallback((nextUser: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const signOut = useCallback(() => {
    setIsSigningOut(true);
    navigate({ pathname: "/", hash: "" }, { replace: true });
    clearSessionToken();
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, [navigate]);

  useEffect(() => {
    if (isSigningOut && location.pathname === "/") {
      setIsSigningOut(false);
      window.scrollTo(0, 0);
    }
  }, [isSigningOut, location.pathname]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null && Boolean(getSessionToken()),
      authReady,
      isSigningOut,
      signInWithGoogleCredential,
      signOut,
      setUserFromProfile,
    }),
    [
      user,
      authReady,
      isSigningOut,
      signInWithGoogleCredential,
      signOut,
      setUserFromProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
