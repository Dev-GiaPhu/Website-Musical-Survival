import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PaymentResultPage({
  searchParams
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const user = await requireUser();
  const { orderId } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: order } = orderId
    ? await supabase
        .from("payment_orders")
        .select("status,amount_vnd,coin_amount,created_at")
        .eq("provider_order_id", orderId)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const title =
    order?.status === "paid"
      ? "Thanh toán thành công"
      : order?.status === "failed"
        ? "Thanh toán chưa hoàn tất"
        : "Đang xác nhận thanh toán";

  return (
    <section className="narrow-page shell">
      <div className="panel auth-panel">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>{title}</h1>
        <p>
          {order?.status === "paid"
            ? "Số dư tài khoản đã được cập nhật."
            : order?.status === "failed"
              ? "Giao dịch không được hoàn tất."
              : "Kết quả thanh toán đang được xác nhận."}
        </p>
        <Link className="button button-primary full" href="/account">
          Về tài khoản
        </Link>
      </div>
    </section>
  );
}
