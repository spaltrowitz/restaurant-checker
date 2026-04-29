# Restaurant Discount Checker v2 🍽️

Check which dining discount platforms list a given restaurant — from the command line.

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

> ⚠️ **Card conflict**: Seated, Upside, and Nea cannot share the same linked card. Use a different card for each.

> **Personalization note**: Most platforms serve different offers to different users. This tool checks whether a restaurant **is listed** on a platform, not what specific discount you'll get.

## Setup

```bash
git clone https://github.com/spaltrowitz/restaurant-checker.git
cd restaurant-checker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium   # one-time, for search fallback
```

## Commands

### `check` — Look up a restaurant across all platforms

```bash
python restaurant_checker.py check "Carbone"
python restaurant_checker.py check "Oxomoco"
```

Runs live checks and also shows any saved sightings you've reported. Warns you about card conflicts if the restaurant is on multiple competing platforms.

### `report` — Log a sighting after checking an app manually

```bash
# Basic: record that you saw it listed
python restaurant_checker.py report "Carbone" "Seated" -d "~20% cashback"

# Record with a specific date
python restaurant_checker.py report "Lilia" "Nea" -d "6% back" --date 2026-04-20

# Record that it's NOT listed
python restaurant_checker.py report "McDonald's" "Blackbird" --not-listed
```

Discount notes on personalized platforms automatically get a "your offer may differ" tag.

### `history` — View sighting history with freshness

```bash
python restaurant_checker.py history "Carbone"
```

Shows all sightings with freshness indicators:
- 🟢 **Fresh** (≤7 days) — likely still accurate
- 🟡 **Stale** (8-30 days) — may have changed
- 🔴 **Outdated** (>30 days) — likely outdated, re-check

### `platforms` — List all supported platforms

```bash
python restaurant_checker.py platforms
```

Shows reward types, personalization, card requirements, and conflict warnings.

## How Checks Work

| Platform | Method | Reliability |
|----------|--------|:-----------:|
| **Blackbird** | Public sitemap parsing (`sm.xml`) | ⭐ Excellent |
| **inKind** | Subdomain check + web search | ⚠️ Moderate |
| **All others** | DuckDuckGo web search | ⚠️ Limited |

- **Blackbird** is the most reliable — their sitemap lists all partner restaurants
- **Search-based checks** depend on whether the platform has indexed web pages for that restaurant
- **App-only platforms** (Upside, Seated, Nea, Rakuten) may not be findable via search — use `report` after manually checking the app

## Compliance & Safety

✅ Only uses publicly accessible data  
✅ Respects all robots.txt rules  
✅ Rate-limited (2s between checks)  
✅ Standard browser behavior via Playwright  
❌ No private or undocumented APIs  
❌ No mobile app traffic interception  
❌ No authentication bypass  

**For personal use only.** Do not use for commercial data aggregation.

## Key Concepts

### Card Conflicts
Seated, Upside, and Nea all require a linked debit/credit card and **block the same card from being used across competing apps**. If you want to use multiple cashback apps, link a different card to each.

### Personalization
Blackbird, Seated, Upside, and Nea serve **different offers to different users**. The discount percentage you see may differ from what someone else sees at the same restaurant. The `report` command lets you log what *you* saw, with a note that it's personalized.

### Freshness
Restaurant listings change frequently — a restaurant on Seated today might not be there next week, and discount percentages shift constantly. The sightings database tracks *when* you last verified a listing so you know if your data is still reliable.

---

🍽️ [Share the savings](https://spaltrowitz.github.io/#support)

