import { getApiUrl } from "./config";

/**
 * Verify email with verification code
 */
export const verifyEmail = async (accountId: string, code: string): Promise<void> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_id: accountId,
      code: code,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Verification failed");
  }
};

/**
 * Resend verification code to email
 */
export const resendVerification = async (email: string): Promise<void> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to resend verification code");
  }
};
