import { api, UnauthorizedError } from "./api-client";

export { UnauthorizedError };

export interface UserInfo {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  auth_type: string;
  org_id: string;
  org_name: string;
  role: string;
  permissions: string[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

export interface LoginResponse {
  user: UserInfo;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

export interface SignupResponse {
  email: string;
  account_id: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  user?: UserInfo;
}

export const signup = (email: string, password: string, inviteCode?: string, orgName?: string): Promise<SignupResponse> =>
  api.post("/auth/signup", { email, password, invite_code: inviteCode || undefined, org_name: orgName || undefined });

export const login = (email: string, password: string): Promise<LoginResponse> =>
  api.post("/auth/login", { email, password });

export const googleLogin = (idToken: string): Promise<LoginResponse> =>
  api.post("/auth/google", { id_token: idToken });

export const logout = async (): Promise<void> => {
  try {
    const raw = localStorage.getItem("auth_tokens");
    if (!raw) return;
    const tokens = JSON.parse(raw);
    await api.post("/auth/logout", { access_token: tokens.access_token }, { auth: true });
  } catch {
    // best-effort
  }
};

export const refreshToken = (refresh: string): Promise<RefreshResponse> =>
  api.post("/auth/refresh", { refresh_token: refresh });

export const getCurrentUser = (): Promise<UserInfo> =>
  api.get("/auth/me", { auth: true });
