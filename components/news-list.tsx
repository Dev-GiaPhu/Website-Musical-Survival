"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type NewsPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  published_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export function NewsList() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    void supabase
      .from("news_posts")
      .select("id,slug,title,summary,published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        setPosts((data as NewsPost[] | null) ?? []);
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!loaded) {
    return <div className="empty-panel"><span className="empty-icon">♪</span><div><h3>Đang tải tin tức</h3><p>Đang lấy thông tin chính thức mới nhất.</p></div></div>;
  }

  if (!posts.length) {
    return <div className="empty-panel"><span className="empty-icon">♪</span><div><h3>Chưa có thông báo</h3><p>Các thông tin chính thức sẽ được đăng tại đây khi sẵn sàng.</p></div></div>;
  }

  return (
    <div className="news-grid">
      {posts.map((post) => (
        <article className="news-card" key={post.id}>
          <div className="news-meta">{formatDate(post.published_at)}</div>
          <h3>{post.title}</h3>
          <p>{post.summary}</p>
          <Link href={`/news/${post.slug}`}>Đọc thông báo →</Link>
        </article>
      ))}
    </div>
  );
}
