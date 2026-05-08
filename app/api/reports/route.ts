import { getReports } from "@/lib/db";
import { rateLimit, REPORTS_LIMIT } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(request, "/api/reports", REPORTS_LIMIT);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return Response.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const reports = getReports(query);
  return Response.json({ reports });
}
