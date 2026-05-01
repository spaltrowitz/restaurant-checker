import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EatDiscounted — Find Restaurant Discount Platforms",
  description:
    "Check which dining discount platforms list your favorite restaurant. Compare Blackbird, inKind, Bilt, Rakuten Dining, Too Good To Go, and more.",
  openGraph: {
    title: "EatDiscounted — Find Restaurant Discount Platforms",
    description: "Check which dining discount platforms list your favorite restaurant.",
    type: "website",
    siteName: "EatDiscounted",
  },
  twitter: {
    card: "summary",
    title: "EatDiscounted — Find Restaurant Discount Platforms",
    description: "Check which dining discount platforms list your favorite restaurant.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[var(--color-surface)] text-[var(--color-text-primary)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-surface-overlay)] focus:text-[var(--color-gold)] focus:rounded"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
