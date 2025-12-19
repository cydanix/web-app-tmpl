"use client";

import { Container, Navbar, Nav, Button } from "react-bootstrap";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <Navbar bg="white" expand="lg" className="shadow-sm py-3" sticky="top">
      <Container>
        <Link href="/" className="navbar-brand fw-bold text-primary" style={{ fontSize: "1.5rem" }}>
          WebApp
        </Link>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="ms-auto align-items-lg-center">
            <Link 
              href="/" 
              className={`nav-link ${pathname === "/" ? "fw-semibold text-primary" : ""}`}
            >
              Home
            </Link>
            <Link 
              href="/about" 
              className={`nav-link ${pathname === "/about" ? "fw-semibold text-primary" : ""}`}
            >
              About
            </Link>
            <Link 
              href="/blog" 
              className={`nav-link ${pathname === "/blog" || pathname?.startsWith("/blog/") ? "fw-semibold text-primary" : ""}`}
            >
              Blog
            </Link>
            <Link 
              href="/status" 
              className={`nav-link ${pathname === "/status" ? "fw-semibold text-primary" : ""}`}
            >
              Status
            </Link>
            <Link 
              href="/pricing" 
              className={`nav-link ${pathname === "/pricing" ? "fw-semibold text-primary" : ""}`}
            >
              Pricing
            </Link>
            <div className="d-flex gap-2 ms-lg-3 mt-3 mt-lg-0">
              <Link href="/signin">
                <Button variant="outline-primary" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

