import { api } from "./api-client";

export const verifyEmail = (accountId: string, code: string): Promise<void> =>
  api.post("/auth/verify-email", { account_id: accountId, code });

export const resendVerification = (email: string): Promise<void> =>
  api.post("/auth/resend-verification", { email });
