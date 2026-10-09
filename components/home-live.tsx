"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type NewsItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  severity: "info" | "warning" | "important";
};

type GameEvent = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  reward_description: string | null;
};

type Player = {
  name: string;
  role: string;
} | null;

export function HomeLive() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [player, setPlayer] = useState<Player>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function load() {
      const [{ data: authData }, newsResult, announcementResult, eventResult] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("news_posts")
            .select("id,slug,title,summary")
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
            .select("id,slug,title,summary,reward_description")
            .eq("status", "published")
            .order("starts_at", { ascending: true })
            .limit(3)
        ]);

      if (!active) return;

      setNews((newsResult.data as NewsItem[] | null) ?? []);
      setAnnouncements(
        (announcementResult.data as Announcement[] | null) ?? []
      );
      setEvents((eventResult.data as GameEvent[] | null) ?? []);

      const user = authData.user;
      setSignedIn(Boolean(user));

      if (!user) {
        setPlayer(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username,display_name,role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      setPlayer({
        name: profile?.display_name || profile?.username || "Người chơi",
        role: profile?.role || "player"
      });
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const playerName = player?.name || "Người chơi";
  const isAdmin = player?.role === "admin" || player?.role === "super_admin";

  return (
    <>
      {announcements.length > 0 ? (
        <section className="announcement-strip">
          <div className="shell announcement-list">
            {announcements.map((item) => (
              <div
                className={`announcement-item announcement-${item.severity}`}
                key={item.id}
              >
                <strong>{item.title}</strong>
                <span>{item.content}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-overline">
            <span className="hero-overline-dot" />
            TRANG CHÍNH THỨC
          </div>
          <h1>
            <span className="hero-title-main">MUSICAL</span>
            <span className="hero-title-outline">SURVIVAL</span>
          </h1>
          <p className="hero-copy">
            Cổng chính thức dành cho người chơi — tin tức, sự kiện, tài khoản,
            cửa hàng và toàn bộ dịch vụ Musical Survival trong một nơi.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/news">Xem tin mới</Link>
            {signedIn ? (
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
            <span className="release-index">01</span>
            <div>
              <strong>Thông tin chính thức, một nguồn duy nhất</strong>
              <p>Tin tức và nội dung chưa được xác nhận sẽ không được đăng tải tại đây.</p>
            </div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-stage">
            <div className="hero-stage-grid" />
            <div className="hero-stage-orbit hero-stage-orbit-one" />
            <div className="hero-stage-orbit hero-stage-orbit-two" />
            <div className="hero-stage-core">
              <span>MS</span>
              <small>OFFICIAL</small>
            </div>
            <div className="hero-stage-label hero-stage-label-a">SURVIVE THE SOUND</div>
            <div className="hero-stage-label hero-stage-label-b">MUSICAL / SURVIVAL</div>
          </div>
          <div className="hero-ghost-word">MS</div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <div className="section-title-block">
            <span className="section-index">01</span>
            <div>
              <span className="kicker">BẢNG TIN CHÍNH THỨC</span>
              <h2>Tin mới</h2>
            </div>
          </div>
          <Link className="text-link" href="/news">Xem tất cả</Link>
        </div>

        {news.length > 0 ? (
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

      {events.length > 0 ? (
        <section className="section shell">
          <div className="section-heading">
            <div className="section-title-block">
              <span className="section-index">02</span>
              <div>
                <span className="kicker">SỰ KIỆN & MINI-GAME</span>
                <h2>Đang diễn ra</h2>
              </div>
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
                <Link href={`/events/${event.slug}`}>
                  Tham gia / xem chi tiết →
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section shell">
        <div className={`account-banner ${signedIn ? "account-banner-signed" : ""}`}>
          <div>
            <span className="section-index section-index-inline">03</span>
            <span className="kicker">TÀI KHOẢN MUSICAL SURVIVAL</span>
            {signedIn ? (
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
            {signedIn ? (
              <>
                <Link className="button button-primary" href="/account">Mở hồ sơ</Link>
                {isAdmin ? (
                  <Link className="button button-ghost" href="/admin">Trang quản trị</Link>
                ) : null}
              </>
            ) : (
              <>
                <Link className="button button-primary" href="/auth?mode=register">
                  Đăng ký
                </Link>
                <Link className="button button-ghost" href="/auth?mode=login">
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
