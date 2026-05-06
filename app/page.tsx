import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { PopularSearches } from "@/components/PopularSearches";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:py-24">
        <div className="text-center mb-14 hero-gradient pt-4 pb-8">
          <div className="mb-5">
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-[var(--color-text-primary)] mb-3">
              <span className="text-[var(--color-gold)]">Eat</span>Discounted
            </h1>
            <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent mx-auto opacity-50 mb-5"></div>
          </div>
          <p className="text-xl sm:text-2xl font-light text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed mb-3">
            Check <span className="text-[var(--color-gold)] font-medium">12+ reward programs</span> in seconds
          </p>
          <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
            Airline miles · Hotel points · Cashback · Dining credits — one search, every deal
          </p>
        </div>
        <div className="mt-6">
          <SearchBar />
        </div>
        <SearchResults />
        <PopularSearches />
      </main>
      <footer className="border-t border-[var(--color-border)] footer-gradient">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-gold)]">Eat</span>Discounted
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                NYC Dining Rewards Finder — 10 platforms, 12+ programs
              </p>
            </div>
            <div className="flex gap-6 text-xs text-[var(--color-text-muted)]">
              <Link href="/about" className="hover:text-[var(--color-text-secondary)] transition-colors">About</Link>
              <Link href="/platforms" className="hover:text-[var(--color-text-secondary)] transition-colors">Platforms</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
