# Partnership Outreach: Nea, Seated, and Upside

## Email Template

Subject: Free Discovery Channel for Your Restaurants — EatDiscounted Partnership

---

Hi [Contact Name],

I'm building EatDiscounted, a web app that helps diners find dining discounts across multiple platforms in seconds. We check 8 platforms simultaneously for any restaurant—and **we drive direct traffic to your app when a user finds their restaurant on your platform**.

Here's the opportunity: When a NYC diner searches for "Carbone," they see it's listed on [Platform], and they immediately tap "Open [Platform]" to view your deals. That's a free discovery and acquisition channel.

**Currently, we check 3 platforms via web search (Blackbird, inKind, Too Good To Go).** We can't yet surface your restaurant listings because you have no public web presence or API. I'd like to propose a partnership where you give us read-only access to your restaurant restaurant listings and pricing tiers.

**What we're asking:** A simple read-only API (or data feed) with restaurant name, location, and current deal info. Minimal integration—just enough for us to tell users "Yes, this restaurant is on your platform."

**Metrics & Traction:** Currently testing with [XX daily searches / XX active users in NYC]. This is early, but we're targeting power users on 3+ platforms who actively hunt discounts. As we grow, so does your referral traffic.

**Timeline:** We can integrate within 2-3 weeks of API access.

Would you be open to a 30-min call to discuss? I can show you how we route traffic and what the integration would look like on our end.

Best,
Shari Paltrowitz
EatDiscounted

P.S. — I'm also attaching a brief overview of how the integration works. Happy to share our product analytics once we're live.

---

## Platform-Specific Implementation Notes

### **Nea**

**Contact Strategy:**
- Website: https://neaapp.ai (check for partnerships/business email)
- LinkedIn: Look for founder/COO directly (app-stage companies are more responsive to direct outreach)
- Try: partnerships@neaapp.ai or business@neaapp.ai if available

**Integration Ideal:**
- Read-only API endpoint: `GET /api/restaurants?city=nyc` → returns array with `{ name, lat, lng, minCashback%, maxCashback% }`
- Or: Daily/weekly JSON feed of participating restaurants
- Optional: Real-time cashback % for known user segments (we can use average tier for matching)

