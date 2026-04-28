import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";
import { PLATFORMS } from "./platforms";

const DB_PATH = path.join(process.cwd(), "eatdiscounted.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
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
    `);
  }
  return _db;
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + "eatdiscounted-salt").digest("hex").slice(0, 16);
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
  const normalized = normalize(restaurantName);

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
}
