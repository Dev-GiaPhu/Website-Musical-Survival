import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isTrustedGameServer } from "@/lib/game-server-auth";

const schema = z.object({
  playerId: z.string().uuid(),
  level: z.number().int().min(1).max(1000000),
  xp: z.number().int().nonnegative()
});

export async function POST(request: Request) {
  if (!isTrustedGameServer(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("server_update_player_progress", {
    target_user_id: parsed.data.playerId,
    new_level: parsed.data.level,
    new_xp: parsed.data.xp
  });

  if (error) {
    return NextResponse.json({ error: "progress_update_failed" }, { status: 400 });
  }

  return NextResponse.json(data);
}
