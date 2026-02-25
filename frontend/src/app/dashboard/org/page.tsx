"use client";

import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge } from "react-bootstrap";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { getOrg, inviteMember, removeMember, updateMemberRole, OrgMemberInfo, OrgResponse } from "@/backend/org";
import { useI18n } from "@/contexts/i18n-context";

export default function OrgPage() {
  const { user, loading, hasPermission } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [orgData, setOrgData] = useState<OrgResponse | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isAdmin = hasPermission("members:invite");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadOrg();
    }
  }, [user]);

  const loadOrg = async () => {
    try {
      setLoadingOrg(true);
      setError(null);
      const data = await getOrg();
      setOrgData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load organization");
    } finally {
      setLoadingOrg(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInviteLoading(true);
      setInviteError(null);
      await inviteMember(inviteEmail, inviteRole);
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("member");
      loadOrg();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemove = async (member: OrgMemberInfo) => {
    if (!confirm(`Remove ${member.email} from the organization?`)) return;
    try {
      await removeMember(member.profile_id);
      loadOrg();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleRoleChange = async (member: OrgMemberInfo, newRole: string) => {
    try {
      await updateMemberRole(member.profile_id, newRole);
      loadOrg();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update role");
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

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "primary";
    if (role === "member") return "success";
    return "secondary";
  };

  return (
    <div className="min-h-screen bg-light">
      <Row className="g-0">
        <Col md={3} lg={2} className="bg-white border-end">
          <DashboardSidebar />
        </Col>
        <Col md={9} lg={10}>
          <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h3 fw-bold mb-1">{t("dashboard.organization")}</h1>
                {orgData && (
                  <p className="text-muted mb-0">{orgData.org.name}</p>
                )}
              </div>
              {isAdmin && (
                <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
                  Invite Member
                </Button>
              )}
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {loadingOrg ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : orgData ? (
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Members ({orgData.members.length})</h5>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table responsive className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Joined</th>
                        {isAdmin && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {orgData.members.map((member) => (
                        <tr key={member.profile_id}>
                          <td>{member.email}</td>
                          <td>{member.display_name || member.username || "—"}</td>
                          <td>
                            <Badge bg={roleBadgeVariant(member.role)}>
                              {member.role}
                            </Badge>
                          </td>
                          <td>{new Date(member.joined_at).toLocaleDateString()}</td>
                          {isAdmin && (
                            <td>
                              {member.profile_id !== user.id ? (
                                <div className="d-flex gap-2">
                                  <Form.Select
                                    size="sm"
                                    value={member.role}
                                    onChange={(e) => handleRoleChange(member, e.target.value)}
                                    style={{ width: "auto" }}
                                  >
                                    <option value="admin">admin</option>
                                    <option value="member">member</option>
                                    <option value="viewer">viewer</option>
                                  </Form.Select>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleRemove(member)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted small">You</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            ) : null}
          </Container>
        </Col>
      </Row>

      <Modal show={showInvite} onHide={() => setShowInvite(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Invite Member</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleInvite}>
          <Modal.Body>
            {inviteError && (
              <div className="alert alert-danger" role="alert">
                {inviteError}
              </div>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                The user must already have an account.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={inviteLoading}>
              {inviteLoading ? "Inviting..." : "Invite"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
