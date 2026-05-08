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
        placeholder="Try Carbone, Lilia, Thai Diner…"
        aria-label="Search for a restaurant"
        className="flex-1 rounded-2xl border-2 border-[var(--color-border)] bg-white px-6 py-4 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-300 shadow-sm hover:border-orange-200 hover:shadow-md"
        autoFocus
      />
      <button
        type="submit"
        className="rounded-2xl bg-gradient-to-b from-[#ff8c5a] via-[#ff6b35] to-[#e55a2b] px-7 sm:px-9 py-4 text-base font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-orange-200 hover:scale-[1.03] active:scale-[0.97] shadow-md shadow-orange-100"
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
