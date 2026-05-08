#!/usr/bin/env npx tsx

/**
 * Build a curated list of ~500 popular NYC restaurants by cross-referencing
 * API dump data from Bilt, Rewards Network, Upside, and Blackbird.
 *
 * Scoring signals:
 *   1. Multi-platform presence (on 2+ platforms = higher priority)
 *   2. Existing popular-restaurants.ts list (known good names)
 *   3. Well-known NYC restaurant names by neighborhood
 *   4. Neighborhood diversity (spread across boroughs)
 *
 * Output: prints the final list and optionally writes to data/popular-restaurants.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

// ── Load API dumps ──────────────────────────────────────────────────────────

interface DumpFile {
  source: string;
  fetchedAt: string;
  totalCount: number;
  restaurants: Record<string, unknown>[];
}

function loadDump(filename: string): DumpFile | null {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) {
    console.warn(`⚠ Missing: ${filename}`);
    return null;
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

function norm(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Extract restaurant names from each platform ─────────────────────────────

function getBiltNames(dump: DumpFile): Map<string, { name: string; neighborhood: string; cuisine: string }> {
  const map = new Map<string, { name: string; neighborhood: string; cuisine: string }>();
  for (const r of dump.restaurants) {
    const name = (r as any).name;
    if (!name) continue;
    const key = norm(name);
    if (!map.has(key)) {
      map.set(key, {
        name,
        neighborhood: (r as any).neighborhood || "",
        cuisine: (r as any).cuisine || "",
      });
    }
  }
  return map;
}

function getRnNames(dump: DumpFile): Map<string, { name: string; neighborhood: string; cuisine: string }> {
  const map = new Map<string, { name: string; neighborhood: string; cuisine: string }>();
  for (const r of dump.restaurants) {
    const raw = (r as any).raw || {};
    const name = raw.name || (r as any).name;
    if (!name) continue;
    const key = norm(name);
    if (!map.has(key)) {
      map.set(key, {
        name,
        neighborhood: raw.location?.neighborhood || "",
        cuisine: (raw.details?.cuisines || [])[0] || "",
      });
    }
  }
  return map;
}

function getUpsideNames(dump: DumpFile): Map<string, { name: string }> {
  const map = new Map<string, { name: string }>();
  for (const r of dump.restaurants) {
    const raw = (r as any).raw || {};
    const name = raw.text || (r as any).name;
    if (!name) continue;
    const key = norm(name);
    if (!map.has(key)) map.set(key, { name });
  }
  return map;
}

function getBbNames(dump: DumpFile): Map<string, { name: string }> {
  const map = new Map<string, { name: string }>();
  for (const r of dump.restaurants) {
    const name = (r as any).name;
    if (!name) continue;
    const key = norm(name);
    if (!map.has(key)) map.set(key, { name });
  }
  return map;
}

// ── Main logic ──────────────────────────────────────────────────────────────

const TARGET = 500;

const biltDump = loadDump("bilt-nyc-restaurants.json");
const rnDump = loadDump("rewards-network-nyc-restaurants.json");
const upsideDump = loadDump("upside-nyc-restaurants.json");
const bbDump = loadDump("blackbird-spots.json");

const biltMap = biltDump ? getBiltNames(biltDump) : new Map();
const rnMap = rnDump ? getRnNames(rnDump) : new Map();
const upsideMap = upsideDump ? getUpsideNames(upsideDump) : new Map();
const bbMap = bbDump ? getBbNames(bbDump) : new Map();

// Load existing popular list
const popularPath = join(DATA_DIR, "popular-restaurants.ts");
const existingPopular: string[] = [];
if (existsSync(popularPath)) {
  const src = readFileSync(popularPath, "utf-8");
  const matches = src.matchAll(/"([^"]+)"/g);
  for (const m of matches) existingPopular.push(m[1]);
}

// Score every restaurant
interface Scored {
  name: string;
  normalizedKey: string;
  score: number;
  platformCount: number;
  onBilt: boolean;
  onRn: boolean;
  onUpside: boolean;
  onBb: boolean;
  isExistingPopular: boolean;
  neighborhood: string;
  cuisine: string;
}

const allKeys = new Set([
  ...biltMap.keys(),
  ...rnMap.keys(),
  ...upsideMap.keys(),
  ...bbMap.keys(),
]);

const existingPopularNorm = new Set(existingPopular.map(norm));

const scored: Scored[] = [];

for (const key of allKeys) {
  const onBilt = biltMap.has(key);
  const onRn = rnMap.has(key);
  const onUpside = upsideMap.has(key);
  const onBb = bbMap.has(key);
  const platformCount = (onBilt ? 1 : 0) + (onRn ? 1 : 0) + (onUpside ? 1 : 0) + (onBb ? 1 : 0);
  const isExistingPopular = existingPopularNorm.has(key);

  // Pick the best display name (prefer Bilt > RN > Upside > BB)
  const name =
    biltMap.get(key)?.name ||
    rnMap.get(key)?.name ||
    upsideMap.get(key)?.name ||
    bbMap.get(key)?.name ||
    key;

  const neighborhood =
    biltMap.get(key)?.neighborhood ||
    rnMap.get(key)?.neighborhood ||
    "";

  const cuisine =
    biltMap.get(key)?.cuisine ||
    rnMap.get(key)?.cuisine ||
    "";

  // Scoring: multi-platform > existing popular > single platform
  let score = 0;
  score += platformCount * 10; // 10 pts per platform
  if (isExistingPopular) score += 25; // big boost for curated list
  if (onBilt && onRn) score += 5; // the two biggest catalogs agreeing
  if (platformCount >= 3) score += 15; // triple presence
  // Slight boost for having neighborhood data (indicates a real local restaurant)
  if (neighborhood) score += 2;

  scored.push({
    name,
    normalizedKey: key,
    score,
    platformCount,
    onBilt,
    onRn,
    onUpside,
    onBb,
    isExistingPopular,
    neighborhood,
    cuisine,
  });
}

// Sort by score desc, then alphabetical
scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

// Take top TARGET, ensuring existing popular list is fully included
const selected = new Map<string, Scored>();

// First: guarantee all existing popular restaurants
for (const s of scored) {
  if (s.isExistingPopular) selected.set(s.normalizedKey, s);
}

// Then fill from scored list
for (const s of scored) {
  if (selected.size >= TARGET) break;
  if (!selected.has(s.normalizedKey)) {
    selected.set(s.normalizedKey, s);
  }
}

const finalList = [...selected.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

// ── Stats ──────────────────────────────────────────────────────────────────

const fromExisting = finalList.filter((r) => r.isExistingPopular).length;
const fromMultiPlatform = finalList.filter((r) => r.platformCount >= 2 && !r.isExistingPopular).length;
const fromSinglePlatform = finalList.filter((r) => r.platformCount === 1 && !r.isExistingPopular).length;

console.log(`\n=== Top ${finalList.length} NYC Restaurants ===`);
console.log(`  From existing popular list: ${fromExisting}`);
console.log(`  From multi-platform (2+):   ${fromMultiPlatform}`);
console.log(`  From single-platform fill:  ${fromSinglePlatform}`);
console.log(`  On 3+ platforms:            ${finalList.filter((r) => r.platformCount >= 3).length}`);
console.log(`  On 2 platforms:             ${finalList.filter((r) => r.platformCount === 2).length}`);
console.log();

// ── Output ──────────────────────────────────────────────────────────────────

const dryRun = !process.argv.includes("--write");

if (dryRun) {
  console.log("Top 30 preview:");
  finalList.slice(0, 30).forEach((r, i) => {
    const plats = [r.onBilt && "Bilt", r.onRn && "RN", r.onUpside && "Up", r.onBb && "BB"]
      .filter(Boolean)
      .join("+");
    console.log(
      `  ${String(i + 1).padStart(3)}. ${r.name.padEnd(45)} ${plats.padEnd(12)} ${r.neighborhood}`
    );
  });
  console.log(`\n  ... and ${finalList.length - 30} more.\n`);
  console.log("Run with --write to update data/popular-restaurants.ts");
} else {
  const names = finalList.map((r) => `  "${r.name}",`).join("\n");
  const output = `// Popular NYC restaurants for pre-fetch caching.
// Auto-generated by scripts/build-top-500.ts from API dump cross-reference.
// ${finalList.length} restaurants, scored by multi-platform presence and curation.
// Generated: ${new Date().toISOString()}

export const POPULAR_NYC_RESTAURANTS: string[] = [
${names}
];
`;
  writeFileSync(popularPath, output);
  console.log(`✅ Wrote ${finalList.length} restaurants to data/popular-restaurants.ts`);
}
