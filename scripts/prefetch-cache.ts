/**
 * Pre-fetch Brave Search results for popular NYC restaurants.
 * Stores results in data/search-cache.json for instant serving.
 *
 * Usage: npx tsx scripts/prefetch-cache.ts
 *
 * Rate-limits to 1 Brave API call per second.
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { POPULAR_NYC_RESTAURANTS } from "../data/popular-restaurants";
import { PLATFORMS } from "../lib/platforms";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";
const RATE_LIMIT_MS = 1000;
const CACHE_FILE = path.resolve(__dirname, "../data/search-cache.json");

type SearchResult = { title: string; href: string; snippet: string };

interface CacheEntry {
  restaurant: string;
  fetchedAt: string;
  platforms: Record<string, SearchResult[]>;
}

type SearchCache = Record<string, CacheEntry>;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function braveSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, count: "5" });
  const resp = await fetch(`${BRAVE_API_URL}?${params}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    const reason = await resp.text().catch(() => "");
    throw new Error(`Brave HTTP ${resp.status}: ${reason}`);
  }

  const data = await resp.json();
  const results: Array<{ title?: string; url?: string; description?: string }> =
    data?.web?.results || [];

  return results.slice(0, 5).map((r) => ({
    title: r.title ?? "",
    href: r.url ?? "",
    snippet: r.description ?? "",
  }));
}

// Platforms that use batchSearch (web search via Brave)
const WEB_SEARCH_PLATFORMS = PLATFORMS.filter(
  (p) =>
    p.name !== "Blackbird" &&
    p.name !== "Upside" &&
    p.name !== "Bilt Rewards" &&
    p.name !== "Rewards Network"
);

async function prefetchRestaurant(
  restaurant: string,
  apiKey: string
): Promise<CacheEntry> {
  const platforms: Record<string, SearchResult[]> = {};

  for (const platform of WEB_SEARCH_PLATFORMS) {
    const siteOp = platform.domainFilter ? ` site:${platform.domainFilter}` : "";
    const baseQuery = platform.searchQuery
      ? `"${restaurant}" ${platform.searchQuery}`
      : `"${restaurant}"`;
    const query = `${baseQuery}${siteOp}`;

    try {
      const results = await braveSearch(query, apiKey);
      platforms[platform.name] = results;
    } catch (err) {
      console.error(`  ✗ ${platform.name}: ${(err as Error).message}`);
      platforms[platform.name] = [];
    }

    await delay(RATE_LIMIT_MS);
  }

  return {
    restaurant,
    fetchedAt: new Date().toISOString(),
    platforms,
  };
}

async function main() {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    console.error("Error: BRAVE_SEARCH_API_KEY not set in .env.local");
    process.exit(1);
  }

  // Deduplicate restaurant list
  const restaurants = [...new Set(POPULAR_NYC_RESTAURANTS)];
  const platformCount = WEB_SEARCH_PLATFORMS.length;
  const totalCalls = restaurants.length * platformCount;

  console.log(`Pre-fetching ${restaurants.length} restaurants × ${platformCount} platforms = ${totalCalls} Brave API calls`);
  console.log(`Estimated time: ~${Math.ceil(totalCalls / 60)} minutes at 1 req/sec\n`);

  // Load existing cache for incremental updates
  let cache: SearchCache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      console.log(`Loaded existing cache with ${Object.keys(cache).length} entries\n`);
    } catch {
      console.log("Could not parse existing cache, starting fresh\n");
    }
  }

  let completed = 0;
  for (const restaurant of restaurants) {
    const key = restaurant.toLowerCase().trim();

    // Skip if cached within last 24 hours
    const existing = cache[key];
    if (existing) {
      const age = Date.now() - new Date(existing.fetchedAt).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        completed++;
        console.log(`[${completed}/${restaurants.length}] ⏭ ${restaurant} (cached ${Math.round(age / 3600000)}h ago)`);
        continue;
      }
    }

    completed++;
    console.log(`[${completed}/${restaurants.length}] 🔍 ${restaurant}`);

    try {
      cache[key] = await prefetchRestaurant(restaurant, apiKey);
    } catch (err) {
      console.error(`  ✗ Failed: ${(err as Error).message}`);
    }

    // Write after each restaurant in case of interruption
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  }

  console.log(`\n✅ Done. Cache saved to ${CACHE_FILE}`);
  console.log(`Total entries: ${Object.keys(cache).length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
