"use client";

import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, InputGroup } from "react-bootstrap";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import ConsoleSidebar from "@/components/console-sidebar";
import {
  getOrg, removeMember, updateMemberRole, createInvitation,
  listInvitations, revokeInvitation,
  OrgMemberInfo, OrgResponse, OrgInvitation,
} from "@/backend/org";
import { useI18n } from "@/contexts/i18n-context";

export default function OrgPage() {
  const { user, loading, hasPermission } = useAuth();
  const router = useRouter();
  const { t } = useI18n();
  const [orgData, setOrgData] = useState<OrgResponse | null>(null);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createRole, setCreateRole] = useState("member");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      const [data, invs] = await Promise.all([
        getOrg(),
        isAdmin ? listInvitations() : Promise.resolve([]),
      ]);
      setOrgData(data);
      setInvitations(invs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load organization");
    } finally {
      setLoadingOrg(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      setCreateError(null);
      const result = await createInvitation(createRole);
      setGeneratedCode(result.code);
      setCopied(false);
      loadOrg();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create invitation");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedCode) return;
    const link = `${window.location.origin}/invite/${generatedCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
  };

  const handleRevoke = async (inv: OrgInvitation) => {
    if (!confirm("Revoke this invitation?")) return;
    try {
      await revokeInvitation(inv.id);
      loadOrg();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revoke invitation");
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

  const closeCreateModal = () => {
    setShowCreate(false);
    setGeneratedCode(null);
    setCreateRole("member");
    setCreateError(null);
    setCopied(false);
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

  const activeInvitations = invitations.filter(
    (inv) => !inv.consumed_at && new Date(inv.expires_at) > new Date()
  );

  return (
    <div className="min-h-screen bg-light">
      <Row className="g-0">
        <Col md={3} lg={2} className="bg-white border-end">
          <ConsoleSidebar />
        </Col>
        <Col md={9} lg={10}>
          <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h3 fw-bold mb-1">{t("console.organization")}</h1>
                {orgData && (
                  <p className="text-muted mb-0">{orgData.org.name}</p>
                )}
              </div>
              {isAdmin && (
                <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                  Create Invitation
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
              <>
                <Card className="border-0 shadow-sm mb-4">
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

                {isAdmin && activeInvitations.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white">
                      <h5 className="mb-0">Active Invitations ({activeInvitations.length})</h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                      <Table responsive className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Code</th>
                            <th>Expires</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeInvitations.map((inv) => (
                            <tr key={inv.id}>
                              <td>
                                <code>{inv.code.substring(0, 8)}…</code>
                              </td>
                              <td>{new Date(inv.expires_at).toLocaleDateString()}</td>
                              <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `${window.location.origin}/invite/${inv.code}`
                                      );
                                    }}
                                  >
                                    Copy Link
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleRevoke(inv)}
                                  >
                                    Revoke
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}
              </>
            ) : null}
          </Container>
        </Col>
      </Row>

      <Modal show={showCreate} onHide={closeCreateModal}>
        <Modal.Header closeButton>
          <Modal.Title>Create Invitation</Modal.Title>
        </Modal.Header>
        {generatedCode ? (
          <Modal.Body>
            <p className="mb-2">Share this link with the person you want to invite:</p>
            <InputGroup className="mb-3">
              <Form.Control
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${generatedCode}`}
              />
              <Button variant="outline-secondary" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </InputGroup>
            <p className="text-muted small mb-0">
              This invitation expires in 7 days. The invitee must sign in or create an account to join.
            </p>
          </Modal.Body>
        ) : (
          <Form onSubmit={handleCreate}>
            <Modal.Body>
              {createError && (
                <div className="alert alert-danger" role="alert">
                  {createError}
                </div>
              )}
              <Form.Group className="mb-3">
                <Form.Label>Role</Form.Label>
                <Form.Select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  The role assigned to the person who accepts this invitation.
                </Form.Text>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={createLoading}>
                {createLoading ? "Creating..." : "Create"}
              </Button>
            </Modal.Footer>
          </Form>
        )}
        {generatedCode && (
          <Modal.Footer>
            <Button variant="primary" onClick={closeCreateModal}>
              Done
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
}
