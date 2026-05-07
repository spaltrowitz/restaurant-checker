import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <div className="mb-12 animate-title-reveal">
          <h1 className="text-3xl sm:text-5xl font-black text-[var(--color-text-primary)] tracking-tighter">
            About <span className="text-gold-shimmer">Eat</span>Discounted
          </h1>
          <div className="h-px bg-gradient-to-r from-[var(--color-gold)] to-transparent mt-5 animate-line-grow"></div>
        </div>

        <div className="space-y-5 text-[var(--color-text-secondary)] leading-relaxed text-base animate-fade-in">
          <p>
            There are <span className="text-[var(--color-text-primary)] font-semibold">10 dining discount platforms</span> and <span className="text-[var(--color-gold)] font-semibold">12+ reward programs</span> for NYC restaurants — Blackbird, Upside, inKind, Bilt, Rakuten Dining, Too Good To Go, Rewards Network (powering American Airlines, United, Delta, Southwest, JetBlue, Hilton, Marriott, and Hyatt), Pulsd, Restaurant.com, and more.
          </p>
          <p>
            When you&apos;re heading out to eat, you shouldn&apos;t have to open 5+ apps to make sure you&apos;re not leaving money on the table. But that&apos;s exactly what it takes.
          </p>
          <p className="text-[var(--color-text-primary)] text-lg leading-relaxed">
            <strong className="text-gold-shimmer">EatDiscounted</strong> fixes that. Search any restaurant and instantly see which platforms have it — with verified earning rates from our API integrations and web search coverage for everything else.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-[var(--color-border)]/60 card-premium p-7 animate-fade-in-up">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">How it works</h2>
          <ol className="mt-5 space-y-4 text-sm text-[var(--color-text-secondary)]">
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-dim)] text-[var(--color-surface)] text-xs font-black flex items-center justify-center mt-0.5 shadow-sm shadow-[var(--color-gold-glow)]">1</span>
              <span>Type a restaurant name</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-dim)] text-[var(--color-surface)] text-xs font-black flex items-center justify-center mt-0.5 shadow-sm shadow-[var(--color-gold-glow)]">2</span>
              <span>We check <strong className="text-[var(--color-text-primary)]">10 platforms</strong> in parallel — 4 via verified APIs, 6 via web search</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-dim)] text-[var(--color-surface)] text-xs font-black flex items-center justify-center mt-0.5 shadow-sm shadow-[var(--color-gold-glow)]">3</span>
              <span>See which apps have deals — with earning rates like <strong className="text-emerald-400">15% cashback</strong> or <strong className="text-emerald-400">5x miles</strong></span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-dim)] text-[var(--color-surface)] text-xs font-black flex items-center justify-center mt-0.5 shadow-sm shadow-[var(--color-gold-glow)]">4</span>
              <span>Open the app and claim your discount</span>
            </li>
          </ol>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--color-border)]/60 card-premium p-7 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">What we don&apos;t do</h2>
          <ul className="mt-5 space-y-4 text-sm text-[var(--color-text-secondary)]">
            <li className="flex items-start gap-4">
              <span className="text-[var(--color-text-muted)] text-lg leading-none mt-px">✕</span>
              <span>Show your <em>specific</em> discount — many platforms personalize offers per user</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="text-[var(--color-text-muted)] text-lg leading-none mt-px">✕</span>
              <span>Scrape or access any private data</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="text-[var(--color-text-muted)] text-lg leading-none mt-px">✕</span>
              <span>Replace any app — we just help you know which one to open</span>
            </li>
          </ul>
        </div>

        <div className="mt-12 flex items-center justify-between">
          <p className="text-sm text-[var(--color-text-muted)] italic">
            Built because checking 5 apps before dinner is annoying.
          </p>
          <Link href="/platforms" className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] font-semibold transition-colors duration-200">
            View all platforms →
          </Link>
        </div>
      </main>
    </>
  );
}
