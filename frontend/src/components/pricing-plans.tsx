"use client";

import { Row, Col, Card, Button } from "react-bootstrap";
import Link from "next/link";

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description?: string;
  features: string[];
  highlighted: boolean;
  cta?: string;
  ctaVariant?: "primary" | "outline-primary";
}

interface PricingPlansProps {
  plans: PricingPlan[];
}

export default function PricingPlans({ plans }: PricingPlansProps) {
  return (
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
                {plan.description && (
                  <p className="text-muted small mb-3">{plan.description}</p>
                )}
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
                  variant={plan.ctaVariant || (plan.highlighted ? "primary" : "outline-primary")}
                  size="lg"
                  className="w-100"
                >
                  {plan.cta || "Get Started"}
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
