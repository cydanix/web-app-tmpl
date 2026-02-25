import { api } from "./api-client";

export const changePassword = (oldPassword: string, newPassword: string): Promise<void> =>
  api.post("/auth/change-password", {
    old_password: oldPassword,
    new_password: newPassword,
  }, { auth: true });

export const deleteAccount = (password: string): Promise<void> =>
  api.post("/auth/delete-account", { password }, { auth: true });
