import type { Metadata } from "next";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from "@/components/header";
import { AuthProvider } from "@/contexts/auth-context";
import { I18nProvider } from "@/contexts/i18n-context";

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
        <I18nProvider>
          <AuthProvider>
            <Header />
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

