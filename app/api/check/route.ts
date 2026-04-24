import { PLATFORMS, detectCardConflicts } from "@/lib/platforms";
import {
  checkBlackbird,
  batchSearch,
  evaluateSearchResults,
} from "@/lib/checkers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2 || query.length > 100) {
    return Response.json(
      { error: "Query must be 2-100 characters" },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const foundPlatforms: string[] = [];

      // Run Blackbird sitemap check and batch web search in parallel
      const [blackbirdResult, searchResults] = await Promise.all([
        checkBlackbird(query),
        batchSearch(query),
      ]);

      // Stream Blackbird result first
      if (blackbirdResult.found) foundPlatforms.push("Blackbird");
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(blackbirdResult)}\n\n`)
      );

      // Stream remaining platform results
      for (const platform of PLATFORMS) {
        if (platform.name === "Blackbird") continue;

        const search = searchResults.get(platform.name);
        const result = search
          ? evaluateSearchResults(platform, query, search)
          : {
              platform: platform.name,
              found: false,
              details: "Search unavailable",
              method: "error" as const,
              url: platform.url,
              matches: [] as string[],
              searchUnavailable: true,
            };

        if (result.found) foundPlatforms.push(result.platform);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(result)}\n\n`)
        );
      }

      const conflicts = detectCardConflicts(foundPlatforms);
      if (conflicts) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "conflict",
              platforms: conflicts,
              message: `${conflicts.join(", ")} cannot share the same linked card. Use a different card for each.`,
            })}\n\n`
          )
        );
      }

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
