import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isTrustedGameServer } from "@/lib/game-server-auth";

const schema = z.object({
  playerId: z.string().uuid(),
  code: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9_-]+$/),
  metadata: z.record(z.string(), z.unknown()).optional().default({})
});

export async function POST(request: Request) {
  if (!isTrustedGameServer(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 20000) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("server_unlock_achievement", {
    target_user_id: parsed.data.playerId,
    target_code: parsed.data.code,
    achievement_metadata: parsed.data.metadata
  });

  if (error) {
    if (error.message.includes("ACHIEVEMENT_NOT_FOUND")) {
      return NextResponse.json({ error: "achievement_not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "achievement_unlock_failed" }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
