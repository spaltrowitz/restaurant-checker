"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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

const PLATFORM_DISPLAY: Record<string, { label: string; color: string; textColor: string; ringColor: string }> = {
  "bilt": { label: "Bilt", color: "bg-blue-50", textColor: "text-blue-700", ringColor: "ring-blue-200" },
  "rewards-network": { label: "Rewards Network", color: "bg-sky-50", textColor: "text-sky-700", ringColor: "ring-sky-200" },
  "upside": { label: "Upside", color: "bg-green-50", textColor: "text-green-700", ringColor: "ring-green-200" },
};

function RestaurantRow({ restaurant }: { restaurant: RestaurantDetail }) {
  const platformKeys = Object.keys(restaurant.platforms);
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(restaurant.name);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--color-border-subtle)] last:border-0">
      <button
        onClick={(e) => { e.stopPropagation(); toggleFavorite(restaurant.name); }}
        className={`mt-1 shrink-0 text-sm transition-colors ${saved ? "text-orange-500" : "text-[var(--color-text-muted)] hover:text-orange-400"}`}
        aria-label={saved ? "Remove from favorites" : "Save to favorites"}
      >
        {saved ? "★" : "☆"}
      </button>
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => router.push(`/?q=${encodeURIComponent(restaurant.name)}`)}
        role="link"
        tabIndex={0}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[var(--color-text-primary)] hover:text-[var(--color-gold)] transition-colors truncate">
              {restaurant.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{restaurant.address}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {platformKeys.map((key) => {
              const display = PLATFORM_DISPLAY[key] ?? { label: key, color: "bg-gray-50", textColor: "text-gray-600", ringColor: "ring-gray-200" };
              const deal = restaurant.platforms[key]?.deal;
              return (
                <span key={key} className={`inline-flex items-center gap-1 rounded-full ${display.color} px-2 py-0.5 text-[11px] font-semibold ${display.textColor} ring-1 ${display.ringColor}`}>
                  {display.label}{deal ? `: ${deal}` : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
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
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-14 sm:py-20">
        <div className="mb-10 animate-title-reveal">
          <h1 className="text-3xl sm:text-5xl font-black text-[var(--color-text-primary)] tracking-tighter">
            Browse Deals
          </h1>
          <div className="h-1 rounded-full bg-gradient-to-r from-[#ff6b35] via-[#ec4899] to-[#8b5cf6] animate-line-grow mt-5 mb-5"></div>
          <p className="text-[var(--color-text-secondary)] max-w-lg">
            {totalRestaurants > 0
              ? `${totalRestaurants.toLocaleString()} restaurants with verified deals across NYC.`
              : "Explore restaurants with active deals near you."}
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-[var(--color-error)]/20 bg-[var(--color-error-dim)] p-5 text-sm text-[var(--color-error)] animate-fade-in">
            <p>{error}</p>
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
                className={`text-left rounded-2xl border-2 border-[var(--color-border)] bg-white p-6 transition-all duration-300 hover:border-[var(--color-gold)]/40 hover:shadow-lg hover:shadow-orange-50 hover:scale-[1.02] animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}
              >
                <h2 className="text-xl font-black text-[var(--color-text-primary)]">{b.name}</h2>
                <p className="mt-1 text-sm text-[var(--color-gold)] font-semibold">
                  {b.totalRestaurants} restaurants · {b.neighborhoods.length} neighborhoods
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
              className="mb-6 text-sm font-medium text-[var(--color-gold)] hover:underline transition-colors"
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
                placeholder="Filter neighborhoods..."
                className="w-full mb-6 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredNeighborhoods.map((n) => {
                const isExpanded = expandedNeighborhood === n.slug;
                return (
                  <div key={n.slug} className={isExpanded ? "sm:col-span-2" : ""}>
                    <button
                      onClick={() => handleNeighborhoodClick(n.slug)}
                      className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-300 ${
                        isExpanded
                          ? "border-[var(--color-gold)]/40 bg-gradient-to-br from-orange-50 to-white shadow-lg shadow-orange-100/50"
                          : "border-[var(--color-border)] bg-white hover:border-[var(--color-gold)]/30 hover:shadow-md hover:shadow-orange-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-[var(--color-text-primary)]">{n.name}</h3>
                        <span className={`text-xs text-[var(--color-text-muted)] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--color-gold)] font-semibold">
                        {n.restaurantCount} restaurant{n.restaurantCount !== 1 ? "s" : ""}
                      </p>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 rounded-2xl border border-[var(--color-border)] bg-white p-4 animate-fade-in">
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
