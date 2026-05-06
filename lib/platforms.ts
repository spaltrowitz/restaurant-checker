export interface Platform {
  name: string;
  url: string;
  appOnly: boolean;
  rewardType: "cashback" | "points" | "credit" | "discount" | "deals";
  rewardEmoji: string;
  rewardLabel: string;
  offerType: string;
  personalized: boolean;
  cardLink: boolean;
  cardConflict: boolean;
  searchQuery: string;
  domainFilter: string;
  skipSiteOperator?: boolean;
}

export interface CheckResult {
  platform: string;
  found: boolean;
  details: string;
  method: "sitemap" | "web_search" | "api" | "error";
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
    searchQuery: "inkind dining",
    domainFilter: "inkind.com",
    skipSiteOperator: true,
  },
  {
    name: "Upside",
    url: "https://www.upside.com/find-offers",
    appOnly: false,
    rewardType: "cashback",
    rewardEmoji: "💵",
    rewardLabel: "Cashback",
    offerType:
      "Personalized: cashback % varies per user, time, and spending history",
    personalized: true,
    cardLink: true,
    cardConflict: true,
    searchQuery: "",
    domainFilter: "upside.com",
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
    searchQuery: "",
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
    searchQuery: "dining",
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
    searchQuery: "dining",
    domainFilter: "rakuten.com/dining",
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
    searchQuery: "",
    domainFilter: "toogoodtogo.com",
  },
  {
    name: "Rewards Network",
    url: "https://aadvantagedining.com",
    appOnly: false,
    rewardType: "points",
    rewardEmoji: "✈️",
    rewardLabel: "Miles/Points (8 programs)",
    offerType:
      "Uniform: earn airline miles or hotel points per $1 spent. Powers AA, United, Southwest, Hilton, Hyatt, Marriott, JetBlue, Choice",
    personalized: false,
    cardLink: true,
    cardConflict: false,
    searchQuery: "",
    domainFilter: "",
  },
  {
    name: "Pulsd",
    url: "https://pulsd.com",
    appOnly: false,
    rewardType: "discount",
    rewardEmoji: "🏷️",
    rewardLabel: "Discount (35-69% off)",
    offerType:
      "Curated: prepaid prix-fixe dining experiences at 35-69% off retail",
    personalized: false,
    cardLink: false,
    cardConflict: false,
    searchQuery: "restaurant dining deal NYC",
    domainFilter: "pulsd.com",
  },
  {
    name: "Restaurant.com",
    url: "https://www.restaurant.com",
    appOnly: false,
    rewardType: "discount",
    rewardEmoji: "🎟️",
    rewardLabel: "Discount certificates",
    offerType:
      "Discount: prepaid dining certificates at 50-80% off face value",
    personalized: false,
    cardLink: false,
    cardConflict: false,
    searchQuery: "restaurant dining certificate NYC",
    domainFilter: "restaurant.com",
  },
  {
    name: "Groupon",
    url: "https://www.groupon.com",
    appOnly: false,
    rewardType: "discount",
    rewardEmoji: "🏷️",
    rewardLabel: "Discount (deals)",
    offerType: "Discount: restaurant deals and vouchers at reduced prices",
    personalized: false,
    cardLink: false,
    cardConflict: false,
    searchQuery: "restaurant deal NYC",
    domainFilter: "groupon.com",
  },
  {
    name: "LivingSocial",
    url: "https://www.livingsocial.com",
    appOnly: false,
    rewardType: "discount",
    rewardEmoji: "🏷️",
    rewardLabel: "Discount (deals)",
    offerType: "Discount: local restaurant deals and experiences at reduced prices",
    personalized: false,
    cardLink: false,
    cardConflict: false,
    searchQuery: "restaurant deal",
    domainFilter: "livingsocial.com",
  },
  {
    name: "The Infatuation",
    url: "https://www.theinfatuation.com",
    appOnly: false,
    rewardType: "deals",
    rewardEmoji: "📰",
    rewardLabel: "Curated Deals",
    offerType: "Curated Deals: editorial roundups of dining deals, events, and promotions",
    personalized: false,
    cardLink: false,
    cardConflict: false,
    searchQuery: "restaurant deal NYC",
    domainFilter: "theinfatuation.com",
  },
  {
    name: "Eater",
    url: "https://www.eater.com",
    appOnly: false,
    rewardType: "deals",
    rewardEmoji: "📰",
    rewardLabel: "Deal Coverage",
    offerType: "Deal Coverage: editorial coverage of restaurant deals, promotions, and dining events",
    personalized: false,
    cardLink: false,
    cardConflict: false,
    searchQuery: "restaurant deal NYC",
    domainFilter: "eater.com",
  },
];

export const CARD_CONFLICT_GROUPS: string[][] = [];

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
