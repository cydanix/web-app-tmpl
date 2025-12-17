"use client";

import { Container, Row, Col, Card } from "react-bootstrap";
import Footer from "@/components/footer";

export default function AboutPage() {
  const team = [
    {
      name: "Alex Thompson",
      role: "Founder & CEO",
      image: "https://i.pravatar.cc/200?img=12",
      bio: "15+ years in building scalable web platforms. Previously at Google and Amazon.",
    },
    {
      name: "Sarah Chen",
      role: "CTO",
      image: "https://i.pravatar.cc/200?img=5",
      bio: "Rust expert and distributed systems architect. Former principal engineer at Microsoft.",
    },
    {
      name: "Michael Rodriguez",
      role: "Head of Product",
      image: "https://i.pravatar.cc/200?img=13",
      bio: "Product visionary with a passion for developer experience. Ex-Stripe and GitHub.",
    },
    {
      name: "Emily Watson",
      role: "Lead Engineer",
      image: "https://i.pravatar.cc/200?img=1",
      bio: "Full-stack developer specializing in React and Next.js. Open source contributor.",
    },
  ];

  const values = [
    {
      title: "Performance First",
      description: "We obsess over every millisecond. Our platform is built with Rust to deliver unmatched speed and efficiency.",
      icon: "⚡",
    },
    {
      title: "Developer Experience",
      description: "We believe great tools should be a joy to use. Clean APIs, comprehensive docs, and excellent support.",
      icon: "💻",
    },
    {
      title: "Transparency",
      description: "Open communication, clear pricing, and honest about our capabilities and limitations.",
      icon: "🔍",
    },
    {
      title: "Innovation",
      description: "Constantly pushing boundaries and adopting cutting-edge technologies to stay ahead.",
      icon: "🚀",
    },
  ];

  const stats = [
    { number: "50K+", label: "Active Users" },
    { number: "1B+", label: "API Calls/Month" },
    { number: "99.99%", label: "Uptime SLA" },
    { number: "24/7", label: "Support Available" },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white py-20">
        <Container>
          <Row className="justify-content-center text-center">
            <Col lg={8}>
              <h1 className="display-3 fw-bold mb-4">About WebApp Platform</h1>
              <p className="lead mb-0">
                We&apos;re on a mission to make building and scaling web applications effortless.
                Our platform combines the raw performance of Rust with the developer experience
                of modern web frameworks.
              </p>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-light">
        <Container>
          <Row className="g-4">
            {stats.map((stat, index) => (
              <Col key={index} md={6} lg={3}>
                <div className="text-center">
                  <div className="display-4 fw-bold text-primary mb-2">{stat.number}</div>
                  <div className="text-muted">{stat.label}</div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="mb-5 mb-lg-0">
              <h2 className="display-5 fw-bold mb-4">Our Story</h2>
              <p className="text-muted mb-4">
                WebApp Platform was born out of frustration with slow, unreliable infrastructure
                and poor developer tools. In 2023, our founding team came together with a vision:
                to build the platform we&apos;d always wanted to use.
              </p>
              <p className="text-muted mb-4">
                We chose Rust for its unparalleled performance and safety, and Next.js for its
                excellent developer experience. The result? A platform that&apos;s fast, reliable,
                and actually enjoyable to work with.
              </p>
              <p className="text-muted mb-0">
                Today, we&apos;re proud to serve thousands of developers and companies worldwide,
                powering everything from startups to enterprise applications. But we&apos;re just
                getting started.
              </p>
            </Col>
            <Col lg={6}>
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3 p-8">
                <div className="bg-white rounded-2 p-6 shadow-sm">
                  <h3 className="h5 fw-bold mb-4">Our Mission</h3>
                  <p className="text-muted mb-4">
                    To empower developers with the fastest, most reliable platform for building
                    modern web applications, while maintaining the best developer experience in
                    the industry.
                  </p>
                  <h3 className="h5 fw-bold mb-4">Our Vision</h3>
                  <p className="text-muted mb-0">
                    A world where infrastructure complexity is abstracted away, allowing
                    developers to focus on what matters: building great products for their users.
                  </p>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-light">
        <Container>
          <div className="text-center mb-16">
            <h2 className="display-5 fw-bold mb-3">Our Values</h2>
            <p className="lead text-muted">The principles that guide everything we do</p>
          </div>
          <Row className="g-4">
            {values.map((value, index) => (
              <Col key={index} md={6}>
                <Card className="h-100 border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <div className="display-4 mb-3">{value.icon}</div>
                    <h3 className="h5 fw-bold mb-3">{value.title}</h3>
                    <p className="text-muted mb-0">{value.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <Container>
          <div className="text-center mb-16">
            <h2 className="display-5 fw-bold mb-3">Meet Our Team</h2>
            <p className="lead text-muted">
              Experienced engineers and product leaders from top tech companies
            </p>
          </div>
          <Row className="g-4">
            {team.map((member, index) => (
              <Col key={index} md={6} lg={3}>
                <Card className="h-100 border-0 shadow-sm text-center">
                  <Card.Body className="p-4">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="rounded-circle mb-3"
                      width="120"
                      height="120"
                    />
                    <h3 className="h5 fw-bold mb-1">{member.name}</h3>
                    <p className="text-primary mb-3">{member.role}</p>
                    <p className="text-muted small mb-0">{member.bio}</p>
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
              <h2 className="display-5 fw-bold mb-4">Want to Join Us?</h2>
              <p className="lead mb-5">
                We&apos;re always looking for talented individuals who share our passion
                for building great developer tools.
              </p>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <a href="#" className="btn btn-light btn-lg px-5 fw-semibold">
                  View Open Positions
                </a>
                <a href="#" className="btn btn-outline-light btn-lg px-5">
                  Contact Us
                </a>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <Footer />
    </>
  );
}

