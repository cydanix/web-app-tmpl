"use client";

import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Badge, Form } from "react-bootstrap";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import {
  Notification,
  getNotifications,
  updateNotification,
  updateNotificationsBatch,
  deleteNotification,
  deleteNotificationsBatch,
} from "@/backend/notifications";
import { useI18n } from "@/contexts/i18n-context";

export default function NotificationsPage() {
  const { user, tokens, loading } = useAuth();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && tokens?.access_token) {
      loadNotifications();
    }
  }, [user, tokens]);

  const loadNotifications = async () => {
    if (!tokens?.access_token) return;

    try {
      setLoadingNotifications(true);
      setError(null);
      const data = await getNotifications(tokens.access_token);
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notifications.failedToLoad"));
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const handleMarkAsRead = async (read: boolean) => {
    if (!tokens?.access_token || selectedIds.size === 0) return;

    try {
      setError(null);
      const ids = Array.from(selectedIds);
      await updateNotificationsBatch(ids, read, tokens.access_token);
      await loadNotifications();
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notifications");
    }
  };

  const handleToggleRead = async (notification: Notification) => {
    if (!tokens?.access_token) return;

    try {
      setError(null);
      await updateNotification(notification.id, !notification.read, tokens.access_token);
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notification");
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!tokens?.access_token) return;

    if (!confirm("Are you sure you want to delete this notification?")) {
      return;
    }

    try {
      setError(null);
      await deleteNotification(notificationId, tokens.access_token);
      await loadNotifications();
      // Remove from selection if selected
      const newSelected = new Set(selectedIds);
      newSelected.delete(notificationId);
      setSelectedIds(newSelected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete notification");
    }
  };

  const handleDeleteBatch = async () => {
    if (!tokens?.access_token || selectedIds.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} notification(s)?`)) {
      return;
    }

    try {
      setError(null);
      const ids = Array.from(selectedIds);
      await deleteNotificationsBatch(ids, tokens.access_token);
      await loadNotifications();
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notifications.failedToDeleteBatch"));
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "error":
        return "danger";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Return relative time
    if (diffMins < 1) {
      return t("notifications.justNow");
    } else if (diffMins < 60) {
      return t("notifications.minutesAgo", { count: diffMins });
    } else if (diffHours < 24) {
      return t("notifications.hoursAgo", { count: diffHours });
    } else if (diffDays < 7) {
      return t("notifications.daysAgo", { count: diffDays });
    } else {
      // For older notifications, show date
      const localeMap: Record<string, string> = {
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'pt': 'pt-BR',
        'de': 'de-DE',
      };
      return date.toLocaleDateString(localeMap[locale] || 'en-US', {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const formatFullTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'pt': 'pt-BR',
      'de': 'de-DE',
    };
    // Use 12-hour format for English and Portuguese, 24-hour for others
    const use12Hour = locale === 'en' || locale === 'pt';
    return date.toLocaleString(localeMap[locale] || 'en-US', {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: use12Hour,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen d-flex align-items-center justify-content-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasSelected = selectedIds.size > 0;

  return (
    <div className="min-h-screen bg-light">
      <Row className="g-0">
        <Col md={3} lg={2} className="bg-white border-end">
          <DashboardSidebar />
        </Col>
        <Col md={9} lg={10}>
          <Container className="py-4">
            <div className="mb-4 d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 fw-bold mb-1">{t("notifications.title")}</h1>
                <p className="text-muted mb-0">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
                </p>
              </div>
              {hasSelected && (
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleMarkAsRead(true)}
                  >
                    {t("notifications.markAllRead")}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleMarkAsRead(false)}
                  >
                    {t("notifications.markAllUnread")}
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleDeleteBatch}
                  >
                    {t("notifications.deleteSelected")}
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {loadingNotifications ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">{t("common.loading")}</span>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-5">
                  <p className="text-muted mb-0">{t("notifications.noNotifications")}</p>
                </Card.Body>
              </Card>
            ) : (
              <>
                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <Form.Check
                    type="checkbox"
                    label={t("notifications.selectAll")}
                    checked={selectedIds.size === notifications.length}
                    onChange={handleSelectAll}
                  />
                  <Button
                    variant="link"
                    size="sm"
                    onClick={loadNotifications}
                    className="text-decoration-none"
                  >
                    {t("notifications.refresh")}
                  </Button>
                </div>

                <div className="d-flex flex-column gap-3">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`border-0 shadow-sm ${
                        !notification.read ? "border-start border-primary border-3" : ""
                      }`}
                    >
                      <Card.Body>
                        <div className="d-flex align-items-start">
                          <Form.Check
                            type="checkbox"
                            checked={selectedIds.has(notification.id)}
                            onChange={() => handleToggleSelect(notification.id)}
                            className="me-3 mt-1"
                          />
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <Badge bg={getLevelBadgeVariant(notification.level)}>
                                  {notification.level === "info" ? t("notifications.info") :
                                   notification.level === "warning" ? t("notifications.warning") :
                                   notification.level === "error" ? t("notifications.error") :
                                   notification.level.toUpperCase()}
                                </Badge>
                                {!notification.read && (
                                  <Badge bg="primary" pill>
                                    {t("notifications.unread")}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-end">
                                <div className="small text-muted">
                                  {formatDate(notification.created_at)}
                                </div>
                                <div className="small text-muted" style={{ fontSize: "0.75rem" }}>
                                  {formatFullTimestamp(notification.created_at)}
                                </div>
                              </div>
                            </div>
                            <p className="mb-2">{notification.message}</p>
                            <div className="d-flex gap-2 align-items-center">
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 text-decoration-none"
                                onClick={() => handleToggleRead(notification)}
                              >
                                {notification.read ? t("notifications.markAllUnread") : t("notifications.markAllRead")}
                              </Button>
                              <span className="text-muted">•</span>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 text-decoration-none text-danger"
                                onClick={() => handleDelete(notification.id)}
                              >
                                {t("common.delete")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </Container>
        </Col>
      </Row>
    </div>
  );
}
