import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAnnouncement } from "./actions";

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
    .select("id,title,severity,active,created_at")
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
          {params.status === "saved" ? <div className="notice notice-success">Thông báo đã được lưu.</div> : null}
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
            <label className="check-row">
              <input name="active" type="checkbox" />
              Hiển thị ngay
            </label>
            <button className="button button-primary" type="submit">Lưu thông báo</button>
          </form>
        </div>

        <aside className="stack">
          <div className="panel">
            <h2>Thông báo gần đây</h2>
            {items?.length ? items.map((item) => (
              <div className="profile-row" key={item.id}>
                <span>{item.active ? "Đang hiển thị" : "Đã ẩn"}</span>
                <strong>{item.title}</strong>
              </div>
            )) : <p className="panel-note">Chưa có thông báo.</p>}
          </div>
          <Link className="button button-ghost full" href="/admin">Về quản lý nội dung</Link>
        </aside>
      </section>
    </>
  );
}
