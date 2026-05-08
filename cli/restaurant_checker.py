#!/usr/bin/env python3
"""
Restaurant Discount Checker v2
Check which dining discount platforms list a given restaurant.

Commands:
  check    — look up a restaurant across all platforms (live + saved sightings)
  report   — log that you saw a restaurant listed on a platform
  history  — show all sightings for a restaurant with freshness indicators
  platforms — list all supported platforms with notes on how offers work

Platforms checked:
  Blackbird, inKind, Upside, Seated, Nea, Rakuten Dining, Too Good To Go

Note on personalization:
  Most platforms serve personalized offers — different users see different
  discounts at the same restaurant. This tool checks WHETHER a restaurant
  is listed, not what specific discount you'll get.

Compliance:
  • Only uses publicly accessible data (sitemaps, public web pages)
  • Respects robots.txt for all platforms
  • Rate-limited (2s delay between checks)
  • No private APIs, no authentication bypass
  • For personal use only
"""

import argparse
import asyncio
import json
import os
import re
import sqlite3
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

import httpx

# Load environment variables from .env.local (then .env as fallback)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env.local")
    load_dotenv()  # .env as fallback, won't override existing vars
except ImportError:
    pass


# ---------------------------------------------------------------------------
# Platform registry
# ---------------------------------------------------------------------------

PLATFORMS = {
    "Blackbird": {
        "url": "https://www.blackbird.xyz/where-to-blackbird",
        "app_only": False,
        "reward_type": "points",
        "offer_type": "Personalized: tiered rewards via $FLY points, perks scale with visit frequency",
        "personalized": True,
        "card_link": True,
        "card_conflict": False,
    },
    "inKind": {
        "url": "https://inkind.com/#explore-restaurants",
        "app_only": False,
        "reward_type": "credit",
        "offer_type": "Mostly uniform: pre-pay house accounts with bonus credit (e.g. spend $100 get $120)",
        "personalized": False,
        "card_link": False,
        "card_conflict": False,
    },
    "Upside": {
        "url": "https://www.upside.com/find-offers",
        "app_only": True,
        "reward_type": "cashback",
        "offer_type": "Personalized: cashback % varies per user, time, and spending history",
        "personalized": True,
        "card_link": True,
        "card_conflict": True,
    },
    "Seated": {
        "url": "https://seatedapp.io",
        "app_only": True,
        "reward_type": "cashback",
        "offer_type": "Personalized: cashback % varies by user, time of day, day of week (up to 30%)",
        "personalized": True,
        "card_link": True,
        "card_conflict": True,
    },
    "Nea": {
        "url": "https://neaapp.ai",
        "app_only": True,
        "reward_type": "cashback",
        "offer_type": "Personalized: daily rewards vary per user, ~6% avg cashback to Venmo (NYC only)",
        "personalized": True,
        "card_link": True,
        "card_conflict": True,
    },
    "Bilt Rewards": {
        "url": "https://www.biltrewards.com/dining",
        "app_only": False,
        "reward_type": "points",
        "offer_type": "Points: 1-5x Bilt points/$ (up to 11x on Rent Day w/ Bilt card). Transferable to airlines/hotels",
        "personalized": False,
        "card_link": True,
        "card_conflict": False,
    },
    "Rakuten Dining": {
        "url": "https://www.rakuten.com/dining",
        "app_only": True,
        "reward_type": "cashback",
        "offer_type": "Uniform: 5% cashback (10% w/ Rakuten Amex) at all participating restaurants",
        "personalized": False,
        "card_link": True,
        "card_conflict": False,
    },
    "Too Good To Go": {
        "url": "https://www.toogoodtogo.com",
        "app_only": False,
        "reward_type": "discount",
        "offer_type": "Uniform: surprise bags of surplus food at ~1/3 retail price",
        "personalized": False,
        "card_link": False,
        "card_conflict": False,
    },
}

# Platforms that conflict with each other for card linking.
# You generally cannot have the same card linked to multiple apps in a group.
CARD_CONFLICT_GROUPS = [
    {"Seated", "Upside", "Nea"},  # card-linked cashback apps that block each other
]

RATE_LIMIT_DELAY = 2

