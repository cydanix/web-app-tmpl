import { getApiUrl } from "./config";

export interface AccountInfo {
  id: string;
  iam_account_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  auth_type: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

export interface LoginResponse {
  account: AccountInfo;
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
  account?: AccountInfo;
}

/**
 * Get authentication headers with access token
 */
const getAuthHeaders = (): HeadersInit => {
  const tokens = localStorage.getItem("auth_tokens");
  if (!tokens) {
    return { "Content-Type": "application/json" };
  }

  try {
    const parsed = JSON.parse(tokens);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${parsed.access_token}`,
    };
  } catch {
    return { "Content-Type": "application/json" };
  }
};

/**
 * Sign up a new user
 */
export const signup = async (email: string, password: string): Promise<SignupResponse> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Signup failed");
  }

  return await response.json();
};

/**
 * Login with email and password
 */
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  return await response.json();
};

/**
 * Login with Google ID token
 */
export const googleLogin = async (idToken: string): Promise<LoginResponse> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Google login failed");
  }

  return await response.json();
};

/**
 * Logout the current user
 */
export const logout = async (): Promise<void> => {
  const apiUrl = getApiUrl();
  const tokens = localStorage.getItem("auth_tokens");
  
  if (tokens) {
    try {
      const parsed = JSON.parse(tokens);
      await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${parsed.access_token}`,
        },
        body: JSON.stringify({ access_token: parsed.access_token }),
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (refreshToken: string): Promise<RefreshResponse> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  return await response.json();
};

/**
 * Get current user information
 */
export const getCurrentUser = async (): Promise<AccountInfo> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to get user information");
  }

  return await response.json();
};
