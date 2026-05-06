import { NextRequest } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const runtime = "nodejs";

// NYC zip → neighborhood mapping
const ZIP_TO_NEIGHBORHOOD: Record<string, string> = {
  "10001": "Chelsea/Flatiron",
  "10002": "Lower East Side",
  "10003": "East Village/Gramercy",
  "10004": "Financial District",
  "10005": "Financial District",
  "10006": "Financial District",
  "10007": "Tribeca",
  "10009": "East Village",
  "10010": "Gramercy/Flatiron",
  "10011": "Chelsea",
  "10012": "SoHo/Nolita",
  "10013": "SoHo/Tribeca",
  "10014": "West Village",
  "10016": "Murray Hill",
  "10017": "Midtown East",
  "10018": "Midtown West/Hell's Kitchen",
  "10019": "Midtown West/Hell's Kitchen",
  "10020": "Midtown",
  "10021": "Upper East Side",
  "10022": "Midtown East",
  "10023": "Upper West Side",
  "10024": "Upper West Side",
  "10025": "Upper West Side",
  "10026": "Harlem",
  "10027": "Harlem",
  "10028": "Upper East Side",
  "10029": "East Harlem",
  "10030": "Harlem",
  "10031": "Washington Heights",
  "10032": "Washington Heights",
  "10033": "Washington Heights",
  "10034": "Inwood",
  "10035": "East Harlem",
  "10036": "Times Square/Theater District",
  "10038": "Financial District/Seaport",
  "10039": "Harlem",
  "10040": "Washington Heights",
  "10065": "Upper East Side",
  "10075": "Upper East Side",
  "10128": "Upper East Side",
  "10280": "Battery Park City",
  "10281": "Battery Park City",
  "10301": "Staten Island - St. George",
  "10451": "South Bronx",
  "10452": "South Bronx",
  "10453": "West Bronx",
  "10454": "South Bronx",
  "10455": "South Bronx",
  "10456": "West Bronx",
  "10458": "Belmont/Bronx",
  "10461": "East Bronx",
  "10462": "East Bronx",
  "10463": "Kingsbridge/Bronx",
  "10464": "City Island/Bronx",
  "10465": "Throggs Neck/Bronx",
  "10466": "North Bronx",
  "10467": "Norwood/Bronx",
  "10468": "Fordham/Bronx",
  "10469": "North Bronx",
  "10470": "North Bronx",
  "10471": "Riverdale/Bronx",
  "10472": "East Bronx",
  "10475": "Co-op City/Bronx",
  "11101": "Long Island City",
  "11102": "Astoria",
  "11103": "Astoria",
  "11104": "Sunnyside",
  "11105": "Astoria",
  "11106": "Astoria",
  "11109": "Long Island City",
  "11201": "Brooklyn Heights/DUMBO",
  "11203": "East Flatbush",
  "11204": "Bensonhurst",
  "11205": "Clinton Hill/Fort Greene",
  "11206": "Bushwick/Williamsburg",
  "11207": "East New York",
  "11209": "Bay Ridge",
  "11211": "Williamsburg",
  "11212": "Brownsville",
  "11213": "Crown Heights",
  "11214": "Bensonhurst/Bath Beach",
  "11215": "Park Slope",
  "11216": "Crown Heights/Bed-Stuy",
  "11217": "Boerum Hill/Prospect Heights",
  "11218": "Kensington/Flatbush",
  "11219": "Borough Park",
  "11220": "Sunset Park",
  "11221": "Bushwick/Bed-Stuy",
  "11222": "Greenpoint",
  "11223": "Gravesend",
  "11224": "Coney Island/Brighton Beach",
  "11225": "Crown Heights/Prospect Lefferts",
  "11226": "Flatbush",
  "11228": "Dyker Heights",
  "11229": "Sheepshead Bay",
  "11230": "Midwood",
  "11231": "Carroll Gardens/Red Hook",
  "11232": "Sunset Park/Industry City",
  "11233": "Brownsville/Ocean Hill",
  "11234": "Canarsie/Mill Basin",
  "11235": "Brighton Beach/Sheepshead Bay",
  "11236": "Canarsie",
  "11237": "Bushwick",
  "11238": "Prospect Heights/Crown Heights",
  "11239": "East New York",
  "11249": "Williamsburg",
  "11354": "Flushing",
  "11356": "College Point",
  "11357": "Whitestone",
  "11358": "Flushing/Murray Hill",
  "11360": "Bayside",
  "11361": "Bayside",
  "11362": "Little Neck",
  "11365": "Fresh Meadows",
  "11367": "Kew Gardens Hills",
  "11368": "Corona",
  "11372": "Jackson Heights",
  "11373": "Elmhurst",
  "11374": "Rego Park",
  "11375": "Forest Hills",
  "11377": "Woodside",
  "11378": "Maspeth",
  "11379": "Middle Village",
  "11385": "Ridgewood/Glendale",
  "11414": "Howard Beach",
  "11415": "Kew Gardens",
  "11416": "Ozone Park",
  "11417": "Ozone Park",
  "11418": "Richmond Hill",
  "11419": "South Richmond Hill",
  "11421": "Woodhaven",
  "11432": "Jamaica",
  "11435": "Jamaica/Briarwood",
  "11692": "Rockaway",
};

