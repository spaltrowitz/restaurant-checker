import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-18">
        <div className="text-center mb-8 hero-gradient rounded-[2rem] px-4 py-8 relative">
          <p className="mb-4 inline-flex items-center rounded-full border border-[var(--color-border)] bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)] shadow-sm">
            NYC dining deals, checked fast
          </p>
          <div className="mb-4 animate-title-reveal">
            <h1 className="mb-3 whitespace-nowrap text-[clamp(1.35rem,6.2vw,3.5rem)] font-black tracking-[-0.07em] text-[var(--color-text-primary)] leading-none">
              Find every restaurant deal
            </h1>
            <div className="brand-rule mx-auto animate-line-grow mb-4 max-w-28"></div>
          </div>
          <p id="restaurant-search-help" className="text-lg sm:text-xl font-medium text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed animate-badge-pop">
            Search one NYC restaurant and see cashback, discounts, points, and direct partner links in one place.
          </p>
        </div>
        <div className="premium-panel rounded-[1.75rem] p-3 sm:p-4">
          <SearchBar />
          <div className="mt-4 flex justify-center rounded-2xl bg-[var(--color-surface-overlay)]/70 p-3">
            <Link
              href="/browse"
              className="touch-target inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-[var(--color-accent)] shadow-sm ring-1 ring-[var(--color-border)] transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              Browse neighborhoods →
            </Link>
          </div>
        </div>
        <SearchResults />
        <section
          aria-labelledby="how-it-works"
          className="mt-12 grid gap-4 rounded-[1.75rem] border border-[var(--color-border)] bg-white/85 p-5 shadow-sm sm:grid-cols-3 sm:p-6"
        >
          <div className="sm:col-span-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">What EatDiscounted does</p>
            <h2 id="how-it-works" className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
              One clear path from restaurant idea to best deal.
            </h2>
          </div>
          {[
            ["1", "Search or browse", "Type a restaurant you already know, or browse verified deals by neighborhood."],
            ["2", "Compare every source", "We check partner APIs, cashback apps, dining rewards, and web-search platforms."],
            ["3", "Open the right app", "Use the direct partner link once you know which platform has the strongest offer."],
          ].map(([step, title, copy]) => (
            <div key={step} className="rounded-2xl bg-[var(--color-surface)] p-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-black text-white">
                {step}
              </span>
              <h3 className="mt-3 font-bold text-[var(--color-text-primary)]">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{copy}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t border-[var(--color-border)]/60 footer-gradient">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="text-center sm:text-left">
              <Link href="/" className="touch-target inline-flex items-center text-sm font-black text-[var(--color-text-primary)] tracking-tight" aria-label="Go to EatDiscounted homepage">
                <span className="text-accent-gradient">Eat</span>Discounted
              </Link>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                NYC Dining Rewards Intelligence
              </p>
            </div>
            <div className="flex gap-6 text-xs font-medium text-[var(--color-text-muted)]">
              <Link href="/privacy" className="hover:text-[var(--color-gold)] transition-colors duration-200">Privacy</Link>
              <Link href="/terms" className="hover:text-[var(--color-gold)] transition-colors duration-200">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
