"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { ACTIVE_PLATFORMS as PLATFORMS, CheckResult, ConflictWarning as ConflictWarningType } from "@/lib/platforms";
import { findBestDeal } from "@/lib/best-deal";
import { ResultCard } from "./ResultCard";
import { BestDealCard } from "./BestDealCard";
import { FilterBar, useFilterState } from "./FilterBar";

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
  const [filters, setFilters] = useFilterState();

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
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

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

  // Reset state during render when query changes
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

  useEffect(() => {
    if (!query || query.length < 2) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

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

  // Filter platforms based on active filters
  const filterPlatform = (p: typeof PLATFORMS[number]) => {
    if (filters.cardFreeOnly && p.cardLink) return false;
    if (filters.rewardType !== "all") {
      const typeMap: Record<string, string[]> = {
        cashback: ["cashback"],
        points: ["points"],
        discounts: ["credit", "discount", "deals"],
        "app-rewards": ["cashback", "points", "credit", "discount", "deals"],
      };
      if (filters.rewardType === "app-rewards") {
        if (!p.appOnly) return false;
      } else {
        const allowed = typeMap[filters.rewardType] ?? [];
        if (!allowed.includes(p.rewardType)) return false;
      }
    }
    return true;
  };

  const filteredPlatforms = PLATFORMS.filter(filterPlatform);

  // --- Three-tier grouping ---
  const isFound = (p: typeof PLATFORMS[number]) => {
    const r = results.get(p.name);
    const communityConfirmed = (communityReports.get(p.name)?.count ?? 0) >= 2;
    return r?.found || communityConfirmed;
  };

  const isManualCheck = (p: typeof PLATFORMS[number]) => {
    const r = results.get(p.name);
    const communityConfirmed = (communityReports.get(p.name)?.count ?? 0) >= 2;
    return r?.searchUnavailable && !communityConfirmed;
  };

  const isNotFound = (p: typeof PLATFORMS[number]) => {
    const r = results.get(p.name);
    const communityConfirmed = (communityReports.get(p.name)?.count ?? 0) >= 2;
    return r && !r.found && !r.searchUnavailable && !communityConfirmed;
  };

  // Group found results by value category
  const primaryFound = filteredPlatforms.filter((p) => (p.valueCategory as string) === "primary" && isFound(p));
  const additionalFound = filteredPlatforms.filter((p) => (p.valueCategory as string) === "additional" && isFound(p));
  const manualCheckPlatforms = filteredPlatforms.filter((p) => isManualCheck(p));
  const notFoundPlatforms = isDone ? filteredPlatforms.filter((p) => isNotFound(p)) : [];

  // Sort within groups: API method first, then by name
  const sortWithinTier = (platforms: typeof PLATFORMS) => {
    if (filters.sortBy === "name") return [...platforms].sort((a, b) => a.name.localeCompare(b.name));
    return [...platforms].sort((a, b) => {
      const aResult = results.get(a.name);
      const bResult = results.get(b.name);
      const aApi = aResult?.method === "api" ? 1 : 0;
      const bApi = bResult?.method === "api" ? 1 : 0;
      return bApi - aApi;
    });
  };

  const sortedPrimary = sortWithinTier(primaryFound);
  const sortedAdditional = sortWithinTier(additionalFound);
  const sortedManual = sortWithinTier(manualCheckPlatforms);

  // During streaming: flat list sorted by tier awareness
  const streamingPlatforms = !isDone
    ? [...filteredPlatforms].sort((a, b) => {
        if (filters.sortBy === "name") return a.name.localeCompare(b.name);
        const aResult = results.get(a.name);
        const bResult = results.get(b.name);
        const aFound = aResult?.found || (communityReports.get(a.name)?.count ?? 0) >= 2;
        const bFound = bResult?.found || (communityReports.get(b.name)?.count ?? 0) >= 2;
        // Primary found first
        if (aFound && (a.valueCategory as string) === "primary" && !(bFound && (b.valueCategory as string) === "primary")) return -1;
        if (bFound && (b.valueCategory as string) === "primary" && !(aFound && (a.valueCategory as string) === "primary")) return 1;
        if (aFound && !bFound) return -1;
        if (!aFound && bFound) return 1;
        if ((a.valueCategory as string) === "primary" && (b.valueCategory as string) === "additional") return -1;
        if ((a.valueCategory as string) === "additional" && (b.valueCategory as string) === "primary") return 1;
        return 0;
      })
    : [];

  const apiFoundCount = resultsArr.filter((r) => r.found && r.method === "api").length;
  const webFoundCount = foundCount - apiFoundCount;

  // Get conflicting platforms for inline warnings
  const conflictPlatforms = conflict?.platforms ?? [];

  // Celebration summary card (post-stream)
  const celebrationSummary = isDone && resultsArr.length > 0 && (
    <div
      className={`mb-6 rounded-xl p-6 animate-scale-in ${
        foundCount > 0
          ? "bg-gradient-to-br from-[var(--color-success-dim)] via-[var(--color-surface-raised)] to-[var(--color-surface-raised)] border border-[var(--color-success)]/30"
          : "bg-[var(--color-surface-raised)] border border-[var(--color-border)]"
      }`}
    >
      {foundCount > 0 ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-[var(--color-success)]">
              Found on {foundCount} platform{foundCount !== 1 ? "s" : ""}
              {apiFoundCount > 0 || webFoundCount > 0
                ? ` (${[
                    apiFoundCount > 0 ? `${apiFoundCount} verified` : "",
                    webFoundCount > 0 ? `${webFoundCount} web search` : "",
                  ]
                    .filter(Boolean)
                    .join(", ")})`
                : ""}
            </h2>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Available at:{" "}
            {[...sortedPrimary, ...sortedAdditional, ...sortedManual]
              .filter((p) => isFound(p))
              .map((p) => p.name)
              .join(", ")}
          </p>
          {conflict && (
            <div className="mt-3 pt-3 border-t border-[var(--color-border)] text-sm">
              <span className="text-[var(--color-warning)]">{conflict.message}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              No deals found yet
            </h2>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {unavailableCount > 0
              ? `${unavailableCount} platform${
                  unavailableCount !== 1 ? "s" : ""
                } need manual check — they might still have deals!`
              : "This restaurant isn't on any discount platforms yet. Try searching another spot!"}
          </p>
        </>
      )}
    </div>
  );

  // Render a result card for a platform
  const renderCard = (p: typeof PLATFORMS[number], i: number, showConflict = false) => (
    <div key={p.name} className={`animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}>
      <ResultCard
        platformName={p.name}
        result={results.get(p.name) ?? null}
        restaurantName={query}
        communityReport={communityReports.get(p.name)}
        onReported={() => fetchCommunityReports(query)}
        conflictWarning={showConflict && conflictPlatforms.includes(p.name) ? conflict?.message : undefined}
      />
    </div>
  );

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

      {!error && isSearching && (
        <div className="mb-6 flex items-center gap-3 animate-fade-in">
          <div className="h-1.5 flex-1 rounded-full bg-[var(--color-surface-overlay)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-dim)] transition-all duration-500 ease-out"
              style={{ width: `${Math.max(10, (checkedCount / PLATFORMS.length) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
            {checkedCount}/{PLATFORMS.length}
          </p>
        </div>
      )}

      {!error && isDone && (
        <FilterBar filters={filters} onChange={setFilters} />
      )}

      {!error && isDone && (() => {
        const bestDealResult = findBestDeal(resultsArr);
        if (!bestDealResult) return null;
        return (
          <BestDealCard
            best={bestDealResult.best}
            otherDealsCount={bestDealResult.otherDealsCount}
          />
        );
      })()}

      {!error && celebrationSummary}

      {/* During streaming: flat list */}
      {!error && !isDone && (
        <div className="grid gap-3">
          {streamingPlatforms.map((p, i) => renderCard(p, i, true))}
        </div>
      )}

      {/* After streaming: grouped sections */}
      {!error && isDone && (
        <div className="space-y-6">
          {/* Primary: Real cashback & discounts */}
          {sortedPrimary.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-green-600">
                  Deals &amp; Cashback
                </span>
              </div>
              <div className="grid gap-3">
                {sortedPrimary.map((p, i) => renderCard(p, i, true))}
              </div>
            </section>
          )}

          {/* Manual check platforms */}
          {sortedManual.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-warning)]">
                  Manual Check Needed
                </span>
              </div>
              <div className="grid gap-3">
                {sortedManual.map((p, i) => renderCard(p, i, false))}
              </div>
            </section>
          )}

          {/* Additional: Card-specific points programs */}
          {sortedAdditional.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">
                  Also Found
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  — Lower priority
                </span>
              </div>
              <div className="grid gap-3">
                {sortedAdditional.map((p, i) => renderCard(p, i, true))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Not found — collapsed line */}
      {notFoundPlatforms.length > 0 && (
        <div className="mt-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 opacity-50 animate-fade-in transition-all duration-300 hover:opacity-70">
          <p className="text-sm text-[var(--color-text-muted)]">
            <span className="font-medium text-[var(--color-text-secondary)]">Not available on:</span>{" "}
            {notFoundPlatforms.map((p) => p.name).join(" · ")}
          </p>
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
