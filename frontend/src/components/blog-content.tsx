"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BlogContentProps {
  content: string;
}

export default function BlogContent({ content }: BlogContentProps) {
  return (
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
        {content}
      </ReactMarkdown>
    </div>
  );
}
