#!/usr/bin/env npx tsx

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const NYC_BOROUGHS = ["new york", "brooklyn", "queens", "bronx", "staten island", "manhattan"];

function isNYC(city: string | undefined, state: string | undefined): boolean {
  if (!state || state.toUpperCase() !== "NY") return false;
  if (!city) return false;
  const c = city.toLowerCase().trim();
  return NYC_BOROUGHS.some((b) => c.includes(b));
}

function saveJSON(filename: string, source: string, restaurants: Record<string, unknown>[]) {
  const payload = {
    source,
    fetchedAt: new Date().toISOString(),
    totalCount: restaurants.length,
    restaurants,
  };
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(payload, null, 2));
}

// ── 1. Bilt Rewards ──────────────────────────────────────────────────────────

async function fetchBilt(): Promise<Record<string, unknown>[]> {
  console.log("\n🏦 Bilt Rewards — fetching national catalog...");
  const all: any[] = [];
  let page = 0;
  const size = 100;

  while (true) {
    const url = `https://api.biltrewards.com/public/merchants?page=${page}&size=${size}`;
    console.log(`  page ${page}...`);
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.log(`  ⚠ HTTP ${res.status} on page ${page}, stopping.`);
      break;
    }
    const data = await res.json() as any;
    const meta = data.meta_data;

    const items = data.restaurants ?? data.merchants ?? data.content ?? [];
    if (items.length === 0) break;
    all.push(...items);

    if (meta && !meta.has_more_items) break;
    if (items.length < size) break;

    page++;
    await sleep(1000);
  }

  console.log(`  Total national merchants: ${all.length}`);

  const nyc = all
    .filter((m: any) => {
      const addr = m.addressDetails ?? {};
      if (addr.state === "NY" && addr.city) {
        return NYC_BOROUGHS.some((b) => addr.city.toLowerCase().includes(b));
      }
      const metro = m.metropolitanArea;
      if (metro && metro.name === "New York") return true;
      // fallback: parse the flat address string "150 Nassau St, New York, NY 10038"
      if (typeof m.address === "string" && /,\s*NY\s+\d{5}/.test(m.address)) return true;
      return false;
    })
    .map((m: any) => {
      const addr = m.addressDetails ?? {};
      return {
        name: m.name ?? "",
        address: m.address ?? addr.street1 ?? "",
        city: addr.city ?? "",
        state: addr.state ?? "",
        zip: addr.zip ?? "",
        neighborhood: m.neighborhood ?? addr.neighborhood ?? "",
        cuisine: m.primary_cuisine?.name ?? "",
        tags: (m.tags ?? []).map((t: any) => t.name),
        lat: m.latitude ?? null,
        lon: m.longitude ?? null,
        id: m.id ?? "",
        raw: m,
      };
    });

  console.log(`  NYC restaurants: ${nyc.length}`);
  return nyc;
}

// ── 2. Upside ─────────────────────────────────────────────────────────────────

async function fetchUpside(): Promise<Record<string, unknown>[]> {
  console.log("\n⬆️  Upside — fetching NYC offers...");
  const body = {
    location: {
      boundingBox: {
        southWestLat: 40.49,
        southWestLon: -74.26,
        northEastLat: 40.92,
        northEastLon: -73.68,
      },
    },
    userLocation: { latitude: 0, longitude: 0 },
  };

  const res = await fetch(
    "https://pdjc6srrfb.execute-api.us-east-1.amazonaws.com/prod/offers/refresh",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://www.upside.com" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) {
    console.log(`  ⚠ HTTP ${res.status}`);
    return [];
  }

  const data = await res.json() as any;
  const offers = data.offers ?? data.results ?? data.data ?? (Array.isArray(data) ? data : []);

  const restaurants = offers
    .filter((o: any) => o.offerCategory === "RESTAURANT")
    .map((o: any) => ({
      name: o.merchantName ?? o.name ?? "",
      address: o.address ?? o.streetAddress ?? "",
      city: o.city ?? "",
      state: o.state ?? "",
      zip: o.zipCode ?? o.postalCode ?? "",
      lat: o.latitude ?? o.lat ?? null,
      lon: o.longitude ?? o.lon ?? null,
      cashbackPercent: o.cashbackPercent ?? o.reward ?? null,
      id: o.offerId ?? o.id ?? "",
      raw: o,
    }));

  console.log(`  NYC restaurants: ${restaurants.length}`);
  return restaurants;
}

