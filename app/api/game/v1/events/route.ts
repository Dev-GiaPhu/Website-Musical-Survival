import { NextResponse } from "next/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export async function GET() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("game_events")
    .select("id,slug,title,summary,rules,submission_prompt,reward_description,starts_at,ends_at,max_entries")
    .eq("status", "published")
    .order("starts_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "events_unavailable" }, { status: 503 });
  }

  const now = Date.now();
  const items = (data ?? []).map((event) => {
    const starts = new Date(event.starts_at).getTime();
    const ends = new Date(event.ends_at).getTime();
    const phase = now < starts ? "not_started" : now >= ends ? "ended" : "open";
    return { ...event, phase };
  });

  return NextResponse.json(
    { items },
    { headers: { "cache-control": "public, max-age=10, s-maxage=20" } }
  );
}
