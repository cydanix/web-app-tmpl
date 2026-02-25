import { api } from "./api-client";

export interface Notification {
  id: string;
  profile_id: string;
  level: "info" | "warning" | "error";
  message: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateNotificationRequest {
  level: "info" | "warning" | "error";
  message: string;
}

export interface UnreadCountResponse {
  count: number;
}

export const createNotification = (
  request: CreateNotificationRequest,
  _token?: string
): Promise<Notification> =>
  api.post("/notifications", request, { auth: true });

export const getNotifications = (
  _token?: string
): Promise<PaginatedNotifications> =>
  api.get("/notifications", { auth: true });

export const getUnreadCount = async (
  _token?: string
): Promise<number> => {
  const data = await api.get<UnreadCountResponse>("/notifications/unread-count", { auth: true });
  return data.count;
};

export const updateNotification = (
  notificationId: string,
  read: boolean,
  _token?: string
): Promise<Notification> =>
  api.put(`/notifications/${notificationId}`, { read }, { auth: true });

export const updateNotificationsBatch = (
  notificationIds: string[],
  read: boolean,
  _token?: string
): Promise<Notification[]> =>
  api.put("/notifications/batch", { notification_ids: notificationIds, read }, { auth: true });

export const deleteNotification = (
  notificationId: string,
  _token?: string
): Promise<void> =>
  api.delete(`/notifications/${notificationId}`, undefined, { auth: true });

export const deleteNotificationsBatch = (
  notificationIds: string[],
  _token?: string
): Promise<{ deleted_count: number }> =>
  api.delete("/notifications/batch", { notification_ids: notificationIds }, { auth: true });
