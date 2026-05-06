export function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

export function stripThePrefix(text: string): string {
  return text.replace(/^the\s+/i, "");
}

export function slugVariants(name: string): string[] {
  const nopunc = norm(name);
  const words = nopunc.split(/\s+/);
  const variants = new Set<string>();
  variants.add(nopunc.replace(/\s+/g, ""));
  variants.add(nopunc.replace(/\s+/g, "-"));
  if (words[0] === "the") {
    const rest = words.slice(1);
    variants.add(rest.join(""));
    variants.add(rest.join("-"));
  }
  variants.delete("");
  return Array.from(variants);
}

function wordBoundaryMatch(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s|\\b)${escaped}(?:\\s|\\b|$)`).test(haystack);
}

export function matchesRestaurant(text: string, name: string): boolean {
  const t = norm(text);
  const n = norm(name);

  // Guard: empty normalized name should not match anything
  if (n.length === 0) return false;

  // Short names (≤3 chars) require word-boundary match to avoid "Bo" matching "robot"
  if (n.length <= 3) {
    return wordBoundaryMatch(t, n);
  }

  // Exact substring match
  if (t.includes(n)) return true;

  // Try without "The" prefix: "The Smith" matches text containing "Smith"
  const nNoThe = norm(stripThePrefix(name));
  if (nNoThe.length > 3 && nNoThe !== n && t.includes(nNoThe)) return true;

  // Word-level match: all significant words (>2 chars) must appear with word boundaries
  const words = n.split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 1 && words.every((w) => wordBoundaryMatch(t, w))) return true;

  return false;
}
