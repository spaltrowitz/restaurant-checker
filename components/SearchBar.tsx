"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent, Suspense } from "react";

function SearchBarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      router.push(`/?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <label htmlFor="restaurant-search" className="sr-only">
        Search for a restaurant
      </label>
      <input
        id="restaurant-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a restaurant name…"
        aria-label="Search for a restaurant"
        className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 py-4 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-glow)] transition-all duration-200"
        autoFocus
      />
      <button
        type="submit"
        className="rounded-xl bg-[var(--color-gold)] px-7 py-4 text-sm font-semibold text-[var(--color-surface)] transition-all duration-200 hover:bg-[var(--color-gold-dim)] hover:scale-[1.02] active:scale-[0.98]"
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
          <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 py-4 text-base text-[var(--color-text-muted)] animate-shimmer">
            Loading...
          </div>
        </div>
      }
    >
      <SearchBarInner />
    </Suspense>
  );
}
