import { NextResponse } from "next/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export async function GET() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id,title,content,severity,starts_at,ends_at,created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "announcements_unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    { items: data ?? [] },
    { headers: { "cache-control": "public, max-age=15, s-maxage=30" } }
  );
}
