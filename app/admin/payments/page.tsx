import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: orders } = await supabase
    .from("payment_orders")
    .select("id,user_id,provider_order_id,amount_vnd,coin_amount,status,created_at,paid_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Giao dịch</h1>
        <p>Theo dõi các giao dịch nạp tiền đã được tạo.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <div className="panel table-panel">
          <div className="data-table">
            <div className="data-row data-head">
              <span>Mã giao dịch</span><span>Giá trị</span><span>Quyền lợi</span><span>Trạng thái</span>
            </div>
            {orders?.length ? orders.map((order) => (
              <div className="data-row" key={order.id}>
                <span><strong>{order.provider_order_id}</strong><small>{formatDate(order.created_at)}</small></span>
                <span>{Number(order.amount_vnd).toLocaleString("vi-VN")} ₫</span>
                <span>{Number(order.coin_amount).toLocaleString("vi-VN")}</span>
                <span><span className="badge">{order.status}</span></span>
              </div>
            )) : <p className="panel-note">Chưa có giao dịch.</p>}
          </div>
        </div>
        <div style={{ marginTop: 16 }}><Link className="text-link" href="/admin">← Quản lý nội dung</Link></div>
      </section>
    </>
  );
}
