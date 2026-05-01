"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();

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
