import { Platform, CheckResult, PLATFORMS } from "./platforms";
import { matchesRestaurant } from "./matching";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

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

// Batch search: runs all non-Blackbird queries in a single Python process
export async function batchSearch(
  name: string
): Promise<Map<string, SearchResponse>> {
  const nonBlackbird = PLATFORMS.filter((p) => p.name !== "Blackbird");
  const queries = nonBlackbird.map(
    (p) => `"${name}" ${p.searchQuery}`
  );

  const resultMap = new Map<string, SearchResponse>();

  // Initialize all as blocked (fallback)
  for (const p of nonBlackbird) {
    resultMap.set(p.name, { results: [], blocked: true });
  }

  const bridgePath = path.join(process.cwd(), "lib", "search_bridge.py");

  try {
    const { stdout } = await execFileAsync(
      "python3",
      [bridgePath, "--batch", JSON.stringify(queries)],
      { timeout: 45000, maxBuffer: 2 * 1024 * 1024 }
    );

    const batchResults: Array<{
      query: string;
      results: Array<{ title?: string; href?: string; body?: string }>;
      error: string | null;
    }> = JSON.parse(stdout.trim());

    for (let i = 0; i < nonBlackbird.length; i++) {
      const platform = nonBlackbird[i];
      const data = batchResults[i];
      if (data && !data.error) {
        resultMap.set(platform.name, {
          results: (data.results || []).map((r) => ({
            title: r.title ?? "",
            href: r.href ?? "",
            snippet: r.body ?? "",
          })),
          blocked: false,
        });
      }
    }
  } catch {
    // All searches stay as blocked
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
