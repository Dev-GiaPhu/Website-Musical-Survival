import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [
    profileResult,
    walletResult,
    stateResult,
    achievementsResult,
    inventoryResult,
    paymentsResult,
    usernameHistoryResult,
    eventEntriesResult
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,username,display_name,role,status,username_changed_at,last_seen_at,created_at,updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("wallets")
      .select("id,coin_balance,version,created_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("player_game_state")
      .select("level,xp,revision,state,updated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("player_achievements")
      .select("unlocked_at,metadata,achievements(code,name,description,hidden)")
      .eq("user_id", user.id)
      .order("unlocked_at", { ascending: false }),
    supabase
      .from("player_inventory")
      .select("acquired_at,source,metadata,store_items(sku,name,metadata)")
      .eq("user_id", user.id)
      .order("acquired_at", { ascending: false }),
    supabase
      .from("payment_orders")
      .select("provider,provider_order_id,provider_transaction_id,amount_vnd,coin_amount,status,paid_at,created_at,updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("username_history")
      .select("old_username,changed_at")
      .eq("user_id", user.id)
      .order("changed_at", { ascending: false }),
    supabase
      .from("game_event_entries")
      .select("submission,status,reward_coins,admin_note,submitted_at,reviewed_at,game_events(slug,title)")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
  ]);

  const wallet = walletResult.data;
  const ledgerResult = wallet
    ? await supabase
        .from("wallet_ledger")
        .select("delta,balance_after,kind,reference_id,metadata,created_at")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const payload = {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      createdAt: user.created_at,
      emailConfirmedAt: user.email_confirmed_at ?? null,
      phoneConfirmedAt: user.phone_confirmed_at ?? null,
      signInProviders: (user.identities ?? []).map((identity) => identity.provider)
    },
    profile: profileResult.data,
    wallet,
    walletLedger: ledgerResult.data ?? [],
    gameState: stateResult.data,
    achievements: achievementsResult.data ?? [],
    inventory: inventoryResult.data ?? [],
    payments: paymentsResult.data ?? [],
    usernameHistory: usernameHistoryResult.data ?? [],
    eventEntries: eventEntriesResult.data ?? []
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="musical-survival-account-data.json"',
      "cache-control": "no-store, private",
      "x-content-type-options": "nosniff"
    }
  });
}
