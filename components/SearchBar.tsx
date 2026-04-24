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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder='e.g. "Carbone", "Oxomoco"'
        className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        autoFocus
      />
      <button
        type="submit"
        className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
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
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-400">
            Loading...
          </div>
        </div>
      }
    >
      <SearchBarInner />
    </Suspense>
  );
}
