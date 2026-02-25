"use client";

import { useEffect, useState } from "react";
import { Container, Card, Button, Spinner } from "react-bootstrap";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getInvitationInfo, OrgInvitationInfo } from "@/backend/org";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const code = params.code as string;

  const [info, setInfo] = useState<OrgInvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getInvitationInfo(code);
        setInfo(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Invitation not found or expired");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  if (loading || authLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <Container style={{ maxWidth: 480 }}>
          <Card className="border-0 shadow-sm text-center p-4">
            <Card.Body>
              <h2 className="h4 fw-bold mb-3">Invitation Invalid</h2>
              <p className="text-muted mb-4">{error}</p>
              <Button variant="primary" onClick={() => router.push("/")}>
                Go Home
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <Container style={{ maxWidth: 480 }}>
        <Card className="border-0 shadow-sm text-center p-4">
          <Card.Body>
            <h2 className="h4 fw-bold mb-3">You&apos;re Invited</h2>
            <p className="mb-1">
              Join <strong>{info.org_name}</strong> as a <strong>{info.role}</strong>.
            </p>
            <p className="text-muted small mb-4">
              Expires {new Date(info.expires_at).toLocaleDateString()}
            </p>

            {user ? (
              <div>
                <p className="text-muted mb-3">
                  You are already signed in as <strong>{user.email}</strong>.
                  Invitation codes can only be used when creating a new account.
                </p>
                <Button variant="primary" onClick={() => router.push("/console")}>
                  Go to Console
                </Button>
              </div>
            ) : (
              <div className="d-grid">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push(`/signup?invite=${code}`)}
                >
                  Sign up to Join
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
