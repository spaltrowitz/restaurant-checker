"use client";

import Link from "next/link";
import { Nav } from "@/components/Nav";
import { useFavorites } from "@/hooks/useFavorites";

export default function FavoritesPage() {
  const { favorites, toggleFavorite } = useFavorites();

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:py-16">
        {/* Hero */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            ❤️ Your Saved Restaurants
          </h1>
          <div className="w-16 h-0.5 bg-[var(--color-gold)] mt-4 opacity-50 mx-auto sm:mx-0" />
          <p className="mt-4 text-[var(--color-text-secondary)] max-w-lg mx-auto sm:mx-0">
            Quick access to your favorite deals
          </p>
        </div>

        {/* Empty state */}
        {favorites.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <span className="text-6xl mb-6 block" role="img" aria-label="No favorites">
              🍽️
            </span>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              No favorites yet
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-sm mx-auto">
              Start searching to save restaurants you love. Tap the ♡ on any result card.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-gold)]/15 px-6 py-3 text-sm font-semibold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/25 transition-all duration-200 ring-1 ring-[var(--color-gold)]/30"
            >
              🔍 Search restaurants
            </Link>
          </div>
        )}

        {/* Favorites grid */}
        {favorites.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((name, i) => (
              <div
                key={name}
                className={`relative rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 transition-all duration-300 hover:border-[var(--color-gold)]/30 hover:shadow-lg hover:shadow-amber-500/5 animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
              >
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] pr-8 truncate">
                  {name}
                </h2>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/?q=${encodeURIComponent(name)}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-gold)]/15 px-4 py-2 text-sm font-semibold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/25 transition-all duration-200 ring-1 ring-[var(--color-gold)]/30"
                  >
                    🔍 Search deals
                  </Link>
                  <button
                    onClick={() => toggleFavorite(name)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all duration-200 ring-1 ring-red-500/20"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
