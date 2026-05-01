import { PLATFORMS, detectCardConflicts } from "@/lib/platforms";
import {
  checkBlackbird,
  checkUpside,
  checkBilt,
  checkRewardsNetwork,
  batchSearch,
  evaluateSearchResults,
} from "@/lib/checkers";
import { rateLimit, CHECK_LIMIT } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request, "/api/check", CHECK_LIMIT);
  if (limited) return limited;

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
      try {
        const foundPlatforms: string[] = [];

        // Run Blackbird sitemap check, Upside API check, Bilt API check, Rewards Network API check, and batch web search in parallel
        const [blackbirdResult, upsideResult, biltResult, rewardsNetworkResult, searchResults] = await Promise.all([
          checkBlackbird(query),
          checkUpside(query),
          checkBilt(query),
          checkRewardsNetwork(query),
          batchSearch(query),
        ]);

        // Stream Blackbird result first
        if (blackbirdResult.found) foundPlatforms.push("Blackbird");
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(blackbirdResult)}\n\n`)
        );

        // Stream Upside result
        if (upsideResult.found) foundPlatforms.push("Upside");
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(upsideResult)}\n\n`)
        );

        // Stream Bilt result
        if (biltResult.found) foundPlatforms.push("Bilt Rewards");
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(biltResult)}\n\n`)
        );

        // Stream Rewards Network result
        if (rewardsNetworkResult.found) foundPlatforms.push("Rewards Network");
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(rewardsNetworkResult)}\n\n`)
        );

        // Stream remaining platform results
        for (const platform of PLATFORMS) {
          if (platform.name === "Blackbird" || platform.name === "Upside" || platform.name === "Bilt Rewards" || platform.name === "Rewards Network") continue;

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
      } catch (error) {
        console.error('[api/check]', error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", details: "Internal server error" })}\n\n`)
        );
        controller.close();
      }
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
