import { getApiUrl } from "./config";

export interface AccountSettings {
  username: string | null;
}

export interface UpdateAccountSettingsRequest {
  username?: string | null;
}

/**
 * Get account settings for the current user
 */
export async function getAccountSettings(
  token: string
): Promise<AccountSettings> {
  const response = await fetch(`${getApiUrl()}/account/settings`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get account settings");
  }

  return response.json();
}

/**
 * Update account settings
 */
export async function updateAccountSettings(
  request: UpdateAccountSettingsRequest,
  token: string
): Promise<AccountSettings> {
  const response = await fetch(`${getApiUrl()}/account/settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update account settings");
  }

  return response.json();
}
