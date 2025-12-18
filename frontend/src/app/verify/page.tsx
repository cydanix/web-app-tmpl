"use client";

import { useState, useEffect, Suspense } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyContent() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  useEffect(() => {
    // Get email and account_id from URL params (passed from signup)
    const emailParam = searchParams.get("email");
    const accountIdParam = searchParams.get("account_id");

    if (emailParam) {
      setEmail(emailParam);
    }
    if (accountIdParam) {
      setAccountId(accountIdParam);
    }

    // If missing params, redirect to signup
    if (!emailParam || !accountIdParam) {
      router.push("/signup");
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          code: code,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Verification failed");
      }

      setSuccess(true);
      // Redirect to signin after 2 seconds
      setTimeout(() => {
        router.push("/signin?verified=true");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResendLoading(true);

    try {
      const response = await fetch(`${apiUrl}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to resend verification code");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setResendLoading(false);
    }
  };

  if (success && !loading) {
    return (
      <div className="min-h-screen d-flex align-items-center bg-light py-5">
        <Container className="max-w-md">
          <Card className="shadow">
            <Card.Body className="p-5 text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto text-success"
                  width="64"
                  height="64"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.022-1.08z" />
                </svg>
              </div>
              <h2 className="fw-bold mb-3">Email Verified!</h2>
              <p className="text-muted mb-4">
                Your email has been successfully verified. Redirecting to sign in...
              </p>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen d-flex align-items-center bg-light py-5">
      <Container className="max-w-md">
        <Card className="shadow">
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <h2 className="fw-bold">Verify Your Email</h2>
              <p className="text-muted">
                We&apos;ve sent a verification code to <strong>{email}</strong>
              </p>
              <p className="text-muted small">
                Please enter the 6-digit code from your email to verify your account.
              </p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">Verification code sent! Check your email.</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Verification Code</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  required
                  className="text-center"
                  style={{ fontSize: "1.5rem", letterSpacing: "0.5rem" }}
                />
                <Form.Text className="text-muted">
                  Enter the code sent to your email address
                </Form.Text>
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100 mb-3"
                disabled={loading || code.length !== 6}
              >
                {loading ? "Verifying..." : "Verify Email"}
              </Button>
            </Form>

            <div className="text-center">
              <p className="text-muted small mb-2">
                Didn&apos;t receive the code?
              </p>
              <Button
                variant="link"
                onClick={handleResend}
                disabled={resendLoading}
                className="p-0"
              >
                {resendLoading ? "Sending..." : "Resend Verification Code"}
              </Button>
            </div>

            <hr className="my-4" />

            <div className="text-center">
              <p className="mb-0">
                <Link href="/signin" className="text-decoration-none">
                  Back to Sign In
                </Link>
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen d-flex align-items-center bg-light py-5">
        <Container className="max-w-md">
          <Card className="shadow">
            <Card.Body className="p-5 text-center">
              <p>Loading...</p>
            </Card.Body>
          </Card>
        </Container>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

