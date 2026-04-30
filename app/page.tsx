import { Nav } from "@/components/Nav";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { PopularSearches } from "@/components/PopularSearches";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="text-center text-3xl font-bold">🔍 EatDiscounted</h1>
        <p className="mt-2 text-center text-gray-500">
          Never miss a deal where you&apos;re already eating
        </p>
        <div className="mt-8">
          <SearchBar />
        </div>
        <SearchResults />
        <PopularSearches />
      </main>
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        Uses public sitemaps &amp; web search only. No private APIs.
        For personal use.
      </footer>
    </>
  );
}
