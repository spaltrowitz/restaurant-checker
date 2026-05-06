# Project Context

- **Owner:** Shari Paltrowitz
- **Project:** EatDiscounted — a Next.js web app that checks 8 dining discount platforms for any restaurant name. SSE streaming results. Beli-style restaurant discovery meets deal aggregation.
- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, better-sqlite3, SSE streaming
- **Created:** 2026-04-30

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-04-30 — UX Review (Beli lens)
- Completed full UX review grading search, results, social proof, error states, mobile, engagement.
- Top 3 proposals: sort by signal, celebration moment, collapse not-found cards.
- Key insight: Progressive SSE streaming is the product's UX differentiator. Protect and enhance it.
- The product needs emotional payoff — finding deals should feel like a win, not a status report.
- Community reports are the closest thing to Beli's social signal. Make them more prominent on "not found" cards.

## Cross-Project Designer Knowledge (injected 2026-05-02)

### From MyDailyWin (Sidon)
- **Celebration psychology is a design lever:** Task completions, level-ups, streak milestones all need modal + confetti + sound — not just toast notifications. Silent rewards feel like status reports, not wins.
- **Spin wheel easing creates suspense:** Exponential deceleration (`60ms * e^(1.8 * progress)`) makes randomized rewards feel fair and exciting. Linear intervals feel chaotic. Apply similar easing to SSE streaming reveal moments.
- **Dark mode must be universal:** Implementing dark mode on one page but not others creates jarring transitions. Use a shared `dark-mode.js` init script reading localStorage + prefers-color-scheme.
- **PWA install prompt is a retention lever:** No `beforeinstallprompt` handler = missed growth opportunity for daily-use apps.

### From Slotted (Suki)
- **Emoji audit methodology:** Apply 4-criteria test — if there's a text label next to the emoji, the emoji is redundant. Achieved 87% reduction (100→13 unique emojis).
- **Settings pages should minimize "teaching" copy:** Users already chose to be on the page. Label controls clearly and let them act. Explanations belong in onboarding, not settings.
- **Progressive disclosure > structural simplification:** Ask "for this user at this moment" not "for this page." Temporal design (WHEN features appear) is more impactful than spatial design (WHAT to remove).

### From Slotted (Ty Lee)
- **"Visual diet, not redesign":** Features work — visual layer is drowning. Strip, then polish.
- **Every pixel must earn its place:** Define 5-level type scale (H1–H5 + body + caption) and enforce globally. One accent color, grayscale for everything else.
- **Empty states need design attention:** Warm whitespace + illustration + single CTA. Day 1 experience must feel like opportunity, not void.

### From Scrunch (Jan)
- **Prose-inspired homepage pattern:** Single mission statement, one CTA, progressive disclosure on scroll. Lead with "why we exist" not "what we have."
- **Mobile-first, single-column layouts > grid layouts** for value-prop sections. Dark backgrounds are risky on landing pages.
- **44px minimum touch targets** across all interactive elements (Apple HIG + WCAG). Collapsible filters essential on mobile.
- **Copy verbosity scales with commitment:** Hero/feature cards = short (scanning mode). About page = longer (reading mode).

### From HealthStitch (Book — UX Writing)
- **Voice:** Smart, personal, encouraging — like a knowledgeable friend, not a corporate tool. Avoid jargon in user-facing text.
- **Null states:** Use em-dash "—" instead of "--" for missing data. Reads as intentional absence, not a bug.
- **Loading states:** Conversational and specific ("Checking platforms for deals…") rather than generic ("Loading...").
- **Error framing:** Always lead with what the user wanted ("Couldn't find deals for this restaurant") before the technical message.

## Owner Preferences (learned)

### 2026-05-03: Copy conciseness
- **Context:** Verbal proposed tagline ending with "...so you stop paying full price for places you were already going."
- **Owner correction:** "places you are already going isn't necessary"
- **Pattern:** Owner prefers endings that are tight and punchy. Don't add qualifiers that restate the obvious. If someone is looking up restaurant deals, they're obviously going to eat there. Cut the redundant context.
- **Revised to:** "...so you never pay full price without knowing you could've saved."
- **General rule:** When writing copy, end on the emotional hook, not on an explanatory qualifier.
