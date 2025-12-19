import { Container } from "react-bootstrap";
import Footer from "@/components/footer";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - WebApp Platform",
  description: "Privacy Policy for WebApp Platform",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Container className="py-5">
        <div className="mx-auto" style={{ maxWidth: '56rem' }}>
          <h1 className="display-4 fw-bold mb-4">Privacy Policy</h1>
          <p className="text-muted mb-4">
            <small>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</small>
          </p>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">1. Introduction</h2>
            <p className="mb-3">
              WebApp Platform ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">2. Information We Collect</h2>
            <h3 className="h5 fw-semibold mb-2 mt-3">2.1 Information You Provide</h3>
            <p className="mb-3">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="mb-3">
              <li>Email address and password when you create an account</li>
              <li>Profile information such as display name and avatar</li>
              <li>Any other information you choose to provide</li>
            </ul>

            <h3 className="h5 fw-semibold mb-2 mt-3">2.2 Automatically Collected Information</h3>
            <p className="mb-3">
              When you use our Service, we automatically collect certain information, including:
            </p>
            <ul className="mb-3">
              <li>IP address and browser type</li>
              <li>Device information and operating system</li>
              <li>Usage data and interaction patterns</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">
              We use the information we collect to:
            </p>
            <ul className="mb-3">
              <li>Provide, maintain, and improve our Service</li>
              <li>Process your transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, prevent, and address technical issues</li>
            </ul>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">4. Information Sharing and Disclosure</h2>
            <p className="mb-3">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul className="mb-3">
              <li><strong>Service Providers:</strong> We may share information with third-party service providers who perform services on our behalf</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required by law or in response to valid requests by public authorities</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred</li>
            </ul>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">5. Data Security</h2>
            <p className="mb-3">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">6. Data Retention</h2>
            <p className="mb-3">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">7. Your Rights</h2>
            <p className="mb-3">
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="mb-3">
              <li>The right to access your personal information</li>
              <li>The right to rectify inaccurate or incomplete information</li>
              <li>The right to request deletion of your information</li>
              <li>The right to object to processing of your information</li>
              <li>The right to data portability</li>
            </ul>
            <p className="mb-3">
              To exercise these rights, please contact us through our support channels.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">8. Cookies and Tracking Technologies</h2>
            <p className="mb-3">
              We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">9. Third-Party Links</h2>
            <p className="mb-3">
              Our Service may contain links to third-party websites or services that are not owned or controlled by us. We have no control over, and assume no responsibility for, the privacy practices of such third parties.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">10. Children's Privacy</h2>
            <p className="mb-3">
              Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">11. Changes to This Privacy Policy</h2>
            <p className="mb-3">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="h3 fw-bold mb-3">12. Contact Us</h2>
            <p className="mb-3">
              If you have any questions about this Privacy Policy, please contact us through our support channels.
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
