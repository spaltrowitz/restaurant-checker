"use client";

import { useEffect, useState, useCallback } from "react";
import { Nav } from "@/components/Nav";

interface Restaurant {
  name: string;
  address: string;
  platforms: string[];
}

interface Neighborhood {
  slug: string;
  name: string;
  restaurantCount: number;
  topRestaurants: string[];
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  "Bilt Rewards": { bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/20" },
  "Rewards Network": { bg: "bg-sky-500/10", text: "text-sky-400", ring: "ring-sky-500/20" },
  "Upside": { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  "Blackbird": { bg: "bg-purple-500/10", text: "text-purple-400", ring: "ring-purple-500/20" },
  "inKind": { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/20" },
  "Rakuten Dining": { bg: "bg-red-500/10", text: "text-red-400", ring: "ring-red-500/20" },
  "Too Good To Go": { bg: "bg-teal-500/10", text: "text-teal-400", ring: "ring-teal-500/20" },
  "Nea": { bg: "bg-pink-500/10", text: "text-pink-400", ring: "ring-pink-500/20" },
};

function getPlatformStyle(name: string) {
  return PLATFORM_COLORS[name] ?? { bg: "bg-[var(--color-surface-overlay)]", text: "text-[var(--color-text-secondary)]", ring: "ring-[var(--color-border)]" };
}

function NeighborhoodSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5">
      <div className="h-5 w-32 rounded skeleton-card mb-3" />
      <div className="h-4 w-20 rounded skeleton-card mb-4" style={{ animationDelay: "0.1s" }} />
      <div className="space-y-2">
        <div className="h-3 w-40 rounded skeleton-card" style={{ animationDelay: "0.15s" }} />
        <div className="h-3 w-36 rounded skeleton-card" style={{ animationDelay: "0.2s" }} />
        <div className="h-3 w-28 rounded skeleton-card" style={{ animationDelay: "0.25s" }} />
      </div>
    </div>
  );
}

function RestaurantRow({ restaurant }: { restaurant: Restaurant }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b border-[var(--color-border-subtle)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--color-text-primary)] truncate">{restaurant.name}</p>
        <p className="text-xs text-[var(--color-text-muted)] truncate">{restaurant.address}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 shrink-0">
        {restaurant.platforms.map((p) => {
          const style = getPlatformStyle(p);
          return (
            <span
              key={p}
              className={`inline-flex items-center rounded-full ${style.bg} px-2.5 py-0.5 text-xs font-medium ${style.text} ring-1 ${style.ring}`}
            >
              {p}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

  useEffect(() => {
    fetch("/api/browse")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load neighborhoods");
        return r.json();
      })
      .then((data) => {
        setNeighborhoods(data.neighborhoods ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load neighborhoods. Please try again.");
        setLoading(false);
      });
  }, []);

  const handleNeighborhoodClick = useCallback(
    async (slug: string) => {
      if (expanded === slug) {
        setExpanded(null);
        setRestaurants([]);
        return;
      }

      setExpanded(slug);
      setRestaurants([]);
      setLoadingRestaurants(true);

      try {
        const resp = await fetch(`/api/browse?neighborhood=${encodeURIComponent(slug)}`);
        if (!resp.ok) throw new Error("Failed to load restaurants");
        const data = await resp.json();
        setRestaurants(data.restaurants ?? []);
      } catch {
        setRestaurants([]);
      } finally {
        setLoadingRestaurants(false);
      }
    },
    [expanded]
  );

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:py-16">
        {/* Hero */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            Browse NYC Deals by Neighborhood
          </h1>
          <div className="w-16 h-0.5 bg-[var(--color-gold)] mt-4 opacity-50 mx-auto sm:mx-0" />
          <p className="mt-4 text-[var(--color-text-secondary)] max-w-lg mx-auto sm:mx-0">
            Explore restaurants with active deals near you. Tap a neighborhood to see every restaurant and which platforms they&apos;re on.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-[var(--color-error)]/20 bg-[var(--color-error-dim)] p-5 text-sm text-[var(--color-error)] animate-fade-in">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetch("/api/browse")
                  .then((r) => r.json())
                  .then((data) => {
                    setNeighborhoods(data.neighborhoods ?? []);
                    setLoading(false);
                  })
                  .catch(() => {
                    setError("Still couldn't load. Please try again later.");
                    setLoading(false);
                  });
              }}
              className="mt-3 rounded-lg bg-[var(--color-error)]/10 px-4 py-2 text-xs font-medium text-[var(--color-error)] transition-all duration-200 hover:bg-[var(--color-error)]/20 ring-1 ring-[var(--color-error)]/20"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <NeighborhoodSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Neighborhood grid */}
        {!loading && !error && neighborhoods.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl mb-4 block" role="img" aria-label="No data">📭</span>
            <p className="text-[var(--color-text-secondary)]">No neighborhoods available yet. Check back soon!</p>
          </div>
        )}

        {!loading && !error && neighborhoods.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {neighborhoods.map((n, i) => {
              const isExpanded = expanded === n.slug;
              return (
                <div
                  key={n.slug}
                  className={`animate-fade-in-up stagger-${Math.min(i + 1, 8)} ${isExpanded ? "sm:col-span-2 lg:col-span-3" : ""}`}
                >
                  <button
                    onClick={() => handleNeighborhoodClick(n.slug)}
                    className={`w-full text-left rounded-xl border-2 p-5 transition-all duration-300 ${
                      isExpanded
                        ? "border-[var(--color-gold)]/40 bg-gradient-to-br from-amber-900/10 to-[var(--color-surface-raised)] shadow-lg shadow-amber-500/5"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-gold)]/30 hover:shadow-lg hover:shadow-amber-500/5 hover:scale-[1.02]"
                    }`}
                  >
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {n.name}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--color-gold)] font-medium">
                      {n.restaurantCount} restaurant{n.restaurantCount !== 1 ? "s" : ""} with deals
                    </p>
                    {n.topRestaurants.length > 0 && !isExpanded && (
                      <div className="mt-3 space-y-1">
                        {n.topRestaurants.slice(0, 3).map((name) => (
                          <p key={name} className="text-sm text-[var(--color-text-muted)] truncate">
                            {name}
                          </p>
                        ))}
                        {n.restaurantCount > 3 && (
                          <p className="text-xs text-[var(--color-text-muted)]">
                            +{n.restaurantCount - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Expanded restaurant list */}
                  {isExpanded && (
                    <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 animate-fade-in">
                      {loadingRestaurants ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="flex gap-4 py-3">
                              <div className="flex-1 space-y-2">
                                <div className="h-4 w-40 rounded skeleton-card" />
                                <div className="h-3 w-56 rounded skeleton-card" style={{ animationDelay: "0.1s" }} />
                              </div>
                              <div className="flex gap-1.5">
                                <div className="h-5 w-16 rounded-full skeleton-card" />
                                <div className="h-5 w-14 rounded-full skeleton-card" style={{ animationDelay: "0.15s" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : restaurants.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                          No restaurant data available for this neighborhood.
                        </p>
                      ) : (
                        <div>
                          {restaurants.map((r) => (
                            <RestaurantRow key={r.name} restaurant={r} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