**Value Prop to Nea:**
- **NYC-first discovery:** EatDiscounted is NYC-focused (matching Nea's market). We surface high-intent diners actively searching for specific restaurants.
- **Incremental transactions:** Most searches convert to app opens → dining events → cashback payouts. ~5-10% of search discovery traffic typically converts to bookings.
- **Affiliate-friendly:** We drive Venmo payouts. No cannibalization—we're a discovery layer, not a competitor.
- **Zero maintenance:** API call once per search—no ongoing support burden.

**Technical Notes:**
- Nea's app-only model is actually an advantage for us—users who see "Nea" on search are already app users or install-ready.
- We handle rate limiting on our side (5 req/min). Minimal server load.

---

### **Seated**

**Contact Strategy:**
- Website: https://seatedapp.io (look for "partnerships" or "business development" link)
- LinkedIn: Search for partnerships/BD lead or CEO/founder
- Try: partnerships@seatedapp.io or bd@seatedapp.io

**Integration Ideal:**
- `GET /api/restaurants?search=NYC` → returns `{ name, address, maxCashback%, lastUpdated }`
- Or: Webhook-based: push new restaurant listings as they're added
- Alternative: Sitemap/feed (like Blackbird/TGTG) if API isn't available

**Value Prop to Seated:**
- **Discovery at scale:** Seated has high cashback rates (up to 30%)—but only works if users know about the listings. EatDiscounted surfaces restaurants diners are already looking for.
- **Cross-platform awareness:** Users often compare Seated vs Upside vs Nea for the same restaurant. Being discoverable in comparison results increases wallet share.
- **Monetization alignment:** Every user we send is a potential high-value repeat user. Higher cashback % = more incentive to book via Seated first.
- **Competitive moat:** Early integrators get featured prominently in our results; Upside/Nea follow later.

**Technical Notes:**
- Seated's current `domainFilter: "seated"` works, but it's flaky (requires public web presence). API would give us definitive data.
- Real-time cashback % is nice-to-have but not essential; we can show "up to 30% cashback" with a note that rates vary.

---

### **Upside**

**Contact Strategy:**
- Website: https://www.upside.com (check for partnerships/investor relations)
- LinkedIn: Search partnerships/BD contacts
- Try: partnerships@upside.com, business@upside.com, or BD@upside.com
- Note: Upside is venture-backed (raised $50M+); they may have dedicated partnership ops.

**Integration Ideal:**
- `GET /api/v1/restaurants?city=new_york_city` → returns `{ id, name, address, cashback%, merchantCategory, lastUpdated }`
- Or: GraphQL endpoint if they have one
- Or: Bulk export of restaurant listings (weekly/daily)

**Value Prop to Upside:**
- **Underlevered distribution:** Upside's web presence is minimal; most growth is app-driven. EatDiscounted fills that gap with high-intent traffic (diners actively searching for restaurants by name).
- **Increase per-user AOV:** Users discovering restaurants via EatDiscounted are already predisposed to discount-hunting. Higher booking frequency = higher lifetime value.
- **Data network effects:** As more users use EatDiscounted → more feedback on restaurant popularity → Upside gets product insights.
- **Brand awareness play:** Early-stage restaurants often don't know they're on Upside. Discovery tool drives merchant traffic too (restaurants want to promote their Upside presence).

**Technical Notes:**
- Upside likely has the most mature API/partnership program (larger company, Series B+). Pitch format should be more formal (mention: scalability, 99.9% SLA expectations, data residency if applicable).
- Real-time personalized cashback % is optional; static "average user" cashback % is sufficient for matching.
- Rate limiting: We'll respect standard API quotas (1000 req/day or similar).

---

## One-Pager: EatDiscounted Partnership Overview

**[Attach as PDF or embed in email]**

---

### **EatDiscounted: Free Discovery Channel for Diners**

**What is EatDiscounted?**

A web-based search tool for NYC diners that checks 8 dining discount platforms simultaneously. Users enter a restaurant name ("Carbone") and instantly see which platforms have deals, their cashback/points, and booking links. Think of it as a meta-search engine for dining discounts.

**Current Platform Coverage:**
- ✅ Blackbird (web-checkable)
- ✅ inKind (web-checkable)
- ✅ Bilt Rewards (web-checkable)
- ✅ Too Good To Go (web-checkable)
- ✅ Rakuten Dining (app-only, pending API)
- ❌ **Nea** (app-only, needs API)
- ❌ **Seated** (app-only, needs API)
- ❌ **Upside** (app-only, needs API)

**The Integration Model**

```
User searches "Carbone"
        ↓
EatDiscounted checks all 8 platforms in parallel
        ↓
Results display: "Seated: 20% cashback" | "Upside: 15% cashback" | "Nea: 6% to Venmo"
        ↓
User taps "Open Seated" → Direct link to Seated app/web listing
        ↓
[Your platform handles conversion from there]
```

**What We Need From You**

**Option 1 (Preferred): Read-Only REST API**
- Endpoint: List all restaurants, optionally filtered by city/zip code
- Response: `{ restaurants: [{ name, location, offerId, cashback%, category, ... }] }`
- Rate: ~100-500 requests/day initially, scaling with user growth
- Auth: API key or OAuth 2.0

**Option 2: Data Feed**
- Daily or weekly JSON/CSV file with restaurant listings
- S3 drop, SFTP, or HTTP download

**Option 3: Webhook**
- We poll less frequently; you push updates when listings change
- Reduces both sides' load

**Mutual Benefits**

| For You | For Us |
|---------|---------|
| **Free user acquisition:** Every search discovery = potential app install or booking | **Complete platform coverage:** We can surface all deals, not just web-accessible ones |
| **Incremental referral revenue:** No cost on your side; you only pay out when users book | **Better UX:** One search gives comprehensive results instead of partial data |
| **Product insights:** Learn which restaurants drive the most interest (via anonymized search trends) | **Retention:** Users find more reasons to return if we have complete data |
| **Competitive visibility:** Featured in comparison results alongside competitors | **Monetization:** Future affiliate partnerships (commission on bookings we refer) |

**Traction & Timeline**

- **Launch date:** Early May 2026
- **Initial audience:** NYC power users (50K+ target)
- **Growth channels:** Food Twitter, Reddit (r/FoodNYC, r/AskNYC), discount forums
- **API integration timeline:** 2-3 weeks from data access
- **Scaling:** If successful, we plan to expand to 5+ US cities (LA, SF, Boston, Chicago, Miami)

**Example Search Flow**

User searches "Jetsons" (Nolita):
```
Seated: 💵 20-30% cashback
Upside: 💵 18% cashback  
Nea: 💵 6% to Venmo (NYC only)
Rakuten: 💵 5% cashback
Bilt: ⭐ 4x points
Too Good To Go: 🏷️ Dinner bags ~$20
```

→ User clicks "Open Seated" → Goes directly to restaurant listing in Seated app/web.

**Why This Matters**

**For diners:** Stop juggling 8 apps to find the best deal. One search. All platforms.

**For you:** Reach diners who are actively hunting for *your* restaurants, at the exact moment they're deciding where to eat. No ad spend required.

**Next Steps**

1. Review the integration options above
2. Schedule 30-min call to discuss technical requirements
3. Pilot integration (1-2 weeks)
4. Go live and track referral metrics together

---

**Contact:**
Shari Paltrowitz  
EatDiscounted  
[email] | [phone if applicable]

