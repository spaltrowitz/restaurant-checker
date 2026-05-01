import { Nav } from "@/components/Nav";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { PopularSearches } from "@/components/PopularSearches";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--color-text-primary)]">
            <span className="text-[var(--color-gold)]">Eat</span>Discounted
          </h1>
          <p className="mt-3 text-lg text-[var(--color-text-secondary)]">
            Never miss a deal where you&apos;re already eating
          </p>
        </div>
        <div className="mt-10">
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
