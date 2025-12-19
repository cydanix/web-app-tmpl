import { notFound } from "next/navigation";
import { getBlogPostBySlug, getAllBlogPosts } from "@/lib/blog";
import Footer from "@/components/footer";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen">
      <div className="container py-5">
        <div className="mb-4">
          <Link 
            href="/blog"
            className="text-decoration-none text-muted"
          >
            ← Back to Blog
          </Link>
        </div>

        <article className="mx-auto" style={{ maxWidth: '48rem' }}>
          <header className="mb-4">
            <h1 className="display-4 fw-bold mb-3">{post.title}</h1>
            <p className="text-muted">
              <time dateTime={post.date}>{formattedDate}</time>
            </p>
          </header>

          <div className="blog-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <h1 className="h2 fw-bold mb-3" {...props} />,
                h2: ({ node, ...props }) => <h2 className="h3 fw-bold mb-3 mt-4" {...props} />,
                h3: ({ node, ...props }) => <h3 className="h4 fw-bold mb-2 mt-3" {...props} />,
                p: ({ node, ...props }) => <p className="mb-3" {...props} />,
                ul: ({ node, ...props }) => <ul className="mb-3 ms-4" {...props} />,
                ol: ({ node, ...props }) => <ol className="mb-3 ms-4" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                code: ({ node, className, children, ...props }: any) => {
                  const isInline = !className;
                  if (isInline) {
                    return <code className="bg-light px-1 rounded" {...props}>{children}</code>;
                  }
                  return <code className="d-block bg-light p-3 rounded mb-3" {...props}>{children}</code>;
                },
                pre: ({ node, ...props }) => <pre className="mb-3" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-start border-3 border-primary ps-3 py-2 mb-3" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a className="text-primary text-decoration-none" {...props} />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
      <Footer />
    </div>
  );
}
