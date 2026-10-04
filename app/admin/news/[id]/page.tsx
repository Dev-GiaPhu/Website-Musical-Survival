import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteNews, updateNews } from "../../actions";

const messages: Record<string, { kind: "success" | "error"; text: string }> = {
  updated: { kind: "success", text: "Bài viết đã được cập nhật." },
  error: { kind: "error", text: "Không thể cập nhật bài viết." },
  "delete-error": { kind: "error", text: "Không thể xóa bài viết." }
};

export default async function AdminNewsEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: post } = await supabase
    .from("news_posts")
    .select("id,slug,title,summary,content,published,published_at,created_at")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  const message = query.status ? messages[query.status] : undefined;

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">PUBLISHER CONSOLE · NEWS</span>
        <h1>Chỉnh sửa bài viết</h1>
        <p>{post.title}</p>
      </section>

      <section className="content-grid shell">
        <div className="panel">
          {message ? <div className={`notice notice-${message.kind}`}>{message.text}</div> : null}
          <form action={updateNews} className="form-grid" style={{ marginTop: 18 }}>
            <input type="hidden" name="id" value={post.id} />
            <div className="field">
              <label htmlFor="title">Tiêu đề</label>
              <input id="title" name="title" defaultValue={post.title} minLength={3} maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="summary">Mô tả ngắn</label>
              <textarea id="summary" name="summary" defaultValue={post.summary} minLength={3} maxLength={280} required />
            </div>
            <div className="field">
              <label htmlFor="content">Nội dung</label>
              <textarea id="content" name="content" defaultValue={post.content} minLength={3} maxLength={20000} required />
            </div>
            <label className="check-row">
              <input name="published" type="checkbox" defaultChecked={post.published} />
              Công bố bài viết
            </label>
            <button className="button button-primary" type="submit">Lưu thay đổi</button>
          </form>
        </div>

        <aside className="stack">
          <div className="panel">
            <h2>Thông tin</h2>
            <div className="profile-row"><span>Slug</span><strong>{post.slug}</strong></div>
            <div className="profile-row"><span>Trạng thái</span><strong>{post.published ? "Đã công bố" : "Bản nháp"}</strong></div>
          </div>

          <div className="panel danger-panel">
            <h2>Xóa bài viết</h2>
            <p className="panel-note">Thao tác này không thể hoàn tác.</p>
            <form action={deleteNews}>
              <input type="hidden" name="id" value={post.id} />
              <button className="button button-danger full" type="submit">Xóa bài viết</button>
            </form>
          </div>

          <Link className="button button-ghost full" href="/admin">Về Publisher Console</Link>
        </aside>
      </section>
    </>
  );
}
