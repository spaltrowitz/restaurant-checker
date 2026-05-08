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
            Find every deal, discount &amp; reward at any NYC restaurant
          </p>
          <div className="flex items-center justify-center gap-2.5 flex-wrap animate-badge-pop" style={{ animationDelay: "0.7s" }}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3.5 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
              4 verified APIs
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
              8 airline programs
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-orange-700 ring-1 ring-orange-200">
              Cashback &amp; points
            </span>
          </div>
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
