import { getApiUrl } from "./config";

export interface Notification {
  id: string;
  account_id: string;
  level: "info" | "warning" | "error";
  message: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationRequest {
  level: "info" | "warning" | "error";
  message: string;
}

export interface UpdateNotificationRequest {
  read: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

/**
 * Create a new notification (requires authentication - creates for current user)
 */
export async function createNotification(
  request: CreateNotificationRequest,
  token: string
): Promise<Notification> {
  const response = await fetch(`${getApiUrl()}/notifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create notification");
  }

  return response.json();
}

/**
 * Get all notifications for the current user
 */
export async function getNotifications(
  token: string
): Promise<Notification[]> {
  const response = await fetch(`${getApiUrl()}/notifications`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get notifications");
  }

  return response.json();
}

/**
 * Get unread notifications count
 */
export async function getUnreadCount(
  token: string
): Promise<number> {
  const response = await fetch(`${getApiUrl()}/notifications/unread-count`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get unread count");
  }

  const data: UnreadCountResponse = await response.json();
  return data.count;
}

/**
 * Update a single notification's read status
 */
export async function updateNotification(
  notificationId: string,
  read: boolean,
  token: string
): Promise<Notification> {
  const response = await fetch(`${getApiUrl()}/notifications/${notificationId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ read }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update notification");
  }

  return response.json();
}

/**
 * Update multiple notifications' read status
 */
export async function updateNotificationsBatch(
  notificationIds: string[],
  read: boolean,
  token: string
): Promise<Notification[]> {
  const response = await fetch(`${getApiUrl()}/notifications/batch`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notification_ids: notificationIds,
      read,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update notifications");
  }

  return response.json();
}

/**
 * Delete a single notification
 */
export async function deleteNotification(
  notificationId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${getApiUrl()}/notifications/${notificationId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete notification");
  }
}

/**
 * Delete multiple notifications
 */
export async function deleteNotificationsBatch(
  notificationIds: string[],
  token: string
): Promise<{ deleted_count: number }> {
  const response = await fetch(`${getApiUrl()}/notifications/batch`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notification_ids: notificationIds,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete notifications");
  }

  return response.json();
}
