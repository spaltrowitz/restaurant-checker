"use client";

import Link from "next/link";
import { Nav } from "@/components/Nav";
import { useFavorites } from "@/hooks/useFavorites";

export default function FavoritesPage() {
  const { favorites, toggleFavorite } = useFavorites();

  return (
    <>
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:py-16">
        {/* Hero */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            Your Saved Restaurants
          </h1>
          <div className="brand-rule mt-4 max-w-20 mx-auto sm:mx-0" />
          <p className="mt-4 text-[var(--color-text-secondary)] max-w-lg mx-auto sm:mx-0">
            Quick access to restaurants you saved on this device.
          </p>
          <p className="mt-2 max-w-lg text-xs text-[var(--color-text-muted)] mx-auto sm:mx-0">
            No account needed right now. Account sync can come later if you want favorites across devices.
          </p>
        </div>

        {/* Empty state */}
        {favorites.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-100 to-purple-50 flex items-center justify-center">
              <span className="text-2xl font-black text-[var(--color-accent)]">0</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              No favorites yet
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-sm mx-auto">
              Start searching to save restaurants you love. Saves stay on this device for now.
            </p>
            <Link
              href="/"
              className="touch-target inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm shadow-orange-900/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              Search restaurants
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
                    className="touch-target inline-flex items-center gap-1 rounded-lg bg-[var(--color-accent)]/10 px-4 py-2 text-sm font-bold text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20 transition-all duration-200 hover:bg-[var(--color-accent)]/15"
                  >
                    Search deals
                  </Link>
                  <button
                    onClick={() => toggleFavorite(name)}
                    className="touch-target inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-500/20 transition-all duration-200 hover:bg-red-500/20"
                  >
                    Remove
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
