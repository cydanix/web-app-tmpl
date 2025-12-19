import { getAllBlogPosts } from "@/lib/blog";
import Footer from "@/components/footer";
import BlogList from "@/components/blog-list";

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <div className="min-h-screen">
      <div className="container py-5">
        <div className="text-center mb-5">
          <h1 className="display-4 fw-bold mb-3">Blog</h1>
          <p className="lead text-muted">
            Latest articles and insights
          </p>
        </div>

        <BlogList posts={posts} />
      </div>
      <Footer />
    </div>
  );
}
