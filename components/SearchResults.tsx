"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { PLATFORMS, CheckResult, ConflictWarning as ConflictWarningType } from "@/lib/platforms";
import { ResultCard } from "./ResultCard";
import { ConflictWarning } from "./ConflictWarning";

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
  const [conflict, setConflict] = useState<ConflictWarningType | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const startSearch = useCallback(async (q: string) => {
    setResults(new Map());
    setConflict(null);
    setIsSearching(true);
    setIsDone(false);

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
            // "done" type just means stream is finished
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
  }, []);

  useEffect(() => {
    if (query && query.length >= 2) {
      startSearch(query);
    } else {
      setResults(new Map());
      setConflict(null);
      setIsDone(false);
    }
  }, [query, startSearch]);

  if (!query) return null;

  const resultsArr = Array.from(results.values());
  const foundCount = resultsArr.filter((r) => r.found).length;
  const unavailableCount = resultsArr.filter((r) => r.searchUnavailable).length;
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
