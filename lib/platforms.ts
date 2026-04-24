export interface Platform {
  name: string;
  url: string;
  appOnly: boolean;
  rewardType: "cashback" | "points" | "credit" | "discount";
  rewardEmoji: string;
  rewardLabel: string;
  offerType: string;
  personalized: boolean;
  cardLink: boolean;
  cardConflict: boolean;
  searchQuery: string;
  domainFilter: string;
}

export interface CheckResult {
  platform: string;
  found: boolean;
  details: string;
  method: "sitemap" | "web_search" | "error";
  url: string;
  matches: string[];
  searchUnavailable?: boolean;
}

export interface ConflictWarning {
  type: "conflict";
  platforms: string[];
  message: string;
}

export interface DoneSignal {
  type: "done";
}

export type StreamEvent = CheckResult | ConflictWarning | DoneSignal;

export const PLATFORMS: Platform[] = [
  {
    name: "Blackbird",
    url: "https://www.blackbird.xyz/where-to-blackbird",
    appOnly: false,
    rewardType: "points",
    rewardEmoji: "⭐",
    rewardLabel: "Points ($FLY)",
    offerType:
      "Personalized: tiered rewards via $FLY points, perks scale with visit frequency",
    personalized: true,
    cardLink: true,
    cardConflict: false,
    searchQuery: "",
    domainFilter: "",
  },
  {
    name: "inKind",
    url: "https://inkind.com/#explore-restaurants",
    appOnly: false,
    rewardType: "credit",
    rewardEmoji: "🎟️",
    rewardLabel: "Credit (house accounts)",
    offerType:
      "Mostly uniform: pre-pay house accounts with bonus credit (e.g. spend $100 get $120)",
    personalized: false,
    cardLink: false,
    cardConflict: false,
    searchQuery: "site:inkind.com",
    domainFilter: "inkind.com",
  },
  {
    name: "Upside",
    url: "https://www.upside.com/find-offers",
    appOnly: true,
    rewardType: "cashback",
    rewardEmoji: "💵",
    rewardLabel: "Cashback",
    offerType:
      "Personalized: cashback % varies per user, time, and spending history",
    personalized: true,
    cardLink: true,
    cardConflict: true,
    searchQuery: "site:upside.com",
    domainFilter: "upside.com",
  },
  {
    name: "Seated",
    url: "https://seatedapp.io",
    appOnly: true,
    rewardType: "cashback",
    rewardEmoji: "💵",
    rewardLabel: "Cashback (up to 30%)",
    offerType:
      "Personalized: cashback % varies by user, time of day, day of week (up to 30%)",
    personalized: true,
    cardLink: true,
    cardConflict: true,
    searchQuery: "(site:seatedapp.io OR site:getseated.com)",
    domainFilter: "seated",
  },
  {
    name: "Nea",
    url: "https://neaapp.ai",
    appOnly: true,
    rewardType: "cashback",
    rewardEmoji: "💵",
    rewardLabel: "Cashback (NYC only)",
    offerType:
      "Personalized: daily rewards vary per user, ~6% avg cashback to Venmo (NYC only)",
    personalized: true,
    cardLink: true,
    cardConflict: true,
    searchQuery: "site:neaapp.ai",
    domainFilter: "neaapp.ai",
  },
  {
    name: "Bilt Rewards",
    url: "https://www.biltrewards.com/dining",
    appOnly: false,
    rewardType: "points",
    rewardEmoji: "⭐",
    rewardLabel: "Points (1-11x/$)",
    offerType:
      "Points: 1-5x Bilt points/$ (up to 11x on Rent Day w/ Bilt card). Transferable to airlines/hotels",
    personalized: false,
    cardLink: true,
    cardConflict: false,
    searchQuery: "site:biltrewards.com dining",
    domainFilter: "biltrewards.com",
  },
  {
    name: "Rakuten Dining",
    url: "https://www.rakuten.com/dining",
    appOnly: true,
    rewardType: "cashback",
    rewardEmoji: "💵",
    rewardLabel: "Cashback (5-10%)",
    offerType:
      "Uniform: 5% cashback (10% w/ Rakuten Amex) at all participating restaurants",
    personalized: false,
    cardLink: true,
    cardConflict: false,
    searchQuery: "site:rakuten.com/dining OR site:rakuten.com/food",
    domainFilter: "rakuten.com",
  },
  {
    name: "Too Good To Go",
    url: "https://www.toogoodtogo.com",
    appOnly: false,
    rewardType: "discount",
    rewardEmoji: "🏷️",
    rewardLabel: "Discount (~1/3 price)",
    offerType: "Uniform: surprise bags of surplus food at ~1/3 retail price",
    personalized: false,
    cardLink: false,
    cardConflict: false,
    searchQuery: "site:toogoodtogo.com",
    domainFilter: "toogoodtogo.com",
  },
];

export const CARD_CONFLICT_GROUPS: string[][] = [
  ["Seated", "Upside", "Nea"],
];

export const RATE_LIMIT_DELAY = 2000;

export function getConflictingPlatforms(platformName: string): string[] {
  for (const group of CARD_CONFLICT_GROUPS) {
    if (group.includes(platformName)) {
      return group.filter((p) => p !== platformName);
    }
  }
  return [];
}

export function detectCardConflicts(foundPlatforms: string[]): string[] | null {
  for (const group of CARD_CONFLICT_GROUPS) {
    const overlap = foundPlatforms.filter((p) => group.includes(p));
    if (overlap.length > 1) return overlap;
  }
  return null;
}

export function getPlatform(name: string): Platform | undefined {
  return PLATFORMS.find((p) => p.name === name);
}
