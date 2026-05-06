# Decision: Search Quality Improvements

**Author:** Fenster (Backend Dev)
**Date:** 2025-07-14

## Context
Audit of search quality across all platforms revealed several bugs and improvement opportunities affecting result accuracy.

## Changes

### 1. Word-boundary matching for short names
Short restaurant names (≤3 chars) now require word-boundary matches instead of substring inclusion. Prevents "Bo" matching "robot" and "Odo" matching "odometer".

### 2. "The" prefix handling
`matchesRestaurant()` now strips "The" prefix before matching, so "The Smith" matches text containing just "Smith". Previously missed these restaurants entirely.

### 3. Empty/Unicode name guard
Names that normalize to empty string (pure Unicode, empty input) no longer match everything. Returns `false` immediately.

### 4. Bilt API NYC filtering
All 2,262 national Bilt restaurants are now filtered server-side to NYC-area only (state=NY, NYC cities/boroughs, NYC zip prefixes). Prevents false positives from same-name restaurants in other cities.

### 5. Rewards Network per-query caching
Fixed critical bug: cache was global (single entry) instead of per-query. Searching "Carbone" then "Tatiana" would return Carbone's results for both. Now uses a Map keyed by normalized query string.

### 6. Rewards Network special char handling
API queries now strip apostrophes and diacritics before sending (e.g., "L'Artusi" → "LArtusi") to improve match rates.

### 7. Title separator logic fix
`titleMatchesRestaurant()` separator splitting now operates on pre-normalized text. Previously, `norm()` stripped separator characters before the split, making the separator logic dead code.

## Trade-offs
- Stricter matching may miss rare edge cases where a restaurant name appears only as a substring (acceptable — false negatives are much less harmful than false positives)
- Bilt NYC filter uses address heuristics — may miss restaurants with unusual address formats (fallback: include if no geo data)
- Rewards Network Map cache uses slightly more memory than single-entry cache (negligible for expected query volume)
