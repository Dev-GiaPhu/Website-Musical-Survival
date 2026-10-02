import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function NewsArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: post } = await supabase
    .from("news_posts")
    .select("title,summary,content,published_at")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) notFound();

  return (
    <article className="article">
      <span className="kicker">MUSICAL SURVIVAL • {formatDate(post.published_at)}</span>
      <h1>{post.title}</h1>
      <p className="article-summary">{post.summary}</p>
      <div className="article-body">{post.content}</div>
    </article>
  );
}
