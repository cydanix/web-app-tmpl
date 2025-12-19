"use client";

import { Card } from "react-bootstrap";
import Link from "next/link";

interface BlogCardProps {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
}

export default function BlogCard({ slug, title, date, excerpt }: BlogCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="h-100 border-0 shadow-sm hover-shadow transition-all">
      <Card.Body className="d-flex flex-column">
        <div className="mb-3">
          <small className="text-muted">{formattedDate}</small>
        </div>
        <h3 className="h5 fw-bold mb-3">
          <Link 
            href={`/blog/${slug}`}
            className="text-decoration-none text-dark"
          >
            {title}
          </Link>
        </h3>
        <p className="text-muted mb-auto">
          {excerpt}...
        </p>
        <Link 
          href={`/blog/${slug}`}
          className="mt-3 text-decoration-none"
        >
          Read more →
        </Link>
      </Card.Body>
    </Card>
  );
}
