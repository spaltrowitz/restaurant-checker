import { Platform, CheckResult, PLATFORMS } from "./platforms";
import { matchesRestaurant, slugVariants } from "./matching";

// --- In-memory cache ---
type CacheEntry<T> = { data: T; expiresAt: number };

const searchCache = new Map<string, CacheEntry<SearchResult[]>>();
const SEARCH_CACHE_TTL = 3_600_000; // 1 hour

let blackbirdSitemapCache: CacheEntry<string[]> | null = null;
const SITEMAP_CACHE_TTL = 300_000; // 5 minutes

function normalizeKey(restaurant: string, platform: string): string {
  return `${restaurant.toLowerCase().trim()}::${platform.toLowerCase().trim()}`;
}

function getSearchCache(key: string): SearchResult[] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  console.log(`[cache] HIT search: ${key}`);
  return entry.data;
}

function setSearchCache(key: string, data: SearchResult[]): void {
  searchCache.set(key, { data, expiresAt: Date.now() + SEARCH_CACHE_TTL });
}

async function getBlackbirdSpots(): Promise<string[]> {
  if (blackbirdSitemapCache && Date.now() < blackbirdSitemapCache.expiresAt) {
    console.log("[cache] HIT blackbird sitemap");
    return blackbirdSitemapCache.data;
  }
  console.log("[cache] MISS blackbird sitemap — fetching");
  const resp = await fetch("https://www.blackbird.xyz/sm.xml", {
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const xml = await resp.text();
  const spots = [
    ...xml.matchAll(
      /<loc>(https:\/\/www\.blackbird\.xyz\/spots\/[^<]+)<\/loc>/g
    ),
  ].map((m) => m[1]);
  blackbirdSitemapCache = { data: spots, expiresAt: Date.now() + SITEMAP_CACHE_TTL };
  return spots;
}

export async function checkBlackbird(name: string): Promise<CheckResult> {
  const platform = PLATFORMS.find((p) => p.name === "Blackbird")!;
  try {
    const spots = await getBlackbirdSpots();

    const found = spots.filter((url) => {
      const slug = url.split("/spots/")[1] ?? "";
      const slugText = slug.replace(/-/g, " ");
      if (matchesRestaurant(slugText, name)) return true;
      // Also check slug variants of the restaurant name against the raw URL slug
      const variants = slugVariants(name);
      return variants.some((v) => slug === v);
    });

    if (found.length > 0) {
      return {
        platform: "Blackbird",
        found: true,
        details: `Found ${found.length} match(es) in sitemap`,
        method: "sitemap",
        url: found[0],
        matches: found,
      };
    }
    return {
      platform: "Blackbird",
      found: false,
      details: `Not in sitemap (${spots.length} restaurants checked)`,
      method: "sitemap",
      url: platform.url,
      matches: [],
    };
  } catch (e) {
    console.error('[blackbird]', e);
    return {
      platform: "Blackbird",
      found: false,
      details: `Sitemap error: ${e instanceof Error ? e.message : "unknown"}`,
      method: "error",
      url: platform.url,
      matches: [],
    };
  }
}

type SearchResult = { title: string; href: string; snippet: string };
type SearchResponse = {
  results: SearchResult[];
  blocked: boolean;
};

// Search via Brave Search API
async function braveSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error("BRAVE_SEARCH_API_KEY not configured");
  }

  const params = new URLSearchParams({
    q: query,
    count: "5",
  });

  const resp = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!resp.ok) {
    let reason = "";
    try {
      const errBody = await resp.json();
      reason = errBody?.message || errBody?.error || "";
    } catch { /* ignore parse failure */ }

    if (resp.status === 403) {
      console.error(`[brave-search] PERMISSION DENIED (403): ${reason} | query: ${query}`);
      throw new Error(`Brave Search permission denied: ${reason}`);
    }
    if (resp.status === 429) {
      console.error(`[brave-search] RATE LIMITED (429): ${reason} | query: ${query}`);
      throw new Error("Brave Search rate limited");
    }
    console.error(`[brave-search] HTTP ${resp.status}: ${reason} | query: ${query}`);
    throw new Error(`Brave Search HTTP ${resp.status}: ${reason}`);
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

// Batch search: runs all non-Blackbird queries via Brave Search in parallel
export async function batchSearch(
  name: string
): Promise<Map<string, SearchResponse>> {
  const nonBlackbird = PLATFORMS.filter((p) => p.name !== "Blackbird");
  const resultMap = new Map<string, SearchResponse>();

  // Initialize all as blocked (fallback)
  for (const p of nonBlackbird) {
    resultMap.set(p.name, { results: [], blocked: true });
  }

  // Run all searches in parallel, using cache when available
  const searchPromises = nonBlackbird.map(async (platform) => {
    const cacheKey = normalizeKey(name, platform.name);
    const cached = getSearchCache(cacheKey);
    if (cached !== null) {
      return { platform: platform.name, results: cached, blocked: false };
    }

    console.log(`[cache] MISS search: ${cacheKey}`);
    const siteOp = platform.domainFilter ? ` site:${platform.domainFilter}` : "";
    const baseQuery = platform.searchQuery
      ? `"${name}" ${platform.searchQuery}`
      : `"${name}"`;
    const query = `${baseQuery}${siteOp}`;

    try {
      const results = await braveSearch(query);
      setSearchCache(cacheKey, results);
      return { platform: platform.name, results, blocked: false };
    } catch (error) {
      console.error('[brave-search]', platform.name, error);
      return { platform: platform.name, results: [] as SearchResult[], blocked: true };
    }
  });

  const searchResults = await Promise.all(searchPromises);

  for (const sr of searchResults) {
    resultMap.set(sr.platform, {
      results: sr.results,
      blocked: sr.blocked,
    });
  }

  return resultMap;
}

// Convert raw search results into a CheckResult for a platform
export function evaluateSearchResults(
  platform: Platform,
  name: string,
  search: SearchResponse
): CheckResult {
  if (search.blocked) {
    return {
      platform: platform.name,
      found: false,
      details: platform.appOnly
        ? "Search unavailable — check the app directly"
        : "Search unavailable — check the platform directly",
      method: "error",
      url: platform.url,
      matches: [],
      searchUnavailable: true,
    };
  }

  for (const r of search.results) {
    if (
      platform.domainFilter &&
      !r.href.toLowerCase().includes(platform.domainFilter)
    ) {
      continue;
    }
    // Skip generic blog/help pages that mention restaurant names incidentally
    const lowerHref = r.href.toLowerCase();
    if (
      lowerHref.includes("/blog/") ||
      lowerHref.includes("/retailer-blog/") ||
      lowerHref.includes("/help/") ||
      lowerHref.includes("/faq/") ||
      lowerHref.includes("/hc/en-us/")
    ) {
      continue;
    }
    if (matchesRestaurant(`${r.title} ${r.snippet} ${r.href}`, name)) {
      return {
        platform: platform.name,
        found: true,
        details: r.title || `Found on ${platform.name}`,
        method: "web_search",
        url: r.href.startsWith("http") ? r.href : `https://${r.href}`,
        matches: [],
      };
    }
  }

  if (platform.appOnly) {
    return {
      platform: platform.name,
      found: false,
      details: "Not indexed on the web — check the app to verify",
      method: "web_search",
      url: platform.url,
      matches: [],
      searchUnavailable: true,
    };
  }

  return {
    platform: platform.name,
    found: false,
    details: "Not found via web search",
    method: "web_search",
    url: platform.url,
    matches: [],
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
