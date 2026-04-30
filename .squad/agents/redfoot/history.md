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
