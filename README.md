# EatDiscounted 🍽️

Find which dining discount platforms list a given restaurant — from the web or the command line.

## Web App

A Next.js web UI that checks 8 discount platforms for any restaurant name. Results stream in as each platform is checked.

### Pages

- **`/`** — Search page: type a restaurant name, see which platforms have it
- **`/platforms`** — Info page: all 8 platforms with reward types, card linking, and conflicts

### Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**API Setup**: Copy `.env.local.example` to `.env.local` and add your Google Custom Search API key and CSE ID. See the example file for setup instructions.

### How It Works

| Platform | Check Method |
|----------|-------------|
| **Blackbird** | Public sitemap parsing (`sm.xml`) |
| **All others** | Google Custom Search Engine (CSE) with `site:` filtering |

- Results stream in via SSE (Server-Sent Events) as each platform completes
- 2-second rate limit between platform checks (handled server-side)
- App-only platforms (Upside, Seated, Nea, Rakuten) may not appear in web search — check the app manually
- **Free tier limit**: Google CSE provides 100 queries per day with the free tier

### Architecture

```
app/
  page.tsx              Home page (search + streaming results)
  platforms/page.tsx    Platform info page
  api/check/route.ts   SSE streaming API endpoint
lib/
  platforms.ts          Platform data + types
  checkers.ts           Blackbird sitemap + Google CSE search
  matching.ts           String matching helpers
components/
  SearchBar.tsx         Search input
  SearchResults.tsx     SSE consumer + result grid
  ResultCard.tsx        Platform result card
  ConflictWarning.tsx   Card conflict warning
  Nav.tsx               Navigation bar
```

## Deployment (Fly.io)

1. Install the Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Authenticate: `fly auth login`
3. Launch: `fly launch` (uses existing fly.toml)
4. Create a volume for SQLite: `fly volumes create data --size 1 --region ewr`
5. Set secrets: `fly secrets set GOOGLE_CSE_API_KEY=your_key GOOGLE_CSE_ID=your_id`
6. Deploy: `fly deploy`

The app uses SQLite with a persistent Fly volume mounted at `/data`. The database file lives at `/data/eatdiscounted.db`.

## CLI Tool

The original Python CLI is also in this repo. See `cli/restaurant_checker.py`.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r cli/requirements.txt
python cli/restaurant_checker.py check "Carbone"
```

## Platforms (8)

| Platform | Reward Type | Personalized? | Card Linked? |
|----------|:-----------:|:-------------:|:------------:|
| **Blackbird** | ⭐ Points ($FLY) | Yes | Yes |
| **inKind** | 🎟️ Credit (house accounts) | No | No |
| **Upside** | 💵 Cashback | Yes | Yes ⚠️ |
| **Seated** | 💵 Cashback | Yes | Yes ⚠️ |
| **Nea** | 💵 Cashback (NYC only) | Yes | Yes ⚠️ |
| **Bilt Rewards** | ⭐ Points (1-11x/dollar) | No | Yes |
| **Rakuten Dining** | 💵 Cashback (5-10%) | No | Yes |
| **Too Good To Go** | 🏷️ Discount (~1/3 price) | No | No |

> ⚠️ **Card conflict**: Seated, Upside, and Nea cannot share the same linked card.

## Compliance

✅ Only uses publicly accessible APIs (sitemaps + Google Custom Search Engine)
✅ No scraping — uses official Google API
✅ Rate-limited (2s between checks, enforced server-side)
✅ No private or undocumented APIs

For personal use only.
