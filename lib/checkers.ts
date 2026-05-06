import { Platform, CheckResult, PLATFORMS } from "./platforms";
import { matchesRestaurant, slugVariants, norm } from "./matching";

// --- In-memory cache ---
type CacheEntry<T> = { data: T; expiresAt: number };

const searchCache = new Map<string, CacheEntry<SearchResult[]>>();
const SEARCH_CACHE_TTL = 3_600_000; // 1 hour

let blackbirdSitemapCache: CacheEntry<string[]> | null = null;
const SITEMAP_CACHE_TTL = 300_000; // 5 minutes

type UpsideOffer = {
  text: string;
  offerCategory: string;
  discounts: Array<{
    percentOff: number;
    detailText: string;
    maxCashback?: { amount: number };
  }>;
};
let upsideOffersCache: CacheEntry<UpsideOffer[]> | null = null;
const UPSIDE_CACHE_TTL = 3_600_000; // 1 hour

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
        details: "Found in Blackbird sitemap",
        method: "sitemap",
        url: found[0],
        matches: found,
      };
    }
  } catch (e) {
    console.error('[blackbird] sitemap error, falling back to search:', e);
  }

  // Fallback: Brave Search for restaurants not in the (incomplete) sitemap
  try {
    const query = `"${name}" site:blackbird.xyz`;
    const results = await braveSearch(query);

    for (const r of results) {
      if (!r.href.toLowerCase().includes("blackbird.xyz")) continue;
      if (isNoResultsPage(r.title, r.snippet)) continue;
      if (
        titleMatchesRestaurant(r.title, name) &&
        matchesRestaurant(`${r.title} ${r.snippet} ${r.href}`, name)
      ) {
        return {
          platform: "Blackbird",
          found: true,
          details: "Found via web search on blackbird.xyz",
          method: "web_search",
          url: r.href.startsWith("http") ? r.href : `https://${r.href}`,
          matches: [],
        };
      }
    }
  } catch (e) {
    console.error('[blackbird] brave search error:', e);
  }

  return {
    platform: "Blackbird",
    found: false,
    details: "Not found on Blackbird",
    method: "web_search",
    url: platform.url,
    matches: [],
  };
}

// --- Upside direct API ---

const UPSIDE_API_URL =
  "https://pdjc6srrfb.execute-api.us-east-1.amazonaws.com/prod/offers/refresh";

const NYC_BOUNDING_BOX = {
  southWestLat: 40.7,
  southWestLon: -74.02,
  northEastLat: 40.82,
  northEastLon: -73.93,
};

