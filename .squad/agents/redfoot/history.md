# Project Context

- **Owner:** Shari Paltrowitz
- **Project:** EatDiscounted — a Next.js web app that checks 8 dining discount platforms for any restaurant name. SSE streaming results. Covers Blackbird, inKind, Upside, Seated, Nea, Bilt, Rakuten Dining, Too Good To Go.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, better-sqlite3, SSE streaming
- **Created:** 2026-04-30

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-30 — Platform Accuracy Review (Yelp lens)
- Completed platform coverage, CSE reliability, Blackbird sitemap, matching quality, and community reports audit.
- 3 data corrections needed: Rakuten Dining appOnly→false, Seated domain→seatedapp.io, Blackbird cardLink clarification.
- Critical accuracy fix: Add `site:` operator to CSE queries. Currently searching whole web then filtering by domain — wastes result slots and causes false positives.
- Matching fix: Word-boundary matching (`\b`) to prevent short names matching inside longer words.
- Dead code: `slugVariants()` is defined+tested but never called. Either integrate into checkBlackbird or remove.
- Blackbird sitemap approach is most reliable checker — extend pattern to other platforms where public directories exist (Seated at seatedapp.io, Upside at upside.com/find-offers, Rakuten at rakuten.com/dining).
- Card conflict logic is correct. Rakuten excluded because different merchant-matching mechanism. Bilt excluded because requires specific card.

## 2026-05-01: Platform API Landscape Audit — Completed

### Investigation Scope
Audited all 7 non-Blackbird reward platforms for public/accessible APIs:

### Findings
1. **Upside:** Direct REST API (no auth) → 196 restaurants. Public endpoint. ✅
2. **Bilt:** GraphQL + REST API (public) → 2,237 restaurants. Full menu + points data. ✅
3. **inKind:** Rails API with auth token (possible partnership route) → ~500 restaurants
4. **Rakuten:** Partial search suggest API (undocumented) → Incomplete data
5. **TGTG (Too Good To Go):** App-only, no web surface → CSE/DDG only
6. **Seated:** App-only, no web surface → CSE/DDG only
7. **Nea:** App-only, no web surface → CSE/DDG only

### API Landscape Summary
- **Immediately actionable:** Upside (ready), Bilt (ready)
- **Needs partnership:** inKind (auth token), TGTG (app + web API unknown)
- **Requires special handling:** Rakuten (headless browser), Seated/Nea/TGTG (app-only)

### Recommendations
- Prioritize partnership outreach to inKind (significant coverage + auth-based API)
- Nea/Seated: Email Kobayashi's partnership pitch
- TGTG: Reconsider product fit (real-time surplus inventory may not match "does restaurant participate" model)
- Rakuten: Deprioritize unless Bilt/Upside/inKind prove insufficient

### Next
Partner with Kobayashi on outreach sequencing. Confirm inKind + Rakuten interest before dev investment.

## Cross-Project Domain Expert Knowledge (injected 2026-05-02)

### From Scrunch (Marty)
- **Influencer landscape research methodology:** Ranked 15 influencers by product relevance with follower counts, signature products, and relevance scores (★ system). Cross-referenced their recommendations against existing catalog to find gaps. Scrunch validated that top creators overwhelmingly recommend products already in catalog — gaps were incremental, not fundamental.
- **Viral routine analysis framework:** When a viral routine surfaces (e.g., HairTok), analyze each product individually against domain standards (CGM rules for Scrunch). Most viral products may be anti-domain (anti-CGM in Scrunch's case) — don't add blindly.
- **Category expansion from trend signals:** Identified underserved niches (scalp care, bond repair) from influencer trends. New categories should be framed for the underserved audience ("Especially for wavies 2A–2C").
- **Product categorization audit:** Products marketed one way may functionally belong elsewhere (scalp oils in "oil_serum" → "scalp_care", bond repair in "protein_treatment" → "bond_repair"). Audit by function, not marketing.
- **Catalog gap analysis pattern:** Compare existing catalog against top-30 most-mentioned products across domain influencers. Prioritize additions by: (1) brand already in catalog, (2) community adoption, (3) price accessibility.

### From HealthStitch (River)
- **Data pipeline architecture:** Ingestion from multiple sources (Apple Watch, WHOOP) through unified ingest service with batch insert transactions. Both paths trigger baseline computation after ingestion.
- **Baseline computation patterns:** Rolling averages over configurable windows (30d, 90d) stored in derived tables. Different metrics need different windows.
- **Performance: expression indexes on computed columns** (`date(recorded_at)`) dramatically improve GROUP BY date queries.
- **Pre-computed aggregates for dashboards:** Weekly/monthly rollups stored in aggregate tables instead of computing on the fly. Incremental update after each ingest, full recompute available for backfill.
- **Gap indicators in data:** Fill missing dates with `{ date, has_data: false }` so frontend distinguishes "no data collected" from "value was zero."
