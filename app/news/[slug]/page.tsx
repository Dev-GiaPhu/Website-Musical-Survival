"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Post = {
  title: string;
  summary: string;
  content: string;
  published_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default function NewsArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [post, setPost] = useState<Post | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    void supabase
      .from("news_posts")
      .select("title,summary,content,published_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setPost(data as Post | null);
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (!loaded) {
    return (
      <article className="article">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Đang tải...</h1>
      </article>
    );
  }

  if (!post) {
    return (
      <article className="article">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Không tìm thấy bài viết</h1>
        <p className="article-summary">Bài viết không tồn tại hoặc chưa được công bố.</p>
        <Link className="text-link" href="/news">← Về tin tức</Link>
      </article>
    );
  }

  return (
    <article className="article">
      <span className="kicker">MUSICAL SURVIVAL • {formatDate(post.published_at)}</span>
      <h1>{post.title}</h1>
      <p className="article-summary">{post.summary}</p>
      <div className="article-body">{post.content}</div>
    </article>
  );
}
