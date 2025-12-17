"use client";

import { Button, Container, Row, Col, Card } from "react-bootstrap";
import Link from "next/link";
import Footer from "@/components/footer";

export default function Home() {
  const features = [
    {
      title: "Lightning Fast",
      description: "Built with Rust and Next.js for maximum performance and speed",
      icon: (
        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: "Secure & Reliable",
      description: "Enterprise-grade security with 99.9% uptime guarantee",
      icon: (
        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: "Real-time Updates",
      description: "Live data synchronization and instant notifications",
      icon: (
        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      title: "Easy Integration",
      description: "Simple API and comprehensive documentation for quick setup",
      icon: (
        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
    {
      title: "Scalable Architecture",
      description: "Handles millions of requests with horizontal scaling",
      icon: (
        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      title: "24/7 Support",
      description: "Dedicated support team available around the clock",
      icon: (
        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CTO at TechCorp",
      image: "https://i.pravatar.cc/150?img=1",
      content: "This platform transformed our operations. The performance is incredible and the reliability is unmatched.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Founder at StartupXYZ",
      image: "https://i.pravatar.cc/150?img=13",
      content: "Best decision we made for our infrastructure. The real-time features are game-changing.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Engineering Lead at DataFlow",
      image: "https://i.pravatar.cc/150?img=5",
      content: "Outstanding service! The Rust backend provides the performance we needed for our high-traffic application.",
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      features: [
        "Up to 10,000 requests/day",
        "Basic analytics",
        "Email support",
        "99.5% uptime SLA",
        "1 team member",
      ],
      highlighted: false,
    },
    {
      name: "Professional",
      price: "$99",
      period: "/month",
      features: [
        "Up to 100,000 requests/day",
        "Advanced analytics",
        "Priority support",
        "99.9% uptime SLA",
        "10 team members",
      ],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      features: [
        "Unlimited requests",
        "Custom analytics",
        "24/7 phone support",
        "99.99% uptime SLA",
        "Unlimited team members",
      ],
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white">
        <Container className="py-20">
          <Row className="align-items-center">
            <Col lg={6} className="mb-5 mb-lg-0">
              <h1 className="display-3 fw-bold mb-4">
                Build Faster, Scale Better
              </h1>
              <p className="lead mb-4">
                The ultimate platform for modern web applications. Powered by Rust and Next.js,
                delivering unmatched performance and reliability.
              </p>
              <div className="d-flex gap-3 flex-wrap">
                <Button variant="light" size="lg" className="px-5 fw-semibold">
                  Start Free Trial
                </Button>
                <Link href="/status">
                  <Button variant="outline-light" size="lg" className="px-5">
                    View Status
                  </Button>
                </Link>
              </div>
              <p className="mt-4 opacity-75">
                <small>No credit card required • 14-day free trial</small>
              </p>
            </Col>
            <Col lg={6}>
              <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-3 p-5 shadow-lg">
                <div className="bg-gradient-to-br from-white/20 to-white/5 rounded-2 p-8">
                  <div className="text-center mb-4">
                    <div className="bg-green-500 w-3 h-3 rounded-full inline-block"></div>
                    <span className="ms-2 fw-semibold">All Systems Operational</span>
                  </div>
                  <div className="d-flex justify-content-around text-center">
                    <div>
                      <div className="display-6 fw-bold">99.9%</div>
                      <div className="small opacity-75">Uptime</div>
                    </div>
                    <div>
                      <div className="display-6 fw-bold">&lt;50ms</div>
                      <div className="small opacity-75">Latency</div>
                    </div>
                    <div>
                      <div className="display-6 fw-bold">1M+</div>
                      <div className="small opacity-75">Requests/day</div>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-light">
        <Container>
          <div className="text-center mb-16">
            <h2 className="display-4 fw-bold mb-3">Powerful Features</h2>
            <p className="lead text-muted">
              Everything you need to build and scale your application
            </p>
          </div>
          <Row className="g-4">
            {features.map((feature, index) => (
              <Col key={index} md={6} lg={4}>
                <Card className="h-100 border-0 shadow-sm hover-shadow transition-all">
                  <Card.Body className="p-4">
                    <div className="mb-3">{feature.icon}</div>
                    <h3 className="h5 fw-bold mb-3">{feature.title}</h3>
                    <p className="text-muted mb-0">{feature.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <h2 className="display-4 fw-bold mb-3">Loved by Developers</h2>
            <p className="lead text-muted">
              See what our customers are saying about us
            </p>
          </div>
          <Row className="g-4">
            {testimonials.map((testimonial, index) => (
              <Col key={index} lg={4}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <div className="d-flex mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <svg key={i} className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="mb-4 text-muted">&quot;{testimonial.content}&quot;</p>
                    <div className="d-flex align-items-center">
                      <img
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="rounded-circle me-3"
                        width="48"
                        height="48"
                      />
                      <div>
                        <div className="fw-semibold">{testimonial.name}</div>
                        <div className="small text-muted">{testimonial.role}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-light">
        <Container>
          <div className="text-center mb-16">
            <h2 className="display-4 fw-bold mb-3">Simple, Transparent Pricing</h2>
            <p className="lead text-muted">
              Choose the plan that fits your needs
            </p>
          </div>
          <Row className="g-4 justify-content-center">
            {pricingPlans.map((plan, index) => (
              <Col key={index} lg={4} md={6}>
                <Card className={`h-100 border-0 shadow-sm ${plan.highlighted ? 'border-3 border-primary shadow-lg' : ''}`}>
                  {plan.highlighted && (
                    <div className="bg-primary text-white text-center py-2 small fw-semibold">
                      MOST POPULAR
                    </div>
                  )}
                  <Card.Body className="p-4 d-flex flex-column">
                    <h3 className="h4 fw-bold mb-3">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="display-4 fw-bold">{plan.price}</span>
                      <span className="text-muted">{plan.period}</span>
                    </div>
                    <ul className="list-unstyled mb-4 flex-grow-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="mb-3 d-flex align-items-start">
                          <svg className="w-5 h-5 text-success me-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.highlighted ? "primary" : "outline-primary"}
                      size="lg"
                      className="w-100"
                    >
                      Get Started
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <Container>
          <Row className="justify-content-center text-center">
            <Col lg={8}>
              <h2 className="display-4 fw-bold mb-4">
                Ready to Get Started?
              </h2>
              <p className="lead mb-5">
                Join thousands of developers building amazing applications with our platform.
                Start your free trial today, no credit card required.
              </p>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <Button variant="light" size="lg" className="px-5 fw-semibold">
                  Start Free Trial
                </Button>
                <Button variant="outline-light" size="lg" className="px-5">
                  Schedule a Demo
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
