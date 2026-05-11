import { Nav } from "@/components/Nav";
import { ACTIVE_PLATFORMS as PLATFORMS } from "@/lib/platforms";
import Link from "next/link";

export default function PlatformsPage() {
  return (
    <>
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-18">
        <div className="mb-8 animate-title-reveal">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Coverage map</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[var(--color-text-primary)] tracking-tighter">
            Platforms We Check
          </h1>
          <div className="brand-rule animate-line-grow mt-4 mb-4 max-w-28"></div>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {PLATFORMS.length} platforms checked in seconds per search. If you know the restaurant, start with Search. If you are still deciding where to eat, browse verified neighborhood deals.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="touch-target inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-white shadow-sm">
              Search a restaurant
            </Link>
            <Link href="/browse" className="touch-target inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-[var(--color-accent)] ring-1 ring-[var(--color-border)]">
              Browse neighborhoods
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden animate-fade-in">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)]">
                <th className="text-left px-4 py-3 font-semibold text-[var(--color-text-primary)]">Platform</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--color-text-primary)]">Reward</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--color-text-primary)] hidden sm:table-cell">How we check</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORMS.map((p) => (
                <tr key={p.name} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface-overlay)]/50 transition-colors">
                  <td className="px-4 py-3">
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-gold)] transition-colors">
                      {p.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {p.rewardLabel}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                      p.tier === 1
                        ? "bg-[var(--color-result-tier1-dim)] text-[var(--color-result-tier1)] ring-[var(--color-result-tier1)]/20"
                        : "bg-[var(--color-result-tier2-dim)] text-[var(--color-result-tier2)] ring-[var(--color-result-tier2)]/20"
                    }`}>
                      {p.tier === 1 ? "Verified API" : "Web search"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-overlay)] p-5 text-xs text-[var(--color-text-muted)] space-y-2">
          <p><strong className="text-[var(--color-text-secondary)]">Card-linked:</strong> Upside, Bilt, Rakuten, and Blackbird require linking a debit or credit card.</p>
          <p><strong className="text-[var(--color-text-secondary)]">Personalized:</strong> Upside, Blackbird, and Nea show different offers per user. We check if a restaurant is listed, not your specific discount.</p>
        </div>
      </main>
    </>
  );
}
