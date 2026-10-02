import { NextResponse } from "next/server";
import { z } from "zod";
import { getGameSession } from "@/lib/game-api";

const purchaseSchema = z.object({
  sku: z.string().trim().min(1).max(80)
});

export async function POST(request: Request) {
  const session = await getGameSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const { data, error } = await session.supabase.rpc("purchase_store_item", {
    target_sku: parsed.data.sku
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("INSUFFICIENT_BALANCE")) {
      return NextResponse.json({ error: "insufficient_balance" }, { status: 409 });
    }
    if (message.includes("ITEM_ALREADY_OWNED")) {
      return NextResponse.json({ error: "already_owned" }, { status: 409 });
    }
    if (message.includes("ITEM_NOT_FOUND")) {
      return NextResponse.json({ error: "item_not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "purchase_failed" }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
