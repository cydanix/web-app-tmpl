"use client";

import { useEffect } from "react";
import { Container, Button } from "react-bootstrap";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen d-flex align-items-center bg-light">
      <Container>
        <div className="text-center">
          <div className="mb-5">
            <svg
              className="mx-auto"
              width="200"
              height="200"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="100" cy="100" r="80" fill="#FFEBEE" />
              <path
                d="M70 80L80 90M80 80L70 90"
                stroke="#D32F2F"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M120 80L130 90M130 80L120 90"
                stroke="#D32F2F"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M70 130C70 130 80 120 100 120C120 120 130 130 130 130"
                stroke="#D32F2F"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="85" stroke="#D32F2F" strokeWidth="2" opacity="0.3" />
            </svg>
          </div>

          <h1 className="display-1 fw-bold text-danger mb-4">500</h1>
          <h2 className="h3 fw-bold mb-3">Something Went Wrong</h2>
          <p className="lead text-muted mb-4">
            We&apos;re sorry, but something unexpected happened.
            <br />
            Our team has been notified and we&apos;re working on it.
          </p>

          {error.digest && (
            <div className="bg-white rounded p-3 mb-4 d-inline-block">
              <p className="text-muted small mb-0">
                Error ID: <code className="text-danger">{error.digest}</code>
              </p>
            </div>
          )}

          <div className="d-flex gap-3 justify-content-center flex-wrap mb-4">
            <Button
              variant="primary"
              size="lg"
              className="px-5"
              onClick={() => reset()}
            >
              Try Again
            </Button>
            <Link href="/">
              <Button variant="outline-primary" size="lg" className="px-5">
                Go Home
              </Button>
            </Link>
          </div>

          <div className="mt-5">
            <p className="text-muted">
              If the problem persists,{" "}
              <a href="#" className="text-decoration-none fw-semibold">
                contact our support team
              </a>
            </p>
          </div>
        </div>
      </Container>

      <style jsx>{`
        .min-h-screen {
          min-height: calc(100vh - 80px);
        }
      `}</style>
    </div>
  );
}

