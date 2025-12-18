"use client";

import { useState } from "react";
import { Form, Button, Alert, Modal } from "react-bootstrap";
import { useAuth } from "@/contexts/auth-context";

export default function AccountSettings() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const tokens = localStorage.getItem("auth_tokens");
      if (!tokens) {
        throw new Error("Not authenticated");
      }

      const parsed = JSON.parse(tokens);
      const response = await fetch(`${apiUrl}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${parsed.access_token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change password");
      }

      setSuccess("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError("");
    setDeleteLoading(true);

    try {
      const tokens = localStorage.getItem("auth_tokens");
      if (!tokens) {
        throw new Error("Not authenticated");
      }

      const parsed = JSON.parse(tokens);
      const response = await fetch(`${apiUrl}/auth/delete-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${parsed.access_token}`,
        },
        body: JSON.stringify({
          password: deletePassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete account");
      }

      // Account deleted, logout will be handled by auth context
      setShowDeleteModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h5 className="fw-bold mb-3">Account Information</h5>
        <div className="row mb-3">
          <div className="col-sm-3">
            <strong>Email:</strong>
          </div>
          <div className="col-sm-9">{user?.email}</div>
        </div>
        <div className="row mb-3">
          <div className="col-sm-3">
            <strong>Account ID:</strong>
          </div>
          <div className="col-sm-9">
            <code className="small">{user?.id}</code>
          </div>
        </div>
        <div className="row">
          <div className="col-sm-3">
            <strong>Auth Type:</strong>
          </div>
          <div className="col-sm-9 text-capitalize">{user?.auth_type}</div>
        </div>
      </div>

      <hr />

      <div className="mb-4">
        <h5 className="fw-bold mb-3">Change Password</h5>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Form onSubmit={handleChangePassword}>
          <Form.Group className="mb-3">
            <Form.Label>Current Password</Form.Label>
            <Form.Control
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>New Password</Form.Label>
            <Form.Control
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Form.Text className="text-muted">
              Must be at least 8 characters with uppercase, lowercase, digit, and special character.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Confirm New Password</Form.Label>
            <Form.Control
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Changing..." : "Change Password"}
          </Button>
        </Form>
      </div>

      <hr />

      <div>
        <h5 className="fw-bold mb-3 text-danger">Danger Zone</h5>
        <p className="text-muted mb-3">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <Button
          variant="danger"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete Account
        </Button>
      </div>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>Warning!</strong> This action cannot be undone. This will permanently delete your account and all associated data.
          </Alert>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group>
            <Form.Label>Enter your password to confirm</Form.Label>
            <Form.Control
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletePassword("");
              setError("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            disabled={deleteLoading || !deletePassword}
          >
            {deleteLoading ? "Deleting..." : "Delete Account"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

