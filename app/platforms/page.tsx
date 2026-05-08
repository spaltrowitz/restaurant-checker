import { Nav } from "@/components/Nav";
import {
  PLATFORMS,
  getConflictingPlatforms,
} from "@/lib/platforms";

const API_PLATFORMS = ["Blackbird", "Upside", "Bilt Rewards", "Rewards Network"];

function PlatformIcon({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-purple-50 text-lg font-black text-[var(--color-text-primary)]">
      {initial}
    </span>
  );
}

export default function PlatformsPage() {
  const apiPlatforms = PLATFORMS.filter((p) => API_PLATFORMS.includes(p.name));
  const webPlatforms = PLATFORMS.filter((p) => !API_PLATFORMS.includes(p.name));

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
        <div className="mb-12 animate-title-reveal">
          <h1 className="text-3xl sm:text-5xl font-black text-[var(--color-text-primary)] tracking-tighter">
            Platforms
          </h1>
          <div className="h-px bg-gradient-to-r from-[var(--color-gold)] to-transparent mt-5 animate-line-grow"></div>
          <p className="mt-5 text-[var(--color-text-secondary)] animate-badge-pop">
            <span className="text-[var(--color-text-primary)] font-semibold">10 platforms</span> ·{" "}
            <span className="text-[var(--color-gold)] font-semibold">12+ reward programs</span> · checked in seconds
          </p>
        </div>

        {/* Verified API Integrations */}
        <div className="mb-12">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/20 uppercase tracking-wider">
              Verified API
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">Real-time earning rates</span>
          </div>
          <div className="grid gap-4">
            {apiPlatforms.map((p, i) => {
              const conflicts = getConflictingPlatforms(p.name);
              return (
                <div
                  key={p.name}
                  className={`rounded-2xl border-2 border-emerald-500/15 bg-gradient-to-br from-[var(--color-api-green-dim)] via-[var(--color-surface-raised)] to-[var(--color-surface-raised)] p-6 transition-all duration-300 hover:border-emerald-500/35 hover:shadow-xl hover:shadow-emerald-500/5 hover:translate-y-[-1px] animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
                >
                  <div className="flex items-start gap-4">
                    <PlatformIcon name={p.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{p.name}</h2>
                        <span className="inline-flex items-center rounded-full bg-[var(--color-surface-overlay)] px-3 py-1 text-xs font-bold text-[var(--color-gold)] ring-1 ring-[var(--color-gold)]/20">
                          {p.rewardLabel}
                        </span>
                      </div>
                      <p className="mt-2.5 text-sm text-[var(--color-text-secondary)] leading-relaxed">{p.offerType}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-medium ${p.personalized ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20" : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"}`}>
                          {p.personalized ? "Personalized" : "Uniform offers"}
                        </span>
                        <span className="rounded-full bg-[var(--color-surface-overlay)] px-2.5 py-1 text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] font-medium">
                          {p.cardLink ? "Card-linked" : "No card needed"}
                        </span>
                      </div>
                      {conflicts.length > 0 && (
                        <p className="mt-3 text-xs text-[var(--color-warning)]">
                          Card conflicts with: {conflicts.join(", ")}
                        </p>
                      )}
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors duration-200">
                        Visit {p.name} →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Web Search Platforms */}
        <div className="mb-12">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3.5 py-1.5 text-xs font-bold text-blue-400 ring-1 ring-blue-500/20 uppercase tracking-wider">
              Web Search
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">Checked via search results</span>
          </div>
          <div className="grid gap-4">
            {webPlatforms.map((p, i) => {
              const conflicts = getConflictingPlatforms(p.name);
              return (
                <div
                  key={p.name}
                  className={`rounded-2xl border border-[var(--color-border)]/60 card-premium p-6 transition-all duration-300 hover:border-blue-500/25 hover:shadow-xl hover:shadow-blue-500/5 hover:translate-y-[-1px] animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
                >
                  <div className="flex items-start gap-4">
                    <PlatformIcon name={p.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{p.name}</h2>
                        <span className="inline-flex items-center rounded-full bg-[var(--color-surface-overlay)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
                          {p.rewardLabel}
                        </span>
                        {p.appOnly && (
                          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 ring-1 ring-blue-500/20">
                            App-only
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 text-sm text-[var(--color-text-secondary)] leading-relaxed">{p.offerType}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-medium ${p.personalized ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20" : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"}`}>
                          {p.personalized ? "Personalized" : "Uniform offers"}
                        </span>
                        <span className="rounded-full bg-[var(--color-surface-overlay)] px-2.5 py-1 text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] font-medium">
                          {p.cardLink ? "Card-linked" : "No card needed"}
                        </span>
                      </div>
                      {conflicts.length > 0 && (
                        <p className="mt-3 text-xs text-[var(--color-warning)]">
                          Card conflicts with: {conflicts.join(", ")}
                        </p>
                      )}
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors duration-200">
                        Visit {p.name} →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-warning)]/15 bg-gradient-to-br from-[var(--color-warning-dim)] to-[var(--color-surface-raised)] p-6">
            <p className="font-bold text-sm text-[var(--color-warning)]">Card-Linked Note</p>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Some platforms (Upside, Bilt, Rakuten Dining, Blackbird) require
              linking a debit or credit card. Check each app for card requirements.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/15 bg-gradient-to-br from-[var(--color-web-blue-dim)] to-[var(--color-surface-raised)] p-6">
            <p className="font-bold text-sm text-[var(--color-web-blue)]">Personalization Note</p>
            <p className="mt-1.5 text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Blackbird and Upside serve personalized offers —
              different users see different discounts at the same restaurant. This
              tool checks whether a restaurant is listed, not what specific
              discount you&apos;ll get.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