interface RestaurantEntry {
  name: string;
  address: string;
  neighborhood: string;
  platforms: Record<string, { deal: string; url: string }>;
}

type DumpFile = {
  source: string;
  restaurants: Record<string, unknown>[];
};

function extractZip(fullAddress: string): string | null {
  const match = fullAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

function neighborhoodFromZip(zip: string): string | null {
  const clean = zip.replace(/-\d+$/, "").slice(0, 5);
  return ZIP_TO_NEIGHBORHOOD[clean] ?? null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadAndIndex(): Map<string, RestaurantEntry> {
  const dataDir = path.resolve(process.cwd(), "data");
  const index = new Map<string, RestaurantEntry>();

  // Bilt
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(dataDir, "bilt-nyc-restaurants.json"), "utf-8")
    ) as DumpFile;
    for (const r of raw.restaurants) {
      const rec = r as Record<string, unknown>;
      const name = rec.name as string;
      if (!name) continue;
      const zip = (rec.zip as string) || "";
      const address = (rec.address as string) || "";
      const hood = neighborhoodFromZip(zip) || neighborhoodFromZip(extractZip(address) || "");
      if (!hood) continue;

      const rawData = rec.raw as Record<string, unknown> | undefined;
      const multiplier = rawData?.multiplier as Record<string, number> | undefined;
      const maxMul = multiplier
        ? Math.max(...Object.values(multiplier))
        : null;
      const deal = maxMul ? `${maxMul}x Bilt points per $1` : "Bilt points per $1";

      const key = slugify(name);
      const existing = index.get(key);
      if (existing) {
        existing.platforms["bilt"] = {
          deal,
          url: "https://www.biltrewards.com/dining",
        };
      } else {
        index.set(key, {
          name,
          address,
          neighborhood: hood,
          platforms: {
            bilt: {
              deal,
              url: "https://www.biltrewards.com/dining",
            },
          },
        });
      }
    }
  } catch {
    // file missing — skip
  }

  // Rewards Network
  try {
    const raw = JSON.parse(
      fs.readFileSync(
        path.join(dataDir, "rewards-network-nyc-restaurants.json"),
        "utf-8"
      )
    ) as DumpFile;
    for (const r of raw.restaurants) {
      const rec = r as Record<string, unknown>;
      const rawData = rec.raw as Record<string, unknown> | undefined;
      const name = (rec.name as string) || (rawData?.name as string) || "";
      if (!name) continue;

      const location = rawData?.location as Record<string, unknown> | undefined;
      const addr = location?.address as Record<string, string> | undefined;
      const zip = addr?.zip || "";
      const address1 = addr?.address1 || "";
      const city = addr?.city || "";
      const state = addr?.state || "";
      const fullAddress = [address1, city, state, zip]
        .filter(Boolean)
        .join(", ");
      const hood = neighborhoodFromZip(zip);
      if (!hood) continue;

      const benefits = rawData?.benefits as Array<{ value: string }> | undefined;
      const maxMiles = benefits
        ? Math.max(...benefits.map((b) => parseInt(b.value, 10) || 0))
        : 0;
      const deal = maxMiles > 0 ? `Up to ${maxMiles} miles per $1` : "Airline miles per $1";

      const key = slugify(name);
      const existing = index.get(key);
      if (existing) {
        existing.platforms["rewards-network"] = {
          deal,
          url: "https://aadvantagedining.com",
        };
        if (!existing.address && fullAddress) existing.address = fullAddress;
      } else {
        index.set(key, {
          name,
          address: fullAddress,
          neighborhood: hood,
          platforms: {
            "rewards-network": {
              deal,
              url: "https://aadvantagedining.com",
            },
          },
        });
      }
    }
  } catch {
    // file missing — skip
  }

  // Upside
  try {
    const raw = JSON.parse(
      fs.readFileSync(
        path.join(dataDir, "upside-nyc-restaurants.json"),
        "utf-8"
      )
    ) as DumpFile;
    for (const r of raw.restaurants) {
      const rec = r as Record<string, unknown>;
      const rawData = rec.raw as Record<string, unknown> | undefined;
      const siteLocation = rawData?.siteLocation as Record<string, unknown> | undefined;
      const name =
        (rec.name as string) || (rawData?.text as string) || "";
      if (!name) continue;

      const zip = (siteLocation?.postCode as string) || "";
      const address1 = (siteLocation?.address1 as string) || "";
      const locality = (siteLocation?.locality as string) || "";
      const region = (siteLocation?.region as string) || "";
      const fullAddress = [address1, locality, region, zip]
        .filter(Boolean)
        .join(", ");
      const hood = neighborhoodFromZip(zip);
      if (!hood) continue;

      const discounts = rawData?.discounts as Array<{
        percentOff: number;
        detailText: string;
      }> | undefined;
      const topDiscount = discounts?.[0];
      const deal = topDiscount
        ? topDiscount.detailText || `${Math.round(topDiscount.percentOff * 100)}% cash back`
        : "Cash back";

      const key = slugify(name);
      const existing = index.get(key);
      if (existing) {
        existing.platforms["upside"] = {
          deal,
          url: "https://www.upside.com/find-offers",
        };
        if (!existing.address && fullAddress) existing.address = fullAddress;
      } else {
        index.set(key, {
          name,
          address: fullAddress,
          neighborhood: hood,
          platforms: {
            upside: {
              deal,
              url: "https://www.upside.com/find-offers",
            },
          },
        });
      }
    }
  } catch {
    // file missing — skip
  }

  return index;
}

