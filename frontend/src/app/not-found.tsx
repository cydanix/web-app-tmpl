"use client";

import { Container, Button } from "react-bootstrap";
import Link from "next/link";

export default function NotFound() {
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
              <circle cx="100" cy="100" r="80" fill="#E3F2FD" />
              <path
                d="M70 90C70 83.3726 75.3726 78 82 78C88.6274 78 94 83.3726 94 90"
                stroke="#1976D2"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M106 90C106 83.3726 111.373 78 118 78C124.627 78 130 83.3726 130 90"
                stroke="#1976D2"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M70 130C70 130 80 115 100 115C120 115 130 130 130 130"
                stroke="#1976D2"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1 className="display-1 fw-bold text-primary mb-4">404</h1>
          <h2 className="h3 fw-bold mb-3">Page Not Found</h2>
          <p className="lead text-muted mb-5">
            Sorry, we couldn&apos;t find the page you&apos;re looking for.
            <br />
            It might have been moved or doesn&apos;t exist.
          </p>

          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link href="/">
              <Button variant="primary" size="lg" className="px-5">
                Go Home
              </Button>
            </Link>
            <Link href="/status">
              <Button variant="outline-primary" size="lg" className="px-5">
                Check Status
              </Button>
            </Link>
          </div>

          <div className="mt-5">
            <p className="text-muted">
              Need help?{" "}
              <a href="#" className="text-decoration-none fw-semibold">
                Contact Support
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

