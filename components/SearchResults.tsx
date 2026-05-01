"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

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

  const performFetch = useCallback(async (q: string, controller: AbortController) => {
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const resp = await fetch(`/api/check?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });

      if (resp.status === 429) {
        setError("Too many searches. Please wait a moment and try again.");
        setIsSearching(false);
        setIsDone(true);
        return;
      }

      if (!resp.ok || !resp.body) {
        setError("Something went wrong. Please try again.");
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
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      clearTimeout(timeoutId);
      setIsSearching(false);
      setIsDone(true);
    }
  }, []);

  const startSearch = useCallback((q: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setResults(new Map());
    setConflict(null);
    setCommunityReports(new Map());
    setIsSearching(true);
    setIsDone(false);
    setError(null);

    fetchCommunityReports(q);
    performFetch(q, controller);
  }, [fetchCommunityReports, performFetch]);

  // Reset state during render when query changes (React-approved derived state pattern)
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  if (query !== lastQuery) {
    setLastQuery(query);
    if (query && query.length >= 2) {
      setResults(new Map());
      setConflict(null);
      setCommunityReports(new Map());
      setIsSearching(true);
      setIsDone(false);
      setError(null);
    } else {
      setResults(new Map());
      setCommunityReports(new Map());
      setConflict(null);
      setIsDone(false);
      setError(null);
    }
  }

  // Effect handles async side effects via microtask to satisfy lint rule
  useEffect(() => {
    if (!query || query.length < 2) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Wrap in microtask — setState happens in async callbacks, not synchronously
    void Promise.resolve().then(() => {
      fetchCommunityReports(query);
      performFetch(query, controller);
    });

    return () => {
      controller.abort();
    };
  }, [query, fetchCommunityReports, performFetch]);

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
    <div className="mt-8" aria-live="polite" role="status" aria-busy={isSearching}>
      {error && (
        <div className="mb-4 rounded-xl border border-[var(--color-error)]/20 bg-[var(--color-error-dim)] p-5 text-sm text-[var(--color-error)] animate-fade-in">
          <p>{error}</p>
          <button
            onClick={() => startSearch(query)}
            className="mt-3 rounded-lg bg-[var(--color-error)]/10 px-4 py-2 text-xs font-medium text-[var(--color-error)] transition-all duration-200 hover:bg-[var(--color-error)]/20 ring-1 ring-[var(--color-error)]/20"
          >
            Try again
          </button>
        </div>
      )}

      {!error && (isSearching || isDone) && (
        <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
          {summaryText()}
        </p>
      )}

      {!error && (
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
      )}

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
