"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { useFavorites } from "@/hooks/useFavorites";

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

interface Borough {
  name: string;
  totalRestaurants: number;
  neighborhoods: Neighborhood[];
}

const PLATFORM_DISPLAY: Record<string, { label: string; className: string }> = {
  "bilt": { label: "Bilt", className: "bg-[var(--color-result-tier2-dim)] text-[var(--color-result-tier2)] ring-[var(--color-result-tier2)]/20" },
  "rewards-network": { label: "Rewards Network", className: "bg-[var(--color-result-tier2-dim)] text-[var(--color-result-tier2)] ring-[var(--color-result-tier2)]/20" },
  "upside": { label: "Upside", className: "bg-[var(--color-result-tier1-dim)] text-[var(--color-result-tier1)] ring-[var(--color-result-tier1)]/20" },
};

function RestaurantRow({ restaurant }: { restaurant: RestaurantDetail }) {
  const [expanded, setExpanded] = useState(false);
  const platformKeys = Object.keys(restaurant.platforms);
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(restaurant.name);
  const panelId = `restaurant-${restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <article className="border-b border-[var(--color-border-subtle)] py-3 last:border-0">
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(restaurant.name); }}
          className={`touch-target -ml-2 shrink-0 rounded-full text-lg transition-colors ${saved ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"}`}
          aria-label={saved ? `Remove ${restaurant.name} from favorites` : `Save ${restaurant.name} to favorites`}
          aria-pressed={saved}
        >
          {saved ? "★" : "☆"}
        </button>
        <button
          type="button"
          className="touch-target flex min-w-0 flex-1 items-start justify-between gap-3 rounded-2xl px-2 py-2 text-left transition-all hover:bg-[var(--color-surface-overlay)]/70"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={panelId}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-[var(--color-text-primary)]">
              {restaurant.name}
            </span>
            <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">{restaurant.address}</span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              {platformKeys.map((key) => {
                const display = PLATFORM_DISPLAY[key] ?? { label: key, className: "bg-white text-[var(--color-text-secondary)] ring-[var(--color-border)]" };
                const deal = restaurant.platforms[key]?.deal;
                return (
                  <span key={key} className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${display.className}`}>
                    <span>{display.label}</span>
                    {deal ? <span className="max-w-36 truncate opacity-90">: {deal}</span> : null}
                  </span>
                );
              })}
            </span>
          </span>
          <span className={`mt-1 text-xs text-[var(--color-text-muted)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true">▼</span>
        </button>
      </div>

      {expanded && (
        <div id={panelId} className="ml-10 mt-2 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm animate-fade-in">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Available here</p>
          <div className="mt-3 grid gap-3">
            {platformKeys.map((key) => {
              const display = PLATFORM_DISPLAY[key] ?? { label: key, className: "bg-white text-[var(--color-text-secondary)] ring-[var(--color-border)]" };
              const platform = restaurant.platforms[key];
              return (
                <div key={key} className="rounded-xl bg-[var(--color-surface)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-[var(--color-text-primary)]">{display.label}</p>
                      <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{platform.deal || "Deal available"}</p>
                    </div>
                    <a
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="touch-target inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-[var(--color-accent)] ring-1 ring-[var(--color-border)] transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      Open {display.label} →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href={`/?q=${encodeURIComponent(restaurant.name)}`}
            className="touch-target mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-orange-900/10 transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-auto"
          >
            Check all platforms for {restaurant.name}
          </Link>
        </div>
      )}
    </article>
  );
}

export default function BrowsePage() {
  const [boroughs, setBoroughs] = useState<Borough[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBorough, setSelectedBorough] = useState<string | null>(null);
  const [expandedNeighborhood, setExpandedNeighborhood] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantDetail[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    fetch("/api/browse")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        setBoroughs(data.boroughs ?? []);
        setTotalRestaurants(data.totalRestaurants ?? 0);
        setLoading(false);
      })
      .catch(() => {
        setError("Couldn't load neighborhoods. Please try again.");
        setLoading(false);
      });
  }, []);

  const handleNeighborhoodClick = useCallback(async (slug: string) => {
    if (expandedNeighborhood === slug) {
      setExpandedNeighborhood(null);
      setRestaurants([]);
      return;
    }
    setExpandedNeighborhood(slug);
    setRestaurants([]);
    setLoadingRestaurants(true);
    try {
      const resp = await fetch(`/api/browse?neighborhood=${encodeURIComponent(slug)}`);
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      setRestaurants(data.restaurants ?? []);
    } catch {
      setRestaurants([]);
    } finally {
      setLoadingRestaurants(false);
    }
  }, [expandedNeighborhood]);

  const currentBorough = boroughs.find((b) => b.name === selectedBorough);

  const filteredNeighborhoods = useMemo(() => {
    if (!currentBorough) return [];
    if (!searchFilter.trim()) return currentBorough.neighborhoods;
    const q = searchFilter.toLowerCase();
    return currentBorough.neighborhoods.filter((n) => n.name.toLowerCase().includes(q));
  }, [currentBorough, searchFilter]);

  return (
    <>
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:py-18">
        <div className="mb-10 animate-title-reveal">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Discovery path</p>
          <h1 className="text-4xl sm:text-5xl font-black text-[var(--color-text-primary)] tracking-tighter">
            Browse verified neighborhood deals
          </h1>
          <div className="brand-rule animate-line-grow mt-5 mb-5 max-w-28"></div>
          <p className="text-[var(--color-text-secondary)] max-w-2xl">
            {totalRestaurants > 0
              ? `${totalRestaurants.toLocaleString()} restaurants with verified primary deals across NYC. Pick a borough, choose a neighborhood, then open a restaurant card for deal details.`
              : "Explore restaurants with active deals near you."}
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-[var(--color-error)]/20 bg-[var(--color-error-dim)] p-5 text-sm text-[var(--color-error)] animate-fade-in">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="touch-target mt-3 inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-[var(--color-error)] ring-1 ring-[var(--color-error)]/20"
            >
              Try again
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
                <div className="h-6 w-28 rounded skeleton-card mb-2" />
                <div className="h-4 w-20 rounded skeleton-card" />
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Borough selection */}
        {!loading && !error && !selectedBorough && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
            {boroughs.map((b, i) => (
              <button
                key={b.name}
                onClick={() => { setSelectedBorough(b.name); setExpandedNeighborhood(null); setSearchFilter(""); }}
                 className={`text-left rounded-2xl border-2 border-[var(--color-border)] bg-white p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[var(--color-accent)]/40 hover:shadow-lg hover:shadow-orange-900/5 animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
              >
                <h2 className="text-xl font-black text-[var(--color-text-primary)]">{b.name}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {b.neighborhoods.length} neighborhood{b.neighborhoods.length !== 1 ? "s" : ""}
                </p>
               <p className="mt-0.5 text-xs text-[var(--color-accent)] font-semibold">
                  {b.totalRestaurants} restaurant{b.totalRestaurants !== 1 ? "s" : ""} with deals
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Neighborhoods within a borough */}
        {!loading && !error && selectedBorough && currentBorough && (
          <div className="animate-fade-in">
            <button
              onClick={() => { setSelectedBorough(null); setExpandedNeighborhood(null); setRestaurants([]); setSearchFilter(""); }}
              className="touch-target mb-6 inline-flex items-center rounded-xl text-sm font-bold text-[var(--color-accent)] transition-colors hover:underline"
            >
              ← All boroughs
            </button>

            <h2 className="text-2xl font-black text-[var(--color-text-primary)] mb-1">{currentBorough.name}</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              {currentBorough.totalRestaurants} restaurants across {currentBorough.neighborhoods.length} neighborhoods
            </p>

            {currentBorough.neighborhoods.length > 6 && (
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                aria-label="Filter neighborhoods"
                placeholder="Filter neighborhoods..."
                className="mb-6 min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm transition-all placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)]/15"
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredNeighborhoods.map((n) => {
                const isExpanded = expandedNeighborhood === n.slug;
                return (
                  <div key={n.slug} className={isExpanded ? "sm:col-span-2" : ""}>
                    <button
                      onClick={() => handleNeighborhoodClick(n.slug)}
                      aria-expanded={isExpanded}
                      className={`touch-target w-full text-left rounded-2xl border-2 p-5 transition-all duration-300 ${
                        isExpanded
                          ? "border-[var(--color-accent)]/40 bg-gradient-to-br from-[var(--color-surface-overlay)] to-white shadow-lg shadow-orange-900/5"
                          : "border-[var(--color-border)] bg-white hover:border-[var(--color-accent)]/30 hover:shadow-md hover:shadow-orange-900/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-[var(--color-text-primary)]">{n.name}</h3>
                        <span className={`text-xs text-[var(--color-text-muted)] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--color-accent)] font-semibold">
                        {n.restaurantCount} restaurant{n.restaurantCount !== 1 ? "s" : ""}
                      </p>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 rounded-2xl border border-[var(--color-border)] bg-white p-4 animate-fade-in shadow-sm">
                        {loadingRestaurants ? (
                          <div className="space-y-3 py-2">
                            {Array.from({ length: 3 }).map((_, j) => (
                              <div key={j} className="h-10 rounded skeleton-card" style={{ animationDelay: `${j * 0.1}s` }} />
                            ))}
                          </div>
                        ) : restaurants.length === 0 ? (
                          <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">No data available.</p>
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
          </div>
        )}
      </main>
    </>
  );
}
