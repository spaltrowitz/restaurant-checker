"use client";

import { useState } from "react";
import { CheckResult, getPlatform } from "@/lib/platforms";

interface CommunityReportInfo {
  count: number;
  latestReport: string;
}

interface ResultCardProps {
  result: CheckResult | null; // null = loading
  platformName: string;
  restaurantName?: string;
  communityReport?: CommunityReportInfo;
  onReported?: () => void;
}

function CommunityBadge({ report }: { report: CommunityReportInfo }) {
  if (report.count >= 2) {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-purple-200">
        👥 Community confirmed ({report.count})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200">
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
    return <span className="text-xs text-green-600">✓ Reported — thanks!</span>;
  }

  return (
    <button
      onClick={handleReport}
      disabled={status === "loading"}
      className="mt-1 inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 ring-1 ring-purple-200"
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

  if (!result) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mt-0.5 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        <div className="flex-1">
          <p className="font-medium text-gray-700">{platformName}</p>
          <p className="text-sm text-gray-400">Checking…</p>
        </div>
      </div>
    );
  }

  // Community-confirmed (2+ reports) upgrades display even if search didn't find it
  const communityConfirmed = communityReport && communityReport.count >= 2;

  if (result.found || communityConfirmed) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
        <span className="mt-0.5 text-lg">✅</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-900">{platformName}</p>
            {platform && (
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                {platform.rewardEmoji} {platform.rewardLabel}
              </span>
            )}
            {communityReport && <CommunityBadge report={communityReport} />}
          </div>
          <p className="mt-1 text-sm text-gray-600 truncate">
            {result.found
              ? result.details
              : `Community confirmed on ${platformName}`}
          </p>
          {result.url && result.found && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-blue-600 hover:underline truncate max-w-full"
            >
              {result.url}
            </a>
          )}
          {!result.found && platform && (
            <a
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-blue-600 hover:underline"
            >
              Open {platformName} →
            </a>
          )}
          {platform?.personalized && (
            <p className="mt-1 text-xs text-amber-600">
              ⚠️ Offers are personalized — your discount may differ
            </p>
          )}
        </div>
      </div>
    );
  }

  if (result.searchUnavailable) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <span className="mt-0.5 text-lg">🔗</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-amber-800">{platformName}</p>
            {platform && (
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                {platform.rewardEmoji} {platform.rewardLabel}
              </span>
            )}
            {communityReport && <CommunityBadge report={communityReport} />}
          </div>
          <p className="mt-1 text-sm text-amber-700">{result.details}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <a
              href={platform?.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-200 transition-colors"
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

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <span className="mt-0.5 text-lg">❌</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-500">{platformName}</p>
          {communityReport && <CommunityBadge report={communityReport} />}
        </div>
        <p className="mt-1 text-sm text-gray-400">{result.details}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {platform?.appOnly && !result.found && (
            <a
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-blue-500 hover:underline"
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
