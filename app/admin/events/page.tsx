import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEvent } from "./actions";

const messages: Record<string, { kind: "success" | "error"; text: string }> = {
  invalid: { kind: "error", text: "Thông tin sự kiện chưa hợp lệ." },
  error: { kind: "error", text: "Không thể lưu sự kiện." },
  deleted: { kind: "success", text: "Sự kiện đã được xóa." }
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function AdminEventsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: events } = await supabase
    .from("game_events")
    .select("id,title,status,starts_at,ends_at,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const message = params.status ? messages[params.status] : undefined;

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">PUBLISHER CONSOLE</span>
        <h1>Sự kiện & Mini-game</h1>
        <p>Tạo hoạt động chính thức, nhận bài dự thi và trao thưởng trực tiếp vào tài khoản người chơi.</p>
      </section>

      <section className="content-grid shell">
        <div className="panel">
          <h2>Tạo sự kiện mới</h2>
          {message ? <div className={`notice notice-${message.kind}`}>{message.text}</div> : null}
          <form action={createEvent} className="form-grid" style={{ marginTop: 18 }}>
            <div className="field">
              <label htmlFor="title">Tên sự kiện</label>
              <input id="title" name="title" minLength={3} maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="summary">Mô tả ngắn</label>
              <textarea id="summary" name="summary" minLength={3} maxLength={280} required />
            </div>
            <div className="field">
              <label htmlFor="rules">Thể lệ chi tiết</label>
              <textarea id="rules" name="rules" minLength={3} maxLength={12000} required />
            </div>
            <div className="field">
              <label htmlFor="submissionPrompt">Nhãn ô bài dự thi</label>
              <input id="submissionPrompt" name="submissionPrompt" defaultValue="Bài dự thi" maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="rewardDescription">Mô tả phần thưởng</label>
              <input id="rewardDescription" name="rewardDescription" maxLength={500} />
            </div>
            <div className="form-two">
              <div className="field">
                <label htmlFor="startsAt">Bắt đầu — giờ Việt Nam</label>
                <input id="startsAt" name="startsAt" type="datetime-local" required />
              </div>
              <div className="field">
                <label htmlFor="endsAt">Kết thúc — giờ Việt Nam</label>
                <input id="endsAt" name="endsAt" type="datetime-local" required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="maxEntries">Giới hạn số bài dự thi</label>
              <input id="maxEntries" name="maxEntries" type="number" min="1" step="1" placeholder="Để trống nếu không giới hạn" />
            </div>
            <label className="check-row">
              <input name="published" type="checkbox" />
              Công bố sự kiện ngay
            </label>
            <button className="button button-primary" type="submit">Tạo sự kiện</button>
          </form>
        </div>

        <aside className="panel">
          <h2>Sự kiện gần đây</h2>
          <div className="stack">
            {events?.length ? events.map((event) => (
              <Link className="admin-list-link" href={`/admin/events/${event.id}`} key={event.id}>
                <span>{event.status} · {formatDate(event.starts_at)}</span>
                <strong>{event.title}</strong>
              </Link>
            )) : <p className="panel-note">Chưa có sự kiện.</p>}
          </div>
          <Link className="text-link admin-back" href="/admin">← Publisher Console</Link>
        </aside>
      </section>
    </>
  );
}
