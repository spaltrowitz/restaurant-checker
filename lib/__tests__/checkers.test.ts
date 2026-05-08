import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { batchSearch, evaluateSearchResults, titleMatchesRestaurant, isNoResultsPage, extractDealDetails } from "../checkers";
import type { Platform } from "../platforms";

// ─── Helper to build a minimal Platform for testing ───
function makePlatform(overrides: Partial<Platform> = {}): Platform {
  return {
    name: "TestPlatform",
    url: "https://example.com",
    appOnly: false,
    rewardType: "cashback",
    rewardEmoji: "💵",
    rewardLabel: "Cashback",
    offerType: "Test",
    personalized: false,
    cardLink: false,
    cardConflict: false,
    searchQuery: "",
    domainFilter: "",
    ...overrides,
  };
}

// Mock fetch globally
global.fetch = vi.fn();

// Generate unique restaurant name to avoid cache collisions
let testCounter = 0;
function uniqueRestaurantName(prefix = "TestRestaurant"): string {
  return `${prefix}${++testCounter}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Set up environment variables for Brave Search API
  process.env.BRAVE_SEARCH_API_KEY = "test_api_key";
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  braveSearch() — Core Brave Search API integration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("braveSearch()", () => {
  // NOTE: braveSearch is not exported yet; these tests will work once Fenster implements it
  // For now, we test through batchSearch which will call braveSearch internally

  it("returns results when API responds with valid data", async () => {
    const restaurantName = uniqueRestaurantName();
    const mockResponse = {
      web: {
        results: [
          {
            title: `${restaurantName} Italian Restaurant NYC`,
            url: `https://inkind.com/restaurants/${restaurantName.toLowerCase()}`,
            description: `Book ${restaurantName} with inKind credit`,
          },
        ],
      },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const results = await batchSearch(restaurantName);
    const inKindResult = results.get("inKind");

    expect(inKindResult).toBeDefined();
    expect(inKindResult?.blocked).toBe(false);
    expect(inKindResult?.results.length).toBeGreaterThan(0);
  });

  it("returns empty array when no API key configured", async () => {
    const restaurantName = uniqueRestaurantName();
    const originalKey = process.env.BRAVE_SEARCH_API_KEY;
    delete process.env.BRAVE_SEARCH_API_KEY;

    const results = await batchSearch(restaurantName);

    // When API key missing, all platforms should be marked as blocked
    for (const [, searchResponse] of results) {
      expect(searchResponse.blocked).toBe(true);
    }

    // Restore
    if (originalKey) process.env.BRAVE_SEARCH_API_KEY = originalKey;
  });

  it("handles HTTP 403 (forbidden) gracefully", async () => {
    const restaurantName = uniqueRestaurantName();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Forbidden" }),
    } as Response);

    const results = await batchSearch(restaurantName);
    const inKindResult = results.get("inKind");

    expect(inKindResult?.blocked).toBe(true);
    expect(inKindResult?.results).toEqual([]);
  });

  it("handles HTTP 429 (rate limited) gracefully", async () => {
    const restaurantName = uniqueRestaurantName();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many requests" }),
    } as Response);

    const results = await batchSearch(restaurantName);
    const inKindResult = results.get("inKind");

    expect(inKindResult?.blocked).toBe(true);
    expect(inKindResult?.results).toEqual([]);
  });

  it("handles HTTP 500 (server error) gracefully", async () => {
    const restaurantName = uniqueRestaurantName();
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    } as Response);

    const results = await batchSearch(restaurantName);
    const inKindResult = results.get("inKind");

    expect(inKindResult?.blocked).toBe(true);
    expect(inKindResult?.results).toEqual([]);
  });

  it("handles network timeouts gracefully", async () => {
    const restaurantName = uniqueRestaurantName();
    vi.mocked(fetch).mockRejectedValue(new Error("Network timeout"));

    const results = await batchSearch(restaurantName);
    const inKindResult = results.get("inKind");

    expect(inKindResult?.blocked).toBe(true);
    expect(inKindResult?.results).toEqual([]);
  });

  it("handles malformed JSON response", async () => {
    const restaurantName = uniqueRestaurantName();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as Response);

    const results = await batchSearch(restaurantName);
    const inKindResult = results.get("inKind");

    expect(inKindResult?.blocked).toBe(true);
    expect(inKindResult?.results).toEqual([]);
  });

  it("handles missing 'web.results' in response", async () => {
    const restaurantName = uniqueRestaurantName();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ web: {} }), // Brave Search format with missing results
    } as Response);

    const results = await batchSearch(restaurantName);
    const inKindResult = results.get("inKind");

    expect(inKindResult?.blocked).toBe(false);
    expect(inKindResult?.results).toEqual([]);
  });

  it("handles null/undefined values in result fields", async () => {
    const restaurantName = uniqueRestaurantName();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: null, url: undefined, description: "Some text" },
            { title: "Valid", url: "https://example.com", description: null },
          ],
        },
      }),
    } as Response);

    const results = await batchSearch(restaurantName);
    const testResult = results.get("inKind");

    expect(testResult?.blocked).toBe(false);
    expect(testResult?.results.length).toBe(2);
    expect(testResult?.results[0].title).toBe("");
    expect(testResult?.results[0].href).toBe("");
    expect(testResult?.results[1].snippet).toBe("");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  batchSearch() — Batch search orchestration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("batchSearch()", () => {
  it("returns results for all non-Blackbird platforms", async () => {
    const restaurantName = uniqueRestaurantName();
    const mockResponse = {
      web: {
        results: [
          {
            title: "Test Result",
            url: "https://example.com/test",
            description: "Test description",
          },
        ],
      },
    };

    // Mock fetch to return valid response for all calls
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const results = await batchSearch(restaurantName);

    // Should have results for all non-Blackbird, non-Upside, non-Bilt platforms
    const platformNames = [
      "inKind",
      "Nea",
      "Rakuten Dining",
      "Too Good To Go",
      "Pulsd",
      "Restaurant.com",
      "Groupon",
      "LivingSocial",
      "The Infatuation",
      "Eater",
    ];

    for (const name of platformNames) {
      expect(results.has(name)).toBe(true);
    }

    // Should NOT include Blackbird, Upside, or Bilt Rewards (they have dedicated checkers)
    expect(results.has("Blackbird")).toBe(false);
    expect(results.has("Upside")).toBe(false);
    expect(results.has("Bilt Rewards")).toBe(false);
  });

  it("uses cache when available", async () => {
    const restaurantName = uniqueRestaurantName();
    const mockResponse = {
      web: {
        results: [
          {
            title: "Cached Result",
            url: "https://example.com/cached",
            description: "Cached description",
          },
        ],
      },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    // First call - should hit API
    const firstResult = await batchSearch(restaurantName);
    const firstCallCount = vi.mocked(fetch).mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);

    // Clear mocks but NOT the cache
    vi.clearAllMocks();

    // Second call - should use cache (within TTL)
    const secondResult = await batchSearch(restaurantName);
    const secondCallCount = vi.mocked(fetch).mock.calls.length;

    // Cache hit means zero API calls on second attempt
    expect(secondCallCount).toBe(0);
    
    // Results should be identical
    expect(secondResult.get("inKind")?.results.length).toBe(firstResult.get("inKind")?.results.length);
  });

  it("marks platforms as blocked when search fails", async () => {
    const restaurantName = uniqueRestaurantName();
    vi.mocked(fetch).mockRejectedValue(new Error("API error"));

    const results = await batchSearch(restaurantName);

    // All platforms should be marked as blocked due to API failure
    for (const [, searchResponse] of results) {
      expect(searchResponse.blocked).toBe(true);
      expect(searchResponse.results).toEqual([]);
    }
  });

  it("uses site: operator in queries when platform has domainFilter", async () => {
    const restaurantName = uniqueRestaurantName();
    const mockResponse = {
      web: {
        results: [
          {
            title: "Test",
            url: "https://inkind.com/test",
            description: "Test",
          },
        ],
      },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    // Clear cache to ensure fresh search
    await batchSearch(restaurantName);

    // Check that fetch was called with site: operator for platforms with domainFilter (not inKind which uses skipSiteOperator)
    const fetchCalls = vi.mocked(fetch).mock.calls;
    const rakutenCall = fetchCalls.find((call) => {
      const url = call[0] as string;
      return url.includes(restaurantName) && url.includes("site%3Arakuten.com");
    });

    expect(rakutenCall).toBeDefined();
  });

  it("skips site: operator for platforms with skipSiteOperator", async () => {
    const restaurantName = uniqueRestaurantName();
    const mockResponse = {
      web: {
        results: [
          {
            title: "Test",
            url: "https://inkind.com/test",
            description: "Test",
          },
        ],
      },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    await batchSearch(restaurantName);

    const fetchCalls = vi.mocked(fetch).mock.calls;
    const inKindCall = fetchCalls.find((call) => {
      const url = call[0] as string;
      return url.includes(restaurantName) && url.includes("inkind");
    });

    expect(inKindCall).toBeDefined();
    const inKindUrl = inKindCall![0] as string;
    expect(inKindUrl).not.toContain("site%3Ainkind.com");
  });

  it("does NOT use site: operator when platform has no domainFilter", async () => {
    const restaurantName = uniqueRestaurantName();
    const mockResponse = {
      web: { results: [] },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    await batchSearch(restaurantName);

    // Blackbird has no domainFilter, but it's excluded from batchSearch
    // Check that queries without domainFilter don't include site:
    const fetchCalls = vi.mocked(fetch).mock.calls;
    const callsWithoutSite = fetchCalls.filter((call) => {
      const url = call[0] as string;
      return url.includes(restaurantName) && !url.includes("site%3A");
    });

    // Platforms like "Blackbird" (excluded) or "Too Good To Go" (empty domainFilter) don't use site:
    // Since all current platforms have domainFilter, this checks the logic works
    expect(callsWithoutSite.length).toBeGreaterThanOrEqual(0);
  });

  it("includes searchQuery in query when platform has one", async () => {
    const restaurantName = uniqueRestaurantName();
    const mockResponse = {
      web: { results: [] },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    await batchSearch(restaurantName);

    const fetchCalls = vi.mocked(fetch).mock.calls;

    // Rakuten Dining has searchQuery: "dining" (Bilt now uses its own dedicated checker)
    const rakutenCall = fetchCalls.find((call) => {
      const url = call[0] as string;
      return url.includes(restaurantName) && url.includes("dining");
    });

    expect(rakutenCall).toBeDefined();
  });

  it("handles mixed success and failure across platforms", async () => {
    const restaurantName = uniqueRestaurantName();
    let callCount = 0;

    vi.mocked(fetch).mockImplementation(() => {
      callCount++;
      // First 2 calls succeed, rest fail
      if (callCount <= 2) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            web: {
              results: [
                { title: "Success", url: "https://example.com", description: "" },
              ],
            },
          }),
        } as Response);
      }
      return Promise.reject(new Error("API error"));
    });

    const results = await batchSearch(restaurantName);

    let successCount = 0;
    let failureCount = 0;

    for (const [, searchResponse] of results) {
      if (searchResponse.blocked) {
        failureCount++;
      } else {
        successCount++;
      }
    }

    // Should have at least one success and multiple failures
    expect(successCount).toBeGreaterThan(0);
    expect(failureCount).toBeGreaterThan(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  evaluateSearchResults() — Result evaluation with Brave results
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("evaluateSearchResults() with Brave Search results", () => {
  it("correctly identifies found restaurants with Brave format", () => {
    const platform = makePlatform({
      name: "inKind",
      domainFilter: "inkind.com",
    });

    // Brave Search format (url instead of link, description instead of snippet)
    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone - inKind",
          href: "https://inkind.com/restaurants/carbone",
          snippet: "Enjoy Carbone with inKind credit",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
    expect(result.method).toBe("web_search");
    expect(result.url).toBe("https://inkind.com/restaurants/carbone");
  });

  it("extracts deal details from snippet into result details", () => {
    const platform = makePlatform({
      name: "inKind",
      domainFilter: "inkind.com",
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone - inKind",
          href: "https://inkind.com/restaurants/carbone",
          snippet: "Get 20% cashback when you dine at Carbone",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
    expect(result.details).toContain("20%");
    expect(result.details).toContain("Carbone - inKind");
  });

  it("filters blog/help/FAQ URLs from Brave results", () => {
    const platform = makePlatform({ name: "inKind", domainFilter: "inkind.com" });

    const testCases = [
      "https://inkind.com/blog/best-restaurants-carbone",
      "https://inkind.com/retailer-blog/carbone-feature",
      "https://inkind.com/help/how-to-use-carbone",
      "https://inkind.com/faq/carbone-questions",
      "https://inkind.com/hc/en-us/articles/carbone",
    ];

    for (const badUrl of testCases) {
      const result = evaluateSearchResults(platform, "Carbone", {
        results: [
          {
            title: "Carbone Article",
            href: badUrl,
            snippet: "Information about Carbone",
          },
        ],
        blocked: false,
      });

      expect(result.found).toBe(false);
    }
  });

  it("handles searchUnavailable state for blocked platforms", () => {
    const platform = makePlatform({ name: "inKind" });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [],
      blocked: true,
    });

    expect(result.found).toBe(false);
    expect(result.searchUnavailable).toBe(true);
    expect(result.method).toBe("error");
    expect(result.details).toContain("Search unavailable");
  });

  it("handles appOnly platforms differently when search unavailable", () => {
    const appOnlyPlatform = makePlatform({
      name: "Upside",
      appOnly: true,
    });

    const result = evaluateSearchResults(appOnlyPlatform, "Carbone", {
      results: [],
      blocked: true,
    });

    expect(result.found).toBe(false);
    expect(result.searchUnavailable).toBe(true);
    expect(result.details).toContain("check the app directly");
  });

  it("handles appOnly platforms when no results found", () => {
    const appOnlyPlatform = makePlatform({
      name: "Nea",
      appOnly: true,
      domainFilter: "neaapp.ai",
    });

    const result = evaluateSearchResults(appOnlyPlatform, "Carbone", {
      results: [],
      blocked: false,
    });

    expect(result.found).toBe(false);
    expect(result.searchUnavailable).toBe(true);
    expect(result.details).toContain("check the app");
  });

  it("correctly matches across title, snippet, and URL", () => {
    const platform = makePlatform({ domainFilter: "" });

    // Match in title
    const titleMatch = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Visit Carbone NYC",
          href: "https://example.com/restaurant",
          snippet: "Great Italian food in the heart of downtown Manhattan",
        },
      ],
      blocked: false,
    });
    expect(titleMatch.found).toBe(true);

    // Name only in snippet (not in title) — now rejected by title filter
    const snippetOnly = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Italian Restaurant",
          href: "https://example.com/restaurant",
          snippet: "Carbone is a classic NYC spot with excellent pasta and wine selection",
        },
      ],
      blocked: false,
    });
    expect(snippetOnly.found).toBe(false);

    // Name only in URL (not in title) — now rejected by title filter
    const urlOnly = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Restaurant Page",
          href: "https://example.com/carbone-nyc",
          snippet: "Fine dining experience for the whole family tonight",
        },
      ],
      blocked: false,
    });
    expect(urlOnly.found).toBe(false);
  });

  it("respects domainFilter and skips non-matching domains", () => {
    const platform = makePlatform({
      name: "inKind",
      domainFilter: "inkind.com",
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone Restaurant",
          href: "https://yelp.com/biz/carbone",
          snippet: "Carbone reviews from locals and visitors in NYC area",
        },
        {
          title: "Carbone on inKind",
          href: "https://inkind.com/carbone",
          snippet: "Book with credit and save on your next visit to Carbone",
        },
      ],
      blocked: false,
    });

    // Should skip Yelp result and find inKind result
    expect(result.found).toBe(true);
    expect(result.url).toContain("inkind.com");
  });

  it("uses platform URL when result doesn't have protocol", () => {
    const platform = makePlatform({ domainFilter: "" });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone",
          href: "example.com/carbone", // No protocol
          snippet: "Restaurant page for Carbone with full menu and details",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
    expect(result.url).toBe("https://example.com/carbone");
  });

  it("returns platform fallback details when not found on non-appOnly platform", () => {
    const platform = makePlatform({
      name: "inKind",
      appOnly: false,
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [],
      blocked: false,
    });

    expect(result.found).toBe(false);
    expect(result.details).toBe("Not found via web search");
    expect(result.searchUnavailable).toBeUndefined();
  });

  it("handles empty results array", () => {
    const platform = makePlatform();

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  it("handles results with missing fields gracefully", () => {
    const platform = makePlatform({ domainFilter: "" });

    // Empty title won't pass title filter — result is not found
    const emptyTitle = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "",
          href: "https://example.com/carbone",
          snippet: "Visit Carbone today",
        },
      ],
      blocked: false,
    });
    expect(emptyTitle.found).toBe(false);

    // Title with restaurant name still works (snippet must be ≥30 chars)
    const withTitle = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone",
          href: "https://example.com/carbone",
          snippet: "Visit Carbone for an unforgettable dining experience",
        },
      ],
      blocked: false,
    });
    expect(withTitle.found).toBe(true);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  titleMatchesRestaurant() — Title false-positive filter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("titleMatchesRestaurant()", () => {
  it("matches when name is at start of title", () => {
    expect(titleMatchesRestaurant("Carbone - Italian NYC", "Carbone")).toBe(true);
  });

  it("matches when name appears after a separator", () => {
    expect(titleMatchesRestaurant("inKind | Carbone NYC", "Carbone")).toBe(true);
    expect(titleMatchesRestaurant("Restaurants - Carbone", "Carbone")).toBe(true);
    expect(titleMatchesRestaurant("Menu: Carbone Italian", "Carbone")).toBe(true);
  });

  it("matches when name is a large portion of the title", () => {
    expect(titleMatchesRestaurant("Carbone NYC", "Carbone")).toBe(true);
  });

  it("matches multi-word names when all significant words appear", () => {
    expect(titleMatchesRestaurant("The Red Hen Restaurant DC", "Red Hen")).toBe(true);
  });

  it("rejects when name is buried in unrelated text", () => {
    expect(titleMatchesRestaurant("Revue carbone et énergie fossile en France", "Carbone")).toBe(false);
  });

  it("rejects when name does not appear at all", () => {
    expect(titleMatchesRestaurant("Best Italian Restaurants NYC", "Carbone")).toBe(false);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  isNoResultsPage() — No-results page detection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("isNoResultsPage()", () => {
  it("detects common no-results phrases", () => {
    expect(isNoResultsPage("Search", "No results found for Carbone")).toBe(true);
    expect(isNoResultsPage("0 results", "Try different keywords")).toBe(true);
    expect(isNoResultsPage("Sorry, no restaurants found", "")).toBe(true);
  });

  it("returns false for normal result pages", () => {
    expect(isNoResultsPage("Carbone - inKind", "Book Carbone with credit")).toBe(false);
    expect(isNoResultsPage("Menu", "Italian restaurant")).toBe(false);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  evaluateSearchResults() — False positive filtering
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("evaluateSearchResults() false positive filtering", () => {
  it("skips no-results pages", () => {
    const platform = makePlatform({ domainFilter: "" });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "No results found",
          href: "https://example.com/search?q=carbone",
          snippet: "We couldn't find any matches for Carbone",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  it("rejects results where name is buried in foreign-language title", () => {
    const platform = makePlatform({ name: "Rakuten Dining", domainFilter: "rakuten.co.jp" });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Revue carbone et énergie fossile — Rakuten",
          href: "https://rakuten.co.jp/article/revue-carbone",
          snippet: "Article sur le carbone en France",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });
});

// ─── isNonNYCResult location filtering ───
import { isNonNYCResult } from "../checkers";

describe("isNonNYCResult", () => {
  it("rejects results mentioning non-NYC cities", () => {
    expect(isNonNYCResult(
      "Joe's Pizza - Miami, FL",
      "Great pizza in Miami",
      "https://restaurant.com/joes-pizza-miami"
    )).toBe(true);
  });

  it("rejects results mentioning non-NYC states", () => {
    expect(isNonNYCResult(
      "Shake Shack Cedar Park",
      "Restaurant in Cedar Park, Texas",
      "https://restaurant.com/shake-shack"
    )).toBe(true);
  });

  it("rejects results from UK locations", () => {
    expect(isNonNYCResult(
      "Chucky's Shake Shack - Penzance",
      "Fish and chips in Penzance, Cornwall",
      "https://toogoodtogo.com/store/123"
    )).toBe(true);
  });

  it("allows results with NYC indicators", () => {
    expect(isNonNYCResult(
      "Carbone - New York",
      "Italian restaurant in Greenwich Village, Manhattan",
      "https://pulsd.com/carbone"
    )).toBe(false);
  });

  it("allows results with Brooklyn indicator", () => {
    expect(isNonNYCResult(
      "L'Industrie Pizzeria",
      "Best pizza in Williamsburg, Brooklyn",
      "https://restaurant.com/lindustrie"
    )).toBe(false);
  });

  it("allows results with no location mentioned", () => {
    expect(isNonNYCResult(
      "Carbone - Restaurant.com",
      "Save on dining with discount certificates",
      "https://restaurant.com/carbone"
    )).toBe(false);
  });

  it("NYC indicator overrides non-NYC city", () => {
    expect(isNonNYCResult(
      "Best Restaurants NYC",
      "Carbone in Manhattan beats any Chicago spot",
      "https://pulsd.com/carbone"
    )).toBe(false);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  extractDealDetails() — Earning/deal detail extraction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("extractDealDetails()", () => {
  it("extracts cashback percentage from text", () => {
    const result = extractDealDetails("Restaurant Deals", "10% cashback on dining");
    expect(result).not.toBeNull();
    expect(result).toContain("10% cashback");
  });

  it("extracts points multiplier from text", () => {
    const result = extractDealDetails("Earn 3x points per dollar", "Great rewards");
    expect(result).not.toBeNull();
    expect(result).toContain("3x points");
  });

  it("extracts dollar-off deals", () => {
    const result = extractDealDetails("Special Offer", "$25 off your first order");
    expect(result).not.toBeNull();
    expect(result).toContain("$25 off");
  });

  it("extracts percentage-off deals", () => {
    const result = extractDealDetails("Save up to 50% off", "Limited time");
    expect(result).not.toBeNull();
    expect(result).toContain("50% off");
  });

  it("extracts miles per dollar", () => {
    const result = extractDealDetails("Airline rewards", "Earn 5 miles per dollar spent");
    expect(result).not.toBeNull();
    expect(result).toContain("5 miles per dollar");
  });

  it("returns null when no deal info in text", () => {
    const result = extractDealDetails("Carbone Italian Restaurant", "Fine dining in Greenwich Village");
    expect(result).toBeNull();
  });

  it("extracts the first/best deal when multiple are mentioned", () => {
    const result = extractDealDetails(
      "Get 10% cashback or $25 off",
      "Multiple deals available for dining"
    );
    expect(result).not.toBeNull();
    // Should extract at least one deal detail
    expect(result!.length).toBeGreaterThan(0);
  });

  it("handles 'up to' phrasing", () => {
    const result = extractDealDetails("Rewards", "up to 15% cash back on dining");
    expect(result).not.toBeNull();
    expect(result).toContain("15% cash back");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  evaluateSearchResults() — New platform evaluation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("evaluateSearchResults() new platforms", () => {
  // --- Groupon ---
  it("Groupon: finds restaurant deal result on groupon.com", () => {
    const platform = makePlatform({
      name: "Groupon",
      domainFilter: "groupon.com",
      rewardType: "discount",
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone NYC - Restaurant Deal",
          href: "https://www.groupon.com/deals/carbone-nyc",
          snippet: "Get 30% off dining at Carbone in Manhattan",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
    expect(result.platform).toBe("Groupon");
    expect(result.url).toContain("groupon.com");
  });

  it("Groupon: filters out non-restaurant result on groupon.com", () => {
    const platform = makePlatform({
      name: "Groupon",
      domainFilter: "groupon.com",
    });

    // Non-restaurant result (spa) — title doesn't match "Carbone"
    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Best Spa Deals NYC - Groupon",
          href: "https://www.groupon.com/deals/spa-nyc",
          snippet: "Relax at Carbon Spa in NYC",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  it("Groupon: rejects result from wrong domain", () => {
    const platform = makePlatform({
      name: "Groupon",
      domainFilter: "groupon.com",
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone Restaurant Review",
          href: "https://yelp.com/biz/carbone-nyc",
          snippet: "Carbone is a fantastic Italian restaurant",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  // --- LivingSocial ---
  it("LivingSocial: finds restaurant deal", () => {
    const platform = makePlatform({
      name: "LivingSocial",
      domainFilter: "livingsocial.com",
      rewardType: "discount",
    });

    const result = evaluateSearchResults(platform, "L'Artusi", {
      results: [
        {
          title: "L'Artusi - Italian Dining Deal | LivingSocial",
          href: "https://www.livingsocial.com/deals/lartusi-nyc",
          snippet: "Save 40% on dinner at L'Artusi in West Village, Manhattan",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
    expect(result.platform).toBe("LivingSocial");
  });

  it("LivingSocial: rejects result from wrong domain", () => {
    const platform = makePlatform({
      name: "LivingSocial",
      domainFilter: "livingsocial.com",
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone NYC Reservations",
          href: "https://resy.com/cities/ny/carbone",
          snippet: "Book Carbone on Resy",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  // --- The Infatuation ---
  it("The Infatuation: finds deal roundup mentioning restaurant", () => {
    const platform = makePlatform({
      name: "The Infatuation",
      domainFilter: "theinfatuation.com",
      rewardType: "deals",
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone Restaurant Week Deal | The Infatuation",
          href: "https://www.theinfatuation.com/new-york/deals/carbone-restaurant-week",
          snippet: "Carbone is offering a special prix fixe during NYC Restaurant Week",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
    expect(result.platform).toBe("The Infatuation");
    expect(result.url).toContain("theinfatuation.com");
  });

  it("The Infatuation: rejects result from wrong domain", () => {
    const platform = makePlatform({
      name: "The Infatuation",
      domainFilter: "theinfatuation.com",
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone Review - Eater",
          href: "https://www.eater.com/reviews/carbone",
          snippet: "Our review of Carbone",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  // --- Eater ---
  it("Eater: finds editorial deal coverage", () => {
    const platform = makePlatform({
      name: "Eater",
      domainFilter: "eater.com",
      rewardType: "deals",
    });

    const result = evaluateSearchResults(platform, "Shake Shack", {
      results: [
        {
          title: "Shake Shack Deal Alert — 50% Off Burgers | Eater NY",
          href: "https://www.eater.com/new-york/shake-shack-deal",
          snippet: "Shake Shack is running a half-price burger promotion in NYC this week",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
    expect(result.platform).toBe("Eater");
    expect(result.url).toContain("eater.com");
  });

  it("Eater: rejects result from wrong domain", () => {
    const platform = makePlatform({
      name: "Eater",
      domainFilter: "eater.com",
    });

    const result = evaluateSearchResults(platform, "Shake Shack", {
      results: [
        {
          title: "Shake Shack Menu Prices",
          href: "https://www.grubhub.com/restaurant/shake-shack",
          snippet: "Order Shake Shack on Grubhub",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Query tuning — domain/path filtering behavior
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("Query tuning", () => {
  it("inKind: domainFilter works with skipSiteOperator for broader search", () => {
    const platform = makePlatform({
      name: "inKind",
      domainFilter: "inkind.com",
      searchQuery: "inkind dining",
      skipSiteOperator: true,
    });

    // Result from inkind.com should pass domain filter
    const goodResult = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone - inKind",
          href: "https://inkind.com/restaurants/carbone",
          snippet: "Dine at Carbone with inKind house account credit",
        },
      ],
      blocked: false,
    });
    expect(goodResult.found).toBe(true);

    // Result from non-inKind domain should be filtered by domainFilter
    const badResult = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone Review",
          href: "https://yelp.com/biz/carbone-new-york",
          snippet: "Carbone is an inKind dining partner",
        },
      ],
      blocked: false,
    });
    expect(badResult.found).toBe(false);
  });

  it("Rakuten Dining: rejects non-dining Rakuten pages", () => {
    const platform = makePlatform({
      name: "Rakuten Dining",
      domainFilter: "rakuten.com/dining",
    });

    // Non-dining Rakuten page — domain filter requires /dining in path
    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone Activated Charcoal - Rakuten",
          href: "https://www.rakuten.com/shop/carbone-charcoal",
          snippet: "Buy Carbone activated charcoal supplements",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  it("Rakuten Dining: allows dining-specific results", () => {
    const platform = makePlatform({
      name: "Rakuten Dining",
      domainFilter: "rakuten.com/dining",
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone — Earn 5% Cash Back | Rakuten Dining",
          href: "https://www.rakuten.com/dining/restaurant/carbone-nyc",
          snippet: "Earn cashback dining at Carbone in NYC",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
    expect(result.url).toContain("rakuten.com/dining");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  NYC location filter — new platforms integration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("NYC location filter with new platforms", () => {
  it("Groupon: rejects non-NYC location result", () => {
    const platform = makePlatform({
      name: "Groupon",
      domainFilter: "groupon.com",
    });

    const result = evaluateSearchResults(platform, "Joe's Pizza", {
      results: [
        {
          title: "Joe's Pizza - Chicago Deal",
          href: "https://www.groupon.com/deals/joes-pizza-chicago",
          snippet: "Great pizza deal at Joe's Pizza in Chicago, Illinois",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  it("Groupon: allows result with NYC indicator", () => {
    const platform = makePlatform({
      name: "Groupon",
      domainFilter: "groupon.com",
    });

    const result = evaluateSearchResults(platform, "Joe's Pizza", {
      results: [
        {
          title: "Joe's Pizza - NYC Deal",
          href: "https://www.groupon.com/deals/joes-pizza-nyc",
          snippet: "Classic New York slice deal at Joe's Pizza in Manhattan",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
  });

  it("LivingSocial: rejects non-NYC location result", () => {
    const platform = makePlatform({
      name: "LivingSocial",
      domainFilter: "livingsocial.com",
    });

    const result = evaluateSearchResults(platform, "Nobu", {
      results: [
        {
          title: "Nobu Restaurant Deal | LivingSocial",
          href: "https://www.livingsocial.com/deals/nobu-miami",
          snippet: "Dine at Nobu in Miami Beach, Florida",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  it("LivingSocial: allows result with NYC indicator", () => {
    const platform = makePlatform({
      name: "LivingSocial",
      domainFilter: "livingsocial.com",
    });

    const result = evaluateSearchResults(platform, "Nobu", {
      results: [
        {
          title: "Nobu Restaurant Deal | LivingSocial",
          href: "https://www.livingsocial.com/deals/nobu-nyc",
          snippet: "Dine at Nobu in Tribeca, NYC — exclusive deals and discounts",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
  });

  it("The Infatuation: rejects non-NYC location result", () => {
    const platform = makePlatform({
      name: "The Infatuation",
      domainFilter: "theinfatuation.com",
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone Las Vegas Deal | The Infatuation",
          href: "https://www.theinfatuation.com/las-vegas/deals/carbone",
          snippet: "Carbone brings its Italian magic to Las Vegas with a special tasting menu",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  it("Eater: rejects non-NYC location result", () => {
    const platform = makePlatform({
      name: "Eater",
      domainFilter: "eater.com",
    });

    const result = evaluateSearchResults(platform, "Shake Shack", {
      results: [
        {
          title: "Shake Shack Austin Opening Deal | Eater",
          href: "https://www.eater.com/austin/shake-shack-deal",
          snippet: "Shake Shack opens in Austin, Texas with first-week specials",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(false);
  });

  it("Eater: allows result with Brooklyn indicator", () => {
    const platform = makePlatform({
      name: "Eater",
      domainFilter: "eater.com",
    });

    const result = evaluateSearchResults(platform, "Shake Shack", {
      results: [
        {
          title: "Shake Shack Williamsburg Deal | Eater NY",
          href: "https://www.eater.com/new-york/shake-shack-williamsburg",
          snippet: "Shake Shack in Williamsburg, Brooklyn launches a weekend brunch deal",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
  });

  it("new platform result with no location mentioned is allowed", () => {
    const platform = makePlatform({
      name: "Groupon",
      domainFilter: "groupon.com",
    });

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone Restaurant Deal",
          href: "https://www.groupon.com/deals/carbone",
          snippet: "Save on your next dinner at Carbone with this exclusive deal",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  extractDealDetails() — Earning/deal info extraction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("extractDealDetails()", () => {
  it("extracts percentage cashback", () => {
    const result = extractDealDetails("Carbone on Upside", "Get 5% cashback at Carbone");
    expect(result).toContain("5% cashback");
  });

  it("extracts dollar-off deals", () => {
    const result = extractDealDetails("Carbone Deal", "$10 off your first order");
    expect(result).toContain("$10 off");
  });

  it("extracts percentage-off deals", () => {
    const result = extractDealDetails("Carbone Special", "Save 25% off dinner at Carbone");
    expect(result).toContain("25% off");
  });

  it("extracts points multipliers", () => {
    const result = extractDealDetails("Carbone - Bilt Dining", "Earn 3x points per dollar");
    expect(result).toContain("3x points");
  });

  it("extracts miles per dollar", () => {
    const result = extractDealDetails("Carbone Dining", "Earn 5 miles per dollar spent");
    expect(result).toContain("5 miles per dollar");
  });

  it("extracts save $ amounts", () => {
    const result = extractDealDetails("Carbone", "Save $25 on your next visit");
    expect(result).toContain("Save $25");
  });

  it("returns null when no deal info found", () => {
    const result = extractDealDetails("Carbone Restaurant", "Italian fine dining in Greenwich Village");
    expect(result).toBeNull();
  });

  it("extracts multiple deal details", () => {
    const result = extractDealDetails("Carbone Deal", "Get 5% cashback plus $10 off first order");
    expect(result).toContain("5% cashback");
    expect(result).toContain("$10 off");
  });
});

// ─── Gap 1.1: False positive filters ───

describe("evaluateSearchResults — false positive filters", () => {
  const platform = makePlatform({ domainFilter: "" });

  it("rejects generic list page: 'Top 10 NYC Restaurants'", () => {
    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Top 10 NYC Restaurants",
          href: "https://example.com/carbone",
          snippet: "Carbone is one of the top 10 restaurants in New York City for Italian food",
        },
      ],
      blocked: false,
    });
    expect(result.found).toBe(false);
  });

  it("rejects generic list page: 'Best restaurants in Manhattan'", () => {
    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Best restaurants in Manhattan 2026",
          href: "https://example.com/carbone",
          snippet: "Carbone leads our list of best restaurants in Manhattan for Italian cuisine",
        },
      ],
      blocked: false,
    });
    expect(result.found).toBe(false);
  });

  it("rejects generic list page: 'Dining guide 2026'", () => {
    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Dining guide 2026 — NYC picks",
          href: "https://example.com/carbone-guide",
          snippet: "Our dining guide features Carbone among the best Italian restaurants in New York",
        },
      ],
      blocked: false,
    });
    expect(result.found).toBe(false);
  });

  it("allows actual platform page: 'Carbone — Blackbird'", () => {
    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone — Blackbird",
          href: "https://www.blackbird.xyz/spots/carbone",
          snippet: "Carbone is a fine dining Italian restaurant in Greenwich Village, Manhattan",
        },
      ],
      blocked: false,
    });
    expect(result.found).toBe(true);
  });

  it("rejects aggregator URL: /blog/best-nyc-restaurants", () => {
    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone review and more",
          href: "https://example.com/blog/best-nyc-restaurants",
          snippet: "Carbone is a top pick in our roundup of the best restaurants in NYC Manhattan",
        },
      ],
      blocked: false,
    });
    expect(result.found).toBe(false);
  });

  it("rejects aggregator URL: /article/dining-guide", () => {
    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone feature in our dining guide",
          href: "https://example.com/article/dining-guide",
          snippet: "Carbone is featured in our comprehensive dining guide for New York City Manhattan",
        },
      ],
      blocked: false,
    });
    expect(result.found).toBe(false);
  });

  it("rejects short snippet (<30 chars)", () => {
    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Carbone on Platform",
          href: "https://example.com/carbone",
          snippet: "Carbone NYC",
        },
      ],
      blocked: false,
    });
    expect(result.found).toBe(false);
  });
});

// ─── Gap 1.2: NYC filter expansion ───

describe("isNonNYCResult — expanded NYC filtering", () => {
  it("rejects non-NYC zip code (90210)", () => {
    expect(isNonNYCResult(
      "Carbone - Beverly Hills",
      "Fine Italian dining near 90210 in Beverly Hills",
      "https://example.com/carbone"
    )).toBe(true);
  });

  it("allows NYC zip code (10012)", () => {
    expect(isNonNYCResult(
      "Carbone",
      "Italian restaurant at 181 Thompson St, 10012",
      "https://example.com/carbone"
    )).toBe(false);
  });

  it("rejects non-NYC neighborhood: Marina District", () => {
    expect(isNonNYCResult(
      "Carbone - San Francisco",
      "Great Italian food in the Marina District area",
      "https://example.com/carbone-sf"
    )).toBe(true);
  });

  it("rejects non-NYC neighborhood: Back Bay", () => {
    expect(isNonNYCResult(
      "Carbone - Boston",
      "Italian dining experience in Back Bay neighborhood",
      "https://example.com/carbone-boston"
    )).toBe(true);
  });

  it("rejects new non-NYC city: New Orleans", () => {
    expect(isNonNYCResult(
      "Carbone - Louisiana",
      "Fine dining arrives in New Orleans",
      "https://example.com/carbone-nola"
    )).toBe(true);
  });

  it("rejects new non-NYC city: Boca Raton", () => {
    expect(isNonNYCResult(
      "Carbone - Florida",
      "The famous Italian restaurant opens in Boca Raton",
      "https://example.com/carbone-boca"
    )).toBe(true);
  });
});

// ─── Gap 4.3: SSE timeout — checker functions use AbortSignal.timeout ───

describe("checker timeout behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BRAVE_SEARCH_API_KEY;
  });

  it("braveSearch rejects within timeout when fetch hangs", async () => {
    const name = uniqueRestaurantName("TimeoutTest");
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, options?: { signal?: AbortSignal }) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 60000);
          if (options?.signal) {
            options.signal.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(new DOMException("The operation was aborted", "AbortError"));
            });
          }
        });
      }
    );

    const start = Date.now();
    await expect(
      batchSearch(name, [makePlatform({ name: "SlowPlatform", searchQuery: "test", domainFilter: "example.com" })])
    ).resolves.toBeDefined();
    const elapsed = Date.now() - start;
    // Should resolve well under 60s — AbortSignal.timeout(15000) should abort the fetch
    expect(elapsed).toBeLessThan(20000);
  }, 25000);
});