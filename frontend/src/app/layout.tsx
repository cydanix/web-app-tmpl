import type { Metadata } from "next";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "WebApp Platform - Build Faster, Scale Better",
  description: "The ultimate platform for modern web applications powered by Rust and Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}

