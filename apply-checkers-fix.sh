#!/usr/bin/env bash
# Fenster's fix: filter out search pages and "no results" listings
# Run this from the eatdiscounted repo root after: git checkout spaltrowitz/add-nextjs-web-ui

set -euo pipefail
cd "$(dirname "$0")"

git checkout spaltrowitz/add-nextjs-web-ui

FILE="lib/checkers.ts"
if [[ ! -f "$FILE" ]]; then
  echo "ERROR: $FILE not found. Are you on the right branch?"
  exit 1
fi

# Use node to apply the patch precisely
node -e '
const fs = require("fs");
const file = "lib/checkers.ts";
let code = fs.readFileSync(file, "utf8");

const anchor = `    if (
      lowerHref.includes("/blog/") ||
      lowerHref.includes("/retailer-blog/") ||
      lowerHref.includes("/help/") ||
      lowerHref.includes("/faq/") ||
      lowerHref.includes("/hc/en-us/")
    ) {
      continue;
    }`;

const insertion = `    // Skip search/explore pages (query pages, not restaurant listings)
    if (
      /\\/(search|find|explore|discover|browse)(\\/|\\?|$)/i.test(lowerHref)
    ) {
      continue;
    }

    // Skip "no results" / empty listing pages
    const negativeContent = \`\${r.title.toLowerCase()} \${r.snippet.toLowerCase()}\`;
    const NO_RESULT_PHRASES = [
      "no results", "0 results", "not found", "no restaurants",
      "no matches", "sorry", "no locations", "no offers",
      "we couldn'\''t find", "we could not find", "nothing found", "no listings",
    ];
    if (NO_RESULT_PHRASES.some((phrase) => negativeContent.includes(phrase))) {
      continue;
    }`;

if (!code.includes(anchor)) {
  console.error("ERROR: Could not find anchor block in", file);
  process.exit(1);
}

code = code.replace(anchor, anchor + "\n" + insertion);
fs.writeFileSync(file, code, "utf8");
console.log("✅ Patched", file);
'

echo "Running build..."
npm run build

echo "Running tests..."
npm test

echo "Committing..."
git add lib/checkers.ts
git commit -m 'fix(checkers): filter out search pages and "no results" listings

Skip search/explore/discover/browse URL patterns and pages whose
title or snippet contain "no results"-style phrases so they don't
produce false-positive restaurant matches.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'

echo "✅ Done! Run 'git push' to push the fix."
