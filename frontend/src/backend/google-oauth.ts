import { api } from "./api-client";

export interface GoogleOAuthConfig {
  enabled: boolean;
  client_id: string | null;
}

let cachedConfig: GoogleOAuthConfig | null = null;

export async function getGoogleOAuthConfig(): Promise<GoogleOAuthConfig> {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  try {
    const config = await api.get<GoogleOAuthConfig>("/auth/google-oauth-config");
    cachedConfig = config;
    return config;
  } catch {
    return { enabled: false, client_id: null };
  }
}
