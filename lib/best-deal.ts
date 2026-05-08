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

// Cashback/discount platforms that give real money back
const CASHBACK_PLATFORMS = new Set(["Upside", "Nea", "Rakuten Dining"]);
const DISCOUNT_PLATFORMS = new Set(["Too Good To Go", "Pulsd", "Restaurant.com", "Groupon", "LivingSocial", "inKind"]);

function rankResult(result: CheckResult): number {
  // Tier 1a: API cashback results (Upside — real money back)
  if (result.method === "api" && CASHBACK_PLATFORMS.has(result.platform)) {
    return 400;
  }
  // Tier 1b: API results with discount/credit (Blackbird, Bilt — points but from API)
  if (result.method === "api" || result.method === "sitemap") {
    return 200;
  }
  // Tier 2: Web search with extracted deal details (actual % or $ amounts)
  if (result.method === "web_search" && hasDealDetails(result.details)) {
    // Cashback/discount platforms rank higher than points
    if (CASHBACK_PLATFORMS.has(result.platform) || DISCOUNT_PLATFORMS.has(result.platform)) {
      return 150;
    }
    return 100;
  }
  // Tier 3: Web search found but no deal details — NOT a deal, just a listing
  // These should never be "Best Deal"
  if (result.method === "web_search") {
    return 10;
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
  // Don't show "Best Deal" if the top result is just a web listing with no deal info
  if (rankResult(winner) <= 10) return null;

  const platform = getPlatform(winner.platform);

  return {
    best: {
      platform: winner.platform,
      details: winner.details,
      method: winner.method,
      url: winner.url,
      savingsEstimate: extractSavingsEstimate(winner.details),
      rewardLabel: platform?.rewardLabel ?? "",
      rewardEmoji: platform?.rewardEmoji ?? "",
    },
    otherDealsCount: found.filter((r) => r !== winner && rankResult(r) > 10).length,
  };
}
