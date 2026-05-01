"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const CURATED_NYC = [
  "Carbone",
  "Tatiana",
  "Thai Diner",
  "Oxomoco",
  "Dhamaka",
  "Los Tacos No. 1",
  "Joe's Pizza",
  "Lilia",
  "Don Angie",
  "Lovely Day",
  "Bonnie's",
  "Win Son",
];

function PopularSearchesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  if (query) return null;

  function handleClick(name: string) {
    router.push(`/?q=${encodeURIComponent(name)}`);
  }

  return (
    <div className="mt-12">
      <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-widest">
        Try searching
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CURATED_NYC.map((name) => (
          <button
            key={name}
            onClick={() => handleClick(name)}
            aria-label={`Search for ${name}`}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-all duration-200 hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] hover:bg-[var(--color-gold-glow)]"
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
