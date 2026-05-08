"use client";

import { BestDeal } from "@/lib/best-deal";

interface BestDealCardProps {
  best: BestDeal;
  otherDealsCount: number;
}

export function BestDealCard({ best, otherDealsCount }: BestDealCardProps) {
  return (
    <div className="mb-6 animate-best-deal-in rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-white to-white p-6 sm:p-7 shadow-lg shadow-orange-100/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-50/80 to-transparent pointer-events-none" />
      <div className="relative flex items-start gap-4">
        <span className="text-3xl sm:text-4xl shrink-0 font-black text-orange-500" aria-hidden="true">
          #1
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-black text-orange-600 tracking-tight">
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
            <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 ring-1 ring-orange-200">
              {best.rewardLabel}
            </span>
            {best.method === "api" && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-green-200">
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#ff8c5a] to-[#ff6b35] px-5 py-2.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-orange-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
