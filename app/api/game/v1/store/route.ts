import { NextResponse } from "next/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export async function GET() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("store_items")
    .select("sku,name,price_coins,metadata")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "store_unavailable" }, { status: 503 });
  }

  return NextResponse.json(
    { items: data ?? [] },
    { headers: { "cache-control": "public, max-age=30, s-maxage=60" } }
  );
}
