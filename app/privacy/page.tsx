import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <div className="mb-12 animate-title-reveal">
          <h1 className="text-3xl sm:text-5xl font-black text-[var(--color-text-primary)] tracking-tighter">
            Privacy Policy
          </h1>
          <div className="h-px bg-gradient-to-r from-[var(--color-gold)] to-transparent mt-5 animate-line-grow"></div>
        </div>

        <div className="space-y-6 text-[var(--color-text-secondary)] leading-relaxed text-sm animate-fade-in">
          <p className="text-xs text-[var(--color-text-muted)]">Last Updated: May 7, 2026</p>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">1. Introduction</h2>
            <p>EatDiscounted respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use the EatDiscounted web application.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">2. Information We Collect</h2>
            <p className="mb-2">EatDiscounted is designed to be used without creating an account. We collect minimal information:</p>
            <p className="font-semibold text-[var(--color-text-primary)] mt-3 mb-1">Automatically Collected:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Hashed IP address:</strong> Your IP address is hashed using SHA-256 (one-way, irreversible) and truncated to 16 characters. We never store your actual IP address.</li>
              <li><strong>Hashed User-Agent:</strong> Combined with your hashed IP to create a per-device identifier for favorites.</li>
              <li><strong>Search queries:</strong> Restaurant names you search are logged anonymously (no user identifier) to improve search suggestions and caching.</li>
            </ul>
            <p className="font-semibold text-[var(--color-text-primary)] mt-3 mb-1">User-Provided (optional):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Community reports:</strong> Restaurant name, platform, and your reporter hash.</li>
              <li><strong>Favorites:</strong> Restaurant names you choose to save.</li>
            </ul>
            <p className="mt-3">We do <strong>NOT</strong> collect names, email addresses, payment information, location data, or browsing history.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Displaying community-reported platform matches to other users</li>
              <li>Saving your favorited restaurants</li>
              <li>Rate limiting API requests to prevent abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">4. Information Sharing</h2>
            <p className="mb-2">We do not sell, rent, or trade any user information. When you search for a restaurant, your query (restaurant name only) is sent to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Brave Search API</li>
              <li>Upside, Bilt Rewards, Rewards Network, and Blackbird APIs</li>
            </ul>
            <p className="mt-2">No personal identifiers are included in any API request.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">5. Data Security</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP addresses are hashed with SHA-256 before storage — your actual IP is never persisted</li>
              <li>Rate limiting prevents abuse</li>
              <li>All data is transmitted over HTTPS</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">6. Cookies and Local Storage</h2>
            <p>EatDiscounted does not use cookies, localStorage, or any client-side tracking mechanisms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">7. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Anonymity:</strong> No account, email, or personal information is required</li>
              <li><strong>Reports:</strong> Participation is voluntary</li>
              <li><strong>Deletion:</strong> You may request removal of community reports associated with your device hash</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">8. Contact</h2>
            <p>Email: <a href="mailto:sharipaltrowitz@gmail.com" className="text-[var(--color-gold)] hover:text-[var(--color-gold-bright)]">sharipaltrowitz@gmail.com</a></p>
          </section>
        </div>

        <div className="mt-12 flex items-center justify-between">
          <Link href="/" className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] font-semibold transition-colors duration-200">
            ← Back to home
          </Link>
          <Link href="/terms" className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] font-semibold transition-colors duration-200">
            Terms of Service →
          </Link>
        </div>
      </main>
    </>
  );
}
