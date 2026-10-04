"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type StoreItem = {
  sku: string;
  name: string;
  price_coins: number;
};

type InventoryItem = {
  store_items:
    | { sku: string }
    | { sku: string }[]
    | null;
};

type StorefrontSnapshot = {
  items: StoreItem[];
  signedIn: boolean;
  balance: number;
  owned: Set<string>;
};

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function fetchStorefrontSnapshot(): Promise<StorefrontSnapshot> {
  const supabase = createSupabaseBrowserClient();

  const [{ data: authData }, storeResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("store_items")
      .select("sku,name,price_coins")
      .eq("active", true)
      .order("created_at", { ascending: true })
  ]);

  const items = (storeResult.data as StoreItem[] | null) ?? [];
  const user = authData.user;

  if (!user) {
    return {
      items,
      signedIn: false,
      balance: 0,
      owned: new Set<string>()
    };
  }

  const [walletResult, inventoryResult] = await Promise.all([
    supabase
      .from("wallets")
      .select("coin_balance")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("player_inventory")
      .select("store_items(sku)")
      .eq("user_id", user.id)
  ]);

  const owned = new Set<string>();
  for (const row of (inventoryResult.data as InventoryItem[] | null) ?? []) {
    const item = relationOne(row.store_items);
    if (item?.sku) owned.add(item.sku);
  }

  return {
    items,
    signedIn: true,
    balance: Number(walletResult.data?.coin_balance ?? 0),
    owned
  };
}

export function Storefront() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState(0);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    void fetchStorefrontSnapshot().then((snapshot) => {
      if (!active) return;
      setItems(snapshot.items);
      setSignedIn(snapshot.signedIn);
      setBalance(snapshot.balance);
      setOwned(snapshot.owned);
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, []);

  async function refreshStorefront() {
    const snapshot = await fetchStorefrontSnapshot();
    setItems(snapshot.items);
    setSignedIn(snapshot.signedIn);
    setBalance(snapshot.balance);
    setOwned(snapshot.owned);
    setLoaded(true);
  }

  async function purchase(sku: string) {
    setBusySku(sku);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setMessage({ kind: "error", text: "Hãy đăng nhập trước khi mua vật phẩm." });
        return;
      }

      const response = await fetch("/api/game/v1/store/purchase", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sku })
      });

      const payload = await response.json().catch(() => null) as {
        error?: string;
      } | null;

      if (!response.ok) {
        const text =
          payload?.error === "insufficient_balance"
            ? "Số dư không đủ."
            : payload?.error === "already_owned"
              ? "Tài khoản đã sở hữu vật phẩm này."
              : payload?.error === "item_not_found"
                ? "Vật phẩm không còn được phát hành."
                : "Không thể hoàn tất giao dịch.";

        setMessage({ kind: "error", text });
        return;
      }

      setMessage({ kind: "success", text: "Vật phẩm đã được thêm vào tài khoản." });
      await refreshStorefront();
    } finally {
      setBusySku(null);
    }
  }

  if (!loaded) {
    return (
      <div className="empty-panel">
        <span className="empty-icon">♪</span>
        <div>
          <h3>Đang tải cửa hàng</h3>
          <p>Đang đồng bộ catalog chính thức.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {message ? (
        <div className={`notice notice-${message.kind}`} style={{ marginBottom: 18 }}>
          {message.text}
        </div>
      ) : null}

      {signedIn ? (
        <div className="store-balance panel">
          <div>
            <span className="kicker">SỐ DƯ HIỆN TẠI</span>
            <strong>{balance.toLocaleString("vi-VN")}</strong>
          </div>
          <Link className="button button-ghost" href="/top-up">Nạp tiền</Link>
        </div>
      ) : (
        <div className="notice notice-warning" style={{ marginBottom: 18 }}>
          <strong>Đăng nhập để mua vật phẩm</strong>
          <span>
            Bạn vẫn có thể xem catalog, nhưng giao dịch phải được liên kết với Player ID Musical Survival.
          </span>
        </div>
      )}

      {items.length ? (
        <div className="news-grid">
          {items.map((item) => {
            const isOwned = owned.has(item.sku);

            return (
              <article className="news-card store-card" key={item.sku}>
                <div className="news-meta">{item.sku}</div>
                <h3>{item.name}</h3>
                <p className="stat-number">{Number(item.price_coins).toLocaleString("vi-VN")}</p>
                {signedIn ? (
                  <button
                    className={`button ${isOwned ? "button-ghost" : "button-primary"} full`}
                    type="button"
                    disabled={isOwned || busySku === item.sku}
                    onClick={() => void purchase(item.sku)}
                  >
                    {isOwned
                      ? "Đã sở hữu"
                      : busySku === item.sku
                        ? "Đang xử lý..."
                        : "Mua vật phẩm"}
                  </button>
                ) : (
                  <Link className="button button-primary full" href="/auth?mode=login">
                    Đăng nhập để mua
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-panel">
          <span className="empty-icon">♪</span>
          <div>
            <h3>Chưa có vật phẩm được công bố</h3>
            <p>Catalog chính thức sẽ xuất hiện tại đây khi sẵn sàng.</p>
          </div>
        </div>
      )}
    </>
  );
}
