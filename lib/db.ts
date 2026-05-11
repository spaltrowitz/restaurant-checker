import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";
import { PLATFORMS } from "./platforms";

// Vercel/Lambda only allows writes to /tmp. Default there in serverless,
// fall back to cwd locally. DATABASE_PATH overrides both.
const isServerless = !!(process.env.VERCEL || process.env.LAMBDA_TASK_ROOT || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_PATH =
  process.env.DATABASE_PATH ||
  (isServerless ? "/tmp/eatdiscounted.db" : path.join(process.cwd(), "eatdiscounted.db"));

let _db: Database.Database | null = null;
let _dbInitFailed = false;

function getDb(): Database.Database | null {
  if (_dbInitFailed) return null;
  if (!_db) {
    try {
      _db = new Database(DB_PATH);
      // WAL needs a writable directory; only enable when not in serverless /tmp
      // because /tmp is ephemeral per invocation and WAL doesn't help there.
      if (!isServerless) {
        _db.pragma("journal_mode = WAL");
      }
      _db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_name TEXT NOT NULL,
        restaurant_normalized TEXT NOT NULL,
        platform TEXT NOT NULL,
        reporter_hash TEXT NOT NULL,
        reported_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(restaurant_normalized, platform, reporter_hash)
      );
      CREATE INDEX IF NOT EXISTS idx_reports_restaurant
        ON reports(restaurant_normalized);

      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_hash TEXT NOT NULL,
        restaurant_name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_hash, normalized_name)
      );
      CREATE INDEX IF NOT EXISTS idx_favorites_user
        ON favorites(user_hash);

      CREATE TABLE IF NOT EXISTS search_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        query_normalized TEXT NOT NULL,
        result_count INTEGER NOT NULL DEFAULT 0,
        platforms_found TEXT,
        searched_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_search_queries_normalized
        ON search_queries(query_normalized);
      CREATE INDEX IF NOT EXISTS idx_search_queries_searched_at
        ON search_queries(searched_at);
    `);
    } catch (error) {
      console.error("[db] Failed to initialize database:", error);
      _dbInitFailed = true;
      _db = null;
      return null;
    }
  }
  return _db;
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + "eatdiscounted-salt").digest("hex").slice(0, 16);
}

export function hashUser(ip: string, userAgent: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + userAgent + "eatdiscounted-favorites-salt")
    .digest("hex")
    .slice(0, 16);
}

const validPlatforms = new Set(PLATFORMS.map((p) => p.name));

export function addReport(
  restaurantName: string,
  platform: string,
  ip: string
): { success: boolean; error?: string } {
  if (!restaurantName || restaurantName.length < 2) {
    return { success: false, error: "Restaurant name too short" };
  }
  if (!validPlatforms.has(platform)) {
    return { success: false, error: "Invalid platform" };
  }

  const db = getDb();
  if (!db) return { success: false, error: "Database unavailable" };
  const normalized = normalize(restaurantName);
  const reporterHash = hashIp(ip);

  try {
    db.prepare(`
      INSERT INTO reports (restaurant_name, restaurant_normalized, platform, reporter_hash)
      VALUES (?, ?, ?, ?)
    `).run(restaurantName.trim(), normalized, platform, reporterHash);
    return { success: true };
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return { success: false, error: "Already reported" };
    }
    return { success: false, error: "Database error" };
  }
}

export interface CommunityReport {
  platform: string;
  count: number;
  latestReport: string;
}

export function getReports(restaurantName: string): CommunityReport[] {
  const db = getDb();
  if (!db) return [];
  const normalized = normalize(restaurantName);

  try {
    const rows = db.prepare(`
      SELECT platform, COUNT(*) as count, MAX(reported_at) as latest_report
      FROM reports
      WHERE restaurant_normalized = ?
      GROUP BY platform
      ORDER BY count DESC
    `).all(normalized) as Array<{ platform: string; count: number; latest_report: string }>;

    return rows.map((r) => ({
      platform: r.platform,
      count: r.count,
      latestReport: r.latest_report,
    }));
  } catch (error) {
    console.error("[db] getReports failed:", error);
    return [];
  }
}

// --- Favorites ---

export function addFavorite(userHash: string, restaurantName: string): void {
  const db = getDb();
  if (!db) return;
  const normalized = normalize(restaurantName);
  try {
    db.prepare(`
      INSERT OR IGNORE INTO favorites (user_hash, restaurant_name, normalized_name)
      VALUES (?, ?, ?)
    `).run(userHash, restaurantName.trim(), normalized);
  } catch (error) {
    console.error("[db] addFavorite failed:", error);
  }
}

export function removeFavorite(userHash: string, restaurantName: string): void {
  const db = getDb();
  if (!db) return;
  const normalized = normalize(restaurantName);
  try {
    db.prepare(`
      DELETE FROM favorites WHERE user_hash = ? AND normalized_name = ?
    `).run(userHash, normalized);
  } catch (error) {
    console.error("[db] removeFavorite failed:", error);
  }
}

export function getFavorites(userHash: string): string[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT restaurant_name FROM favorites
      WHERE user_hash = ?
      ORDER BY created_at DESC
    `).all(userHash) as Array<{ restaurant_name: string }>;
    return rows.map((r) => r.restaurant_name);
  } catch (error) {
    console.error("[db] getFavorites failed:", error);
    return [];
  }
}

export function isFavorite(userHash: string, restaurantName: string): boolean {
  const db = getDb();
  if (!db) return false;
  const normalized = normalize(restaurantName);
  try {
    const row = db.prepare(`
      SELECT 1 FROM favorites WHERE user_hash = ? AND normalized_name = ? LIMIT 1
    `).get(userHash, normalized);
    return !!row;
  } catch (error) {
    console.error("[db] isFavorite failed:", error);
    return false;
  }
}

// --- Search Query Logging ---

export function logSearch(query: string, platformsFound: string[]): void {
  const db = getDb();
  if (!db) return;
  const normalized = normalize(query);
  try {
    db.prepare(`
      INSERT INTO search_queries (query, query_normalized, result_count, platforms_found)
      VALUES (?, ?, ?, ?)
    `).run(query.trim(), normalized, platformsFound.length, platformsFound.join(",") || null);
  } catch (error) {
    console.error("[db] logSearch failed:", error);
  }
}

export interface PopularSearch {
  query: string;
  searchCount: number;
  lastSearched: string;
}

export function getPopularSearches(limit = 50): PopularSearch[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT query, COUNT(*) as search_count, MAX(searched_at) as last_searched
      FROM search_queries
      GROUP BY query_normalized
      ORDER BY search_count DESC
      LIMIT ?
    `).all(limit) as Array<{ query: string; search_count: number; last_searched: string }>;
    return rows.map((r) => ({
      query: r.query,
      searchCount: r.search_count,
      lastSearched: r.last_searched,
    }));
  } catch (error) {
    console.error("[db] getPopularSearches failed:", error);
    return [];
  }
}

export function getTrendingSearches(hours = 24, limit = 20): PopularSearch[] {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = db.prepare(`
      SELECT query, COUNT(*) as search_count, MAX(searched_at) as last_searched
      FROM search_queries
      WHERE searched_at >= datetime('now', '-' || ? || ' hours')
      GROUP BY query_normalized
      ORDER BY search_count DESC
      LIMIT ?
    `).all(hours, limit) as Array<{ query: string; search_count: number; last_searched: string }>;
    return rows.map((r) => ({
      query: r.query,
      searchCount: r.search_count,
      lastSearched: r.last_searched,
    }));
  } catch (error) {
    console.error("[db] getTrendingSearches failed:", error);
    return [];
  }
}
