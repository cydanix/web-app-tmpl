"use client";

import { Row, Col } from "react-bootstrap";
import BlogCard from "./blog-card";
import { BlogPost } from "@/lib/blog";

interface BlogListProps {
  posts: BlogPost[];
}

export default function BlogList({ posts }: BlogListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No blog posts yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <Row className="g-4">
      {posts.map((post) => (
        <Col key={post.slug} md={6} lg={4}>
          <BlogCard
            slug={post.slug}
            title={post.title}
            date={post.date}
            excerpt={post.content.substring(0, 150)}
          />
        </Col>
      ))}
    </Row>
  );
}
