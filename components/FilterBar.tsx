"use client";

import { useEffect, useState, useCallback } from "react";

export type RewardFilter = "all" | "cashback" | "points" | "discounts" | "app-rewards";
export type SortOption = "relevance" | "name";

export interface FilterState {
  rewardType: RewardFilter;
  sortBy: SortOption;
  cardFreeOnly: boolean;
}

const REWARD_PILLS: { value: RewardFilter; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "" },
  { value: "cashback", label: "Cashback", emoji: "💵" },
  { value: "points", label: "Points/Miles", emoji: "✈️" },
  { value: "discounts", label: "Discounts", emoji: "🏷️" },
  { value: "app-rewards", label: "App Rewards", emoji: "📱" },
];

const STORAGE_KEY = "eatdiscounted-filters";

function loadFilters(): FilterState {
  const defaults: FilterState = { rewardType: "all", sortBy: "relevance", cardFreeOnly: false };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function saveFilters(filters: FilterState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // storage full or unavailable
  }
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function useFilterState(): [FilterState, (f: FilterState) => void] {
  const [filters, setFilters] = useState<FilterState>({
    rewardType: "all",
    sortBy: "relevance",
    cardFreeOnly: false,
  });

  useEffect(() => {
    setFilters(loadFilters());
  }, []);

  const updateFilters = useCallback((next: FilterState) => {
    setFilters(next);
    saveFilters(next);
  }, []);

  return [filters, updateFilters];
}

export function getActiveFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.rewardType !== "all") count++;
  if (filters.sortBy !== "relevance") count++;
  if (filters.cardFreeOnly) count++;
  return count;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const activeCount = getActiveFilterCount(filters);

  return (
    <div className="mb-5 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Filters</p>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-[var(--color-gold)]/20 px-1.5 text-xs font-bold text-[var(--color-gold)]">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={() => onChange({ rewardType: "all", sortBy: "relevance", cardFreeOnly: false })}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Reward type pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {REWARD_PILLS.map((pill) => {
          const isActive = filters.rewardType === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => onChange({ ...filters, rewardType: pill.value })}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ring-1 ${
                isActive
                  ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)] ring-[var(--color-gold)]/40"
                  : "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] ring-[var(--color-border)] hover:text-[var(--color-text-secondary)] hover:ring-[var(--color-border)]"
              }`}
              aria-pressed={isActive}
            >
              {pill.emoji && <span>{pill.emoji}</span>}
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Sort + Card-free toggle row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs text-[var(--color-text-muted)]">Sort:</label>
          <select
            id="sort-select"
            value={filters.sortBy}
            onChange={(e) => onChange({ ...filters, sortBy: e.target.value as SortOption })}
            className="rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]/50"
          >
            <option value="relevance">Relevance</option>
            <option value="name">Platform (A–Z)</option>
          </select>
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-[var(--color-text-muted)]">No card required</span>
          <button
            role="switch"
            aria-checked={filters.cardFreeOnly}
            onClick={() => onChange({ ...filters, cardFreeOnly: !filters.cardFreeOnly })}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
              filters.cardFreeOnly
                ? "bg-[var(--color-gold)]"
                : "bg-[var(--color-surface-overlay)] ring-1 ring-[var(--color-border)]"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ${
                filters.cardFreeOnly ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}
