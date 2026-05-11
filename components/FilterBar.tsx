"use client";

import { useState, useCallback } from "react";

export type RewardFilter = "all" | "cashback" | "points" | "discounts" | "app-rewards";
export type SortOption = "relevance" | "name";

export interface FilterState {
  rewardType: RewardFilter;
  sortBy: SortOption;
  cardFreeOnly: boolean;
}

const REWARD_PILLS: { value: RewardFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cashback", label: "Cashback" },
  { value: "points", label: "Points/Miles" },
  { value: "discounts", label: "Discounts" },
  { value: "app-rewards", label: "App Rewards" },
];

const STORAGE_KEY = "eatdiscounted-filters";
const DEFAULT_FILTERS: FilterState = {
  rewardType: "all",
  sortBy: "relevance",
  cardFreeOnly: false,
};

function loadFilters(): FilterState {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_FILTERS;
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_FILTERS, ...parsed };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function saveFilters(filters: FilterState) {
  if (typeof window === "undefined") return;
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
  const [filters, setFilters] = useState<FilterState>(loadFilters);

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
    <div className="mb-5 space-y-3 animate-fade-in" aria-label="Filter search results">
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
            className="touch-target inline-flex items-center rounded-xl px-3 text-xs font-bold text-[var(--color-text-muted)] transition-colors hover:bg-white hover:text-[var(--color-accent)]"
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
              className={`touch-target shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ring-1 ${
                isActive
                  ? "bg-[var(--color-accent)] text-white ring-[var(--color-accent)]/40"
                  : "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] ring-[var(--color-border)] hover:text-[var(--color-text-secondary)] hover:ring-[var(--color-border)]"
              }`}
              aria-pressed={isActive}
              aria-label={`Show ${pill.label.toLowerCase()} rewards`}
            >
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
            aria-label="Sort search results"
            className="min-h-11 rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)]/15"
          >
            <option value="relevance">Relevance</option>
            <option value="name">Platform (A–Z)</option>
          </select>
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">No card required</span>
          <button
            role="switch"
            aria-checked={filters.cardFreeOnly}
            aria-label="Show only rewards that do not require a linked card"
            onClick={() => onChange({ ...filters, cardFreeOnly: !filters.cardFreeOnly })}
            className={`touch-target relative inline-flex h-11 w-14 shrink-0 items-center rounded-full transition-colors duration-200 ${
              filters.cardFreeOnly
                ? "bg-[var(--color-accent)]"
                : "bg-[var(--color-surface-overlay)] ring-1 ring-[var(--color-border)]"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                filters.cardFreeOnly ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
}
