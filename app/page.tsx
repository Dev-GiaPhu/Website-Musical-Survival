import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: news }, { data: announcements }] = await Promise.all([
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
      .limit(3)
  ]);

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
            Những thông tin chính thức về Musical Survival sẽ được công bố tại đây.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/news">
              Xem tin mới
            </Link>
            <Link className="button button-ghost" href="/auth">
              Tài khoản người chơi
            </Link>
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

      <section className="section shell">
        <div className="account-banner">
          <div>
            <span className="kicker">TÀI KHOẢN MUSICAL SURVIVAL</span>
            <h2>Thông tin người chơi ở một nơi</h2>
            <p>
              Đăng nhập để quản lý tài khoản và theo dõi các thông tin được liên kết với Musical Survival.
            </p>
          </div>
          <Link className="button button-primary" href="/account">Mở tài khoản</Link>
        </div>
      </section>
    </>
  );
}
