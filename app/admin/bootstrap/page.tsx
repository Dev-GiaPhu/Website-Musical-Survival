import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bootstrapSuperAdmin } from "./actions";

export default async function AdminBootstrapPage() {
  const user = await requireUser();
  const expectedEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();

  if (!expectedEmail || !user.email || user.email.toLowerCase() !== expectedEmail) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin" || profile?.role === "super_admin") {
    redirect("/admin");
  }

  return (
    <section className="narrow-page shell">
      <div className="panel auth-panel">
        <span className="kicker">PUBLISHER CONSOLE</span>
        <h1>Kích hoạt quản trị</h1>
        <p>
          Email đang đăng nhập khớp với tài khoản chủ dự án. Thao tác này sẽ tạo
          Super Admin đầu tiên cho Musical Survival.
        </p>
        <form action={bootstrapSuperAdmin}>
          <button className="button button-primary full" type="submit">
            Kích hoạt Super Admin
          </button>
        </form>
      </div>
    </section>
  );
}
