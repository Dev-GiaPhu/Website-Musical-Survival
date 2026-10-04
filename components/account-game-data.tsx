"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Wallet = {
  id: string;
  coin_balance: number;
  version: number;
};

type GameState = {
  level: number;
  xp: number;
  revision: number;
  updated_at: string;
};

type LedgerEntry = {
  id: string;
  delta: number;
  balance_after: number;
  kind: string;
  created_at: string;
};

type Payment = {
  id: string;
  provider_order_id: string;
  amount_vnd: number;
  coin_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};

type AchievementRow = {
  id: string;
  unlocked_at: string;
  achievements:
    | { code: string; name: string; description: string; hidden: boolean }
    | { code: string; name: string; description: string; hidden: boolean }[]
    | null;
};

type InventoryRow = {
  id: string;
  acquired_at: string;
  source: string;
  store_items:
    | { sku: string; name: string }
    | { sku: string; name: string }[]
    | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function AccountGameData() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!active || !user) {
        setLoaded(true);
        return;
      }

      const [
        walletResult,
        stateResult,
        achievementResult,
        inventoryResult,
        paymentResult
      ] = await Promise.all([
        supabase
          .from("wallets")
          .select("id,coin_balance,version")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("player_game_state")
          .select("level,xp,revision,updated_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("player_achievements")
          .select("id,unlocked_at,achievements(code,name,description,hidden)")
          .eq("user_id", user.id)
          .order("unlocked_at", { ascending: false })
          .limit(12),
        supabase
          .from("player_inventory")
          .select("id,acquired_at,source,store_items(sku,name)")
          .eq("user_id", user.id)
          .order("acquired_at", { ascending: false })
          .limit(12),
        supabase
          .from("payment_orders")
          .select("id,provider_order_id,amount_vnd,coin_amount,status,created_at,paid_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)
      ]);

      if (!active) return;

      const walletData = walletResult.data as Wallet | null;
      setWallet(walletData);
      setGameState(stateResult.data as GameState | null);
      setAchievements((achievementResult.data as AchievementRow[] | null) ?? []);
      setInventory((inventoryResult.data as InventoryRow[] | null) ?? []);
      setPayments((paymentResult.data as Payment[] | null) ?? []);

      if (walletData) {
        const { data } = await supabase
          .from("wallet_ledger")
          .select("id,delta,balance_after,kind,created_at")
          .eq("wallet_id", walletData.id)
          .order("created_at", { ascending: false })
          .limit(12);

        if (active) setLedger((data as LedgerEntry[] | null) ?? []);
      }

      if (active) setLoaded(true);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (!loaded) {
    return (
      <div className="panel">
        <span className="kicker">DỮ LIỆU GAME</span>
        <p className="panel-note">Đang đồng bộ dữ liệu tài khoản...</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="account-stats-grid">
        <div className="panel">
          <span className="kicker">SỐ DƯ</span>
          <p className="stat-number">{Number(wallet?.coin_balance ?? 0).toLocaleString("vi-VN")}</p>
          <Link className="button button-primary full" href="/top-up">Nạp tiền</Link>
        </div>
        <div className="panel">
          <span className="kicker">TIẾN TRÌNH GAME</span>
          <div className="account-stat-pair">
            <div><span>Level</span><strong>{gameState?.level ?? 1}</strong></div>
            <div><span>XP</span><strong>{Number(gameState?.xp ?? 0).toLocaleString("vi-VN")}</strong></div>
          </div>
          <p className="panel-note">Cập nhật gần nhất: {formatDate(gameState?.updated_at)}</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <h2>Thành tựu gần đây</h2>
          <span className="badge">{achievements.length}</span>
        </div>
        {achievements.length ? (
          <div className="account-collection-grid">
            {achievements.map((row) => {
              const item = relationOne(row.achievements);
              return (
                <div className="account-collection-item" key={row.id}>
                  <strong>{item?.name || item?.code || "Thành tựu"}</strong>
                  <span>{item?.description || "Đã mở khóa"}</span>
                  <small>{formatDate(row.unlocked_at)}</small>
                </div>
              );
            })}
          </div>
        ) : <p className="panel-note">Chưa có thành tựu được mở khóa.</p>}
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <h2>Vật phẩm gần đây</h2>
          <span className="badge">{inventory.length}</span>
        </div>
        {inventory.length ? (
          <div className="account-collection-grid">
            {inventory.map((row) => {
              const item = relationOne(row.store_items);
              return (
                <div className="account-collection-item" key={row.id}>
                  <strong>{item?.name || item?.sku || "Vật phẩm"}</strong>
                  <span>{item?.sku || row.source}</span>
                  <small>{formatDate(row.acquired_at)}</small>
                </div>
              );
            })}
          </div>
        ) : <p className="panel-note">Chưa có vật phẩm trong tài khoản.</p>}
      </div>

      <div className="panel table-panel">
        <div className="panel-title-row"><h2>Lịch sử số dư</h2></div>
        {ledger.length ? (
          <div className="data-table">
            <div className="data-row data-head">
              <span>Loại</span><span>Thay đổi</span><span>Số dư sau</span><span>Thời gian</span>
            </div>
            {ledger.map((entry) => (
              <div className="data-row" key={entry.id}>
                <span>{entry.kind}</span>
                <span>{Number(entry.delta).toLocaleString("vi-VN")}</span>
                <span>{Number(entry.balance_after).toLocaleString("vi-VN")}</span>
                <span>{formatDate(entry.created_at)}</span>
              </div>
            ))}
          </div>
        ) : <p className="panel-note">Chưa có giao dịch số dư.</p>}
      </div>

      <div className="panel table-panel">
        <div className="panel-title-row"><h2>Lịch sử nạp tiền</h2></div>
        {payments.length ? (
          <div className="data-table">
            <div className="data-row data-head">
              <span>Mã giao dịch</span><span>Giá trị</span><span>Quyền lợi</span><span>Trạng thái</span>
            </div>
            {payments.map((payment) => (
              <div className="data-row" key={payment.id}>
                <span><strong>{payment.provider_order_id}</strong><small>{formatDate(payment.created_at)}</small></span>
                <span>{Number(payment.amount_vnd).toLocaleString("vi-VN")} ₫</span>
                <span>{Number(payment.coin_amount).toLocaleString("vi-VN")}</span>
                <span><span className="badge">{payment.status}</span></span>
              </div>
            ))}
          </div>
        ) : <p className="panel-note">Chưa có giao dịch nạp tiền.</p>}
      </div>
    </div>
  );
}
