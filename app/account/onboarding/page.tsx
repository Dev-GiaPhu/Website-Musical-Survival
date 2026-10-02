import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completePlayerOnboarding } from "./actions";

const messages: Record<string, string> = {
  invalid: "Thông tin hồ sơ chưa hợp lệ.",
  "username-taken": "Tên người chơi này đã được sử dụng.",
  save: "Không thể hoàn tất hồ sơ. Vui lòng thử lại."
};

export default async function PlayerOnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username,display_name")
    .eq("id", user.id)
    .single();

  if (profile?.username) redirect("/account");

  return (
    <section className="narrow-page shell">
      <div className="panel auth-panel auth-panel-wide">
        <span className="kicker">HOÀN TẤT TÀI KHOẢN GAME</span>
        <h1>Chọn tên người chơi</h1>
        <p>
          Bạn đã xác thực danh tính. Hãy hoàn tất hồ sơ để dùng cùng Player ID này
          trên website và trong Musical Survival.
        </p>

        {params.error ? (
          <div className="notice notice-error">
            {messages[params.error] || "Không thể hoàn tất hồ sơ."}
          </div>
        ) : null}

        <form action={completePlayerOnboarding} className="form-grid auth-form">
          <div className="field">
            <label htmlFor="displayName">Tên hiển thị</label>
            <input
              id="displayName"
              name="displayName"
              defaultValue={profile?.display_name || ""}
              minLength={1}
              maxLength={32}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="username">Tên người chơi</label>
            <input
              id="username"
              name="username"
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_]+"
              autoComplete="username"
              required
            />
            <small>Tên này nhận diện tài khoản của bạn trong Musical Survival.</small>
          </div>
          <button className="button button-primary full" type="submit">
            Hoàn tất tài khoản
          </button>
        </form>
      </div>
    </section>
  );
}
