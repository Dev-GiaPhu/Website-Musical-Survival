"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type GameEvent = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  reward_description: string | null;
  starts_at: string;
  ends_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export function EventsList() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    void supabase
      .from("game_events")
      .select("id,slug,title,summary,reward_description,starts_at,ends_at")
      .eq("status", "published")
      .order("starts_at", { ascending: false })
      .then((result) => {
        const data = result.data;
        if (!active) return;
        setEvents((data as GameEvent[] | null) ?? []);
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!loaded) {
    return <div className="empty-panel"><span className="empty-icon">★</span><div><h3>Đang tải sự kiện</h3><p>Đang lấy danh sách hoạt động chính thức.</p></div></div>;
  }

  if (!events.length) {
    return <div className="empty-panel"><span className="empty-icon">★</span><div><h3>Chưa có sự kiện đang được công bố</h3><p>Các sự kiện và mini-game chính thức sẽ xuất hiện tại đây.</p></div></div>;
  }

  return (
    <div className="news-grid">
      {events.map((event) => (
        <article className="news-card event-card" key={event.id}>
          <div className="news-meta">SỰ KIỆN CHÍNH THỨC</div>
          <h3>{event.title}</h3>
          <p>{event.summary}</p>
          <div className="event-time">
            <span>Bắt đầu: {formatDate(event.starts_at)}</span>
            <span>Kết thúc: {formatDate(event.ends_at)}</span>
          </div>
          {event.reward_description ? (
            <div className="event-reward">{event.reward_description}</div>
          ) : null}
          <Link href={`/events/${event.slug}`}>Xem chi tiết →</Link>
        </article>
      ))}
    </div>
  );
}
