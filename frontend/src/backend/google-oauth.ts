import { getApiUrl } from "./config";

export interface GoogleOAuthConfig {
  enabled: boolean;
  client_id: string | null;
}

let cachedConfig: GoogleOAuthConfig | null = null;

/**
 * Get Google OAuth configuration from backend
 */
export async function getGoogleOAuthConfig(): Promise<GoogleOAuthConfig> {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/auth/google-oauth-config`);
    
    if (!response.ok) {
      return { enabled: false, client_id: null };
    }

    const config = await response.json();
    cachedConfig = config;
    return config;
  } catch (error) {
    console.error("Failed to fetch Google OAuth config:", error);
    return { enabled: false, client_id: null };
  }
}
