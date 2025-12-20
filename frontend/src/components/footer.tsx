"use client";

import { Container, Row, Col } from "react-bootstrap";
import Link from "next/link";
import { useI18n } from "@/contexts/i18n-context";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-dark text-white py-5">
      <Container>
        <Row>
          <Col lg={4} className="mb-4 mb-lg-0">
            <h5 className="fw-bold mb-3">{t("footer.title")}</h5>
            <p className="text-white-50">
              {t("footer.description")}
            </p>
          </Col>
          <Col lg={2} md={6} className="mb-4 mb-lg-0">
            <h6 className="fw-bold mb-3">{t("footer.product")}</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link href="/pricing" className="text-white-50 text-decoration-none hover:text-white">
                  {t("common.pricing")}
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/status" className="text-white-50 text-decoration-none hover:text-white">
                  {t("common.status")}
                </Link>
              </li>
            </ul>
          </Col>
          <Col lg={2} md={6} className="mb-4 mb-lg-0">
            <h6 className="fw-bold mb-3">{t("footer.company")}</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link href="/about" className="text-white-50 text-decoration-none hover:text-white">
                  {t("common.about")}
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/blog" className="text-white-50 text-decoration-none hover:text-white">
                  {t("common.blog")}
                </Link>
              </li>
            </ul>
          </Col>
          <Col lg={2} md={6} className="mb-4 mb-lg-0">
            <h6 className="fw-bold mb-3">{t("footer.account")}</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link href="/signin" className="text-white-50 text-decoration-none hover:text-white">
                  {t("common.signIn")}
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/signup" className="text-white-50 text-decoration-none hover:text-white">
                  {t("common.signUp")}
                </Link>
              </li>
            </ul>
          </Col>
          <Col lg={2} md={6}>
            <h6 className="fw-bold mb-3">{t("footer.legal")}</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link href="/privacy" className="text-white-50 text-decoration-none hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/terms" className="text-white-50 text-decoration-none hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </Col>
        </Row>
        <hr className="my-4 border-secondary" />
        <div className="text-center text-white-50">
          <p className="mb-0">{t("footer.copyright")}</p>
        </div>
      </Container>
    </footer>
  );
}

