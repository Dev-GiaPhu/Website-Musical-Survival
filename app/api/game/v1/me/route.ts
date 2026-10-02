import { NextResponse } from "next/server";
import { getGameSession } from "@/lib/game-api";

export async function GET(request: Request) {
  const session = await getGameSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { user, supabase } = session;

  const [profile, wallet, gameState, achievements, inventory] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,status,created_at,updated_at,last_seen_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("wallets")
      .select("coin_balance,version")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("player_game_state")
      .select("level,xp,revision,state,updated_at")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("player_achievements")
      .select("unlocked_at,metadata,achievements(code,name,description,hidden)")
      .eq("user_id", user.id),
    supabase
      .from("player_inventory")
      .select("acquired_at,source,metadata,store_items(sku,name,metadata)")
      .eq("user_id", user.id)
  ]);

  if (profile.error || wallet.error || gameState.error) {
    return NextResponse.json({ error: "profile_unavailable" }, { status: 503 });
  }

  return NextResponse.json({
    playerId: user.id,
    profile: profile.data,
    wallet: wallet.data,
    gameState: gameState.data,
    achievements: achievements.data ?? [],
    inventory: inventory.data ?? []
  });
}
