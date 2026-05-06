"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFavoritesOptional } from "@/hooks/useFavorites";

export function Nav() {
  const pathname = usePathname();
  const { favorites } = useFavoritesOptional();
  const count = favorites.length;

  return (
    <nav className="border-b border-[var(--color-border)] bg-[var(--color-surface)]" aria-label="Main navigation">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-[var(--color-text-primary)] hover:text-[var(--color-gold)] transition-colors">
          <span className="text-[var(--color-gold)]">Eat</span>Discounted
        </Link>
        <div className="flex gap-6 text-sm">
          <Link
            href="/"
            className={`transition-colors ${pathname === "/" ? "text-[var(--color-gold)] font-medium" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
            {...(pathname === "/" ? { "aria-current": "page" as const } : {})}
          >
            Search
          </Link>
          <Link
            href="/platforms"
            className={`transition-colors ${pathname === "/platforms" ? "text-[var(--color-gold)] font-medium" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
            {...(pathname === "/platforms" ? { "aria-current": "page" as const } : {})}
          >
            Platforms
          </Link>
          <Link
            href="/browse"
            className={`transition-colors ${pathname === "/browse" ? "text-[var(--color-gold)] font-medium" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
            {...(pathname === "/browse" ? { "aria-current": "page" as const } : {})}
          >
            Browse
          </Link>
          <Link
            href="/favorites"
            className={`relative transition-colors ${pathname === "/favorites" ? "text-[var(--color-gold)] font-medium" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
            {...(pathname === "/favorites" ? { "aria-current": "page" as const } : {})}
          >
            ❤️ Favorites
            {count > 0 && (
              <span className="absolute -top-2 -right-4 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
          <Link
            href="/about"
            className={`transition-colors ${pathname === "/about" ? "text-[var(--color-gold)] font-medium" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
            {...(pathname === "/about" ? { "aria-current": "page" as const } : {})}
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}
