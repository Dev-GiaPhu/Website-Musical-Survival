"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { submitEventEntry } from "../actions";

const messages: Record<string, { kind: "success" | "error"; text: string }> = {
  submitted: { kind: "success", text: "Bài dự thi của bạn đã được ghi nhận." },
  "already-submitted": { kind: "error", text: "Bạn đã gửi bài dự thi cho sự kiện này." },
  "not-started": { kind: "error", text: "Sự kiện chưa bắt đầu." },
  ended: { kind: "error", text: "Sự kiện đã kết thúc." },
  full: { kind: "error", text: "Sự kiện đã đủ số lượng bài dự thi." },
  "submit-error": { kind: "error", text: "Không thể gửi bài dự thi. Vui lòng thử lại." }
};

type EventData = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  rules: string;
  submission_prompt: string;
  reward_description: string | null;
  starts_at: string;
  ends_at: string;
  max_entries: number | null;
};

type EntryData = {
  id: string;
  submission: string;
  status: "submitted" | "winner" | "not_selected";
  reward_coins: number;
  admin_note: string | null;
  submitted_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const [event, setEvent] = useState<EventData | null>(null);
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [phase, setPhase] = useState<string>("loading");
  const [signedIn, setSignedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const message = useMemo(() => {
    const status = searchParams.get("status");
    return status ? messages[status] : undefined;
  }, [searchParams]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function load() {
      const [{ data: authData }, { data: eventData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("game_events")
          .select("id,slug,title,summary,rules,submission_prompt,reward_description,starts_at,ends_at,max_entries")
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle()
      ]);

      if (!active) return;

      const currentEvent = eventData as EventData | null;
      setEvent(currentEvent);
      setSignedIn(Boolean(authData.user));

      if (!currentEvent) {
        setLoaded(true);
        return;
      }

      const phasePromise = supabase.rpc("get_game_event_phase", {
        target_event_id: currentEvent.id
      });

      const entryPromise = authData.user
        ? supabase
            .from("game_event_entries")
            .select("id,submission,status,reward_coins,admin_note,submitted_at")
            .eq("event_id", currentEvent.id)
            .eq("user_id", authData.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null });

      const [phaseResult, entryResult] = await Promise.all([phasePromise, entryPromise]);

      if (!active) return;

      setPhase(String(phaseResult.data || "unavailable"));
      setEntry((entryResult.data as EntryData | null) ?? null);
      setLoaded(true);
    }

    void load();

    return () => {
      active = false;
    };
  }, [slug]);

  if (!loaded) {
    return (
      <article className="article event-detail">
        <div className="news-meta">MUSICAL SURVIVAL EVENT</div>
        <h1>Đang tải sự kiện...</h1>
      </article>
    );
  }

  if (!event) {
    return (
      <article className="article event-detail">
        <div className="news-meta">MUSICAL SURVIVAL EVENT</div>
        <h1>Không tìm thấy sự kiện</h1>
        <p className="article-summary">Sự kiện không tồn tại hoặc chưa được công bố.</p>
        <Link className="text-link" href="/events">← Tất cả sự kiện</Link>
      </article>
    );
  }

  const isOpen = phase === "open";

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
              {entry.status === "winner"
                ? "Được chọn"
                : entry.status === "not_selected"
                  ? "Đã xét"
                  : "Đã gửi"}
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
      ) : signedIn && isOpen ? (
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
      ) : !signedIn ? (
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
