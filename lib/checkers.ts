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

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

async function duckduckgoSearch(
  query: string
): Promise<Array<{ title: string; href: string; snippet: string }>> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) return [];
  const html = await resp.text();

  const results: Array<{ title: string; href: string; snippet: string }> = [];
  const resultBlocks = html.split(/class="result\s/);

  for (const block of resultBlocks.slice(1, 6)) {
    const titleMatch = block.match(
      /class="result__title"[^>]*>([\s\S]*?)<\/a>/
    );
    const urlMatch = block.match(/class="result__url"[^>]*>\s*([^<]+)/);
    const snippetMatch = block.match(
      /class="result__snippet"[^>]*>([\s\S]*?)<\/[at]/
    );

    results.push({
      title: stripTags(titleMatch?.[1] ?? ""),
      href: (urlMatch?.[1] ?? "").trim(),
      snippet: stripTags(snippetMatch?.[1] ?? ""),
    });
  }
  return results;
}

export async function checkViaSearch(
  platform: Platform,
  name: string
): Promise<CheckResult> {
  const query = `"${name}" ${platform.searchQuery}`;
  const appNote = platform.appOnly
    ? " (app-only — check the app)"
    : "";

  try {
    const results = await duckduckgoSearch(query);
    for (const r of results) {
      if (
        platform.domainFilter &&
        !r.href.toLowerCase().includes(platform.domainFilter)
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
  } catch {
    // fall through to not-found
  }

  return {
    platform: platform.name,
    found: false,
    details: `Not found via web search${appNote}`,
    method: "web_search",
    url: platform.url,
    matches: [],
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
