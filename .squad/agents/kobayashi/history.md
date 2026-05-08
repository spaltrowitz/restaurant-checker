# Project Context

- **Owner:** Shari Paltrowitz
- **Project:** EatDiscounted — a Next.js web app that checks 8 dining discount platforms for any restaurant name. SSE streaming results. Aggregating deals across Blackbird, inKind, Bilt, Rakuten Dining, Too Good To Go, and more.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, better-sqlite3, SSE streaming
- **Created:** 2026-04-30

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-30 — Product Strategy Review (Beli lens)
- Completed product-market fit, retention, growth, and monetization analysis.
- Biggest risk: Single-use retention problem. Users search once and leave.
- P0 recommendation: Restaurant permalink pages for SEO + shareability.
- P1: Saved restaurants + alerts (converts lookup tool to monitoring tool).
- Bold bet: Deals-Near-Me location-based discovery (10x product potential).
- Monetization: Affiliate links first (Blackbird, inKind, Bilt referral programs). Passive, validates signal.
- Audience: ~30-50K NYC power users on 3+ platforms. Growth via food Twitter/Reddit, not paid ads.

### 2026-04-30 — Partnership Outreach Strategy (App-Only Platforms)
- **Problem:** 3 app-only platforms (Nea, Seated, Upside) inaccessible via web search—no public listings APIs.
- **Solution:** B2B partnership pitch: offer free user acquisition + discovery channel in exchange for read-only API or data feed access.
- **Value prop:** Each platform gets incremental bookings from diner discovery. We get complete platform coverage. Win-win.
- **Contact strategy:** LinkedIn-first for app-stage companies (Nea, Seated). Formal BD outreach for Series B+ (Upside).
- **Integration options:** REST API (preferred), daily JSON feed, or webhook. 2-3 week implementation timeline.
- **Positioning:** EatDiscounted as meta-search engine for dining discounts—free distribution channel, not competitor.

## 2026-05-01: Partnership Outreach Strategy — Completed

### Deliverable
Drafted comprehensive partnership pitch for Nea, Seated, and Upside platforms. Document: `./partnership-pitch.md`

### Pitch Components
1. **One-pager:** Value proposition (user traffic, discovery potential, affiliate revenue sharing)
2. **Platform-specific notes:** 
   - Nea: B2B restaurant SaaS angle; offer co-marketing
   - Seated: Existing web presence; offer feature integration
   - Upside: Direct API already public; offer official partnership + higher priority support
3. **Email templates:** Personalized outreach for BD/partnerships team
4. **Next steps:** Follow-up sequencing, FAQ responses, pilot program framework

### Business Case
- **For EatDiscounted:** Access to app-only platforms (Nea, Seated) enables full coverage
- **For platforms:** Qualified restaurant traffic, user behavior signals, potential affiliate revenue
- **Win-win:** Seated/Nea gain web discoverability; EatDiscounted gains authoritative data

### Action Items
- [ ] Prioritize outreach: Nea (highest value per Redfoot audit) → Seated → Upside (confirmatory)
- [ ] Assign outreach lead (likely PM with platform contacts)
- [ ] Prepare for common objections (privacy, API load, attribution)
- [ ] Design affiliate revenue model (if accepted)

### Status
Ready for partnership outreach. Pending PM decision on priority sequencing.

## Cross-Project PM/Strategist Knowledge (injected 2026-05-02)

### From Slotted (Mai)
- **State-aware progressive UI is the key architectural insight:** The root cause of "too busy" isn't individual features — it's that the same sections render for every user regardless of stage. Progressive disclosure based on user milestones solves it at the source.
- **Smart features are Week 4 features, not Day 1:** Score emojis, activity feeds, and AI suggestions require behavioral data. Showing them before the system has data creates noise and false signals. For EatDiscounted, saved restaurants and alerts are Week 4 — search results are Day 1.
- **Empty states cascade:** Multiple empty sections stacked create "this app has nothing for me." Better to show one section with one actionable CTA.
- **Option C scheduling ("How about Saturday 2pm?"):** One suggestion + action beats a ranked list. Apply to EatDiscounted: "Best deal: 20% off at Blackbird" beats showing all 8 platforms equally.
- **Dual CTA anti-pattern:** When two CTAs compete with equal visual weight, neither wins.

### From Scrunch (Kenickie)
- **Fastest aha moment wins primary CTA:** Ingredient Checker (15 sec: paste → instant result) beat Product Discovery as primary CTA because it's zero-friction and unique to Scrunch. For EatDiscounted, the search bar IS the fastest aha — protect its primacy.
- **Visitor flow: Test → Trust → Explore → Personalize.** First interaction builds trust, then users explore deeper features.
- **Invisible onboarding:** "No gates before value." Don't ask users anything before showing them results. Behavioral signals > explicit profiling.
- **One unique differentiator should be unmissable:** Whatever only your product does (EatDiscounted = cross-platform deal search) should be the hero, not buried in a feature grid.
