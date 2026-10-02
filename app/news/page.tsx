import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function NewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: posts } = await supabase
    .from("news_posts")
    .select("id,slug,title,summary,published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Tin tức</h1>
        <p>Thông báo và cập nhật chính thức từ Musical Survival.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 16 }}>
        {posts && posts.length > 0 ? (
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
        ) : (
          <div className="empty-panel">
            <span className="empty-icon">♪</span>
            <div>
              <h3>Chưa có thông báo</h3>
              <p>Các thông tin chính thức sẽ được đăng tại đây khi sẵn sàng.</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
