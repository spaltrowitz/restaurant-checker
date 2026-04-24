import { PLATFORMS, RATE_LIMIT_DELAY, detectCardConflicts } from "@/lib/platforms";
import { checkBlackbird, checkViaSearch, delay } from "@/lib/checkers";

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

      for (let i = 0; i < PLATFORMS.length; i++) {
        if (i > 0) await delay(RATE_LIMIT_DELAY);

        const platform = PLATFORMS[i];
        const result =
          platform.name === "Blackbird"
            ? await checkBlackbird(query)
            : await checkViaSearch(platform, query);

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
