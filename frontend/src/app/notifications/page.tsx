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

export default function NotificationsPage() {
  const { user, tokens, loading } = useAuth();
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : "Failed to load notifications");
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
      setError(err instanceof Error ? err.message : "Failed to delete notifications");
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
      return "Just now";
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else {
      // For older notifications, show date
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const formatFullTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen d-flex align-items-center justify-content-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
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
                <h1 className="h3 fw-bold mb-1">Notifications</h1>
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
                    Mark as Read
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleMarkAsRead(false)}
                  >
                    Mark as Unread
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleDeleteBatch}
                  >
                    Delete Selected
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
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-5">
                  <p className="text-muted mb-0">No notifications yet.</p>
                </Card.Body>
              </Card>
            ) : (
              <>
                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <Form.Check
                    type="checkbox"
                    label="Select all"
                    checked={selectedIds.size === notifications.length}
                    onChange={handleSelectAll}
                  />
                  <Button
                    variant="link"
                    size="sm"
                    onClick={loadNotifications}
                    className="text-decoration-none"
                  >
                    Refresh
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
                                  {notification.level.toUpperCase()}
                                </Badge>
                                {!notification.read && (
                                  <Badge bg="primary" pill>
                                    New
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
                                {notification.read ? "Mark as unread" : "Mark as read"}
                              </Button>
                              <span className="text-muted">•</span>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 text-decoration-none text-danger"
                                onClick={() => handleDelete(notification.id)}
                              >
                                Delete
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
