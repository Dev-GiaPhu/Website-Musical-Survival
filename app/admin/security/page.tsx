import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SecurityRow = {
  id: number;
  user_id: string | null;
  event_type: string;
  severity: string;
  details: Record<string, unknown>;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function AdminSecurityPage({
  searchParams
}: {
  searchParams: Promise<{ severity?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const severity = ["info", "warning", "critical"].includes(params.severity || "")
    ? params.severity || ""
    : "";
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = 50;
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("security_events")
    .select("id,user_id,event_type,severity,details,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (severity) query = query.eq("severity", severity);

  const { data, count } = await query;
  const rows = (data as SecurityRow[] | null) ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))] as string[];
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id,username,display_name").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">PUBLISHER CONSOLE</span>
        <h1>Security events</h1>
        <p>Các sự kiện bảo mật được ghi nhận bởi backend Musical Survival.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <div className="panel" style={{ marginBottom: 14 }}>
          <form className="admin-filter-form" method="get">
            <div className="field">
              <label htmlFor="severity">Mức độ</label>
              <select id="severity" name="severity" className="select-field" defaultValue={severity}>
                <option value="">Tất cả</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <button className="button button-primary" type="submit">Lọc</button>
            <Link className="button button-ghost" href="/admin/security">Đặt lại</Link>
          </form>
        </div>

        <div className="panel">
          <div className="audit-list">
            {rows.length ? rows.map((row) => {
              const profile = row.user_id ? profileMap.get(row.user_id) : null;
              return (
                <article className="audit-row" key={row.id}>
                  <div className="audit-row-head">
                    <div><strong>{row.event_type}</strong><span>{formatDate(row.created_at)}</span></div>
                    <span className="badge">{row.severity}</span>
                  </div>
                  <div className="audit-meta">
                    <span>User: {profile?.display_name || profile?.username || row.user_id || "—"}</span>
                  </div>
                  {row.details && Object.keys(row.details).length ? (
                    <pre className="audit-details">{JSON.stringify(row.details, null, 2)}</pre>
                  ) : null}
                </article>
              );
            }) : <p className="panel-note">Chưa có security event phù hợp.</p>}
          </div>
        </div>

        <div className="admin-pagination">
          <span>Trang {page} / {totalPages} · {(count || 0).toLocaleString("vi-VN")} sự kiện</span>
          <div>
            {page > 1 ? <Link className="button button-ghost" href={`/admin/security?severity=${severity}&page=${page - 1}`}>← Trước</Link> : null}
            {page < totalPages ? <Link className="button button-ghost" href={`/admin/security?severity=${severity}&page=${page + 1}`}>Sau →</Link> : null}
          </div>
        </div>

        <div style={{ marginTop: 16 }}><Link className="text-link" href="/admin">← Publisher Console</Link></div>
      </section>
    </>
  );
}