async function getUpsideOffers(): Promise<UpsideOffer[]> {
  if (upsideOffersCache && Date.now() < upsideOffersCache.expiresAt) {
    console.log("[cache] HIT upside offers");
    return upsideOffersCache.data;
  }
  console.log("[cache] MISS upside offers — fetching");

  const resp = await fetch(UPSIDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.upside.com",
    },
    body: JSON.stringify({
      location: { boundingBox: NYC_BOUNDING_BOX },
      userLocation: { latitude: 0, longitude: 0 },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) throw new Error(`Upside API HTTP ${resp.status}`);

  const data = await resp.json();
  const offers: UpsideOffer[] = (data.offers ?? []).filter(
    (o: UpsideOffer) => o.offerCategory === "RESTAURANT"
  );

  upsideOffersCache = { data: offers, expiresAt: Date.now() + UPSIDE_CACHE_TTL };
  console.log(`[upside] Cached ${offers.length} restaurant offers`);
  return offers;
}

export async function checkUpside(name: string): Promise<CheckResult> {
  const platform = PLATFORMS.find((p) => p.name === "Upside")!;
  try {
    const offers = await getUpsideOffers();

    for (const offer of offers) {
      if (matchesRestaurant(offer.text, name)) {
        const discount = offer.discounts[0];
        const pct = discount
          ? `${(discount.percentOff * 100).toFixed(0)}% cash back`
          : "Cash back available";
        return {
          platform: "Upside",
          found: true,
          details: `${offer.text} — ${pct}`,
          method: "api",
          url: platform.url,
          matches: [offer.text],
        };
      }
    }

    return {
      platform: "Upside",
      found: false,
      details: "Not found on Upside in NYC area",
      method: "api",
      url: platform.url,
      matches: [],
    };
  } catch (e) {
    console.error("[upside] API error, falling back to search:", e);
    // Fall back to Brave Search if the API is down
    try {
      const query = `"${name}" site:upside.com`;
      const results = await braveSearch(query);
      for (const r of results) {
        if (!r.href.toLowerCase().includes("upside.com")) continue;
        if (isNoResultsPage(r.title, r.snippet)) continue;
        if (
          titleMatchesRestaurant(r.title, name) &&
          matchesRestaurant(`${r.title} ${r.snippet} ${r.href}`, name)
        ) {
          return {
            platform: "Upside",
            found: true,
            details: r.title || "Found on Upside",
            method: "web_search",
            url: r.href.startsWith("http") ? r.href : `https://${r.href}`,
            matches: [],
          };
        }
      }
    } catch (searchErr) {
      console.error("[upside] brave search fallback also failed:", searchErr);
    }

    return {
      platform: "Upside",
      found: false,
      details: "Upside check unavailable — try the app directly",
      method: "error",
      url: platform.url,
      matches: [],
      searchUnavailable: true,
    };
  }
}

// --- Rewards Network direct API ---
// Powers 8 airline/hotel dining programs: AA, United, Southwest, Hilton, Hyatt, Marriott, JetBlue, Choice

type RewardsNetworkMerchant = {
  id: string;
  name: string;
  benefits: Array<{ value: string; dayOfWeek: string; monthDay: string }>;
  location?: {
    neighborhood?: string;
    address?: { address1?: string; city?: string; state?: string; zip?: string };
  };
  details?: {
    cuisines?: string[];
  };
  designation?: string;
};

let rewardsNetworkCache = new Map<string, CacheEntry<RewardsNetworkMerchant[]>>();
const REWARDS_NETWORK_CACHE_TTL = 3_600_000; // 1 hour
const REWARDS_NETWORK_API_URL =
  "https://aadvantagedining.com/api/v2/Merchants/Search";

async function getRewardsNetworkMerchants(
  query: string
): Promise<RewardsNetworkMerchant[]> {
  const cacheKey = `rn::${norm(query)}`;
  const cached = rewardsNetworkCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    console.log("[cache] HIT rewards network");
    return cached.data;
  }

  console.log("[cache] MISS rewards network — fetching");

  // Strip special chars for API query (apostrophes, accents cause misses)
  const apiQuery = query.replace(/[''`]/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const params = new URLSearchParams({
    campaignCode: "aa-dining",
    location: "10001",
    restaurantOrCuisine: apiQuery,
    pageSize: "50",
    pageNo: "1",
    sortBy: "recommended",
  });

  const resp = await fetch(`${REWARDS_NETWORK_API_URL}?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) throw new Error(`Rewards Network API HTTP ${resp.status}`);

  const data = await resp.json();
  const merchants: RewardsNetworkMerchant[] = data.merchants ?? [];

  rewardsNetworkCache.set(cacheKey, {
    data: merchants,
    expiresAt: Date.now() + REWARDS_NETWORK_CACHE_TTL,
  });
  console.log(`[rewards-network] Cached ${merchants.length} merchants for "${apiQuery}"`);
  return merchants;
}

export async function checkRewardsNetwork(
  name: string
): Promise<CheckResult> {
  const platform = PLATFORMS.find((p) => p.name === "Rewards Network")!;
  try {
    const merchants = await getRewardsNetworkMerchants(name);

    for (const m of merchants) {
      if (matchesRestaurant(m.name, name)) {
        // Find the best earning rate from benefits array
        const rates = (m.benefits ?? [])
          .map((b) => parseInt(b.value, 10))
          .filter((v) => !isNaN(v) && v > 0);
        const bestRate = rates.length > 0 ? Math.max(...rates) : 0;
        const rateStr = bestRate > 0 ? `Up to ${bestRate}x miles/$` : "Miles/points per $1";
        const cuisine = m.details?.cuisines?.length
          ? ` (${m.details.cuisines.slice(0, 2).join(", ")})`
          : "";
        const designation = m.designation ? ` ⭐ ${m.designation}` : "";

        return {
          platform: "Rewards Network",
          found: true,
          details: `${m.name}${cuisine} — ${rateStr}${designation}. Works with AA, United, Southwest, Hilton, Hyatt, Marriott, JetBlue, Choice`,
          method: "api",
          url: `https://aadvantagedining.com/restaurants/${m.id}`,
          matches: [m.name],
        };
      }
    }

    return {
      platform: "Rewards Network",
      found: false,
      details: "Not found on Rewards Network dining programs",
      method: "api",
      url: platform.url,
      matches: [],
    };
  } catch (e) {
    console.error("[rewards-network] API error:", e);
    return {
      platform: "Rewards Network",
      found: false,
      details: "Rewards Network check unavailable — try AAdvantage Dining directly",
      method: "error",
      url: platform.url,
      matches: [],
      searchUnavailable: true,
    };
  }
}

// --- Bilt Rewards direct API ---

type BiltRestaurant = {
  name: string;
  address: string;
  neighborhood?: string;
  primary_cuisine?: { name: string };
  multiplier?: Record<string, number>;
  exclusive?: boolean;
  state?: string;
  city?: string;
  zip_code?: string;
};
let biltRestaurantsCache: CacheEntry<BiltRestaurant[]> | null = null;
const BILT_CACHE_TTL = 3_600_000; // 1 hour
const BILT_API_URL = "https://api.biltrewards.com/public/merchants";

const NYC_CITIES = new Set([
  "new york", "brooklyn", "queens", "bronx", "staten island",
  "long island city", "astoria", "flushing", "jamaica",
  "ridgewood", "woodside", "sunnyside", "jackson heights",
]);

const NYC_ZIP_PREFIXES = ["100", "101", "102", "103", "104", "110", "111", "112", "113", "114", "116"];

function isBiltNYC(r: BiltRestaurant): boolean {
  // Check state field first
  if (r.state && r.state.toUpperCase() === "NY") {
    // Further filter to NYC-area by city or zip
    const city = (r.city ?? "").toLowerCase().trim();
    if (city && NYC_CITIES.has(city)) return true;
    const zip = (r.zip_code ?? "").trim();
    if (zip && NYC_ZIP_PREFIXES.some((p) => zip.startsWith(p))) return true;
    // If state is NY but no city/zip data, include it (better false positive than false negative)
    if (!city && !zip) return true;
  }
  // Fallback: check address string for NYC indicators
  const addr = (r.address ?? "").toLowerCase();
  if (addr.includes(", ny ") || addr.includes(", new york")) {
    if (NYC_CITIES.has((r.city ?? "").toLowerCase().trim())) return true;
    if (NYC_ZIP_PREFIXES.some((p) => addr.includes(p))) return true;
    // Generic NY address — include
    return true;
  }
  return false;
}

async function getBiltRestaurants(query: string): Promise<BiltRestaurant[]> {
  const cacheKey = `bilt::${norm(query)}`;
  const cached = biltRestaurantsCache;
  if (cached && Date.now() < cached.expiresAt) {
    console.log("[cache] HIT bilt restaurants");
    return cached.data;
  }

  console.log("[cache] MISS bilt restaurants — fetching");
  const allRestaurants: BiltRestaurant[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore && page < 30) {
    const resp = await fetch(`${BILT_API_URL}?page=${page}&size=100`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`Bilt API HTTP ${resp.status}`);
    const data = await resp.json();
    const restaurants: BiltRestaurant[] = data.restaurants ?? [];
    allRestaurants.push(...restaurants);
    hasMore = data.meta_data?.has_more_items ?? false;
    page++;
  }

  biltRestaurantsCache = {
    data: allRestaurants.filter(isBiltNYC),
    expiresAt: Date.now() + BILT_CACHE_TTL,
  };
  console.log(`[bilt] Cached ${biltRestaurantsCache.data.length}/${allRestaurants.length} NYC restaurants`);
  return biltRestaurantsCache.data;
}

export async function checkBilt(name: string): Promise<CheckResult> {
  const platform = PLATFORMS.find((p) => p.name === "Bilt Rewards")!;
  try {
    const restaurants = await getBiltRestaurants(name);

    for (const r of restaurants) {
      if (matchesRestaurant(r.name, name)) {
        const multipliers = r.multiplier
          ? Object.values(r.multiplier)
          : [];
        const maxMult = multipliers.length > 0 ? Math.max(...multipliers) : 1;
        const cuisine = r.primary_cuisine?.name
          ? ` (${r.primary_cuisine.name})`
          : "";
        const exclusive = r.exclusive ? " ⭐ Exclusive" : "";
        return {
          platform: "Bilt Rewards",
          found: true,
          details: `${r.name}${cuisine} — ${maxMult}x points${exclusive}`,
          method: "api",
          url: platform.url,
          matches: [r.name],
        };
      }
    }

    return {
      platform: "Bilt Rewards",
      found: false,
      details: "Not found on Bilt Dining",
      method: "api",
      url: platform.url,
      matches: [],
    };
  } catch (e) {
    console.error("[bilt] API error, falling back to search:", e);
    try {
      const query = `"${name}" dining site:biltrewards.com`;
      const results = await braveSearch(query);
      for (const r of results) {
        if (!r.href.toLowerCase().includes("biltrewards.com")) continue;
        if (isNoResultsPage(r.title, r.snippet)) continue;
        if (
          titleMatchesRestaurant(r.title, name) &&
          matchesRestaurant(`${r.title} ${r.snippet} ${r.href}`, name)
        ) {
          return {
            platform: "Bilt Rewards",
            found: true,
            details: r.title || "Found on Bilt Rewards",
            method: "web_search",
            url: r.href.startsWith("http") ? r.href : `https://${r.href}`,
            matches: [],
          };
        }
      }
    } catch (searchErr) {
      console.error("[bilt] brave search fallback also failed:", searchErr);
    }

    return {
      platform: "Bilt Rewards",
      found: false,
      details: "Bilt check unavailable — try the app directly",
      method: "error",
      url: platform.url,
      matches: [],
      searchUnavailable: true,
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
  const nonBlackbird = PLATFORMS.filter((p) => p.name !== "Blackbird" && p.name !== "Upside" && p.name !== "Bilt Rewards" && p.name !== "Rewards Network");
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

export function titleMatchesRestaurant(title: string, name: string): boolean {
  const n = norm(name);
  if (n.length === 0) return false;

  const t = norm(title);
  if (t.startsWith(n)) return true;

  // Split on separators BEFORE normalizing so they're still present
  const titleLower = title.toLowerCase();
  for (const sep of ["|", "-", "–", "—", ":"]) {
    if (!titleLower.includes(sep)) continue;
    const parts = titleLower.split(sep);
    for (const part of parts) {
      const stripped = norm(part);
      if (stripped.startsWith(n) || stripped === n) return true;
    }
  }

  // Name is a significant portion of the title
  if (t.includes(n) && n.length / Math.max(t.length, 1) > 0.3) return true;

  // Multi-word names: all significant words present
  const words = n.split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 1 && words.every((w) => t.includes(w))) return true;

  return false;
}

const NO_RESULT_PHRASES = [
  "no results found", "no more results", "did not match any",
  "0 results", "zero results", "nothing found", "no matches found",
  "try different keywords", "check spelling", "no restaurants found",
  "we couldn't find", "we could not find", "sorry, no",
];

export function isNoResultsPage(title: string, snippet: string): boolean {
  const combined = `${title} ${snippet}`.toLowerCase();
  return NO_RESULT_PHRASES.some((phrase) => combined.includes(phrase));
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
    // Skip "no results" pages that search engines index
    if (isNoResultsPage(r.title, r.snippet)) {
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
    if (
      titleMatchesRestaurant(r.title, name) &&
      matchesRestaurant(`${r.title} ${r.snippet} ${r.href}`, name)
    ) {
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
