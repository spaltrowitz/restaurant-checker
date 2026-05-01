import { Nav } from "@/components/Nav";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { PopularSearches } from "@/components/PopularSearches";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <div className="mb-6">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-[var(--color-text-primary)] mb-4">
              <span className="text-[var(--color-gold)]">Eat</span>Discounted
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent mx-auto opacity-30"></div>
          </div>
          <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] max-w-lg mx-auto">
            Never miss a deal where you&apos;re already eating
          </p>
        </div>
        <div className="mt-8">
          <SearchBar />
        </div>
        <SearchResults />
        <PopularSearches />
      </main>
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-text-muted)]">
        Uses public sitemaps &amp; web search only. No private APIs.
        For personal use.
      </footer>
    </>
  );
}
