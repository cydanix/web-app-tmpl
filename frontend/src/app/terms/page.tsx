import { Container } from "react-bootstrap";
import Footer from "@/components/footer";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service - WebApp Platform",
  description: "Terms of Service for WebApp Platform",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Container className="py-5">
        <div className="mx-auto" style={{ maxWidth: '56rem' }}>
          <h1 className="display-4 fw-bold mb-4">Terms of Service</h1>
          <p className="text-muted mb-4">
            <small>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</small>
          </p>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">1. Acceptance of Terms</h2>
            <p className="mb-3">
              By accessing and using WebApp Platform ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">2. Use License</h2>
            <p className="mb-3">
              Permission is granted to temporarily use the Service for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="mb-3">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained on the Service</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">3. User Accounts</h2>
            <p className="mb-3">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account.
            </p>
            <p className="mb-3">
              You agree not to disclose your password to any third party and to take sole responsibility for any activities or actions under your account, whether or not you have authorized such activities or actions.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">4. Acceptable Use</h2>
            <p className="mb-3">
              You agree not to use the Service:
            </p>
            <ul className="mb-3">
              <li>In any way that violates any applicable national or international law or regulation</li>
              <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent</li>
              <li>To impersonate or attempt to impersonate the company, a company employee, another user, or any other person or entity</li>
              <li>In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful</li>
            </ul>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">5. Service Availability</h2>
            <p className="mb-3">
              We reserve the right to withdraw or amend the Service, and any service or material we provide on the Service, in our sole discretion without notice. We will not be liable if, for any reason, all or any part of the Service is unavailable at any time or for any period.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">6. Intellectual Property</h2>
            <p className="mb-3">
              The Service and its original content, features, and functionality are and will remain the exclusive property of WebApp Platform and its licensors. The Service is protected by copyright, trademark, and other laws.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">7. Termination</h2>
            <p className="mb-3">
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">8. Limitation of Liability</h2>
            <p className="mb-3">
              In no event shall WebApp Platform, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">9. Governing Law</h2>
            <p className="mb-3">
              These Terms shall be interpreted and governed by the laws of the jurisdiction in which WebApp Platform operates, without regard to its conflict of law provisions.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">10. Changes to Terms</h2>
            <p className="mb-3">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">11. Contact Information</h2>
            <p className="mb-3">
              If you have any questions about these Terms, please contact us through our support channels.
            </p>
          </div>

          <div className="mt-5 pt-4 border-top">
            <Link href="/" className="text-decoration-none">
              ← Back to Home
            </Link>
          </div>
        </div>
      </Container>
      <Footer />
    </div>
  );
}
