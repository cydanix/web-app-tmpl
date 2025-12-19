"use client";

import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Form, Alert } from "react-bootstrap";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import AccountSettings from "@/components/account-settings";
import {
  AccountSettings as AccountSettingsType,
  getAccountSettings,
  updateAccountSettings,
} from "@/backend/account-settings";

export default function AccountSettingsPage() {
  const { user, tokens, loading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<AccountSettingsType | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && tokens?.access_token) {
      loadSettings();
    }
  }, [user, tokens]);

  const loadSettings = async () => {
    if (!tokens?.access_token) return;

    try {
      setLoadingSettings(true);
      setError(null);
      const data = await getAccountSettings(tokens.access_token);
      setSettings(data);
      setFormData({
        username: data.username || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account settings");
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens?.access_token) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updateData: { username?: string | null } = {};
      if (formData.username.trim() !== "") {
        updateData.username = formData.username.trim();
      } else {
        updateData.username = null;
      }

      const updated = await updateAccountSettings(updateData, tokens.access_token);
      setSettings(updated);
      setSuccess("Account settings updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account settings");
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="min-h-screen bg-light">
      <Row className="g-0">
        <Col md={3} lg={2} className="bg-white border-end">
          <DashboardSidebar />
        </Col>
        <Col md={9} lg={10}>
          <Container className="py-4">
            <div className="mb-4">
              <h1 className="h3 fw-bold mb-1">Account Settings</h1>
              <p className="text-muted">Manage your account preferences</p>
            </div>

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            {loadingSettings ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Profile Settings</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Username</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter your username"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        maxLength={255}
                      />
                      <Form.Text className="text-muted">
                        This username will be used in personalized messages (e.g., &quot;Dear {'{username}'}...&quot;)
                      </Form.Text>
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline-secondary"
                        onClick={loadSettings}
                        disabled={saving || loadingSettings}
                      >
                        Cancel
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            )}

            <Card className="border-0 shadow-sm mt-4">
              <Card.Header className="bg-white">
                <h5 className="mb-0">Account Information</h5>
              </Card.Header>
              <Card.Body>
                <AccountSettings />
              </Card.Body>
            </Card>
          </Container>
        </Col>
      </Row>
    </div>
  );
}
