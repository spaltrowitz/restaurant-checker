import { addReport } from "@/lib/db";
import { headers } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant, platform } = body;

    if (!restaurant || typeof restaurant !== "string") {
      return Response.json({ error: "restaurant is required" }, { status: 400 });
    }
    if (!platform || typeof platform !== "string") {
      return Response.json({ error: "platform is required" }, { status: 400 });
    }

    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "unknown";

    const result = addReport(restaurant, platform, ip);

    if (!result.success) {
      return Response.json(
        { error: result.error },
        { status: result.error === "Already reported" ? 409 : 400 }
      );
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
