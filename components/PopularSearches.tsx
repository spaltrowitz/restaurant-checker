"use client";

import { useRouter } from "next/navigation";

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

export function PopularSearches() {
  const router = useRouter();

  function handleClick(name: string) {
    router.push(`/?q=${encodeURIComponent(name)}`);
  }

  return (
    <div className="mt-8">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        Try searching
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CURATED_NYC.map((name) => (
          <button
            key={name}
            onClick={() => handleClick(name)}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
