import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publishNews } from "./actions";

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: posts } = await supabase
    .from("news_posts")
    .select("id,title,published,created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Quản lý nội dung</h1>
        <p>Khu vực dành cho đội ngũ phát hành Musical Survival.</p>
      </section>

      <section className="admin-shortcuts shell">
        <Link className="admin-shortcut" href="/admin/announcements">
          <span>Thông báo</span>
          <strong>Đăng thông báo cho người chơi →</strong>
        </Link>
        <Link className="admin-shortcut" href="/admin/users">
          <span>Người chơi</span>
          <strong>Xem danh sách tài khoản →</strong>
        </Link>
        <Link className="admin-shortcut" href="/admin/payments">
          <span>Giao dịch</span>
          <strong>Theo dõi giao dịch nạp →</strong>
        </Link>
        <Link className="admin-shortcut" href="/admin/game">
          <span>Nội dung game</span>
          <strong>Quản lý gói nạp, vật phẩm và thành tựu →</strong>
        </Link>
      </section>

      <section className="content-grid shell">
        <div className="panel">
          <h2>Đăng tin mới</h2>
          {params.status === "published" ? (
            <div className="notice notice-success">Tin đã được lưu.</div>
          ) : null}
          {params.status === "error" || params.status === "invalid" ? (
            <div className="notice notice-error">Không thể lưu tin.</div>
          ) : null}
          <form action={publishNews} className="form-grid" style={{ marginTop: 18 }}>
            <div className="field">
              <label htmlFor="title">Tiêu đề</label>
              <input id="title" name="title" minLength={3} maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="summary">Mô tả ngắn</label>
              <textarea id="summary" name="summary" minLength={3} maxLength={280} required />
            </div>
            <div className="field">
              <label htmlFor="content">Nội dung</label>
              <textarea id="content" name="content" minLength={3} maxLength={20000} required />
            </div>
            <label className="check-row">
              <input name="published" type="checkbox" />
              Công bố ngay
            </label>
            <button className="button button-primary" type="submit">Lưu tin</button>
          </form>
        </div>

        <aside className="panel">
          <h2>Bài gần đây</h2>
          <div className="stack">
            {posts?.length ? posts.map((post) => (
              <div key={post.id} className="profile-row">
                <span>{post.published ? "Đã công bố" : "Bản nháp"}</span>
                <strong>{post.title}</strong>
              </div>
            )) : <p className="panel-note">Chưa có nội dung.</p>}
          </div>
        </aside>
      </section>
    </>
  );
}
