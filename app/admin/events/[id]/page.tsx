import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { awardEventEntry, markEntryNotSelected, updateEvent } from "../actions";

const messages: Record<string, { kind: "success" | "error"; text: string }> = {
  created: { kind: "success", text: "Sự kiện đã được tạo." },
  updated: { kind: "success", text: "Sự kiện đã được cập nhật." },
  awarded: { kind: "success", text: "Đã chọn người thắng và cộng phần thưởng vào ví." },
  reviewed: { kind: "success", text: "Bài dự thi đã được đánh dấu đã xét." },
  invalid: { kind: "error", text: "Dữ liệu không hợp lệ." },
  error: { kind: "error", text: "Không thể cập nhật sự kiện." },
  "award-error": { kind: "error", text: "Không thể trao thưởng. Bài này có thể đã được trao thưởng trước đó." },
  "review-error": { kind: "error", text: "Không thể cập nhật bài dự thi." }
};

function toVietnamLocalInput(value: string) {
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function AdminEventDetailPage({
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

  const [{ data: event }, { data: entries }] = await Promise.all([
    supabase.from("game_events").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("game_event_entries")
      .select("id,user_id,submission,status,reward_coins,admin_note,submitted_at")
      .eq("event_id", id)
      .order("submitted_at", { ascending: true })
  ]);

  if (!event) notFound();

  const userIds = [...new Set((entries || []).map((entry) => entry.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id,username,display_name")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const message = query.status ? messages[query.status] : undefined;

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">PUBLISHER CONSOLE · EVENT</span>
        <h1>{event.title}</h1>
        <p>{entries?.length || 0} bài dự thi · trạng thái {event.status}</p>
      </section>

      <section className="shell stack admin-event-layout">
        {message ? <div className={`notice notice-${message.kind}`}>{message.text}</div> : null}

        <div className="panel">
          <h2>Cấu hình sự kiện</h2>
          <form action={updateEvent} className="form-grid">
            <input type="hidden" name="eventId" value={event.id} />
            <div className="field">
              <label htmlFor="title">Tên sự kiện</label>
              <input id="title" name="title" defaultValue={event.title} minLength={3} maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="summary">Mô tả ngắn</label>
              <textarea id="summary" name="summary" defaultValue={event.summary} minLength={3} maxLength={280} required />
            </div>
            <div className="field">
              <label htmlFor="rules">Thể lệ</label>
              <textarea id="rules" name="rules" defaultValue={event.rules} minLength={3} maxLength={12000} required />
            </div>
            <div className="field">
              <label htmlFor="submissionPrompt">Nhãn ô bài dự thi</label>
              <input id="submissionPrompt" name="submissionPrompt" defaultValue={event.submission_prompt} maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="rewardDescription">Mô tả phần thưởng</label>
              <input id="rewardDescription" name="rewardDescription" defaultValue={event.reward_description || ""} maxLength={500} />
            </div>
            <div className="form-two">
              <div className="field">
                <label htmlFor="startsAt">Bắt đầu — giờ Việt Nam</label>
                <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={toVietnamLocalInput(event.starts_at)} required />
              </div>
              <div className="field">
                <label htmlFor="endsAt">Kết thúc — giờ Việt Nam</label>
                <input id="endsAt" name="endsAt" type="datetime-local" defaultValue={toVietnamLocalInput(event.ends_at)} required />
              </div>
            </div>
            <div className="form-two">
              <div className="field">
                <label htmlFor="maxEntries">Giới hạn bài dự thi</label>
                <input id="maxEntries" name="maxEntries" type="number" min="1" step="1" defaultValue={event.max_entries || ""} />
              </div>
              <div className="field">
                <label htmlFor="eventStatus">Trạng thái</label>
                <select id="eventStatus" name="eventStatus" className="select-field" defaultValue={event.status}>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Công bố</option>
                  <option value="closed">Đã đóng</option>
                </select>
              </div>
            </div>
            <button className="button button-primary" type="submit">Lưu cấu hình</button>
          </form>
        </div>

        <div className="panel">
          <div className="panel-title-row">
            <h2>Bài dự thi</h2>
            <Link className="text-link" href={`/events/${event.slug}`}>Xem trang người chơi →</Link>
          </div>

          {entries?.length ? (
            <div className="event-entry-admin-list">
              {entries.map((entry) => {
                const profile = profileMap.get(entry.user_id);
                return (
                  <article className="admin-entry-card" key={entry.id}>
                    <div className="admin-entry-head">
                      <div>
                        <strong>{profile?.display_name || profile?.username || entry.user_id}</strong>
                        <span>{profile?.username || entry.user_id} · {formatDate(entry.submitted_at)}</span>
                      </div>
                      <span className={`badge ${entry.status === "winner" ? "badge-online" : ""}`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="admin-entry-submission">{entry.submission}</div>

                    {entry.status === "winner" ? (
                      <div className="notice notice-success">
                        Đã trao {Number(entry.reward_coins).toLocaleString("vi-VN")} · {entry.admin_note || ""}
                      </div>
                    ) : (
                      <div className="admin-entry-actions">
                        <form action={awardEventEntry} className="form-grid">
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="entryId" value={entry.id} />
                          <div className="field">
                            <label htmlFor={`amount-${entry.id}`}>Phần thưởng</label>
                            <input id={`amount-${entry.id}`} name="amount" type="number" min="1" step="1" required />
                          </div>
                          <div className="field">
                            <label htmlFor={`note-${entry.id}`}>Ghi chú trao thưởng</label>
                            <input id={`note-${entry.id}`} name="note" minLength={3} maxLength={500} required />
                          </div>
                          <button className="button button-primary" type="submit">Chọn thắng & trao thưởng</button>
                        </form>

                        <form action={markEntryNotSelected} className="form-grid">
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="entryId" value={entry.id} />
                          <div className="field">
                            <label htmlFor={`review-${entry.id}`}>Ghi chú xét duyệt</label>
                            <input id={`review-${entry.id}`} name="note" maxLength={500} />
                          </div>
                          <button className="button button-ghost" type="submit">Đánh dấu không được chọn</button>
                        </form>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : <p className="panel-note">Chưa có bài dự thi.</p>}
        </div>

        <Link className="text-link admin-back" href="/admin/events">← Tất cả sự kiện</Link>
      </section>
    </>
  );
}
