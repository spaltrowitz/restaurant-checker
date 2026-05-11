"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useFavoritesOptional } from "@/hooks/useFavorites";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { favorites } = useFavoritesOptional();
  const count = favorites.length;
  const linkClass = (href: string, extra = "") =>
    `touch-target inline-flex items-center rounded-full px-3 text-sm font-semibold transition-all duration-200 ${
      pathname === href
        ? "bg-[var(--color-accent)] text-white shadow-sm shadow-orange-900/10"
        : "text-[var(--color-text-secondary)] hover:bg-white/70 hover:text-[var(--color-text-primary)]"
    } ${extra}`;

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--color-border)]/60 nav-glass" aria-label="Main navigation">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          aria-label="Go to EatDiscounted homepage"
          onClick={(event) => {
            event.preventDefault();
            router.replace("/");
          }}
          className="touch-target inline-flex items-center text-lg font-black text-[var(--color-text-primary)] hover:opacity-80 transition-opacity duration-300 tracking-tight"
        >
          <span className="text-accent-gradient">Eat</span>Discounted
        </Link>
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide" aria-label="Primary">
          <Link
            href="/"
            onClick={(event) => {
              event.preventDefault();
              router.replace("/");
            }}
            className={linkClass("/")}
            {...(pathname === "/" ? { "aria-current": "page" as const } : {})}
          >
            Search
          </Link>
          <Link
            href="/browse"
            className={linkClass("/browse")}
            {...(pathname === "/browse" ? { "aria-current": "page" as const } : {})}
          >
            Browse neighborhoods
          </Link>
          <Link
            href="/favorites"
            className={linkClass("/favorites", "relative")}
            {...(pathname === "/favorites" ? { "aria-current": "page" as const } : {})}
          >
            Favorites
            {count > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-rose)] px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
          <Link
            href="/platforms"
            className={linkClass("/platforms")}
            {...(pathname === "/platforms" ? { "aria-current": "page" as const } : {})}
          >
            Platforms
          </Link>
          <Link
            href="/about"
            className={linkClass("/about")}
            {...(pathname === "/about" ? { "aria-current": "page" as const } : {})}
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}
