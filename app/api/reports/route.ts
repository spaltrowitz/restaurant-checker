import { getReports } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return Response.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const reports = getReports(query);
  return Response.json({ reports });
}
