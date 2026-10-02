import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function EventsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: events } = await supabase
    .from("game_events")
    .select("id,slug,title,summary,reward_description,starts_at,ends_at")
    .eq("status", "published")
    .order("starts_at", { ascending: false });

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Sự kiện & Mini-game</h1>
        <p>Tham gia các hoạt động chính thức bằng chính tài khoản Musical Survival của bạn.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        {events?.length ? (
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
        ) : (
          <div className="empty-panel">
            <span className="empty-icon">★</span>
            <div>
              <h3>Chưa có sự kiện đang được công bố</h3>
              <p>Các sự kiện và mini-game chính thức sẽ xuất hiện tại đây.</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
