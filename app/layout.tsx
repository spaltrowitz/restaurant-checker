import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EatDiscounted — Every Deal at Any NYC Restaurant",
  description:
    "Find every deal, discount & reward at any NYC restaurant. 4 verified APIs, 8 airline programs, cashback & points — one search, every platform.",
  openGraph: {
    title: "EatDiscounted — Every Deal at Any NYC Restaurant",
    description: "Find every deal, discount & reward at any NYC restaurant. 4 verified APIs, 8 airline programs, cashback & points.",
    type: "website",
    siteName: "EatDiscounted",
  },
  twitter: {
    card: "summary_large_image",
    title: "EatDiscounted — Every Deal at Any NYC Restaurant",
    description: "Find every deal, discount & reward at any NYC restaurant. 4 verified APIs, 8 airline programs, cashback & points.",
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
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--color-surface)] text-[var(--color-text-primary)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[var(--color-gold)] focus:rounded focus:shadow-lg"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
