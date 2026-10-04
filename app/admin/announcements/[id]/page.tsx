import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteAnnouncement, updateAnnouncement } from "../actions";

const messages: Record<string, { kind: "success" | "error"; text: string }> = {
  updated: { kind: "success", text: "Thông báo đã được cập nhật." },
  error: { kind: "error", text: "Không thể cập nhật thông báo." },
  "delete-error": { kind: "error", text: "Không thể xóa thông báo." }
};

export default async function AnnouncementEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: item } = await supabase
    .from("announcements")
    .select("id,title,content,severity,active,starts_at,ends_at,created_at")
    .eq("id", id)
    .maybeSingle();

  if (!item) notFound();

  const message = query.status ? messages[query.status] : undefined;

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">PUBLISHER CONSOLE · ANNOUNCEMENT</span>
        <h1>Chỉnh sửa thông báo</h1>
        <p>{item.title}</p>
      </section>

      <section className="content-grid shell">
        <div className="panel">
          {message ? <div className={`notice notice-${message.kind}`}>{message.text}</div> : null}
          <form action={updateAnnouncement} className="form-grid" style={{ marginTop: 18 }}>
            <input type="hidden" name="id" value={item.id} />
            <div className="field">
              <label htmlFor="title">Tiêu đề</label>
              <input id="title" name="title" defaultValue={item.title} minLength={3} maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="content">Nội dung</label>
              <textarea id="content" name="content" defaultValue={item.content} minLength={3} maxLength={1000} required />
            </div>
            <div className="field">
              <label htmlFor="severity">Mức độ</label>
              <select id="severity" name="severity" className="select-field" defaultValue={item.severity}>
                <option value="info">Thông tin</option>
                <option value="warning">Lưu ý</option>
                <option value="important">Quan trọng</option>
              </select>
            </div>
            <label className="check-row">
              <input name="active" type="checkbox" defaultChecked={item.active} />
              Hiển thị thông báo
            </label>
            <button className="button button-primary" type="submit">Lưu thay đổi</button>
          </form>
        </div>

        <aside className="stack">
          <div className="panel">
            <h2>Trạng thái</h2>
            <div className="profile-row">
              <span>Hiển thị</span>
              <strong>{item.active ? "Đang hiển thị" : "Đang ẩn"}</strong>
            </div>
            <div className="profile-row">
              <span>Mức độ</span>
              <strong>{item.severity}</strong>
            </div>
          </div>

          <div className="panel danger-panel">
            <h2>Xóa thông báo</h2>
            <p className="panel-note">Thao tác này không thể hoàn tác.</p>
            <form action={deleteAnnouncement}>
              <input type="hidden" name="id" value={item.id} />
              <button className="button button-danger full" type="submit">Xóa thông báo</button>
            </form>
          </div>

          <Link className="button button-ghost full" href="/admin/announcements">Về danh sách</Link>
        </aside>
      </section>
    </>
  );
}
