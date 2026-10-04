import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AuditRow = {
  id: number;
  actor_user_id: string | null;
  target_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
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

export default async function AdminAuditPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q || "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = 50;
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("audit_logs")
    .select("id,actor_user_id,target_user_id,action,entity_type,entity_id,details,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (q && /^[A-Za-z0-9_.:-]+$/.test(q)) {
    query = query.ilike("action", `%${q}%`);
  }

  const { data, count } = await query;
  const rows = (data as AuditRow[] | null) ?? [];
  const ids = [...new Set(rows.flatMap((row) => [row.actor_user_id, row.target_user_id]).filter(Boolean))] as string[];

  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id,username,display_name").in("id", ids)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

  function href(targetPage: number) {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    search.set("page", String(targetPage));
    return `/admin/audit?${search.toString()}`;
  }

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">PUBLISHER CONSOLE</span>
        <h1>Audit log</h1>
        <p>Lịch sử các thao tác quản trị và thay đổi nhạy cảm trong Musical Survival.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <div className="panel" style={{ marginBottom: 14 }}>
          <form className="admin-filter-form" method="get">
            <div className="field">
              <label htmlFor="q">Lọc theo action</label>
              <input id="q" name="q" defaultValue={q} placeholder="wallet.reward_granted" />
            </div>
            <button className="button button-primary" type="submit">Lọc</button>
            <Link className="button button-ghost" href="/admin/audit">Đặt lại</Link>
          </form>
        </div>

        <div className="panel table-panel">
          <div className="audit-list">
            {rows.length ? rows.map((row) => {
              const actor = row.actor_user_id ? profileMap.get(row.actor_user_id) : null;
              const target = row.target_user_id ? profileMap.get(row.target_user_id) : null;
              return (
                <article className="audit-row" key={row.id}>
                  <div className="audit-row-head">
                    <div>
                      <strong>{row.action}</strong>
                      <span>{formatDate(row.created_at)}</span>
                    </div>
                    <span className="badge">{row.entity_type || "system"}</span>
                  </div>
                  <div className="audit-meta">
                    <span>Actor: {actor?.display_name || actor?.username || row.actor_user_id || "system"}</span>
                    <span>Target: {target?.display_name || target?.username || row.target_user_id || "—"}</span>
                    <span>Entity: {row.entity_id || "—"}</span>
                  </div>
                  {row.details && Object.keys(row.details).length ? (
                    <pre className="audit-details">{JSON.stringify(row.details, null, 2)}</pre>
                  ) : null}
                </article>
              );
            }) : <p className="panel-note">Chưa có audit log phù hợp.</p>}
          </div>
        </div>

        <div className="admin-pagination">
          <span>Trang {page} / {totalPages} · {(count || 0).toLocaleString("vi-VN")} bản ghi</span>
          <div>
            {page > 1 ? <Link className="button button-ghost" href={href(page - 1)}>← Trước</Link> : null}
            {page < totalPages ? <Link className="button button-ghost" href={href(page + 1)}>Sau →</Link> : null}
          </div>
        </div>

        <div style={{ marginTop: 16 }}><Link className="text-link" href="/admin">← Publisher Console</Link></div>
      </section>
    </>
  );
}
