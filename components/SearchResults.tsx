"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { PLATFORMS, CheckResult, ConflictWarning as ConflictWarningType } from "@/lib/platforms";
import { ResultCard } from "./ResultCard";
import { ConflictWarning } from "./ConflictWarning";

interface CommunityReportInfo {
  count: number;
  latestReport: string;
}

type StreamEvent =
  | CheckResult
  | ConflictWarningType
  | { type: "done" };

function isCheckResult(event: StreamEvent): event is CheckResult {
  return "platform" in event && "found" in event;
}

function isConflictWarning(event: StreamEvent): event is ConflictWarningType {
  return "type" in event && event.type === "conflict";
}

function SearchResultsInner() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  const [results, setResults] = useState<Map<string, CheckResult>>(new Map());
  const [communityReports, setCommunityReports] = useState<Map<string, CommunityReportInfo>>(new Map());
  const [conflict, setConflict] = useState<ConflictWarningType | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const fetchCommunityReports = useCallback(async (q: string) => {
    try {
      const resp = await fetch(`/api/reports?q=${encodeURIComponent(q)}`);
      if (!resp.ok) return;
      const data = await resp.json();
      const map = new Map<string, CommunityReportInfo>();
      for (const r of data.reports || []) {
        map.set(r.platform, { count: r.count, latestReport: r.latestReport });
      }
      setCommunityReports(map);
    } catch {
      // silently fail — community reports are supplementary
    }
  }, []);

  const startSearch = useCallback(async (q: string) => {
    setResults(new Map());
    setConflict(null);
    setCommunityReports(new Map());
    setIsSearching(true);
    setIsDone(false);

    // Fetch community reports in parallel with the SSE search
    fetchCommunityReports(q);

    try {
      const resp = await fetch(`/api/check?q=${encodeURIComponent(q)}`);
      if (!resp.ok || !resp.body) {
        setIsSearching(false);
        setIsDone(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith("data: ")) continue;
          const json = dataLine.slice(6);
          try {
            const event: StreamEvent = JSON.parse(json);
            if (isCheckResult(event)) {
              setResults((prev) => {
                const next = new Map(prev);
                next.set(event.platform, event);
                return next;
              });
            } else if (isConflictWarning(event)) {
              setConflict(event);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      // network error — results stay as-is
    } finally {
      setIsSearching(false);
      setIsDone(true);
    }
  }, [fetchCommunityReports]);

  useEffect(() => {
    if (query && query.length >= 2) {
      startSearch(query);
    } else {
      setResults(new Map());
      setCommunityReports(new Map());
      setConflict(null);
      setIsDone(false);
    }
  }, [query, startSearch]);

  if (!query) return null;

  const resultsArr = Array.from(results.values());
  const communityConfirmedCount = Array.from(communityReports.values()).filter(
    (r) => r.count >= 2
  ).length;
  const foundCount =
    resultsArr.filter((r) => r.found).length +
    // Count community-confirmed platforms not already found by search
    Array.from(communityReports.entries()).filter(
      ([platform, report]) =>
        report.count >= 2 && !results.get(platform)?.found
    ).length;
  const unavailableCount = resultsArr.filter(
    (r) =>
      r.searchUnavailable &&
      !(communityReports.get(r.platform)?.count ?? 0 >= 2)
  ).length;
  const checkedCount = results.size;

  const summaryText = () => {
    if (isSearching) {
      return `Checking platforms for "${query}"… (${checkedCount}/${PLATFORMS.length})`;
    }
    const parts = [`Results for "${query}"`];
    if (foundCount > 0) {
      parts.push(`found on ${foundCount} platform${foundCount !== 1 ? "s" : ""}`);
    } else {
      parts.push(`found on 0 platforms`);
    }
    if (unavailableCount > 0) {
      parts.push(`${unavailableCount} need manual check`);
    }
    if (communityConfirmedCount > 0) {
      parts.push(`${communityConfirmedCount} community confirmed`);
    }
    return parts.join(" — ");
  };

  return (
    <div className="mt-8">
      {(isSearching || isDone) && (
        <p className="mb-4 text-sm text-gray-500">
          {summaryText()}
        </p>
      )}

      <div className="grid gap-3">
        {PLATFORMS.map((p) => (
          <ResultCard
            key={p.name}
            platformName={p.name}
            result={results.get(p.name) ?? null}
            restaurantName={query}
            communityReport={communityReports.get(p.name)}
            onReported={() => fetchCommunityReports(query)}
          />
        ))}
      </div>

      {conflict && (
        <div className="mt-4">
          <ConflictWarning
            platforms={conflict.platforms}
            message={conflict.message}
          />
        </div>
      )}
    </div>
  );
}

export function SearchResults() {
  return (
    <Suspense fallback={null}>
      <SearchResultsInner />
    </Suspense>
  );
}
