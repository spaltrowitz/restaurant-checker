import { Platform, CheckResult, PLATFORMS } from "./platforms";
import { matchesRestaurant } from "./matching";

export async function checkBlackbird(name: string): Promise<CheckResult> {
  const platform = PLATFORMS.find((p) => p.name === "Blackbird")!;
  try {
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

    const found = spots.filter((url) => {
      const slug = url.split("/spots/")[1]?.replace(/-/g, " ") ?? "";
      return matchesRestaurant(slug, name);
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

interface SerperResult {
  title?: string;
  link?: string;
  snippet?: string;
}

// Search via Serper.dev Google Search API
async function serperSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error("SERPER_API_KEY not configured");
  }

  const resp = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 10 }),
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    throw new Error(`Serper HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const organic: SerperResult[] = data.organic || [];

  return organic.map((r) => ({
    title: r.title ?? "",
    href: r.link ?? "",
    snippet: r.snippet ?? "",
  }));
}

// Batch search: runs all non-Blackbird queries via Serper API in parallel
export async function batchSearch(
  name: string
): Promise<Map<string, SearchResponse>> {
  const nonBlackbird = PLATFORMS.filter((p) => p.name !== "Blackbird");
  const resultMap = new Map<string, SearchResponse>();

  // Initialize all as blocked (fallback)
  for (const p of nonBlackbird) {
    resultMap.set(p.name, { results: [], blocked: true });
  }

  // Run all searches in parallel
  const searchPromises = nonBlackbird.map(async (platform) => {
    const query = `"${name}" ${platform.searchQuery}`;
    try {
      const results = await serperSearch(query);
      return { platform: platform.name, results, blocked: false };
    } catch {
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
