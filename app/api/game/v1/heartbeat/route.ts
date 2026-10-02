import { NextResponse } from "next/server";
import { getGameSession } from "@/lib/game-api";

export async function POST(request: Request) {
  const session = await getGameSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await session.supabase.rpc("touch_presence");
  if (error) return NextResponse.json({ error: "presence_unavailable" }, { status: 503 });

  return new NextResponse(null, { status: 204 });
}
