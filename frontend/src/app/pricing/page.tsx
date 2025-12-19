"use client";

import { Container, Row, Col, Card, Button } from "react-bootstrap";
import Link from "next/link";
import Footer from "@/components/footer";
import PricingPlans from "@/components/pricing-plans";
import { pricingPlans } from "@/lib/pricing-data";

export default function PricingPage() {

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white py-5">
        <Container>
          <div className="text-center py-5">
            <h1 className="display-3 fw-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="lead mb-4">
              Choose the plan that fits your needs. All plans include a 14-day free trial.
            </p>
            <p className="small opacity-75">
              No credit card required • Cancel anytime • 14-day money-back guarantee
            </p>
          </div>
        </Container>
      </section>

      {/* Pricing Cards */}
      <section className="py-5">
        <Container>
          <PricingPlans plans={pricingPlans} />
        </Container>
      </section>

      {/* FAQ Section */}
      <section className="py-5 bg-light">
        <Container>
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold mb-3">Frequently Asked Questions</h2>
          </div>
          <Row className="g-4">
            <Col md={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h5 className="fw-bold mb-3">Can I change plans later?</h5>
                  <p className="text-muted mb-0">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the billing.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h5 className="fw-bold mb-3">What payment methods do you accept?</h5>
                  <p className="text-muted mb-0">
                    We accept all major credit cards, debit cards, and PayPal. Enterprise customers can also pay via invoice.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h5 className="fw-bold mb-3">Is there a free trial?</h5>
                  <p className="text-muted mb-0">
                    Yes! All paid plans include a 14-day free trial. No credit card required to start your trial.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h5 className="fw-bold mb-3">What happens if I exceed my plan limits?</h5>
                  <p className="text-muted mb-0">
                    We'll notify you when you're approaching your limits. You can upgrade your plan or purchase additional capacity as needed.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h5 className="fw-bold mb-3">Can I cancel anytime?</h5>
                  <p className="text-muted mb-0">
                    Absolutely. You can cancel your subscription at any time with no cancellation fees. Your access continues until the end of your billing period.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <h5 className="fw-bold mb-3">Do you offer refunds?</h5>
                  <p className="text-muted mb-0">
                    Yes, we offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us for a full refund.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <Container>
          <Row className="justify-content-center text-center">
            <Col lg={8}>
              <h2 className="display-5 fw-bold mb-4">
                Still have questions?
              </h2>
              <p className="lead mb-4">
                Our team is here to help you choose the right plan for your needs.
              </p>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <Link href="/signup">
                  <Button variant="light" size="lg" className="px-5 fw-semibold">
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline-light" size="lg" className="px-5">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
