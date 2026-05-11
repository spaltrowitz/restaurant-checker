"use client";

import { useState, useRef } from "react";
import { CheckResult, getPlatform } from "@/lib/platforms";
import { PlatformExplainer } from "./PlatformExplainer";
import { FavoriteButton } from "./FavoriteButton";

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
  conflictWarning?: string;
}

// Extract the primary earning metric from a details string
function extractEarningRate(details: string): string | null {
  const patterns = [
    /(\d+(?:\.\d+)?%\s*cash\s*back)/i,
    /(\d+(?:\.\d+)?x\s*points?\s*(?:per\s*(?:dollar|\$)|\/\$)?)/i,
    /(\d+(?:\.\d+)?\s*miles?\s*(?:per\s*(?:dollar|\$)|\/\$))/i,
    /(earn\s*\d+(?:\.\d+)?x)/i,
    /(up\s*to\s*\d+(?:\.\d+)?(?:x|%)\s*(?:cash\s*back|miles?|points?))/i,
    /(\d+(?:\.\d+)?%\s*off)/i,
    /(\$\d+(?:\.\d+)?\s*(?:credit|bonus)\s*(?:for|on)\s*\$\d+(?:\.\d+)?)/i,
  ];
  for (const p of patterns) {
    const m = details.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

const REWARDS_NETWORK_PROGRAMS = [
  { name: "American Airlines", key: "AA" },
  { name: "United Airlines", key: "United" },
  { name: "Southwest Airlines", key: "Southwest" },
  { name: "Delta Airlines", key: "Delta" },
  { name: "JetBlue", key: "JetBlue" },
  { name: "Hilton Hotels", key: "Hilton" },
  { name: "Hyatt Hotels", key: "Hyatt" },
  { name: "Marriott Bonvoy", key: "Marriott" },
  { name: "Choice Hotels", key: "Choice" },
];

function CommunityBadge({ report }: { report: CommunityReportInfo }) {
  if (report.count >= 2) {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--color-community-dim)] px-2.5 py-1 text-xs font-semibold text-[var(--color-community)] ring-1 ring-[var(--color-community)]/20">
        Community confirmed ({report.count})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-surface-overlay)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
      1 user reported
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
      aria-busy={status === "loading"}
      aria-label={`Report that ${restaurantName} is on ${platformName}`}
      className="touch-target mt-1 inline-flex items-center gap-1 rounded-lg bg-[var(--color-community-dim)] px-4 py-2 text-xs font-bold text-[var(--color-community)] ring-1 ring-[var(--color-community)]/20 transition-all duration-200 hover:bg-[var(--color-community)]/15 disabled:opacity-50"
    >
      {status === "loading" ? "Reporting…" : "I found this here"}
    </button>
  );
}

function ExplainerButton({ platformName }: { platformName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`How ${platformName} works`}
        className="touch-target inline-flex items-center justify-center rounded-full text-xs font-bold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-accent)]"
      >
        ?
      </button>
      <PlatformExplainer
        platformName={platformName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={buttonRef}
      />
    </span>
  );
}

