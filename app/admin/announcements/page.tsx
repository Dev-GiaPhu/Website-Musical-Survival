import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAnnouncement, toggleAnnouncement } from "./actions";

export default async function AnnouncementsAdminPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: items } = await supabase
    .from("announcements")
    .select("id,title,severity,active,starts_at,ends_at,created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Thông báo</h1>
        <p>Đăng thông báo chính thức dành cho người chơi.</p>
      </section>

      <section className="content-grid shell">
        <div className="panel">
          <h2>Tạo thông báo</h2>
          {["saved", "updated", "deleted"].includes(params.status || "") ? (
            <div className="notice notice-success">
              {params.status === "deleted" ? "Thông báo đã được xóa." : "Thông báo đã được lưu."}
            </div>
          ) : null}
          {params.status === "error" || params.status === "invalid" ? <div className="notice notice-error">Không thể lưu thông báo.</div> : null}

          <form action={createAnnouncement} className="form-grid" style={{ marginTop: 18 }}>
            <div className="field">
              <label htmlFor="title">Tiêu đề</label>
              <input id="title" name="title" minLength={3} maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="content">Nội dung</label>
              <textarea id="content" name="content" minLength={3} maxLength={1000} required />
            </div>
            <div className="field">
              <label htmlFor="severity">Mức độ</label>
              <select id="severity" name="severity" defaultValue="info" className="select-field">
                <option value="info">Thông tin</option>
                <option value="warning">Lưu ý</option>
                <option value="important">Quan trọng</option>
              </select>
            </div>
            <div className="form-two">
              <div className="field">
                <label htmlFor="startsAt">Bắt đầu — giờ Việt Nam</label>
                <input id="startsAt" name="startsAt" type="datetime-local" />
              </div>
              <div className="field">
                <label htmlFor="endsAt">Kết thúc — giờ Việt Nam</label>
                <input id="endsAt" name="endsAt" type="datetime-local" />
              </div>
            </div>
            <label className="check-row">
              <input name="active" type="checkbox" />
              Bật thông báo
            </label>
            <button className="button button-primary" type="submit">Lưu thông báo</button>
          </form>
        </div>

        <aside className="stack">
          <div className="panel">
            <h2>Thông báo gần đây</h2>
            {items?.length ? items.map((item) => (
              <div className="admin-content-row" key={item.id}>
                <div>
                  <span>
                    {item.active ? "Đang bật" : "Đã tắt"} · {item.severity}
                    {item.starts_at ? " · có lịch" : ""}
                  </span>
                  <strong>{item.title}</strong>
                </div>
                <div className="admin-row-actions">
                  <Link className="text-link" href={`/admin/announcements/${item.id}`}>Sửa</Link>
                  <form action={toggleAnnouncement}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="active" value={item.active ? "false" : "true"} />
                    <button className="text-button" type="submit">
                      {item.active ? "Ẩn" : "Hiện"}
                    </button>
                  </form>
                </div>
              </div>
            )) : <p className="panel-note">Chưa có thông báo.</p>}
          </div>
          <Link className="button button-ghost full" href="/admin">Về quản lý nội dung</Link>
        </aside>
      </section>
    </>
  );
}
