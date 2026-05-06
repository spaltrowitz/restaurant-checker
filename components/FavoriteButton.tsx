"use client";

import { useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";

interface FavoriteButtonProps {
  name: string;
}

export function FavoriteButton({ name }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [animating, setAnimating] = useState(false);
  const favorited = isFavorite(name);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setAnimating(true);
    toggleFavorite(name);
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={favorited ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
      aria-pressed={favorited}
      className={`absolute top-3 right-3 z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
        favorited
          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
          : "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10"
      } ${animating ? "scale-125" : "scale-100"}`}
    >
      <span className={`text-lg leading-none transition-transform duration-300 ${animating ? "scale-125" : "scale-100"}`}>
        {favorited ? "❤️" : "♡"}
      </span>
    </button>
  );
}
