import { Nav } from "@/components/Nav";
import { ACTIVE_PLATFORMS as PLATFORMS } from "@/lib/platforms";

export default function PlatformsPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <div className="mb-8 animate-title-reveal">
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text-primary)] tracking-tighter">
            Platforms We Check
          </h1>
          <div className="h-1 rounded-full bg-gradient-to-r from-[#ff6b35] via-[#ec4899] to-[#8b5cf6] animate-line-grow mt-4 mb-4"></div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {PLATFORMS.length} platforms checked in seconds per search.
          </p>
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
                        ? "bg-green-50 text-green-700 ring-green-200"
                        : "bg-blue-50 text-blue-700 ring-blue-200"
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
