import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <div className="mb-12 animate-title-reveal">
          <h1 className="text-3xl sm:text-5xl font-black text-[var(--color-text-primary)] tracking-tighter">
            Terms of Service
          </h1>
          <div className="h-px bg-gradient-to-r from-[var(--color-gold)] to-transparent mt-5 animate-line-grow"></div>
        </div>

        <div className="space-y-6 text-[var(--color-text-secondary)] leading-relaxed text-sm animate-fade-in">
          <p className="text-xs text-[var(--color-text-muted)]">Last Updated: May 7, 2026</p>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using EatDiscounted, you agree to these Terms of Service. If you do not agree, please do not use the application.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">2. Service Description</h2>
            <p>EatDiscounted is a free restaurant discount discovery tool for New York City. It searches multiple platforms to find available deals, cashback offers, and loyalty program matches.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">3. Accuracy of Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Restaurant availability on discount platforms is determined through automated searches and may not be current or accurate</li>
              <li>Deal percentages and cashback rates are sourced from third-party platforms and may change without notice</li>
              <li>Community reports are user-submitted and unverified</li>
              <li>Always verify deal availability directly on the respective platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">4. Third-Party Platforms</h2>
            <p>EatDiscounted is not affiliated with, endorsed by, or partnered with any discount platform including Upside, Bilt Rewards, Blackbird, inKind, Rewards Network, Too Good To Go, Restaurant.com, Rakuten Dining, Seated, or Nea. Using deals from these platforms is subject to their respective terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">5. Acceptable Use</h2>
            <p>You agree not to scrape or crawl data from the application, submit false community reports, circumvent rate limiting, or use the service for any unlawful purpose.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">6. Limitation of Liability</h2>
            <p className="uppercase text-xs font-semibold text-[var(--color-text-primary)]">EatDiscounted is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. We shall not be liable for inaccurate deal information, expired offers, restaurants no longer participating in referenced programs, or any actions taken based on information provided by the application.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">7. Geographic Scope</h2>
            <p>EatDiscounted currently covers restaurants in New York City. Coverage in other areas may be limited or unavailable.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">8. Governing Law</h2>
            <p>These Terms shall be governed by the laws of the State of New York.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">9. Contact</h2>
            <p>Email: <a href="mailto:sharipaltrowitz@gmail.com" className="text-[var(--color-gold)] hover:text-[var(--color-gold-bright)]">sharipaltrowitz@gmail.com</a></p>
          </section>
        </div>

        <div className="mt-12 flex items-center justify-between">
          <Link href="/" className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] font-semibold transition-colors duration-200">
            ← Back to home
          </Link>
          <Link href="/privacy" className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] font-semibold transition-colors duration-200">
            Privacy Policy →
          </Link>
        </div>
      </main>
    </>
  );
}