// Cache the index in memory
let cachedIndex: Map<string, RestaurantEntry> | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL = 300_000; // 5 min

function getIndex(): Map<string, RestaurantEntry> {
  if (cachedIndex && Date.now() - cacheLoadedAt < CACHE_TTL) {
    return cachedIndex;
  }
  cachedIndex = loadAndIndex();
  cacheLoadedAt = Date.now();
  return cachedIndex;
}

interface NeighborhoodSummary {
  slug: string;
  name: string;
  restaurantCount: number;
}

interface NeighborhoodDetail {
  slug: string;
  name: string;
  restaurants: {
    name: string;
    address: string;
    platforms: Record<string, { deal: string; url: string }>;
  }[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const neighborhoodSlug = searchParams.get("neighborhood");

  const index = getIndex();

  // Group by neighborhood
  const byNeighborhood = new Map<string, RestaurantEntry[]>();
  for (const entry of index.values()) {
    const list = byNeighborhood.get(entry.neighborhood) || [];
    list.push(entry);
    byNeighborhood.set(entry.neighborhood, list);
  }

  if (neighborhoodSlug) {
    // Find neighborhood by slug
    let matchedName: string | null = null;
    for (const name of byNeighborhood.keys()) {
      if (slugify(name) === neighborhoodSlug) {
        matchedName = name;
        break;
      }
    }

    if (!matchedName) {
      return Response.json(
        { error: "Neighborhood not found" },
        { status: 404 }
      );
    }

    const restaurants = byNeighborhood.get(matchedName)!;
    restaurants.sort((a, b) =>
      Object.keys(b.platforms).length - Object.keys(a.platforms).length
    );

    const detail: NeighborhoodDetail = {
      slug: slugify(matchedName),
      name: matchedName,
      restaurants: restaurants.map((r) => ({
        name: r.name,
        address: r.address,
        platforms: r.platforms,
      })),
    };

    return Response.json(detail);
  }

  // Return all neighborhoods sorted by restaurant count
  const neighborhoods: NeighborhoodSummary[] = [];
  for (const [name, restaurants] of byNeighborhood.entries()) {
    neighborhoods.push({
      slug: slugify(name),
      name,
      restaurantCount: restaurants.length,
    });
  }
  neighborhoods.sort((a, b) => b.restaurantCount - a.restaurantCount);

  return Response.json({
    totalNeighborhoods: neighborhoods.length,
    totalRestaurants: index.size,
    neighborhoods,
  });
}
