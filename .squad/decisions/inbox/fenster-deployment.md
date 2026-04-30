# Fly.io Deployment Configuration

**Author:** Fenster | **Date:** 2026-04-30 | **Status:** Implemented

## Decision

Deploy to Fly.io with persistent volumes for SQLite. This avoids the serverless cold-start problem and keeps our in-memory caching and rate limiting intact (single long-lived process).

## Key Details

- **Platform:** Fly.io (shared-cpu-1x, 512MB RAM, Newark region)
- **Database:** SQLite on persistent volume at `/data/eatdiscounted.db`
- **DB path:** Configurable via `DATABASE_PATH` env var (defaults to `process.cwd()/eatdiscounted.db` for local dev)
- **Auto-stop:** Machines stop when idle (cost = $0 when no traffic), auto-start on request
- **Secrets:** `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_ID` set via `fly secrets` (not in fly.toml)

## Trade-offs

- Single machine = single-writer SQLite works perfectly, no need for hosted DB
- In-memory cache survives across requests (unlike serverless) but lost on deploys
- Auto-stop means first request after idle has ~2-3s cold start (acceptable for side project)
- 1GB volume is more than enough for reports table; can resize later if needed

## Implications

- No need for Redis/Upstash for caching or rate limiting (process stays alive)
- Backups: Consider `fly ssh console` + `sqlite3 .backup` or litestream for production backup
- If we ever need multiple instances, we'd need to move to LiteFS or a hosted DB