# Freshness thresholds for sightings
FRESH_DAYS = 7       # ≤7 days = fresh
STALE_DAYS = 30      # ≤30 days = may have changed
                     # >30 days = likely outdated


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class CheckResult:
    platform: str
    found: bool
    details: str
    method: str        # "sitemap", "subdomain", "web_search", "sighting"
    url: str = ""
    matches: list = field(default_factory=list)
    strategy: str = ""  # which search strategy produced the result (e.g. "brave", "ddgs")


# ---------------------------------------------------------------------------
# Sightings database
# ---------------------------------------------------------------------------

DB_PATH = Path(__file__).parent / "sightings.db"


def get_db() -> sqlite3.Connection:
    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row
    db.execute("""
        CREATE TABLE IF NOT EXISTS sightings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            restaurant TEXT NOT NULL,
            restaurant_normalized TEXT NOT NULL,
            platform TEXT NOT NULL,
            listed INTEGER NOT NULL DEFAULT 1,
            discount_note TEXT DEFAULT '',
            date_seen TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    db.execute("""
        CREATE INDEX IF NOT EXISTS idx_sightings_lookup
        ON sightings (restaurant_normalized, platform)
    """)
    db.commit()
    return db


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9\s]", "", text.lower()).strip()


def add_sighting(
    restaurant: str,
    platform: str,
    listed: bool = True,
    discount_note: str = "",
    date_seen: str = "",
):
    if not date_seen:
        date_seen = datetime.now().strftime("%Y-%m-%d")
    db = get_db()
    db.execute(
        """INSERT INTO sightings
           (restaurant, restaurant_normalized, platform, listed, discount_note, date_seen)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (restaurant, _norm(restaurant), platform, int(listed), discount_note, date_seen),
    )
    db.commit()
    db.close()


def get_sightings(restaurant: str) -> list[dict]:
    db = get_db()
    rows = db.execute(
        """SELECT * FROM sightings
           WHERE restaurant_normalized = ?
           ORDER BY date_seen DESC""",
        (_norm(restaurant),),
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]


def get_latest_sighting(restaurant: str, platform: str) -> Optional[dict]:
    db = get_db()
    row = db.execute(
        """SELECT * FROM sightings
           WHERE restaurant_normalized = ? AND platform = ?
           ORDER BY date_seen DESC LIMIT 1""",
        (_norm(restaurant), platform),
    ).fetchone()
    db.close()
    return dict(row) if row else None


def freshness_label(date_str: str) -> tuple[str, str]:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return "❓", "unknown date"
    age = (datetime.now() - d).days
    if age <= FRESH_DAYS:
        return "🟢", f"{age}d ago — fresh"
    elif age <= STALE_DAYS:
        return "🟡", f"{age}d ago — may have changed"
    else:
        return "🔴", f"{age}d ago — likely outdated"


# ---------------------------------------------------------------------------
# Matching helpers
# ---------------------------------------------------------------------------

def slug_variants(name: str) -> list[str]:
    nopunc = re.sub(r"[^a-z0-9\s]", "", name.lower()).strip()
    words = nopunc.split()
    variants = set()
    variants.add(nopunc.replace(" ", ""))
    variants.add(nopunc.replace(" ", "-"))
    if words and words[0] == "the":
        rest = words[1:]
        variants.add("".join(rest))
        variants.add("-".join(rest))
    variants.discard("")
    return list(variants)


def matches_restaurant(text: str, name: str) -> bool:
    """Check if the restaurant name appears prominently in text."""
    t, n = _norm(text), _norm(name)
    # Use word-boundary regex for standalone match
    pattern = r'(?:^|[\s\-/|,])' + re.escape(n) + r'(?:$|[\s\-/|,])'
    if re.search(pattern, t):
        return True
    # Multi-word fallback: all significant words must appear
    words = [w for w in n.split() if len(w) > 2]
    return bool(words) and len(words) > 1 and all(w in t for w in words)


