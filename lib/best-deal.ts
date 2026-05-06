import { CheckResult, getPlatform } from "./platforms";

export interface BestDeal {
  platform: string;
  details: string;
  method: string;
  url: string;
  savingsEstimate?: string;
  rewardLabel: string;
  rewardEmoji: string;
}

const API_PLATFORMS_WITH_RATES = new Set(["Bilt Rewards", "Rewards Network"]);

const SAVINGS_PATTERNS: RegExp[] = [
  /(\d+(?:\.\d+)?%\s*cash\s*back)/i,
  /(\d+(?:\.\d+)?x\s*points)/i,
  /(\d+(?:\.\d+)?\s*miles?\s*per\s*(?:dollar|\$))/i,
  /(earn\s*\d+(?:\.\d+)?x)/i,
  /(\d+(?:\.\d+)?%\s*off)/i,
  /(\$\d+(?:\.\d+)?\s*off)/i,
  /(up\s*to\s*\d+(?:\.\d+)?%\s*(?:cash\s*back|off|savings?))/i,
  /(\$\d+(?:\.\d+)?\s*(?:credit|bonus|value)\s*(?:for|on)\s*\$\d+(?:\.\d+)?)/i,
  /(\d+(?:\.\d+)?%\s*(?:discount|savings?))/i,
];

function extractSavingsEstimate(details: string): string | undefined {
  for (const pattern of SAVINGS_PATTERNS) {
    const match = details.match(pattern);
    if (match) return match[1].trim();
  }
  return undefined;
}

function hasDealDetails(details: string): boolean {
  return SAVINGS_PATTERNS.some((p) => p.test(details));
}

function rankResult(result: CheckResult): number {
  // Tier 1: API results with explicit earning rates (Bilt multipliers, RN miles)
  if (result.method === "api" && API_PLATFORMS_WITH_RATES.has(result.platform)) {
    return 300;
  }
  // Tier 1b: Other API results (Upside cashback, Blackbird)
  if (result.method === "api" || result.method === "sitemap") {
    return 200;
  }
  // Tier 2: Web search with extracted deal details
  if (result.method === "web_search" && hasDealDetails(result.details)) {
    return 100;
  }
  // Tier 3: Web search with just titles
  if (result.method === "web_search") {
    return 50 + Math.min(result.details.length, 40);
  }
  return 0;
}

export function findBestDeal(results: CheckResult[]): {
  best: BestDeal;
  otherDealsCount: number;
} | null {
  const found = results.filter((r) => r.found);
  if (found.length === 0) return null;

  found.sort((a, b) => rankResult(b) - rankResult(a));

  const winner = found[0];
  const platform = getPlatform(winner.platform);

  return {
    best: {
      platform: winner.platform,
      details: winner.details,
      method: winner.method,
      url: winner.url,
      savingsEstimate: extractSavingsEstimate(winner.details),
      rewardLabel: platform?.rewardLabel ?? "",
      rewardEmoji: platform?.rewardEmoji ?? "🍽️",
    },
    otherDealsCount: found.length - 1,
  };
}
