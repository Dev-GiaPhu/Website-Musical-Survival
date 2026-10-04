import { NextResponse } from "next/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deep = url.searchParams.get("deep") === "1";

  if (!deep) {
    return NextResponse.json(
      {
        service: "musical-survival",
        status: "ok",
        timestamp: new Date().toISOString()
      },
      { headers: { "cache-control": "no-store" } }
    );
  }

  try {
    const supabase = createSupabasePublicClient();

    const [newsResult, eventsResult, storeResult] = await Promise.all([
      supabase.from("news_posts").select("id").limit(1),
      supabase.from("game_events").select("id").limit(1),
      supabase.from("store_items").select("id").limit(1)
    ]);

    const databaseHealthy =
      !newsResult.error &&
      !eventsResult.error &&
      !storeResult.error;

    return NextResponse.json(
      {
        service: "musical-survival",
        status: databaseHealthy ? "ok" : "degraded",
        checks: {
          database: databaseHealthy,
          news: !newsResult.error,
          events: !eventsResult.error,
          store: !storeResult.error
        },
        timestamp: new Date().toISOString()
      },
      {
        status: databaseHealthy ? 200 : 503,
        headers: { "cache-control": "no-store" }
      }
    );
  } catch {
    return NextResponse.json(
      {
        service: "musical-survival",
        status: "degraded",
        checks: { database: false },
        timestamp: new Date().toISOString()
      },
      {
        status: 503,
        headers: { "cache-control": "no-store" }
      }
    );
  }
}