function RewardsNetworkExpander({ details }: { details: string }) {
  const [expanded, setExpanded] = useState(false);

  // Parse earning rate from details if present (e.g. "5x miles per dollar")
  const rateMatch = details.match(/(\d+)x?\s*(miles?|points?)/i);
  const rateDisplay = rateMatch ? `Up to ${rateMatch[1]}x ${rateMatch[2]}/$` : "Earn miles & points per $1";

  return (
    <div className="mt-3">
      <p className="text-lg font-extrabold text-[var(--color-gold)]">{rateDisplay}</p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="touch-target mt-2 inline-flex items-center rounded-lg text-xs font-bold text-[var(--color-result-tier2)] transition-colors hover:bg-[var(--color-result-tier2-dim)]"
        aria-expanded={expanded}
      >
        {expanded ? "Hide programs ▲" : `View all ${REWARDS_NETWORK_PROGRAMS.length} programs ▼`}
      </button>
      {expanded && (
        <div className="mt-2 grid gap-1 animate-fade-in">
          {REWARDS_NETWORK_PROGRAMS.map((prog) => (
            <div key={prog.key} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] py-0.5">
              <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)]"></span>
              <span>{prog.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResultCard({
  result,
  platformName,
  restaurantName,
  communityReport,
  onReported,
  conflictWarning,
}: ResultCardProps) {
  const platform = getPlatform(platformName);
  const isTier1 = platform?.tier === 1;

  // Loading state
  if (!result) {
    return (
      <div className="flex items-start gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 animate-slide-in">
        <div
          className="mt-0.5 h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-gold)]"
          role="status"
        >
          <span className="sr-only">Checking…</span>
        </div>
        <div className="flex-1">
          <p className="font-medium text-[var(--color-text-secondary)]">{platformName}</p>
          <div className="mt-2 space-y-2">
            <div className="h-3 w-40 rounded skeleton-card" aria-hidden="true"></div>
            <div className="h-3 w-24 rounded skeleton-card" aria-hidden="true" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const communityConfirmed = communityReport && communityReport.count >= 2;
  const isApiResult = result.method === "api";
  const isWebSearch = result.method === "web_search";
  const earningRate = result.details ? extractEarningRate(result.details) : null;
  const isRewardsNetwork = platformName === "Rewards Network";

  // FOUND state
  if (result.found || communityConfirmed) {
    const borderClass = isTier1
      ? isApiResult
        ? "border-2 border-[var(--color-tier1-border)] hover:border-[var(--color-result-tier1)]/70"
        : "border-2 border-[var(--color-result-tier1)]/40 hover:border-[var(--color-result-tier1)]/60"
      : "border border-[var(--color-tier2-border)] hover:border-[var(--color-result-tier2)]/40";

    const bgClass = isTier1
      ? "bg-gradient-to-br from-[var(--color-api-green-dim)] to-[var(--color-surface-raised)]"
      : "bg-gradient-to-br from-[var(--color-web-blue-dim)] to-[var(--color-surface-raised)]";

    const shadowClass = isTier1
      ? "hover:shadow-lg hover:shadow-green-900/10"
      : "hover:shadow-md hover:shadow-blue-900/5";

    const paddingClass = isTier1 ? "p-6" : "p-4";

    return (
      <div className={`relative flex items-start gap-4 rounded-xl ${borderClass} ${bgClass} ${paddingClass} animate-fade-in-up transition-all duration-300 ${shadowClass}`}>
        {restaurantName && <FavoriteButton name={restaurantName} />}
        <span className="mt-1 w-2 h-2 rounded-full bg-[var(--color-result-tier1)] shrink-0" aria-label="Found"></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold text-[var(--color-text-primary)] ${isTier1 ? "text-base" : "text-sm"}`}>
              {platformName}
            </h3>
            <ExplainerButton platformName={platformName} />
            {platform && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-surface-overlay)] px-3 py-1 text-xs font-semibold text-[var(--color-gold)] ring-1 ring-[var(--color-gold)]/30">
                {platform.rewardLabel}
              </span>
            )}
            {isApiResult && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-result-tier1-dim)] px-2.5 py-1 text-xs font-semibold text-[var(--color-result-tier1)] ring-1 ring-[var(--color-result-tier1)]/20">
                Verified
              </span>
            )}
            {isWebSearch && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-result-tier2-dim)] px-2.5 py-1 text-xs font-semibold text-[var(--color-result-tier2)] ring-1 ring-[var(--color-result-tier2)]/20">
                Web search
              </span>
            )}
            {communityReport && <CommunityBadge report={communityReport} />}
          </div>

          {/* Earning rate prominence for Tier 1 */}
          {isTier1 && isRewardsNetwork && result.found ? (
            <RewardsNetworkExpander details={result.details} />
          ) : isTier1 && earningRate ? (
            <p className="mt-2 text-lg font-extrabold text-[var(--color-gold)]">
              {earningRate}
            </p>
          ) : null}

          {/* Details text */}
          {isTier1 && isApiResult && result.found ? (
            <p className={`${earningRate || isRewardsNetwork ? "mt-1 text-sm text-[var(--color-text-secondary)]" : "mt-2 text-base font-bold text-[var(--color-text-primary)]"}`}>
              {earningRate || isRewardsNetwork ? result.details.replace(earningRate ?? "", "").trim() || result.details : result.details}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-text-secondary)] truncate">
              {result.found
                ? result.details
                : `Community confirmed on ${platformName}`}
            </p>
          )}

          {/* Inline conflict warning */}
          {conflictWarning && (
            <div className="mt-3 rounded-xl bg-[var(--color-warning-dim)] px-3 py-2 text-xs font-semibold text-[var(--color-warning)] ring-1 ring-[var(--color-warning)]/20">
              <span>Different card may be required to stack this with another deal.</span>
            </div>
          )}

          {result.url && result.found && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target mt-3 inline-flex max-w-full items-center justify-center rounded-xl bg-[var(--color-accent)]/10 px-4 py-2 text-sm font-bold text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20 transition-all hover:bg-[var(--color-accent)]/15"
            >
              View deal →
            </a>
          )}
          {!result.found && platform && (
            <a
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target mt-3 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-[var(--color-accent)] ring-1 ring-[var(--color-border)] transition-all hover:bg-[var(--color-surface-overlay)]"
            >
              Open {platformName} →
            </a>
          )}
          {platform?.personalized && (
            <p className="mt-3 text-xs text-[var(--color-warning)]">
              Offers are personalized — your discount may differ
            </p>
          )}
        </div>
      </div>
    );
  }

  // SEARCH UNAVAILABLE state — amber/warning
  if (result.searchUnavailable) {
    return (
      <div className="relative flex items-start gap-4 rounded-xl border-2 border-[var(--color-warning)]/30 bg-gradient-to-br from-[var(--color-warning-dim)] to-[var(--color-surface-raised)] p-5 animate-fade-in-up transition-all duration-300 hover:border-[var(--color-warning)]/50 hover:shadow-lg hover:shadow-orange-900/10">
        {restaurantName && <FavoriteButton name={restaurantName} />}
        <span className="mt-1 w-2 h-2 rounded-full bg-[var(--color-warning)] shrink-0" aria-label="Manual check needed"></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[var(--color-warning)]">{platformName}</h3>
            <ExplainerButton platformName={platformName} />
            {platform && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-surface-overlay)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
                {platform.rewardLabel}
              </span>
            )}
            {communityReport && <CommunityBadge report={communityReport} />}
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{result.details}</p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <a
              href={platform?.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target inline-flex items-center gap-1 rounded-lg bg-[var(--color-warning)]/15 px-4 py-2 text-sm font-bold text-[var(--color-warning)] ring-1 ring-[var(--color-warning)]/30 transition-all duration-200 hover:bg-[var(--color-warning)]/25"
            >
              {platform?.appOnly ? "Open app" : "Open"} {platformName} →
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

  // NOT FOUND state
  return (
    <div className="relative flex items-start gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 opacity-60 animate-fade-in transition-all duration-300 hover:opacity-90 hover:border-[var(--color-border)]">
      {restaurantName && <FavoriteButton name={restaurantName} />}
      <span className="mt-1 w-2 h-2 rounded-full bg-[var(--color-text-muted)] shrink-0 opacity-50" aria-label="Not found"></span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-[var(--color-text-muted)]">{platformName}</h3>
          <ExplainerButton platformName={platformName} />
          {communityReport && <CommunityBadge report={communityReport} />}
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{result.details}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {platform?.appOnly && !result.found && (
            <a
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target inline-flex items-center rounded-lg text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)]"
            >
              Check the app →
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
