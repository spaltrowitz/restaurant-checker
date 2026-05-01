"use client";

import { useState } from "react";
import { CheckResult, getPlatform } from "@/lib/platforms";

interface CommunityReportInfo {
  count: number;
  latestReport: string;
}

interface ResultCardProps {
  result: CheckResult | null;
  platformName: string;
  restaurantName?: string;
  communityReport?: CommunityReportInfo;
  onReported?: () => void;
}

function CommunityBadge({ report }: { report: CommunityReportInfo }) {
  if (report.count >= 2) {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-300 ring-1 ring-purple-500/20">
        👥 Community confirmed ({report.count})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-surface-overlay)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
      👤 1 user reported
    </span>
  );
}

function ReportButton({
  platformName,
  restaurantName,
  onReported,
}: {
  platformName: string;
  restaurantName: string;
  onReported?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleReport = async () => {
    setStatus("loading");
    try {
      const resp = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant: restaurantName, platform: platformName }),
      });
      if (resp.ok) {
        setStatus("done");
        onReported?.();
      } else {
        const data = await resp.json();
        if (data.error === "Already reported") {
          setStatus("done");
        } else {
          setStatus("error");
        }
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return <span className="text-xs text-[var(--color-success)]">✓ Reported — thanks!</span>;
  }

  return (
    <button
      onClick={handleReport}
      disabled={status === "loading"}
      className="mt-1 inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-all duration-200 disabled:opacity-50 ring-1 ring-purple-500/20"
    >
      {status === "loading" ? "Reporting…" : "🙋 I found this here"}
    </button>
  );
}

export function ResultCard({
  result,
  platformName,
  restaurantName,
  communityReport,
  onReported,
}: ResultCardProps) {
  const platform = getPlatform(platformName);

  // Loading state — shimmer skeleton
  if (!result) {
    return (
      <div className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 animate-fade-in">
        <div
          className="mt-0.5 h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-gold)]"
          role="status"
        >
          <span className="sr-only">Checking…</span>
        </div>
        <div className="flex-1">
          <p className="font-medium text-[var(--color-text-secondary)]">{platformName}</p>
          <div className="mt-2 h-3 w-32 rounded animate-shimmer" aria-hidden="true"></div>
        </div>
      </div>
    );
  }

  // Community-confirmed (2+ reports) upgrades display even if search didn't find it
  const communityConfirmed = communityReport && communityReport.count >= 2;

  // FOUND state — celebration! Gold border, green accent
  if (result.found || communityConfirmed) {
    return (
      <div className="flex items-start gap-4 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success-dim)] p-5 animate-fade-in transition-all duration-200 hover:border-[var(--color-success)]/50">
        <span className="mt-0.5 text-xl" aria-label="Found" role="img">✅</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[var(--color-text-primary)]">{platformName}</p>
            {platform && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-surface-overlay)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-gold)] ring-1 ring-[var(--color-gold)]/20">
                {platform.rewardEmoji} {platform.rewardLabel}
              </span>
            )}
            {communityReport && <CommunityBadge report={communityReport} />}
          </div>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)] truncate">
            {result.found
              ? result.details
              : `Community confirmed on ${platformName}`}
          </p>
          {result.url && result.found && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-dim)] hover:underline truncate max-w-full transition-colors"
            >
              {result.url}
            </a>
          )}
          {!result.found && platform && (
            <a
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-[var(--color-gold)] hover:underline transition-colors"
            >
              Open {platformName} →
            </a>
          )}
          {platform?.personalized && (
            <p className="mt-2 text-xs text-[var(--color-warning)]">
              ⚠️ Offers are personalized — your discount may differ
            </p>
          )}
        </div>
      </div>
    );
  }

  // SEARCH UNAVAILABLE state — amber/warning
  if (result.searchUnavailable) {
    return (
      <div className="flex items-start gap-4 rounded-xl border border-[var(--color-warning)]/20 bg-[var(--color-warning-dim)] p-5 animate-fade-in transition-all duration-200 hover:border-[var(--color-warning)]/40">
        <span className="mt-0.5 text-xl" aria-label="Manual check needed" role="img">🔗</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[var(--color-warning)]">{platformName}</p>
            {platform && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-surface-overlay)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
                {platform.rewardEmoji} {platform.rewardLabel}
              </span>
            )}
            {communityReport && <CommunityBadge report={communityReport} />}
          </div>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">{result.details}</p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <a
              href={platform?.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-warning)]/10 px-4 py-2 text-sm font-medium text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20 transition-all duration-200 ring-1 ring-[var(--color-warning)]/20"
            >
              {platform?.appOnly ? "📱 Open app" : "🔗 Open"} {platformName} →
            </a>
            {restaurantName && (
              <ReportButton
                platformName={platformName}
                restaurantName={restaurantName}
                onReported={onReported}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // NOT FOUND state — subtle, collapsed feel
  return (
    <div className="flex items-start gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 opacity-70 animate-fade-in transition-all duration-200 hover:opacity-100 hover:border-[var(--color-border)]">
      <span className="mt-0.5 text-lg text-[var(--color-text-muted)]" aria-label="Not found" role="img">—</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-[var(--color-text-muted)]">{platformName}</p>
          {communityReport && <CommunityBadge report={communityReport} />}
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{result.details}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {platform?.appOnly && !result.found && (
            <a
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-gold)] transition-colors"
            >
              📱 Check the app →
            </a>
          )}
          {restaurantName && (
            <ReportButton
              platformName={platformName}
              restaurantName={restaurantName}
              onReported={onReported}
            />
          )}
        </div>
      </div>
    </div>
  );
}
