import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            About <span className="text-[var(--color-gold)]">Eat</span>Discounted
          </h1>
          <div className="w-16 h-0.5 bg-[var(--color-gold)] mt-4 opacity-50"></div>
        </div>

        <div className="space-y-5 text-[var(--color-text-secondary)] leading-relaxed text-base">
          <p>
            There are <span className="text-[var(--color-text-primary)] font-medium">8 dining discount platforms</span> and <span className="text-[var(--color-gold)] font-medium">12+ reward programs</span> for NYC restaurants — Blackbird, Upside, inKind, Bilt, Rakuten Dining, Too Good To Go, Rewards Network (powering American Airlines, United, Delta, Southwest, JetBlue, Hilton, Marriott, and Hyatt), and more. Points, airline miles, hotel points, cashback, credits, surprise bags.
          </p>
          <p>
            When you&apos;re heading out to eat, you shouldn&apos;t have to open 5+ apps to make sure you&apos;re not leaving money on the table. But that&apos;s exactly what it takes.
          </p>
          <p className="text-[var(--color-text-primary)]">
            <strong className="text-[var(--color-gold)]">EatDiscounted</strong> fixes that. Search any restaurant and instantly see which platforms have it — with verified earning rates from our API integrations and web search coverage for everything else.
          </p>
        </div>

        <div className="mt-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">How it works</h2>
          <ol className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)] text-xs font-bold flex items-center justify-center mt-0.5">1</span>
              <span>Type a restaurant name</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)] text-xs font-bold flex items-center justify-center mt-0.5">2</span>
              <span>We check <strong className="text-[var(--color-text-primary)]">8 platforms</strong> in parallel — 4 via verified APIs, 4 via web search</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)] text-xs font-bold flex items-center justify-center mt-0.5">3</span>
              <span>See which apps have deals — with earning rates like <strong className="text-[var(--color-success)]">15% cashback</strong> or <strong className="text-[var(--color-success)]">5x miles</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)] text-xs font-bold flex items-center justify-center mt-0.5">4</span>
              <span>Open the app and claim your discount</span>
            </li>
          </ol>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">What we don&apos;t do</h2>
          <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-secondary)]">
            <li className="flex items-start gap-3">
              <span className="text-[var(--color-text-muted)]">✕</span>
              <span>Show your <em>specific</em> discount — many platforms personalize offers per user</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--color-text-muted)]">✕</span>
              <span>Scrape or access any private data</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--color-text-muted)]">✕</span>
              <span>Replace any app — we just help you know which one to open</span>
            </li>
          </ul>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">
            Built because checking 5 apps before dinner is annoying.
          </p>
          <Link href="/platforms" className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-dim)] font-medium transition-colors">
            View all platforms →
          </Link>
        </div>
      </main>
    </>
  );
}
