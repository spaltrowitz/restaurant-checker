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
    <div className="mt-16">
      <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">
        Popular searches
      </p>
      <div className="flex flex-wrap gap-2.5">
        {CURATED_NYC.map((name) => (
          <button
            key={name}
            onClick={() => handleClick(name)}
            aria-label={`Search for ${name}`}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-all duration-200 hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] hover:bg-[var(--color-gold-glow)] hover:scale-[1.03] active:scale-[0.97]"
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
