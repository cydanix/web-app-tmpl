"use client";

import { useEffect } from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import AccountSettings from "@/components/account-settings";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

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
              <h1 className="h3 fw-bold mb-1">Dashboard</h1>
              <p className="text-muted">Welcome back, {user.email}!</p>
            </div>

            <Row className="g-4 mb-4">
              <Col md={6} lg={3}>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="bg-primary bg-opacity-10 rounded p-3 me-3">
                        <svg
                          width="24"
                          height="24"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-muted small">Total Users</div>
                        <div className="h4 mb-0">1</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6} lg={3}>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="bg-success bg-opacity-10 rounded p-3 me-3">
                        <svg
                          width="24"
                          height="24"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                          <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-muted small">Active Sessions</div>
                        <div className="h4 mb-0">1</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6} lg={3}>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="bg-info bg-opacity-10 rounded p-3 me-3">
                        <svg
                          width="24"
                          height="24"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-muted small">Projects</div>
                        <div className="h4 mb-0">0</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6} lg={3}>
                <Card className="border-0 shadow-sm">
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="bg-warning bg-opacity-10 rounded p-3 me-3">
                        <svg
                          width="24"
                          height="24"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-muted small">Notifications</div>
                        <div className="h4 mb-0">0</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white">
                <h5 className="mb-0">Account Settings</h5>
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

