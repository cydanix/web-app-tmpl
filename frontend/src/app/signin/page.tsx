"use client";

import { useState, useEffect, Suspense } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { useAuth } from "@/contexts/auth-context";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import GoogleSignInButton from "@/components/google-signin-button";
import { isGoogleOAuthEnabledFromEnv } from "@/lib/google-oauth";
import { useI18n } from "@/contexts/i18n-context";

function SignInContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const { login } = useAuth();
  const { t } = useI18n();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkGoogleOAuth = async () => {
      const enabled = await isGoogleOAuthEnabledFromEnv();
      setGoogleOAuthEnabled(enabled);
    };
    checkGoogleOAuth();
  }, []);

  useEffect(() => {
    // Check if user was redirected after verification
    if (searchParams.get("verified") === "true") {
      setSuccess(t("signin.emailVerified"));
    }
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen d-flex align-items-center bg-light py-5">
      <Container className="max-w-md">
        <Card className="shadow">
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <h2 className="fw-bold">{t("signin.title")}</h2>
              <p className="text-muted">{t("signin.subtitle")}</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>{t("signin.email")}</Form.Label>
                <Form.Control
                  type="email"
                  placeholder={t("signin.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t("signin.password")}</Form.Label>
                <Form.Control
                  type="password"
                  placeholder={t("signin.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100 mb-3"
                disabled={loading}
              >
                {loading ? t("signin.signingIn") : t("signin.signIn")}
              </Button>
            </Form>

            {googleOAuthEnabled && (
              <>
                <div className="text-center mb-3">
                  <span className="text-muted">{t("signin.or")}</span>
                </div>
                <GoogleSignInButton variant="signin" className="mb-3" disabled={loading} />
              </>
            )}

            <div className="text-center">
              <p className="mb-0">
                {t("signin.noAccount")}{" "}
                <Link href="/signup" className="text-decoration-none">
                  {t("signin.signUp")}
                </Link>
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

export default function SignInPage() {
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
      <SignInContent />
    </Suspense>
  );
}

