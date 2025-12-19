"use client";

import { Container, Row, Col, Card, Button } from "react-bootstrap";
import Link from "next/link";
import Footer from "@/components/footer";

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for getting started",
      features: [
        "Up to 1,000 requests/month",
        "Basic API access",
        "Community support",
        "Standard documentation",
        "99% uptime SLA",
        "1 project",
        "Email notifications",
      ],
      highlighted: false,
      cta: "Get Started Free",
      ctaVariant: "outline-primary" as const,
    },
    {
      name: "Basic",
      price: "$29",
      period: "/month",
      description: "For growing businesses",
      features: [
        "Up to 50,000 requests/month",
        "Full API access",
        "Email support",
        "Advanced analytics",
        "99.5% uptime SLA",
        "5 projects",
        "Priority email support",
        "Custom integrations",
        "API rate limit: 10 req/sec",
      ],
      highlighted: true,
      cta: "Start Free Trial",
      ctaVariant: "primary" as const,
    },
    {
      name: "Pro",
      price: "$99",
      period: "/month",
      description: "For teams and scale",
      features: [
        "Up to 500,000 requests/month",
        "Full API access",
        "Priority support",
        "Advanced analytics & reporting",
        "99.9% uptime SLA",
        "Unlimited projects",
        "24/7 priority support",
        "Custom integrations",
        "API rate limit: 100 req/sec",
        "Dedicated account manager",
        "Custom SLA options",
      ],
      highlighted: false,
      cta: "Start Free Trial",
      ctaVariant: "primary" as const,
    },
  ];

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
          <Row className="g-4 justify-content-center">
            {plans.map((plan, index) => (
              <Col key={index} lg={4} md={6}>
                <Card
                  className={`h-100 border-0 shadow-sm ${
                    plan.highlighted
                      ? "border-3 border-primary shadow-lg position-relative"
                      : ""
                  }`}
                >
                  {plan.highlighted && (
                    <div className="bg-primary text-white text-center py-2 small fw-semibold">
                      MOST POPULAR
                    </div>
                  )}
                  <Card.Body className="p-4 d-flex flex-column">
                    <div className="mb-3">
                      <h3 className="h4 fw-bold mb-2">{plan.name}</h3>
                      <p className="text-muted small mb-3">{plan.description}</p>
                      <div className="mb-3">
                        <span className="display-4 fw-bold">{plan.price}</span>
                        <span className="text-muted">{plan.period}</span>
                      </div>
                    </div>
                    <ul className="list-unstyled mb-4 flex-grow-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="mb-3 d-flex align-items-start">
                          <svg
                            className="w-5 h-5 text-success me-2 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            style={{ width: "1.25rem", height: "1.25rem" }}
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/signup" className="w-100 text-decoration-none">
                      <Button
                        variant={plan.ctaVariant}
                        size="lg"
                        className="w-100"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
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