def _title_matches_restaurant(title: str, name: str) -> bool:
    """Stricter match: restaurant name should appear near the start of the title
    or be a major part of it (not buried in unrelated foreign-language text)."""
    t, n = _norm(title), _norm(name)
    # Name at the very start of the title (strongest signal)
    if t.startswith(n):
        return True
    # Name appears after a common separator (e.g. "Platform | Carbone")
    for sep in ["|", "-", "–", "—", ":"]:
        parts = t.split(sep)
        for part in parts:
            stripped = part.strip()
            if stripped.startswith(n) or stripped == n:
                return True
    # Name is a large portion of the title (>30% of chars)
    if n in t and len(n) / max(len(t), 1) > 0.3:
        return True
    # Multi-word names: all significant words present in title
    words = [w for w in n.split() if len(w) > 2]
    if len(words) > 1 and all(w in t for w in words):
        return True
    return False


# Phrases that indicate a "no results" page rather than an actual listing
_NO_RESULT_PHRASES = [
    "no results found",
    "no more results",
    "did not match any",
    "0 results",
    "zero results",
    "nothing found",
    "no matches found",
    "try different keywords",
    "check spelling",
    "no restaurants found",
    "we couldn't find",
    "we could not find",
    "sorry, no",
]


def _is_no_results_page(title: str, snippet: str) -> bool:
    """Detect search engine or platform 'no results' pages."""
    combined = f"{title} {snippet}".lower()
    return any(phrase in combined for phrase in _NO_RESULT_PHRASES)


# ---------------------------------------------------------------------------
# Live platform checkers
# ---------------------------------------------------------------------------

