"use client";

import { BestDeal } from "@/lib/best-deal";

interface BestDealCardProps {
  best: BestDeal;
  otherDealsCount: number;
}

export function BestDealCard({ best, otherDealsCount }: BestDealCardProps) {
  return (
    <div className="mb-6 animate-best-deal-in rounded-[1.5rem] border-2 border-[var(--color-accent)]/25 bg-gradient-to-br from-[var(--color-surface-overlay)] via-white to-white p-4 sm:p-6 shadow-lg shadow-orange-900/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent)]/8 to-transparent pointer-events-none" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-lg font-black text-white shadow-md shadow-orange-900/15" aria-hidden="true">
          #1
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Best value found</p>
          <h2 className="mt-1 text-lg sm:text-xl font-black text-[var(--color-text-primary)] tracking-tight">
            Your Best Deal
          </h2>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg text-[var(--color-text-primary)]">
              {best.platform}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {best.details}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20">
              {best.rewardLabel}
            </span>
            {best.method === "api" && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-result-tier1-dim)] px-2.5 py-1 text-xs font-semibold text-[var(--color-result-tier1)] ring-1 ring-[var(--color-result-tier1)]/20">
                ✓ Verified
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            {best.url && (
              <a
                href={best.url}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[var(--color-accent-bright)] to-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-900/15 active:scale-[0.98]"
              >
                View Deal →
              </a>
            )}
            {otherDealsCount > 0 && (
              <span className="text-xs text-[var(--color-text-muted)]">
                + {otherDealsCount} more deal{otherDealsCount !== 1 ? "s" : ""} below
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
