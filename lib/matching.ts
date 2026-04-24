export function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
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

export function matchesRestaurant(text: string, name: string): boolean {
  const t = norm(text);
  const n = norm(name);
  if (t.includes(n)) return true;
  const words = n.split(/\s+/).filter((w) => w.length > 2);
  return words.length > 0 && words.every((w) => t.includes(w));
}
