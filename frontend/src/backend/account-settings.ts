import { api } from "./api-client";

export interface AccountSettings {
  username: string | null;
}

export interface UpdateAccountSettingsRequest {
  username?: string | null;
}

export const getAccountSettings = (_token?: string): Promise<AccountSettings> =>
  api.get("/account/settings", { auth: true });

export const updateAccountSettings = (
  request: UpdateAccountSettingsRequest,
  _token?: string
): Promise<AccountSettings> =>
  api.put("/account/settings", request, { auth: true });
