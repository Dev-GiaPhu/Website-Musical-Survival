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

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("id,username,display_name,role,status,created_at,last_seen_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Người chơi</h1>
        <p>Danh sách tài khoản gần đây của Musical Survival.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <div className="panel table-panel">
          <div className="data-table">
            <div className="data-row data-head">
              <span>Người chơi</span><span>Trạng thái</span><span>Tạo lúc</span><span>Hoạt động gần nhất</span>
            </div>
            {users?.length ? users.map((user) => (
              <div className="data-row" key={user.id}>
                <span><strong>{user.display_name || user.username || "Chưa đặt tên"}</strong><small>{user.username || user.id}</small></span>
                <span><span className="badge">{user.status}</span></span>
                <span>{formatDate(user.created_at)}</span>
                <span>{formatDate(user.last_seen_at)}</span>
              </div>
            )) : <p className="panel-note">Chưa có tài khoản.</p>}
          </div>
        </div>
        <div style={{ marginTop: 16 }}><Link className="text-link" href="/admin">← Quản lý nội dung</Link></div>
      </section>
    </>
  );
}
