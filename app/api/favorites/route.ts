import { headers } from "next/headers";
import {
  hashUser,
  addFavorite,
  removeFavorite,
  getFavorites,
} from "@/lib/db";
import { rateLimit, REPORT_LIMIT } from "@/lib/rate-limit";

export const runtime = "nodejs";

async function getUserHash(): Promise<string> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";
  const ua = hdrs.get("user-agent") || "unknown";
  return hashUser(ip, ua);
}

export async function GET(request: Request) {
  const limited = rateLimit(request, "/api/favorites", REPORT_LIMIT);
  if (limited) return limited;

  const userHash = await getUserHash();
  const favorites = getFavorites(userHash);
  return Response.json({ favorites });
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "/api/favorites", REPORT_LIMIT);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { restaurantName } = body;

    if (!restaurantName || typeof restaurantName !== "string") {
      return Response.json(
        { error: "restaurantName is required" },
        { status: 400 }
      );
    }

    if (restaurantName.trim().length < 2) {
      return Response.json(
        { error: "Restaurant name too short" },
        { status: 400 }
      );
    }

    const userHash = await getUserHash();
    addFavorite(userHash, restaurantName);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const limited = rateLimit(request, "/api/favorites", REPORT_LIMIT);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { restaurantName } = body;

    if (!restaurantName || typeof restaurantName !== "string") {
      return Response.json(
        { error: "restaurantName is required" },
        { status: 400 }
      );
    }

    const userHash = await getUserHash();
    removeFavorite(userHash, restaurantName);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
