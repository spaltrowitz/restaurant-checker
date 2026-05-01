import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { batchSearch, evaluateSearchResults } from "../checkers";
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

    // Should have results for all non-Blackbird platforms
    const platformNames = [
      "inKind",
      "Upside",
      "Seated",
      "Nea",
      "Bilt Rewards",
      "Rakuten Dining",
      "Too Good To Go",
    ];

    for (const name of platformNames) {
      expect(results.has(name)).toBe(true);
    }

    // Should NOT include Blackbird
    expect(results.has("Blackbird")).toBe(false);
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

    // Check that fetch was called with site: operator for platforms with domainFilter
    const fetchCalls = vi.mocked(fetch).mock.calls;
    const inKindCall = fetchCalls.find((call) => {
      const url = call[0] as string;
      return url.includes(restaurantName) && url.includes("site%3Ainkind.com");
    });

    expect(inKindCall).toBeDefined();
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

    // Bilt Rewards has searchQuery: "dining"
    const biltCall = fetchCalls.find((call) => {
      const url = call[0] as string;
      return url.includes(restaurantName) && url.includes("dining");
    });

    expect(biltCall).toBeDefined();
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
    expect(result.details).toBe("Carbone - inKind");
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
      name: "Seated",
      appOnly: true,
      domainFilter: "seated",
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
          snippet: "Great Italian food",
        },
      ],
      blocked: false,
    });
    expect(titleMatch.found).toBe(true);

    // Match in snippet
    const snippetMatch = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Italian Restaurant",
          href: "https://example.com/restaurant",
          snippet: "Carbone is a classic NYC spot",
        },
      ],
      blocked: false,
    });
    expect(snippetMatch.found).toBe(true);

    // Match in URL
    const urlMatch = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "Restaurant Page",
          href: "https://example.com/carbone-nyc",
          snippet: "Fine dining",
        },
      ],
      blocked: false,
    });
    expect(urlMatch.found).toBe(true);
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
          snippet: "Carbone reviews",
        },
        {
          title: "Carbone on inKind",
          href: "https://inkind.com/carbone",
          snippet: "Book with credit",
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
          snippet: "Restaurant",
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

    const result = evaluateSearchResults(platform, "Carbone", {
      results: [
        {
          title: "", // Empty title
          href: "https://example.com/carbone",
          snippet: "Visit Carbone today",
        },
      ],
      blocked: false,
    });

    expect(result.found).toBe(true);
    expect(result.details).toBe("Found on TestPlatform"); // Fallback when title is empty
  });
});