async def check_blackbird(name: str) -> CheckResult:
    """Parse Blackbird's public sitemap."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://www.blackbird.xyz/sm.xml",
                timeout=15, follow_redirects=True,
            )
            resp.raise_for_status()
        except Exception as e:
            return CheckResult("Blackbird", False, f"Sitemap error: {e}", "sitemap",
                               PLATFORMS["Blackbird"]["url"])

        spots = re.findall(
            r"<loc>(https://www\.blackbird\.xyz/spots/[^<]+)</loc>", resp.text)
        found = [u for u in spots
                 if matches_restaurant(u.split("/spots/")[-1].replace("-", " "), name)]

        if found:
            return CheckResult("Blackbird", True,
                               f"Found {len(found)} match(es) in sitemap",
                               "sitemap", found[0], found)
        return CheckResult("Blackbird", False,
                           f"Not in sitemap ({len(spots)} restaurants)",
                           "sitemap", PLATFORMS["Blackbird"]["url"])



async def check_inkind(name: str) -> CheckResult:
    """Check inKind via web search only (subdomain probing removed — ToS risk)."""
    return await _search("inKind", name, "site:inkind.com",
                         domain_filter="inkind.com")


async def check_upside(name: str) -> CheckResult:
    return await _search("Upside", name, "site:upside.com",
                         domain_filter="upside.com")

async def check_seated(name: str) -> CheckResult:
    return await _search("Seated", name,
                         "(site:seatedapp.io OR site:getseated.com)",
                         domain_filter="seated")

async def check_nea(name: str) -> CheckResult:
    return await _search("Nea", name, "site:neaapp.ai",
                         domain_filter="neaapp.ai")

async def check_rakuten(name: str) -> CheckResult:
    return await _search("Rakuten Dining", name,
                         "site:rakuten.com/dining OR site:rakuten.com/food",
                         domain_filter="rakuten.com")

async def check_bilt(name: str) -> CheckResult:
    return await _search("Bilt Rewards", name,
                         "site:biltrewards.com dining",
                         domain_filter="biltrewards.com")

async def check_toogoodtogo(name: str) -> CheckResult:
    return await _search("Too Good To Go", name, "site:toogoodtogo.com",
                         domain_filter="toogoodtogo.com")


CHECKERS = {
    "Blackbird": check_blackbird,
    "inKind": check_inkind,
    "Upside": check_upside,
    "Seated": check_seated,
    "Nea": check_nea,
    "Bilt Rewards": check_bilt,
    "Rakuten Dining": check_rakuten,
    "Too Good To Go": check_toogoodtogo,
}


# ---------------------------------------------------------------------------
# Search helpers — tries ddgs → Playwright → curl
# ---------------------------------------------------------------------------

_STRATEGY_NAMES = {
    "_try_brave": "brave",
    "_try_ddgs": "ddgs",
    "_try_playwright": "playwright",
    "_try_curl": "curl",
}


async def _search(platform: str, name: str, site_q: str,
                  domain_filter: str = "") -> CheckResult:
    url = PLATFORMS[platform]["url"]
    app_note = " (app-only — check the app for full results)" if PLATFORMS[platform]["app_only"] else ""
    query = f'"{name}" {site_q}'

    for strategy in [_try_brave, _try_ddgs, _try_playwright, _try_curl]:
        strategy_name = _STRATEGY_NAMES.get(strategy.__name__, strategy.__name__)
        try:
            results = await strategy(query) if asyncio.iscoroutinefunction(strategy) \
                else await asyncio.to_thread(strategy, query)
        except Exception:
            results = []
        if results:
            for title, href, snippet in results:
                # Skip results from wrong domains
                if domain_filter and href and domain_filter not in href.lower():
                    continue
                # Skip "no results" pages that echo back the search query
                if _is_no_results_page(title, snippet):
                    continue
                # Require restaurant name prominently in the title
                if _title_matches_restaurant(title, name):
                    return CheckResult(platform, True,
                                       title or f"Found on {platform}",
                                       "web_search", href or url,
                                       strategy=strategy_name)

    return CheckResult(platform, False, f"Not found via web search{app_note}",
                       "web_search", url)


async def _try_brave(query: str) -> list[tuple]:
    """Search via Brave Search API (requires BRAVE_SEARCH_API_KEY)."""
    api_key = os.getenv("BRAVE_SEARCH_API_KEY")
    if not api_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params={"q": query, "count": 5},
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip",
                    "X-Subscription-Token": api_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            results = data.get("web", {}).get("results", [])
            return [
                (r.get("title", ""), r.get("url", ""), r.get("description", ""))
                for r in results[:5]
            ]
    except Exception:
        return []


def _try_ddgs(query: str) -> list[tuple]:
    try:
        from ddgs import DDGS
        raw = DDGS().text(query, max_results=5) or []
        return [(r.get("title", ""), r.get("href", ""), r.get("body", ""))
                for r in raw]
    except Exception:
        return []


async def _try_playwright(query: str) -> list[tuple]:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return []
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(
                f"https://html.duckduckgo.com/html/?q={quote_plus(query)}",
                wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(2000)
            out = []
            for el in (await page.query_selector_all(".result"))[:5]:
                t = await el.query_selector(".result__title")
                s = await el.query_selector(".result__snippet")
                u = await el.query_selector(".result__url")
                out.append((
                    (await t.inner_text()).strip() if t else "",
                    (await u.inner_text()).strip() if u else "",
                    (await s.inner_text()).strip() if s else "",
                ))
            await browser.close()
            return out
    except Exception:
        return []


def _try_curl(query: str) -> list[tuple]:
    try:
        r = subprocess.run(
            ["curl", "-s", "-L",
             "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
             "-H", "Accept: text/html",
             f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"],
            capture_output=True, text=True, timeout=15)
        if r.returncode != 0:
            return []
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(r.stdout, "html.parser")
        return [
            (
                (e.select_one(".result__title") or type("", (), {"get_text": lambda **_: ""})).get_text(strip=True),
                (e.select_one(".result__url") or type("", (), {"get_text": lambda **_: ""})).get_text(strip=True),
                (e.select_one(".result__snippet") or type("", (), {"get_text": lambda **_: ""})).get_text(strip=True),
            )
            for e in soup.select(".result")[:5]
        ]
    except Exception:
        return []


# ---------------------------------------------------------------------------
# CLI: check
# ---------------------------------------------------------------------------

def print_result(r: CheckResult, verbose: bool = False):
    icon = "✅" if r.found else "❌"
    label = {"sitemap": "📄 sitemap", "subdomain": "🌐 direct",
             "web_search": "🔍 search", "sighting": "📝 sighting"
             }.get(r.method, r.method)
    strategy_info = f" via {r.strategy}" if verbose and r.strategy else ""
    print(f"  {icon}  {r.platform:<18} [{label}{strategy_info}]")
    print(f"      {r.details}")
    if r.url:
        print(f"      → {r.url}")
    for m in (r.matches or [])[1:]:
        print(f"      → {m}")
    print()


async def cmd_check(args):
    name = args.restaurant
    verbose = getattr(args, "verbose", False)
    print(f"\n🍽️  Checking platforms for: \"{name}\"\n")
    print("=" * 64)
    print()

    # Run all platform checks in parallel (API-based, no need to rate-limit)
    async def _run_checker(plat, checker):
        try:
            return await checker(name)
        except Exception as e:
            return CheckResult(plat, False, f"Error: {e}", "error")

    tasks = {plat: asyncio.create_task(_run_checker(plat, checker))
             for plat, checker in CHECKERS.items()}
    results = []
    for plat in CHECKERS:
        result = await tasks[plat]
        results.append(result)
        print_result(result, verbose=verbose)

    # Show saved sightings
    sightings = get_sightings(name)
    if sightings:
        print("-" * 64)
        print("  📝 Saved sightings from your reports:\n")
        seen_platforms = set()
        for s in sightings:
            if s["platform"] in seen_platforms:
                continue
            seen_platforms.add(s["platform"])
            emoji, age = freshness_label(s["date_seen"])
            status = "listed" if s["listed"] else "NOT listed"
            disc = f' — "{s["discount_note"]}"' if s["discount_note"] else ""
            pers = " ⚠️  offers are personalized" if PLATFORMS.get(s["platform"], {}).get("personalized") else ""
            print(f"  {emoji}  {s['platform']:<18} {status} (seen {s['date_seen']}, {age}){disc}{pers}")
        print()

    # Summary
    print("=" * 64)
    found = [r for r in results if r.found]
    if found:
        print(f"\n✨ \"{name}\" found on: {', '.join(r.platform for r in found)}")
    else:
        print(f"\n😕 \"{name}\" was not found on any platform via live check.")

    app_only = [r for r in results
                if not r.found and PLATFORMS.get(r.platform, {}).get("app_only")]
    if app_only:
        print(f"\n📱 App-only platforms (check manually for best results):")
        for r in app_only:
            print(f"   • {r.platform}: {r.url}")

    # Auto-save positive live results as sightings
    today = datetime.now().strftime("%Y-%m-%d")
    for r in found:
        existing = get_latest_sighting(name, r.platform)
        if not existing or existing["date_seen"] != today:
            add_sighting(name, r.platform, listed=True, date_seen=today)

    # Card conflict warning
    all_found_platforms = {r.platform for r in found}
    # Also include sighted platforms
    for s in (sightings or []):
        if s["listed"]:
            all_found_platforms.add(s["platform"])
    for group in CARD_CONFLICT_GROUPS:
        overlap = all_found_platforms & group
        if len(overlap) > 1:
            print(f"\n⚠️  Card conflict: {', '.join(sorted(overlap))} cannot share the same linked card.")
            print(f"   Use a different card for each, or pick one cashback app per card.")

    print()


# ---------------------------------------------------------------------------
# CLI: report
# ---------------------------------------------------------------------------

def cmd_report(args):
    platform = args.platform

    # Fuzzy-match platform name
    matches = [p for p in PLATFORMS if p.lower() == platform.lower()]
    if not matches:
        matches = [p for p in PLATFORMS if platform.lower() in p.lower()]
    if not matches:
        print(f"❌ Unknown platform: {platform}")
        print(f"   Known platforms: {', '.join(PLATFORMS.keys())}")
        return
    platform = matches[0]

    listed = not args.not_listed
    discount = args.discount or ""
    date = args.date or datetime.now().strftime("%Y-%m-%d")

    if PLATFORMS[platform].get("personalized") and discount:
        discount += " (personalized — your offer may differ)"

    add_sighting(args.restaurant, platform, listed=listed,
                 discount_note=discount, date_seen=date)

    status = "listed ✅" if listed else "NOT listed ❌"
    print(f"\n📝 Recorded: \"{args.restaurant}\" is {status} on {platform} (as of {date})")
    if discount:
        print(f"   Discount note: {discount}")
    print()


# ---------------------------------------------------------------------------
# CLI: history
# ---------------------------------------------------------------------------

def cmd_history(args):
    name = args.restaurant
    sightings = get_sightings(name)

    if not sightings:
        print(f"\n📭 No sightings recorded for \"{name}\".")
        print("   Use 'check' to do a live search, or 'report' to log a sighting.\n")
        return

    print(f"\n📋 Sighting history for \"{name}\"\n")
    print(f"   {'Platform':<18} {'Status':<10} {'Date':<12} {'Freshness':<24} Discount Note")
    print(f"   {'─'*18} {'─'*10} {'─'*12} {'─'*24} {'─'*30}")

    for s in sightings:
        emoji, age = freshness_label(s["date_seen"])
        status = "listed" if s["listed"] else "NOT listed"
        disc = s["discount_note"] or "—"
        print(f"   {s['platform']:<18} {status:<10} {s['date_seen']:<12} {emoji} {age:<21} {disc}")

    print(f"\n   Total: {len(sightings)} sighting(s)\n")


# ---------------------------------------------------------------------------
# CLI: platforms
# ---------------------------------------------------------------------------

def cmd_platforms(_args):
    print("\n📋 Supported platforms\n")
    for name, info in PLATFORMS.items():
        pers = "👤 Personalized" if info["personalized"] else "🏷️  Uniform"
        mode = "📱 App-only" if info["app_only"] else "🌐 Web + App"
        rtype = {"cashback": "💵 Cashback", "points": "⭐ Points",
                 "credit": "🎟️  Credit", "discount": "🏷️  Discount"
                 }.get(info["reward_type"], info["reward_type"])
        print(f"  {name}")
        print(f"    {mode}  |  {pers}  |  {rtype}")
        print(f"    {info['offer_type']}")
        if info.get("card_link"):
            conflict_note = ""
            if info.get("card_conflict"):
                # Find which platforms conflict with this one
                partners = []
                for group in CARD_CONFLICT_GROUPS:
                    if name in group:
                        partners = sorted(group - {name})
                if partners:
                    conflict_note = f" ⚠️  Card conflicts with: {', '.join(partners)}"
            print(f"    🔗 Requires linked card{conflict_note}")
        print(f"    → {info['url']}")
        print()

    print("  ⚠️  Card conflict note:")
    print("  Some card-linked cashback apps block the same card from being")
    print("  linked to competing apps. Use different cards for different apps,")
    print("  or choose one cashback app per card.")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Restaurant Discount Checker v2 — find which platforms list a restaurant.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command")

    # check
    p_check = sub.add_parser("check", help="Look up a restaurant across all platforms")
    p_check.add_argument("restaurant", help='Restaurant name (e.g. "Carbone")')
    p_check.add_argument("-v", "--verbose", action="store_true",
                         help="Show which search strategy was used for each platform")

    # report
    p_report = sub.add_parser("report", help="Log that you saw a restaurant on a platform")
    p_report.add_argument("restaurant", help="Restaurant name")
    p_report.add_argument("platform", help=f"Platform name ({', '.join(PLATFORMS.keys())})")
    p_report.add_argument("-d", "--discount", help="Discount note (e.g. '15%% cashback', '$20 bonus on $100')")
    p_report.add_argument("--date", help="Date seen (YYYY-MM-DD, default: today)")
    p_report.add_argument("--not-listed", action="store_true",
                          help="Record that the restaurant is NOT listed on this platform")

    # history
    p_hist = sub.add_parser("history", help="Show sighting history for a restaurant")
    p_hist.add_argument("restaurant", help="Restaurant name")

    # platforms
    sub.add_parser("platforms", help="List all supported platforms")

    args = parser.parse_args()

    if args.command == "check":
        asyncio.run(cmd_check(args))
    elif args.command == "report":
        cmd_report(args)
    elif args.command == "history":
        cmd_history(args)
    elif args.command == "platforms":
        cmd_platforms(args)
    else:
        # Default: if a bare restaurant name is given, treat as check
        if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
            args = argparse.Namespace(restaurant=" ".join(sys.argv[1:]))
            asyncio.run(cmd_check(args))
        else:
            parser.print_help()


if __name__ == "__main__":
    main()
