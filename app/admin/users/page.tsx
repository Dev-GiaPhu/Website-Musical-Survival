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

type AdminPlayerRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string;
  status: string;
  created_at: string;
  last_seen_at: string | null;
  is_online: boolean;
  total_count: number;
};

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q || "").trim();
  const status = ["active", "suspended", "banned"].includes(params.status || "")
    ? params.status || ""
    : "";
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = 50;
  const supabase = await createSupabaseServerClient();

  const { data: users, error } = await supabase.rpc("admin_list_players", {
    search_text: q,
    status_filter: status,
    page_limit: pageSize,
    page_offset: (page - 1) * pageSize
  });

  const typedUsers = (users as AdminPlayerRow[] | null) ?? [];
  const total = Number(typedUsers[0]?.total_count || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(target: number) {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status) query.set("status", status);
    query.set("page", String(target));
    return `/admin/users?${query.toString()}`;
  }

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Người chơi</h1>
        <p>Tìm kiếm, lọc và quản lý tài khoản Musical Survival.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <div className="panel" style={{ marginBottom: 14 }}>
          <form className="admin-filter-form" method="get">
            <div className="field">
              <label htmlFor="q">Tìm người chơi</label>
              <input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Tên, username hoặc Player ID"
              />
            </div>
            <div className="field">
              <label htmlFor="status">Trạng thái</label>
              <select id="status" name="status" className="select-field" defaultValue={status}>
                <option value="">Tất cả</option>
                <option value="active">Hoạt động</option>
                <option value="suspended">Tạm khóa</option>
                <option value="banned">Cấm</option>
              </select>
            </div>
            <button className="button button-primary" type="submit">Lọc</button>
            <Link className="button button-ghost" href="/admin/users">Đặt lại</Link>
          </form>
        </div>

        {error ? (
          <div className="notice notice-error" style={{ marginBottom: 14 }}>
            Không thể tải danh sách người chơi. Hãy chắc chắn migration quản trị mới đã được chạy.
          </div>
        ) : null}

        <div className="panel table-panel">
          <div className="data-table">
            <div className="data-row data-head">
              <span>Người chơi</span><span>Trạng thái</span><span>Quyền</span><span>Hoạt động gần nhất</span>
            </div>
            {typedUsers.length ? typedUsers.map((user) => (
              <div className="data-row" key={user.id}>
                <span>
                  <Link href={`/admin/users/${user.id}`}>
                    <strong>{user.display_name || user.username || "Chưa đặt tên"}</strong>
                    <small>{user.username || user.id}</small>
                  </Link>
                </span>
                <span>
                  {user.status === "active" ? (
                    <span className={`badge ${user.is_online ? "badge-online" : ""}`}>
                      {user.is_online ? "Online" : "Offline"}
                    </span>
                  ) : (
                    <span className="badge">{user.status}</span>
                  )}
                </span>
                <span><span className="badge">{user.role}</span></span>
                <span>{formatDate(user.last_seen_at)}</span>
              </div>
            )) : <p className="panel-note">Không tìm thấy tài khoản phù hợp.</p>}
          </div>
        </div>

        <div className="admin-pagination">
          <span>Trang {page} / {totalPages} · {total.toLocaleString("vi-VN")} tài khoản</span>
          <div>
            {page > 1 ? <Link className="button button-ghost" href={pageHref(page - 1)}>← Trước</Link> : null}
            {page < totalPages ? <Link className="button button-ghost" href={pageHref(page + 1)}>Sau →</Link> : null}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Link className="text-link" href="/admin">← Publisher Console</Link>
        </div>
      </section>
    </>
  );
}
