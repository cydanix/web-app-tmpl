"use client";

import { useState, useEffect } from "react";
import { Container, Card, Form, Button, Alert } from "react-bootstrap";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import GoogleSignInButton from "@/components/google-signin-button";
import { isGoogleOAuthEnabledFromEnv } from "@/lib/google-oauth";
import { useI18n } from "@/contexts/i18n-context";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const { signup } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    const checkGoogleOAuth = async () => {
      const enabled = await isGoogleOAuthEnabledFromEnv();
      setGoogleOAuthEnabled(enabled);
    };
    checkGoogleOAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("signup.passwordMismatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("signup.passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      await signup(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
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
              <h2 className="fw-bold">{t("signup.title")}</h2>
              <p className="text-muted">{t("signup.subtitle")}</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>{t("signup.email")}</Form.Label>
                <Form.Control
                  type="email"
                  placeholder={t("signup.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t("signup.password")}</Form.Label>
                <Form.Control
                  type="password"
                  placeholder={t("signup.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Form.Text className="text-muted">
                  {t("signup.passwordHint")}
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>{t("signup.confirmPassword")}</Form.Label>
                <Form.Control
                  type="password"
                  placeholder={t("signup.confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100 mb-3"
                disabled={loading}
              >
                {loading ? t("signup.creating") : t("signup.signUp")}
              </Button>
            </Form>

            {googleOAuthEnabled && (
              <>
                <div className="text-center mb-3">
                  <span className="text-muted">{t("signup.or")}</span>
                </div>
                <GoogleSignInButton variant="signup" className="mb-3" disabled={loading} />
              </>
            )}

            <div className="text-center">
              <p className="mb-0">
                {t("signup.hasAccount")}{" "}
                <Link href="/signin" className="text-decoration-none">
                  {t("signup.signIn")}
                </Link>
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

