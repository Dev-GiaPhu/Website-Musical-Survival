import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { submitEventEntry } from "../actions";

const messages: Record<string, { kind: "success" | "error"; text: string }> = {
  submitted: { kind: "success", text: "Bài dự thi của bạn đã được ghi nhận." },
  "already-submitted": { kind: "error", text: "Bạn đã gửi bài dự thi cho sự kiện này." },
  "not-started": { kind: "error", text: "Sự kiện chưa bắt đầu." },
  ended: { kind: "error", text: "Sự kiện đã kết thúc." },
  full: { kind: "error", text: "Sự kiện đã đủ số lượng bài dự thi." },
  "submit-error": { kind: "error", text: "Không thể gửi bài dự thi. Vui lòng thử lại." }
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function EventDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  const { data: event } = await supabase
    .from("game_events")
    .select("id,slug,title,summary,rules,submission_prompt,reward_description,starts_at,ends_at,max_entries")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!event) notFound();

  const { data: entry } = user
    ? await supabase
        .from("game_event_entries")
        .select("id,submission,status,reward_coins,admin_note,submitted_at")
        .eq("event_id", event.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: phase } = await supabase.rpc("get_game_event_phase", {
    target_event_id: event.id
  });
  const isOpen = phase === "open";
  const message = query.status ? messages[query.status] : undefined;

  return (
    <article className="article event-detail">
      <div className="news-meta">MUSICAL SURVIVAL EVENT</div>
      <h1>{event.title}</h1>
      <p className="article-summary">{event.summary}</p>

      <div className="event-meta-grid">
        <div><span>Bắt đầu</span><strong>{formatDate(event.starts_at)}</strong></div>
        <div><span>Kết thúc</span><strong>{formatDate(event.ends_at)}</strong></div>
      </div>

      {event.reward_description ? (
        <div className="event-reward event-reward-large">{event.reward_description}</div>
      ) : null}

      <section className="event-rules">
        <h2>Thể lệ</h2>
        <div className="article-body">{event.rules}</div>
      </section>

      {message ? <div className={`notice notice-${message.kind}`}>{message.text}</div> : null}

      {entry ? (
        <section className="panel event-entry-panel">
          <div className="panel-title-row">
            <h2>Bài dự thi của bạn</h2>
            <span className={`badge ${entry.status === "winner" ? "badge-online" : ""}`}>
              {entry.status === "winner" ? "Được chọn" : entry.status === "not_selected" ? "Đã xét" : "Đã gửi"}
            </span>
          </div>
          <p className="entry-submission">{entry.submission}</p>
          {entry.status === "winner" ? (
            <div className="notice notice-success">
              Phần thưởng đã được cộng vào tài khoản: {Number(entry.reward_coins).toLocaleString("vi-VN")}.
            </div>
          ) : null}
          {entry.admin_note ? <p className="panel-note">{entry.admin_note}</p> : null}
        </section>
      ) : user && isOpen ? (
        <section className="panel event-entry-panel">
          <h2>Tham gia mini-game</h2>
          <form action={submitEventEntry} className="form-grid">
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="slug" value={event.slug} />
            <div className="field">
              <label htmlFor="submission">{event.submission_prompt}</label>
              <textarea id="submission" name="submission" minLength={1} maxLength={4000} required />
            </div>
            <button className="button button-primary" type="submit">Gửi bài dự thi</button>
          </form>
        </section>
      ) : !user ? (
        <section className="panel event-entry-panel">
          <h2>Đăng nhập để tham gia</h2>
          <p className="panel-note">Sự kiện sử dụng chính tài khoản Musical Survival của bạn.</p>
          <Link className="button button-primary" href="/auth?mode=login">Đăng nhập</Link>
          <Link className="button button-ghost" href="/auth?mode=register">Tạo tài khoản</Link>
        </section>
      ) : (
        <div className="notice notice-warning">
          {phase === "not_started" ? "Sự kiện chưa bắt đầu." : "Sự kiện đã kết thúc."}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <Link className="text-link" href="/events">← Tất cả sự kiện</Link>
      </div>
    </article>
  );
}
