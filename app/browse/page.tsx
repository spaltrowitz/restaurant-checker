"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import Link from "next/link";

interface RestaurantDetail {
  name: string;
  address: string;
  platforms: Record<string, { deal: string; url: string }>;
}

interface Neighborhood {
  slug: string;
  name: string;
  restaurantCount: number;
}

const PLATFORM_DISPLAY: Record<string, { label: string; color: string; textColor: string; ringColor: string }> = {
  "bilt": { label: "Bilt", color: "bg-blue-50", textColor: "text-blue-700", ringColor: "ring-blue-200" },
  "rewards-network": { label: "Rewards Network", color: "bg-sky-50", textColor: "text-sky-700", ringColor: "ring-sky-200" },
  "upside": { label: "Upside", color: "bg-green-50", textColor: "text-green-700", ringColor: "ring-green-200" },
};

function NeighborhoodSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <div className="h-5 w-32 rounded skeleton-card mb-3" />
      <div className="h-4 w-20 rounded skeleton-card" style={{ animationDelay: "0.1s" }} />
    </div>
  );
}

function RestaurantRow({ restaurant }: { restaurant: RestaurantDetail }) {
  const platformKeys = Object.keys(restaurant.platforms);
  const router = useRouter();

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-4 border-b border-[var(--color-border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--color-surface-overlay)]/50 -mx-3 px-3 rounded-lg transition-colors"
      onClick={() => router.push(`/?q=${encodeURIComponent(restaurant.name)}`)}
      role="link"
      tabIndex={0}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-gold)] transition-colors">
          {restaurant.name}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{restaurant.address}</p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0 sm:text-right">
        {platformKeys.map((key) => {
          const display = PLATFORM_DISPLAY[key] ?? { label: key, color: "bg-gray-50", textColor: "text-gray-600", ringColor: "ring-gray-200" };
          const deal = restaurant.platforms[key]?.deal;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full ${display.color} px-2.5 py-0.5 text-xs font-semibold ${display.textColor} ring-1 ${display.ringColor}`}>
                {display.label}
              </span>
              {deal && (
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {deal}
                </span>
              )}
            </div>
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
  const [restaurants, setRestaurants] = useState<RestaurantDetail[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [totalRestaurants, setTotalRestaurants] = useState(0);

  useEffect(() => {
    fetch("/api/browse")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load neighborhoods");
        return r.json();
      })
      .then((data) => {
        setNeighborhoods(data.neighborhoods ?? []);
        setTotalRestaurants(data.totalRestaurants ?? 0);
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

  const filteredNeighborhoods = useMemo(() => {
    if (!searchFilter.trim()) return neighborhoods;
    const q = searchFilter.toLowerCase();
    return neighborhoods.filter((n) => n.name.toLowerCase().includes(q));
  }, [neighborhoods, searchFilter]);

  const filteredRestaurants = useMemo(() => {
    if (!platformFilter) return restaurants;
    return restaurants.filter((r) => platformFilter in r.platforms);
  }, [restaurants, platformFilter]);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-14 sm:py-20">
        <div className="mb-10 animate-title-reveal">
          <h1 className="text-3xl sm:text-5xl font-black text-[var(--color-text-primary)] tracking-tighter">
            Browse by Neighborhood
          </h1>
          <div className="h-1 rounded-full bg-gradient-to-r from-[#ff6b35] via-[#ec4899] to-[#8b5cf6] animate-line-grow mt-5 mb-5"></div>
          <p className="text-[var(--color-text-secondary)] max-w-lg">
            {totalRestaurants > 0
              ? `${totalRestaurants.toLocaleString()} restaurants with verified deals across NYC.`
              : "Explore restaurants with active deals near you."}{" "}
            Tap a neighborhood to see restaurants and their deals.
          </p>
        </div>

        {/* Search + platform filter */}
        {!loading && !error && neighborhoods.length > 0 && (
          <div className="mb-8 flex flex-col sm:flex-row gap-3 animate-fade-in">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter neighborhoods..."
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
            />
            <div className="flex gap-2">
              {Object.entries(PLATFORM_DISPLAY).map(([key, display]) => (
                <button
                  key={key}
                  onClick={() => setPlatformFilter(platformFilter === key ? null : key)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ring-1 ${
                    platformFilter === key
                      ? `${display.color} ${display.textColor} ${display.ringColor}`
                      : "bg-white text-[var(--color-text-muted)] ring-[var(--color-border)] hover:ring-[var(--color-gold)]/50"
                  }`}
                >
                  {display.label}
                </button>
              ))}
              {platformFilter && (
                <button
                  onClick={() => setPlatformFilter(null)}
                  className="rounded-full px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-[var(--color-error)]/20 bg-[var(--color-error-dim)] p-5 text-sm text-[var(--color-error)] animate-fade-in">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetch("/api/browse")
                  .then((r) => r.json())
                  .then((data) => {
                    setNeighborhoods(data.neighborhoods ?? []);
                    setTotalRestaurants(data.totalRestaurants ?? 0);
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

        {loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <NeighborhoodSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && !error && filteredNeighborhoods.length === 0 && (
          <div className="text-center py-16">
            {searchFilter ? (
              <p className="text-[var(--color-text-secondary)]">No neighborhoods matching &ldquo;{searchFilter}&rdquo;</p>
            ) : (
              <p className="text-[var(--color-text-secondary)]">No neighborhoods available yet. Check back soon!</p>
            )}
          </div>
        )}

        {!loading && !error && filteredNeighborhoods.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredNeighborhoods.map((n, i) => {
              const isExpanded = expanded === n.slug;
              return (
                <div
                  key={n.slug}
                  className={`animate-fade-in-up stagger-${Math.min(i + 1, 8)} ${isExpanded ? "sm:col-span-2 lg:col-span-3" : ""}`}
                >
                  <button
                    onClick={() => handleNeighborhoodClick(n.slug)}
                    className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-300 ${
                      isExpanded
                        ? "border-[var(--color-gold)]/40 bg-gradient-to-br from-orange-50 to-white shadow-lg shadow-orange-100/50"
                        : "border-[var(--color-border)] bg-white hover:border-[var(--color-gold)]/30 hover:shadow-lg hover:shadow-orange-50 hover:scale-[1.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                        {n.name}
                      </h2>
                      <span className={`text-xs transition-transform duration-200 text-[var(--color-text-muted)] ${isExpanded ? "rotate-180" : ""}`}>
                        ▼
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-gold)] font-semibold">
                      {n.restaurantCount} restaurant{n.restaurantCount !== 1 ? "s" : ""} with deals
                    </p>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-white p-5 animate-fade-in">
                      {/* Platform filter within expanded */}
                      {platformFilter && (
                        <p className="text-xs text-[var(--color-text-muted)] mb-3">
                          Showing {filteredRestaurants.length} of {restaurants.length} restaurants
                          {platformFilter && ` on ${PLATFORM_DISPLAY[platformFilter]?.label ?? platformFilter}`}
                        </p>
                      )}
                      {loadingRestaurants ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="flex gap-4 py-3">
                              <div className="flex-1 space-y-2">
                                <div className="h-4 w-40 rounded skeleton-card" />
                                <div className="h-3 w-56 rounded skeleton-card" style={{ animationDelay: "0.1s" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredRestaurants.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                          {platformFilter ? "No restaurants match this filter." : "No restaurant data available."}
                        </p>
                      ) : (
                        <div>
                          {filteredRestaurants.map((r) => (
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
