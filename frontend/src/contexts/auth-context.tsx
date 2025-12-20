"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AccountInfo,
  AuthTokens,
  signup as signupApi,
  login as loginApi,
  googleLogin as googleLoginApi,
  logout as logoutApi,
  refreshToken,
  getCurrentUser,
} from "@/backend/auth";

interface AuthContextType {
  user: AccountInfo | null;
  tokens: AuthTokens | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const tokensRef = useRef<AuthTokens | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep tokensRef in sync with tokens state
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    // Check for stored tokens on mount
    const storedTokens = localStorage.getItem("auth_tokens");
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens);
        setTokens(parsed);
        // Verify token and get user info
        refreshUser();
      } catch (e) {
        localStorage.removeItem("auth_tokens");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Refresh access token when it's close to expiring
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (!tokens?.refresh_token || !tokens?.access_token_expires_at) {
      return;
    }

    const refreshAccessToken = async () => {
      // Prevent concurrent refresh attempts
      if (isRefreshingRef.current) {
        return;
      }

      // Check if token is close to expiring (within 5 minutes)
      const expiresAt = new Date(tokensRef.current?.access_token_expires_at || 0);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const fiveMinutes = 5 * 60 * 1000;

      // Only refresh if token expires within 5 minutes
      if (timeUntilExpiry > fiveMinutes) {
        return;
      }

      // Use ref to get the latest refresh token
      const currentRefreshToken = tokensRef.current?.refresh_token;
      if (!currentRefreshToken) {
        return;
      }

      isRefreshingRef.current = true;

      try {
        const data = await refreshToken(currentRefreshToken);
        const tokenData = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          access_token_expires_at: data.access_token_expires_at,
          refresh_token_expires_at: data.refresh_token_expires_at,
        };
        setTokens(tokenData);
        localStorage.setItem("auth_tokens", JSON.stringify(tokenData));
        
        // Update user info if account data is present
        if (data.account) {
          setUser(data.account);
        }
      } catch (error) {
        // Refresh token invalid, logout user
        console.error("Error refreshing token:", error);
        localStorage.removeItem("auth_tokens");
        setTokens(null);
        setUser(null);
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // Check every 2 minutes if token needs refreshing
    // This is much less frequent than before and only refreshes when needed
    const interval = setInterval(refreshAccessToken, 2 * 60 * 1000); // 2 minutes
    refreshIntervalRef.current = interval;

    // Check immediately on mount if token needs refreshing
    refreshAccessToken();

    return () => {
      clearInterval(interval);
      refreshIntervalRef.current = null;
    };
  }, [tokens?.refresh_token, tokens?.access_token_expires_at]);

  const refreshUser = async () => {
    const storedTokens = localStorage.getItem("auth_tokens");
    if (!storedTokens) {
      setLoading(false);
      return;
    }

    try {
      const account = await getCurrentUser();
      setUser(account);
    } catch (error) {
      // Silently handle unauthorized errors (expired/invalid tokens)
      // This is expected behavior when tokens are no longer valid
      if (error instanceof Error && error.name === "UnauthorizedError") {
        // Token is invalid/expired, clear it silently
        localStorage.removeItem("auth_tokens");
        setTokens(null);
        setUser(null);
      } else {
        // Log other errors (network issues, etc.)
        console.error("Failed to refresh user:", error);
        localStorage.removeItem("auth_tokens");
        setTokens(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    const data = await signupApi(email, password);
    // Redirect to verification page with account info
    router.push(`/verify?email=${encodeURIComponent(data.email)}&account_id=${data.account_id}`);
  };

  const login = async (email: string, password: string) => {
    const data = await loginApi(email, password);
    setUser(data.account);
    const tokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      access_token_expires_at: data.access_token_expires_at,
      refresh_token_expires_at: data.refresh_token_expires_at,
    };
    setTokens(tokenData);
    localStorage.setItem("auth_tokens", JSON.stringify(tokenData));
    router.push("/dashboard");
  };

  const googleLogin = async (idToken: string) => {
    const data = await googleLoginApi(idToken);
    setUser(data.account);
    const tokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      access_token_expires_at: data.access_token_expires_at,
      refresh_token_expires_at: data.refresh_token_expires_at,
    };
    setTokens(tokenData);
    localStorage.setItem("auth_tokens", JSON.stringify(tokenData));
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("auth_tokens");
    setTokens(null);
    setUser(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        loading,
        signup,
        login,
        googleLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

