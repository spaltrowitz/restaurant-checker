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
        placeholder="Search any NYC restaurant…"
        aria-label="Search for a restaurant"
        className="flex-1 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 sm:px-6 py-4 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-4 focus:ring-[var(--color-gold-glow)] transition-all duration-300 shadow-sm hover:border-[var(--color-gold-dim)]/40"
        autoFocus
      />
      <button
        type="submit"
        className="rounded-xl bg-gradient-to-b from-[var(--color-gold-bright)] to-[var(--color-gold)] px-6 sm:px-8 py-4 text-base font-bold text-[var(--color-surface)] transition-all duration-200 hover:from-[var(--color-gold)] hover:to-[var(--color-gold-dim)] hover:shadow-lg hover:shadow-[var(--color-gold-glow)] hover:scale-[1.02] active:scale-[0.98] shadow-md"
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
