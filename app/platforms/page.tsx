import { Nav } from "@/components/Nav";
import {
  PLATFORMS,
  getConflictingPlatforms,
} from "@/lib/platforms";

const API_PLATFORMS = ["Blackbird", "Upside", "Bilt Rewards", "Rewards Network"];

function PlatformEmoji({ name }: { name: string }) {
  const emojis: Record<string, string> = {
    "Blackbird": "🐦‍⬛",
    "inKind": "🎟️",
    "Upside": "💵",
    "Bilt Rewards": "🏠",
    "Rakuten Dining": "🛒",
    "Too Good To Go": "🥡",
    "Rewards Network": "✈️",
    "Seated": "💺",
    "Pulsd": "🏷️",
  };
  return <span className="text-3xl">{emojis[name] ?? "🍽️"}</span>;
}

export default function PlatformsPage() {
  const apiPlatforms = PLATFORMS.filter((p) => API_PLATFORMS.includes(p.name));
  const webPlatforms = PLATFORMS.filter((p) => !API_PLATFORMS.includes(p.name));

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            Platforms
          </h1>
          <div className="w-16 h-0.5 bg-[var(--color-gold)] mt-4 opacity-50"></div>
          <p className="mt-4 text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-primary)] font-medium">9 platforms</span> ·{" "}
            <span className="text-[var(--color-gold)] font-medium">12+ reward programs</span> · checked in seconds
          </p>
        </div>

        {/* Verified API Integrations */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/20 uppercase tracking-wider">
              ✓ Verified API
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">Real-time earning rates</span>
          </div>
          <div className="grid gap-3">
            {apiPlatforms.map((p) => {
              const conflicts = getConflictingPlatforms(p.name);
              return (
                <div
                  key={p.name}
                  className="rounded-xl border-2 border-emerald-500/20 bg-gradient-to-br from-[var(--color-api-green-dim)] to-[var(--color-surface-raised)] p-5 transition-all duration-200 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <div className="flex items-start gap-4">
                    <PlatformEmoji name={p.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{p.name}</h2>
                        <span className="inline-flex items-center rounded-full bg-[var(--color-surface-overlay)] px-3 py-1 text-xs font-semibold text-[var(--color-gold)] ring-1 ring-[var(--color-gold)]/20">
                          {p.rewardEmoji} {p.rewardLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{p.offerType}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 ${p.personalized ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20" : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"}`}>
                          {p.personalized ? "👤 Personalized" : "🏷️ Uniform offers"}
                        </span>
                        <span className="rounded-full bg-[var(--color-surface-overlay)] px-2.5 py-1 text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
                          {p.cardLink ? "🔗 Card-linked" : "No card needed"}
                        </span>
                      </div>
                      {conflicts.length > 0 && (
                        <p className="mt-3 text-xs text-[var(--color-warning)]">
                          ⚠️ Card conflicts with: {conflicts.join(", ")}
                        </p>
                      )}
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-medium text-[var(--color-gold)] hover:text-[var(--color-gold-dim)] transition-colors">
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
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 ring-1 ring-blue-500/20 uppercase tracking-wider">
              🔍 Web Search
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">Checked via search results</span>
          </div>
          <div className="grid gap-3">
            {webPlatforms.map((p) => {
              const conflicts = getConflictingPlatforms(p.name);
              return (
                <div
                  key={p.name}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 transition-all duration-200 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5"
                >
                  <div className="flex items-start gap-4">
                    <PlatformEmoji name={p.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{p.name}</h2>
                        <span className="inline-flex items-center rounded-full bg-[var(--color-surface-overlay)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
                          {p.rewardEmoji} {p.rewardLabel}
                        </span>
                        {p.appOnly && (
                          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 ring-1 ring-blue-500/20">
                            📱 App-only
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{p.offerType}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 ${p.personalized ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20" : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"}`}>
                          {p.personalized ? "👤 Personalized" : "🏷️ Uniform offers"}
                        </span>
                        <span className="rounded-full bg-[var(--color-surface-overlay)] px-2.5 py-1 text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
                          {p.cardLink ? "🔗 Card-linked" : "No card needed"}
                        </span>
                      </div>
                      {conflicts.length > 0 && (
                        <p className="mt-3 text-xs text-[var(--color-warning)]">
                          ⚠️ Card conflicts with: {conflicts.join(", ")}
                        </p>
                      )}
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
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
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--color-warning)]/20 bg-[var(--color-warning-dim)] p-5">
            <p className="font-semibold text-sm text-[var(--color-warning)]">⚠️ Card-Linked Note</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Some platforms (Upside, Bilt, Rakuten Dining, Blackbird) require
              linking a debit or credit card. Check each app for card requirements.
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-[var(--color-web-blue-dim)] p-5">
            <p className="font-semibold text-sm text-[var(--color-web-blue)]">📝 Personalization Note</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
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
