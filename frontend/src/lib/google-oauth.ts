import { getGoogleOAuthConfig } from "@/backend/google-oauth";

/**
 * Check if Google OAuth is enabled from environment variable
 * Falls back to API check if env var not available
 */
export async function isGoogleOAuthEnabledFromEnv(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  
  // Try environment variable first (if set)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  if (clientId && clientId.trim() !== "") {
    return true;
  }
  
  // Fallback to API check
  const config = await getGoogleOAuthConfig();
  return config.enabled;
}

/**
 * Get Google OAuth client ID from environment variable or API
 */
export async function getGoogleOAuthClientId(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  
  // Try environment variable first (if set)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  if (clientId && clientId.trim() !== "") {
    return clientId;
  }
  
  // Fallback to API
  const config = await getGoogleOAuthConfig();
  return config.client_id;
}
