"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type PackageRow = {
  id: string;
  name: string;
  vnd_amount: number;
  coin_amount: number;
};

const errorMessages: Record<string, string> = {
  package: "Gói nạp không hợp lệ hoặc không còn được phát hành.",
  unavailable: "Thanh toán hiện chưa được mở.",
  order: "Không thể tạo giao dịch. Vui lòng thử lại.",
  payment: "Đơn vị thanh toán chưa thể khởi tạo giao dịch."
};

export function TopUpPanel() {
  const searchParams = useSearchParams();
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const error = useMemo(() => {
    const code = searchParams.get("error");
    return code ? errorMessages[code] || "Không thể bắt đầu thanh toán." : null;
  }, [searchParams]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function load() {
      const [{ data: authData }, packageResult, configResponse] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("topup_packages")
          .select("id,name,vnd_amount,coin_amount")
          .eq("active", true)
          .order("vnd_amount", { ascending: true }),
        fetch("/api/game/v1/config", { cache: "no-store" }).catch(() => null)
      ]);

      if (!active) return;

      setSignedIn(Boolean(authData.user));
      setPackages((packageResult.data as PackageRow[] | null) ?? []);

      if (configResponse?.ok) {
        const config = await configResponse.json().catch(() => null) as {
          features?: { payments?: boolean };
        } | null;
        if (active) setPaymentsEnabled(Boolean(config?.features?.payments));
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
      <div className="empty-panel">
        <span className="empty-icon">♪</span>
        <div><h3>Đang tải gói nạp</h3><p>Đang đồng bộ thông tin thanh toán.</p></div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="panel auth-panel" style={{ margin: "0 auto" }}>
        <h2>Đăng nhập để nạp tiền</h2>
        <p className="panel-note">Giao dịch phải được liên kết với một Player ID Musical Survival.</p>
        <Link className="button button-primary full" href="/auth?mode=login">Đăng nhập</Link>
        <Link className="button button-ghost full" href="/auth?mode=register">Tạo tài khoản</Link>
      </div>
    );
  }

  return (
    <>
      {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}
      {!paymentsEnabled ? (
        <div className="notice notice-warning" style={{ marginBottom: 18 }}>
          <strong>Thanh toán chưa được mở</strong>
          <span>Các gói có thể được chuẩn bị trước, nhưng nút thanh toán chỉ hoạt động khi kênh thanh toán chính thức đã được cấu hình.</span>
        </div>
      ) : null}

      {packages.length ? (
        <div className="news-grid">
          {packages.map((item) => (
            <div className="news-card" key={item.id}>
              <div className="news-meta">GÓI NẠP</div>
              <h3>{item.name}</h3>
              <p className="stat-number" style={{ margin: "8px 0" }}>
                {Number(item.coin_amount).toLocaleString("vi-VN")}
              </p>
              <p>{Number(item.vnd_amount).toLocaleString("vi-VN")} ₫</p>
              <form action="/api/payments/momo/create" method="post" style={{ marginTop: "auto" }}>
                <input type="hidden" name="packageId" value={item.id} />
                <button className="button button-primary full" type="submit" disabled={!paymentsEnabled}>
                  {paymentsEnabled ? "Thanh toán" : "Chưa mở thanh toán"}
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <span className="empty-icon">♪</span>
          <div>
            <h3>Chưa có gói nạp được công bố</h3>
            <p>Các gói nạp chính thức sẽ xuất hiện tại đây khi sẵn sàng.</p>
          </div>
        </div>
      )}
    </>
  );
}
