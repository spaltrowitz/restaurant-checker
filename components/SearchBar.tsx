"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent, Suspense } from "react";

function SearchBarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState({ urlQuery: currentQuery, value: currentQuery });

  if (draft.urlQuery !== currentQuery) {
    setDraft({ urlQuery: currentQuery, value: currentQuery });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.value.trim();
    if (trimmed.length >= 2) {
      router.push(`/?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row" aria-describedby="restaurant-search-help">
      <label htmlFor="restaurant-search" className="sr-only">
        Search for a restaurant
      </label>
      <input
        id="restaurant-search"
        type="text"
        value={draft.value}
        onChange={(e) => setDraft({ urlQuery: currentQuery, value: e.target.value })}
        placeholder="Try Carbone, Lilia, Thai Diner..."
        aria-label="Search for a restaurant"
        className="min-h-14 flex-1 rounded-2xl border-2 border-[var(--color-border)] bg-white px-5 py-4 text-base text-[var(--color-text-primary)] shadow-sm transition-all duration-300 placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/40 hover:shadow-md focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)]/15 sm:px-6"
        autoFocus
      />
      <button
        type="submit"
        className="touch-target rounded-2xl bg-gradient-to-b from-[var(--color-accent-bright)] via-[var(--color-accent)] to-[var(--color-accent-dim)] px-6 py-4 text-base font-bold text-white shadow-md shadow-orange-900/10 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-900/15 active:scale-[0.98] sm:px-8"
      >
        Search
      </button>
    </form>
  );
}

export function SearchBar() {
  return (
    <Suspense
      fallback={
        <div className="flex gap-3">
          <div className="min-h-14 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 py-4 text-base text-[var(--color-text-muted)] animate-shimmer">
            Loading...
          </div>
        </div>
      }
    >
      <SearchBarInner />
    </Suspense>
  );
}
