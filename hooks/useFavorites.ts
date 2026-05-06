"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { ReactNode } from "react";
import React from "react";

const STORAGE_KEY = "eatdiscounted:favorites";

interface FavoritesContextValue {
  favorites: string[];
  isFavorite: (name: string) => boolean;
  toggleFavorite: (name: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readLocalStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalStorage(favorites: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // storage full or unavailable
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(readLocalStorage);
  const syncedRef = useRef(false);

  // Sync from API on mount
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;

    fetch("/api/favorites")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.favorites && Array.isArray(data.favorites)) {
          setFavorites(data.favorites);
          writeLocalStorage(data.favorites);
        }
      })
      .catch(() => {
        // offline — localStorage cache is fine
      });
  }, []);

  // Persist to localStorage whenever favorites change
  useEffect(() => {
    writeLocalStorage(favorites);
  }, [favorites]);

  const isFavorite = useCallback(
    (name: string) => favorites.includes(name),
    [favorites]
  );

  const toggleFavorite = useCallback((name: string) => {
    setFavorites((prev) => {
      const removing = prev.includes(name);
      const next = removing ? prev.filter((n) => n !== name) : [name, ...prev];

      const method = removing ? "DELETE" : "POST";
      fetch("/api/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).catch(() => {
        setFavorites((current) =>
          removing
            ? [name, ...current]
            : current.filter((n) => n !== name)
        );
      });

      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite }),
    [favorites, isFavorite, toggleFavorite]
  );

  return React.createElement(FavoritesContext.Provider, { value }, children);
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return ctx;
}

const NOOP_CONTEXT: FavoritesContextValue = {
  favorites: [],
  isFavorite: () => false,
  toggleFavorite: () => {},
};

export function useFavoritesOptional(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  return ctx ?? NOOP_CONTEXT;
}
