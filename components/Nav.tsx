"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFavoritesOptional } from "@/hooks/useFavorites";

export function Nav() {
  const pathname = usePathname();
  const { favorites } = useFavoritesOptional();
  const count = favorites.length;

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--color-border)]/60 nav-glass" aria-label="Main navigation">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="text-lg font-black text-[var(--color-text-primary)] hover:opacity-80 transition-opacity duration-300 tracking-tight">
          <span className="text-accent-gradient">Eat</span>Discounted
        </Link>
        <div className="flex gap-5 text-sm">
          <Link
            href="/"
            className={`transition-colors duration-200 ${pathname === "/" ? "text-[var(--color-gold)] font-semibold" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}
            {...(pathname === "/" ? { "aria-current": "page" as const } : {})}
          >
            Search
          </Link>
          <Link
            href="/platforms"
            className={`transition-colors duration-200 ${pathname === "/platforms" ? "text-[var(--color-gold)] font-semibold" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}
            {...(pathname === "/platforms" ? { "aria-current": "page" as const } : {})}
          >
            Platforms
          </Link>
          <Link
            href="/browse"
            className={`transition-colors duration-200 ${pathname === "/browse" ? "text-[var(--color-gold)] font-semibold" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}
            {...(pathname === "/browse" ? { "aria-current": "page" as const } : {})}
          >
            Browse
          </Link>
          <Link
            href="/favorites"
            className={`relative transition-colors duration-200 ${pathname === "/favorites" ? "text-[var(--color-gold)] font-semibold" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}
            {...(pathname === "/favorites" ? { "aria-current": "page" as const } : {})}
          >
            Favorites
            {count > 0 && (
              <span className="absolute -top-2 -right-4 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ec4899] text-[10px] font-bold text-white leading-none shadow-sm">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
          <Link
            href="/about"
            className={`transition-colors duration-200 ${pathname === "/about" ? "text-[var(--color-gold)] font-semibold" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"}`}
            {...(pathname === "/about" ? { "aria-current": "page" as const } : {})}
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}
