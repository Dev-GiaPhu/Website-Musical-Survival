import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await supabase
    .from("news_posts")
    .select("slug,title,summary,published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ items: data ?? [] });
}
