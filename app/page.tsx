import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-20 sm:py-28">
        <div className="text-center mb-16 hero-gradient pt-6 pb-10 relative">
          <div className="mb-6 animate-title-reveal">
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-[var(--color-text-primary)] mb-4 leading-[0.95]">
              <span className="text-accent-gradient">Eat</span>Discounted
            </h1>
            <div className="h-1 rounded-full bg-gradient-to-r from-[#ff6b35] via-[#ec4899] to-[#8b5cf6] mx-auto animate-line-grow mb-6"></div>
          </div>
          <p className="text-lg sm:text-2xl font-medium text-[var(--color-text-secondary)] max-w-lg mx-auto leading-relaxed mb-5 animate-badge-pop">
            Search <span className="text-[var(--color-text-primary)] font-bold">12+ programs</span> for deals at any NYC restaurant
          </p>
        </div>
        <div className="mt-8">
          <SearchBar />
        </div>
        <SearchResults />
      </main>
      <footer className="border-t border-[var(--color-border)]/60 footer-gradient">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="text-center sm:text-left">
              <p className="text-sm font-black text-[var(--color-text-primary)] tracking-tight">
                <span className="text-accent-gradient">Eat</span>Discounted
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                NYC Dining Rewards Intelligence
              </p>
            </div>
            <div className="flex gap-6 text-xs font-medium text-[var(--color-text-muted)]">
              <Link href="/about" className="hover:text-[var(--color-gold)] transition-colors duration-200">About</Link>
              <Link href="/platforms" className="hover:text-[var(--color-gold)] transition-colors duration-200">Platforms</Link>
              <Link href="/browse" className="hover:text-[var(--color-gold)] transition-colors duration-200">Browse</Link>
              <Link href="/privacy" className="hover:text-[var(--color-gold)] transition-colors duration-200">Privacy</Link>
              <Link href="/terms" className="hover:text-[var(--color-gold)] transition-colors duration-200">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
