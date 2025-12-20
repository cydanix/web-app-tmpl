"use client";

import { Container, Navbar, Nav, Button } from "react-bootstrap";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/contexts/i18n-context";
import LanguageSwitcher from "@/components/language-switcher";

export default function Header() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <Navbar bg="white" expand="lg" className="shadow-sm py-3" sticky="top">
      <Container>
        <Link href="/" className="navbar-brand fw-bold text-primary" style={{ fontSize: "1.5rem" }}>
          {t("header.title")}
        </Link>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="ms-auto align-items-lg-center">
            <Link 
              href="/" 
              className={`nav-link ${pathname === "/" ? "fw-semibold text-primary" : ""}`}
            >
              {t("common.home")}
            </Link>
            <Link 
              href="/about" 
              className={`nav-link ${pathname === "/about" ? "fw-semibold text-primary" : ""}`}
            >
              {t("common.about")}
            </Link>
            <Link 
              href="/blog" 
              className={`nav-link ${pathname === "/blog" || pathname?.startsWith("/blog/") ? "fw-semibold text-primary" : ""}`}
            >
              {t("common.blog")}
            </Link>
            <Link 
              href="/status" 
              className={`nav-link ${pathname === "/status" ? "fw-semibold text-primary" : ""}`}
            >
              {t("common.status")}
            </Link>
            <Link 
              href="/pricing" 
              className={`nav-link ${pathname === "/pricing" ? "fw-semibold text-primary" : ""}`}
            >
              {t("common.pricing")}
            </Link>
            <div className="d-flex gap-2 ms-lg-3 mt-3 mt-lg-0 align-items-center">
              <LanguageSwitcher />
              <Link href="/signin">
                <Button variant="outline-primary" size="sm">
                  {t("common.signIn")}
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  {t("common.signUp")}
                </Button>
              </Link>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