// ── 3. Rewards Network ───────────────────────────────────────────────────────

async function fetchRewardsNetwork(): Promise<Record<string, unknown>[]> {
  console.log("\n🎁 Rewards Network — fetching NYC catalog...");
  const all: Record<string, unknown>[] = [];
  let pageNo = 1;
  let totalPages = 1;

  while (pageNo <= totalPages) {
    const url = `https://aadvantagedining.com/api/v2/Merchants/Search?campaignCode=aa-dining&location=10001&pageSize=15&pageNo=${pageNo}`;
    console.log(`  page ${pageNo}/${totalPages}...`);
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.log(`  ⚠ HTTP ${res.status} on page ${pageNo}, stopping.`);
      break;
    }
    const data = await res.json() as any;

    totalPages = data.totalPages ?? data.TotalPages ?? data.total_pages ?? 1;
    const items = data.merchants ?? data.Merchants ?? data.results ?? data.data ?? (Array.isArray(data) ? data : []);
    if (items.length === 0) break;

    const mapped = items.map((m: any) => ({
      name: m.name ?? m.Name ?? m.merchantName ?? "",
      address: m.address ?? m.Address ?? m.streetAddress ?? "",
      city: m.city ?? m.City ?? "",
      state: m.state ?? m.State ?? "",
      zip: m.zip ?? m.Zip ?? m.postalCode ?? "",
      cuisine: m.cuisine ?? m.Cuisine ?? "",
      rewardPercent: m.rewardPercent ?? m.RewardPercent ?? null,
      id: m.id ?? m.Id ?? m.merchantId ?? "",
      raw: m,
    }));

    all.push(...mapped);
    if (items.length < 15) break;

    pageNo++;
    await sleep(1000);
  }

  console.log(`  NYC restaurants: ${all.length}`);
  return all;
}

// ── 4. Blackbird ─────────────────────────────────────────────────────────────

async function fetchBlackbird(): Promise<Record<string, unknown>[]> {
  console.log("\n🐦 Blackbird — fetching sitemap spots...");
  const res = await fetch("https://www.blackbird.xyz/sm.xml", {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.log(`  ⚠ HTTP ${res.status}`);
    return [];
  }
  const xml = await res.text();

  const spots: Record<string, unknown>[] = [];
  const regex = /<loc>(https?:\/\/www\.blackbird\.xyz\/spots\/[^<]+)<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const url = match[1];
    const slug = url.replace("https://www.blackbird.xyz/spots/", "");
    spots.push({ url, slug, name: slug.replace(/-/g, " ") });
  }

  console.log(`  Spots found: ${spots.length}`);
  return spots;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== API Restaurant Catalog Dump ===\n");
  const results: Record<string, number> = {};

  try {
    const bilt = await fetchBilt();
    saveJSON("bilt-nyc-restaurants.json", "bilt", bilt);
    results["Bilt NYC"] = bilt.length;
  } catch (e: any) {
    console.log(`  ❌ Bilt failed: ${e.message}`);
    results["Bilt NYC"] = 0;
  }

  try {
    const upside = await fetchUpside();
    saveJSON("upside-nyc-restaurants.json", "upside", upside);
    results["Upside NYC"] = upside.length;
  } catch (e: any) {
    console.log(`  ❌ Upside failed: ${e.message}`);
    results["Upside NYC"] = 0;
  }

  try {
    const rn = await fetchRewardsNetwork();
    saveJSON("rewards-network-nyc-restaurants.json", "rewards-network", rn);
    results["Rewards Network"] = rn.length;
  } catch (e: any) {
    console.log(`  ❌ Rewards Network failed: ${e.message}`);
    results["Rewards Network"] = 0;
  }

  try {
    const bb = await fetchBlackbird();
    saveJSON("blackbird-spots.json", "blackbird", bb);
    results["Blackbird"] = bb.length;
  } catch (e: any) {
    console.log(`  ❌ Blackbird failed: ${e.message}`);
    results["Blackbird"] = 0;
  }

  const total = Object.values(results).reduce((a, b) => a + b, 0);

  console.log("\n=== API Restaurant Catalog Dump ===");
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k.padEnd(20)} ${v} ${k === "Blackbird" ? "spots" : "restaurants"}`);
  }
  console.log(`${"TOTAL".padEnd(20)} ~${total} (before dedup)`);
  console.log("\nFiles saved to data/");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
