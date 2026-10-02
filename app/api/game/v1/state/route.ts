import { NextResponse } from "next/server";
import { z } from "zod";
import { getGameSession } from "@/lib/game-api";

const saveSchema = z.object({
  revision: z.number().int().nonnegative(),
  state: z.record(z.string(), z.unknown())
});

export async function GET(request: Request) {
  const session = await getGameSession(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await session.supabase
    .from("player_game_state")
    .select("level,xp,revision,state,updated_at")
    .eq("user_id", session.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "state_unavailable" }, { status: 503 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const session = await getGameSession(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 70000) {
    return NextResponse.json({ error: "state_too_large" }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  const { data, error } = await session.supabase.rpc("save_player_state", {
    expected_revision: parsed.data.revision,
    new_state: parsed.data.state
  });

  if (error) {
    if (error.message.includes("STATE_CONFLICT")) {
      return NextResponse.json({ error: "state_conflict" }, { status: 409 });
    }
    if (error.message.includes("STATE_TOO_LARGE")) {
      return NextResponse.json({ error: "state_too_large" }, { status: 413 });
    }
    return NextResponse.json({ error: "state_save_failed" }, { status: 400 });
  }

  return NextResponse.json(data);
}
