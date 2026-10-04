"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Order = {
  status: "pending" | "paid" | "failed" | "refunded";
  amount_vnd: number;
  coin_amount: number;
  created_at: string;
  paid_at: string | null;
};

export function PaymentResultLive() {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!active) return;

      if (!authData.user) {
        setSignedIn(false);
        setLoaded(true);
        return;
      }

      if (!orderId) {
        setLoaded(true);
        return;
      }

      const { data } = await supabase
        .from("payment_orders")
        .select("status,amount_vnd,coin_amount,created_at,paid_at")
        .eq("provider_order_id", orderId)
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!active) return;

      const next = data as Order | null;
      setOrder(next);
      setLoaded(true);

      if (next?.status === "pending" && attempts < 15) {
        attempts += 1;
        timer = setTimeout(() => void load(), 2000);
      }
    }

    void load();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  if (!loaded) {
    return (
      <div className="panel auth-panel">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Đang xác nhận</h1>
        <p>Đang kiểm tra trạng thái giao dịch...</p>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="panel auth-panel">
        <h1>Đăng nhập để xem giao dịch</h1>
        <Link className="button button-primary full" href="/auth?mode=login">Đăng nhập</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="panel auth-panel">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Không tìm thấy giao dịch</h1>
        <p>Mã giao dịch không thuộc tài khoản hiện tại hoặc không tồn tại.</p>
        <Link className="button button-primary full" href="/account">Về tài khoản</Link>
      </div>
    );
  }

  const title =
    order.status === "paid"
      ? "Thanh toán thành công"
      : order.status === "failed"
        ? "Thanh toán chưa hoàn tất"
        : order.status === "refunded"
          ? "Giao dịch đã hoàn tiền"
          : "Đang xác nhận thanh toán";

  return (
    <div className="panel auth-panel">
      <span className="kicker">MUSICAL SURVIVAL</span>
      <h1>{title}</h1>
      <div className="profile-row"><span>Mã giao dịch</span><strong>{orderId}</strong></div>
      <div className="profile-row"><span>Giá trị</span><strong>{Number(order.amount_vnd).toLocaleString("vi-VN")} ₫</strong></div>
      <div className="profile-row"><span>Quyền lợi</span><strong>{Number(order.coin_amount).toLocaleString("vi-VN")}</strong></div>
      <div className="profile-row"><span>Trạng thái</span><strong>{order.status}</strong></div>
      <p className="panel-note">
        {order.status === "paid"
          ? "Số dư tài khoản đã được cập nhật bởi callback thanh toán đã xác minh."
          : order.status === "pending"
            ? "Trang sẽ tự kiểm tra lại trong ít phút đầu. Không cần thanh toán lại khi giao dịch vẫn đang chờ xác nhận."
            : "Nếu bạn đã thanh toán nhưng trạng thái không đúng, hãy giữ mã giao dịch để đối soát."}
      </p>
      <Link className="button button-primary full" href="/account">Về tài khoản</Link>
    </div>
  );
}
