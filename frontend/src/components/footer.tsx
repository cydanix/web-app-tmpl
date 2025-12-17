import { Container, Row, Col } from "react-bootstrap";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-dark text-white py-5">
      <Container>
        <Row>
          <Col lg={4} className="mb-4 mb-lg-0">
            <h5 className="fw-bold mb-3">WebApp Platform</h5>
            <p className="text-white-50">
              Built with Rust Actix-Web and Next.js for maximum performance and developer experience.
            </p>
          </Col>
          <Col lg={2} md={6} className="mb-4 mb-lg-0">
            <h6 className="fw-bold mb-3">Product</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <a href="#features" className="text-white-50 text-decoration-none hover:text-white">
                  Features
                </a>
              </li>
              <li className="mb-2">
                <a href="#pricing" className="text-white-50 text-decoration-none hover:text-white">
                  Pricing
                </a>
              </li>
              <li className="mb-2">
                <Link href="/status" className="text-white-50 text-decoration-none hover:text-white">
                  Status
                </Link>
              </li>
            </ul>
          </Col>
          <Col lg={2} md={6} className="mb-4 mb-lg-0">
            <h6 className="fw-bold mb-3">Company</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link href="/about" className="text-white-50 text-decoration-none hover:text-white">
                  About
                </Link>
              </li>
              <li className="mb-2">
                <a href="#" className="text-white-50 text-decoration-none hover:text-white">
                  Blog
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="text-white-50 text-decoration-none hover:text-white">
                  Careers
                </a>
              </li>
            </ul>
          </Col>
          <Col lg={2} md={6} className="mb-4 mb-lg-0">
            <h6 className="fw-bold mb-3">Account</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link href="/signin" className="text-white-50 text-decoration-none hover:text-white">
                  Sign In
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/signup" className="text-white-50 text-decoration-none hover:text-white">
                  Sign Up
                </Link>
              </li>
            </ul>
          </Col>
          <Col lg={2} md={6} className="mb-4 mb-lg-0">
            <h6 className="fw-bold mb-3">Resources</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <a href="#" className="text-white-50 text-decoration-none hover:text-white">
                  Documentation
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="text-white-50 text-decoration-none hover:text-white">
                  API Reference
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="text-white-50 text-decoration-none hover:text-white">
                  Support
                </a>
              </li>
            </ul>
          </Col>
          <Col lg={2} md={6}>
            <h6 className="fw-bold mb-3">Legal</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <a href="#" className="text-white-50 text-decoration-none hover:text-white">
                  Privacy
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="text-white-50 text-decoration-none hover:text-white">
                  Terms
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="text-white-50 text-decoration-none hover:text-white">
                  Security
                </a>
              </li>
            </ul>
          </Col>
        </Row>
        <hr className="my-4 border-secondary" />
        <div className="text-center text-white-50">
          <p className="mb-0">&copy; 2025 WebApp Platform. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
}

