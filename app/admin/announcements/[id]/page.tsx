import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteAnnouncement, updateAnnouncement } from "../actions";

function toVietnamLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

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
            <div className="form-two">
              <div className="field">
                <label htmlFor="startsAt">Bắt đầu — giờ Việt Nam</label>
                <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={toVietnamLocalInput(item.starts_at)} />
              </div>
              <div className="field">
                <label htmlFor="endsAt">Kết thúc — giờ Việt Nam</label>
                <input id="endsAt" name="endsAt" type="datetime-local" defaultValue={toVietnamLocalInput(item.ends_at)} />
              </div>
            </div>
            <label className="check-row">
              <input name="active" type="checkbox" defaultChecked={item.active} />
              Bật thông báo
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
            <div className="profile-row">
              <span>Bắt đầu</span>
              <strong>{item.starts_at ? toVietnamLocalInput(item.starts_at).replace("T", " ") : "Ngay khi bật"}</strong>
            </div>
            <div className="profile-row">
              <span>Kết thúc</span>
              <strong>{item.ends_at ? toVietnamLocalInput(item.ends_at).replace("T", " ") : "Không giới hạn"}</strong>
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
