"use client";

import { BestDeal } from "@/lib/best-deal";

interface BestDealCardProps {
  best: BestDeal;
  otherDealsCount: number;
}

export function BestDealCard({ best, otherDealsCount }: BestDealCardProps) {
  return (
    <div className="mb-6 animate-best-deal-in rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-900/20 via-[var(--color-surface-raised)] to-[var(--color-surface-raised)] p-5 sm:p-6 shadow-lg shadow-amber-500/5">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="text-2xl sm:text-3xl shrink-0" role="img" aria-label="Trophy">
          🏆
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-extrabold text-amber-400 tracking-tight">
            Your Best Deal
          </h2>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[var(--color-text-primary)]">
              {best.platform}
            </span>
            <span className="text-[var(--color-text-muted)]">—</span>
            <span className="text-sm text-[var(--color-text-secondary)]">
              {best.details}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/20">
              {best.rewardEmoji} {best.rewardLabel}
            </span>
            {best.method === "api" && (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                ✓ Verified
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            {best.url && (
              <a
                href={best.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/25 transition-all duration-200 ring-1 ring-amber-500/30"
              >
                View Deal →
              </a>
            )}
            {otherDealsCount > 0 && (
              <span className="text-xs text-[var(--color-text-muted)]">
                and {otherDealsCount} more deal{otherDealsCount !== 1 ? "s" : ""} found
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
