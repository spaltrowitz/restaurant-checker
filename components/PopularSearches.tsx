"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const QUICK_SEARCHES = [
  "Carbone", "Joe's Pizza", "Los Tacos No. 1", "Thai Diner",
  "Dhamaka", "Don Angie", "Oxomoco", "Win Son",
  "Tatiana", "Lilia", "Lovely Day", "Bonnie's",
];

function PopularSearchesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  if (query) return null;

  return (
    <div className="mt-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <p className="text-center text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-6">
        Try a quick search
      </p>
      <div className="flex flex-wrap gap-2.5 justify-center">
        {QUICK_SEARCHES.map((name) => (
          <button
            key={name}
            onClick={() => router.push(`/?q=${encodeURIComponent(name)}`)}
            aria-label={`Search for ${name}`}
            className="rounded-full border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-all duration-300 hover:border-[var(--color-gold)]/50 hover:text-[var(--color-text-primary)] hover:shadow-md hover:shadow-orange-50 hover:scale-[1.04] active:scale-[0.97]"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PopularSearches() {
  return (
    <Suspense fallback={null}>
      <PopularSearchesInner />
    </Suspense>
  );
}
