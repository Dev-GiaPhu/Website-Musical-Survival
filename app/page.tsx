import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  const [
    { data: news },
    { data: announcements },
    { data: events },
    profileResult
  ] = await Promise.all([
    supabase
      .from("news_posts")
      .select("id,slug,title,summary,published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("announcements")
      .select("id,title,content,severity")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("game_events")
      .select("id,slug,title,summary,starts_at,ends_at,reward_description")
      .eq("status", "published")
      .order("starts_at", { ascending: true })
      .limit(3),
    user
      ? supabase
          .from("profiles")
          .select("username,display_name,role")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const profile = profileResult.data;
  const playerName = profile?.display_name || profile?.username || "Người chơi";

  return (
    <>
      {announcements && announcements.length > 0 ? (
        <section className="announcement-strip">
          <div className="shell announcement-list">
            {announcements.map((item) => (
              <div className={`announcement-item announcement-${item.severity}`} key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.content}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="hero">
        <div className="shell hero-inner">
          <div className="eyebrow">TRANG CHÍNH THỨC</div>
          <h1>
            MUSICAL
            <span>SURVIVAL</span>
          </h1>
          <p className="hero-copy">
            Tài khoản, tin tức, sự kiện và các thông tin chính thức của Musical Survival.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/news">
              Xem tin mới
            </Link>
            {user ? (
              <Link className="button button-ghost" href="/account">
                Hồ sơ của {playerName}
              </Link>
            ) : (
              <>
                <Link className="button button-ghost" href="/auth?mode=register">
                  Tạo tài khoản
                </Link>
                <Link className="button button-ghost" href="/auth?mode=login">
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
          <div className="release-note">
            <span className="pulse" />
            <div>
              <strong>Musical Survival đang trong quá trình phát triển</strong>
              <p>Các thông tin chưa được xác nhận sẽ không được đăng tải.</p>
            </div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="vinyl">
            <div className="vinyl-ring" />
            <div className="vinyl-core">MS</div>
          </div>
          <div className="equalizer">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} style={{ height: `${28 + ((i * 19) % 96)}px` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <div>
            <span className="kicker">BẢNG TIN</span>
            <h2>Tin mới</h2>
          </div>
          <Link className="text-link" href="/news">Xem tất cả</Link>
        </div>

        {news && news.length > 0 ? (
          <div className="news-grid">
            {news.map((item) => (
              <article className="news-card" key={item.id}>
                <div className="news-meta">MUSICAL SURVIVAL</div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <Link href={`/news/${item.slug}`}>Đọc thông báo →</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <span className="empty-icon">♪</span>
            <div>
              <h3>Chưa có tin mới</h3>
              <p>Các thông tin chính thức sẽ xuất hiện tại đây khi sẵn sàng.</p>
            </div>
          </div>
        )}
      </section>

      {events && events.length > 0 ? (
        <section className="section shell">
          <div className="section-heading">
            <div>
              <span className="kicker">SỰ KIỆN & MINI-GAME</span>
              <h2>Đang diễn ra</h2>
            </div>
            <Link className="text-link" href="/events">Xem sự kiện</Link>
          </div>
          <div className="news-grid">
            {events.map((event) => (
              <article className="news-card event-card" key={event.id}>
                <div className="news-meta">MUSICAL SURVIVAL EVENT</div>
                <h3>{event.title}</h3>
                <p>{event.summary}</p>
                {event.reward_description ? (
                  <div className="event-reward">{event.reward_description}</div>
                ) : null}
                <Link href={`/events/${event.slug}`}>Tham gia / xem chi tiết →</Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section shell">
        <div className={`account-banner ${user ? "account-banner-signed" : ""}`}>
          <div>
            <span className="kicker">TÀI KHOẢN MUSICAL SURVIVAL</span>
            {user ? (
              <>
                <h2>Chào mừng trở lại, {playerName}</h2>
                <p>
                  Bạn đang đăng nhập bằng tài khoản Musical Survival dùng chung với game.
                  Mở hồ sơ để quản lý danh tính, bảo mật, số dư và các liên kết tài khoản.
                </p>
              </>
            ) : (
              <>
                <h2>Một tài khoản cho website và game</h2>
                <p>
                  Tạo tài khoản Musical Survival để sử dụng cùng một Player ID khi chơi game,
                  quản lý hồ sơ và tham gia các sự kiện chính thức.
                </p>
              </>
            )}
          </div>
          <div className="account-banner-actions">
            {user ? (
              <>
                <Link className="button button-primary" href="/account">Mở hồ sơ</Link>
                {profile?.role === "admin" || profile?.role === "super_admin" ? (
                  <Link className="button button-ghost" href="/admin">Trang quản trị</Link>
                ) : null}
              </>
            ) : (
              <>
                <Link className="button button-primary" href="/auth?mode=register">Đăng ký</Link>
                <Link className="button button-ghost" href="/auth?mode=login">Đăng nhập</Link>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
