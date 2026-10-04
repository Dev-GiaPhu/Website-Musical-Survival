import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PaymentRow = {
  id: string;
  user_id: string | null;
  provider_order_id: string;
  provider_transaction_id: string | null;
  amount_vnd: number;
  coin_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function AdminPaymentsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q || "").trim();
  const status = ["pending", "paid", "failed", "refunded"].includes(params.status || "")
    ? params.status || ""
    : "";
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = 50;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("payment_orders")
    .select("id,user_id,provider_order_id,provider_transaction_id,amount_vnd,coin_amount,status,created_at,paid_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq("status", status);

  if (q) {
    if (/^[0-9a-fA-F-]{36}$/.test(q)) {
      query = query.eq("user_id", q);
    } else if (/^[A-Za-z0-9_-]{2,100}$/.test(q)) {
      query = query.ilike("provider_order_id", `%${q}%`);
    }
  }

  const { data, count, error } = await query;
  const orders = (data as PaymentRow[] | null) ?? [];
  const userIds = [...new Set(orders.map((order) => order.user_id).filter(Boolean))] as string[];

  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id,username,display_name").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

  function pageHref(target: number) {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (status) search.set("status", status);
    search.set("page", String(target));
    return `/admin/payments?${search.toString()}`;
  }

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">PUBLISHER CONSOLE</span>
        <h1>Giao dịch</h1>
        <p>Tìm kiếm, lọc và đối soát các giao dịch nạp tiền của Musical Survival.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <div className="panel" style={{ marginBottom: 14 }}>
          <form className="admin-filter-form" method="get">
            <div className="field">
              <label htmlFor="q">Mã giao dịch hoặc Player ID</label>
              <input id="q" name="q" defaultValue={q} placeholder="MS-... hoặc UUID" />
            </div>
            <div className="field">
              <label htmlFor="status">Trạng thái</label>
              <select id="status" name="status" className="select-field" defaultValue={status}>
                <option value="">Tất cả</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <button className="button button-primary" type="submit">Lọc</button>
            <Link className="button button-ghost" href="/admin/payments">Đặt lại</Link>
          </form>
        </div>

        {error ? (
          <div className="notice notice-error" style={{ marginBottom: 14 }}>
            Không thể tải danh sách giao dịch.
          </div>
        ) : null}

        <div className="panel table-panel">
          <div className="data-table">
            <div className="data-row data-head">
              <span>Giao dịch</span><span>Người chơi</span><span>Giá trị</span><span>Trạng thái</span>
            </div>
            {orders.length ? orders.map((order) => {
              const profile = order.user_id ? profileMap.get(order.user_id) : null;
              return (
                <div className="data-row" key={order.id}>
                  <span>
                    <strong>{order.provider_order_id}</strong>
                    <small>{formatDate(order.created_at)}</small>
                  </span>
                  <span>
                    {order.user_id ? (
                      <Link href={`/admin/users/${order.user_id}`}>
                        <strong>{profile?.display_name || profile?.username || "Người chơi"}</strong>
                        <small>{profile?.username || order.user_id}</small>
                      </Link>
                    ) : (
                      <>
                        <strong>Tài khoản đã xóa</strong>
                        <small>Dữ liệu giao dịch được giữ để đối soát</small>
                      </>
                    )}
                  </span>
                  <span>
                    {Number(order.amount_vnd).toLocaleString("vi-VN")} ₫
                    <small>{Number(order.coin_amount).toLocaleString("vi-VN")} quyền lợi</small>
                  </span>
                  <span>
                    <span className="badge">{order.status}</span>
                    <small>{order.paid_at ? `Paid: ${formatDate(order.paid_at)}` : "Chưa xác nhận thanh toán"}</small>
                  </span>
                </div>
              );
            }) : <p className="panel-note">Không có giao dịch phù hợp.</p>}
          </div>
        </div>

        <div className="admin-pagination">
          <span>Trang {page} / {totalPages} · {(count || 0).toLocaleString("vi-VN")} giao dịch</span>
          <div>
            {page > 1 ? <Link className="button button-ghost" href={pageHref(page - 1)}>← Trước</Link> : null}
            {page < totalPages ? <Link className="button button-ghost" href={pageHref(page + 1)}>Sau →</Link> : null}
          </div>
        </div>

        <div style={{ marginTop: 16 }}><Link className="text-link" href="/admin">← Publisher Console</Link></div>
      </section>
    </>
  );
}
