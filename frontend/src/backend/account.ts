import { getApiUrl } from "./config";

/**
 * Get authentication headers with access token
 */
const getAuthHeaders = (): HeadersInit => {
  const tokens = localStorage.getItem("auth_tokens");
  if (!tokens) {
    throw new Error("Not authenticated");
  }

  try {
    const parsed = JSON.parse(tokens);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${parsed.access_token}`,
    };
  } catch {
    throw new Error("Invalid token format");
  }
};

/**
 * Change user password
 */
export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/auth/change-password`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to change password");
  }
};

/**
 * Delete user account
 */
export const deleteAccount = async (password: string): Promise<void> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/auth/delete-account`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      password: password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete account");
  }
};
