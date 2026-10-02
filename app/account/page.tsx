import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  updateDisplayName,
  changeUsername,
  requestEmailChange,
  requestPhoneLink,
  verifyPhoneLink
} from "./actions";

const statusMessages: Record<string, { kind: "success" | "error"; text: string }> = {
  "profile-updated": { kind: "success", text: "Tên hiển thị đã được cập nhật." },
  "username-updated": { kind: "success", text: "Tên người chơi đã được cập nhật." },
  "email-sent": { kind: "success", text: "Hãy kiểm tra hộp thư để hoàn tất thay đổi email." },
  "phone-sent": { kind: "success", text: "Mã xác minh đã được gửi đến số điện thoại." },
  "phone-verified": { kind: "success", text: "Số điện thoại đã được liên kết." },
  "invalid-profile": { kind: "error", text: "Tên hiển thị không hợp lệ." },
  "invalid-username": { kind: "error", text: "Tên người chơi cần 3–20 ký tự, chỉ gồm chữ, số và dấu gạch dưới." },
  "username-taken": { kind: "error", text: "Tên người chơi này đã được sử dụng." },
  "username-cooldown": { kind: "error", text: "Bạn chưa thể đổi tên người chơi vào lúc này." },
  "username-error": { kind: "error", text: "Không thể đổi tên người chơi. Vui lòng thử lại." },
  "profile-error": { kind: "error", text: "Không thể cập nhật hồ sơ. Vui lòng thử lại." },
  "invalid-email": { kind: "error", text: "Email không hợp lệ." },
  "email-error": { kind: "error", text: "Không thể bắt đầu thay đổi email." },
  "invalid-phone": { kind: "error", text: "Số điện thoại cần có mã quốc gia, ví dụ +84." },
  "invalid-phone-code": { kind: "error", text: "Mã xác minh không hợp lệ." },
  "phone-code-error": { kind: "error", text: "Không thể xác minh số điện thoại. Hãy kiểm tra lại mã." },
  "phone-unavailable": { kind: "error", text: "Xác minh số điện thoại hiện chưa sẵn sàng." }
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(value));
}

export default async function AccountPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("touch_presence");

  const [{ data: profile }, { data: wallet }, params] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,display_name,role,status,created_at,updated_at,last_seen_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("wallets")
      .select("coin_balance")
      .eq("user_id", user.id)
      .single(),
    searchParams
  ]);

  const message = params.status ? statusMessages[params.status] : undefined;

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">TÀI KHOẢN MUSICAL SURVIVAL</span>
        <h1>{profile?.display_name || profile?.username || "Người chơi"}</h1>
        <p>Quản lý thông tin được liên kết với tài khoản Musical Survival của bạn.</p>
      </section>

      <section className="content-grid shell">
        <div className="stack">
          {message ? (
            <div className={`notice notice-${message.kind}`}>{message.text}</div>
          ) : null}

          <div className="panel">
            <h2>Hồ sơ người chơi</h2>
            <div className="profile-row">
              <span>ID người chơi</span>
              <strong>{user.id}</strong>
            </div>
            <div className="profile-row">
              <span>Tên người chơi</span>
              <strong>{profile?.username || "Chưa đặt"}</strong>
            </div>
            <div className="profile-row">
              <span>Email</span>
              <strong>{user.email || "Chưa liên kết"}</strong>
            </div>
            <div className="profile-row">
              <span>Số điện thoại</span>
              <strong>{user.phone || "Chưa liên kết"}</strong>
            </div>
            <div className="profile-row">
              <span>Tạo tài khoản</span>
              <strong>{formatDate(profile?.created_at || user.created_at)}</strong>
            </div>
            <div className="profile-row">
              <span>Cập nhật gần nhất</span>
              <strong>{formatDate(profile?.updated_at)}</strong>
            </div>
            <div className="profile-row">
              <span>Trạng thái</span>
              <strong><span className="badge badge-online">Đang trực tuyến</span></strong>
            </div>
          </div>

          <div className="panel">
            <h2>Đổi tên hiển thị</h2>
            <form action={updateDisplayName} className="form-grid">
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
              <button className="button button-primary" type="submit">Lưu thay đổi</button>
            </form>
          </div>

          <div className="panel">
            <h2>Đổi tên người chơi</h2>
            <form action={changeUsername} className="form-grid">
              <div className="field">
                <label htmlFor="username">Tên người chơi mới</label>
                <input
                  id="username"
                  name="username"
                  defaultValue={profile?.username || ""}
                  minLength={3}
                  maxLength={20}
                  autoComplete="off"
                  required
                />
              </div>
              <p className="panel-note">Sau khi đổi tên, bạn cần chờ 30 ngày trước khi đổi lại.</p>
              <button className="button button-primary" type="submit">Đổi tên người chơi</button>
            </form>
          </div>

          <div className="panel">
            <h2>Thay đổi email</h2>
            <form action={requestEmailChange} className="form-grid">
              <div className="field">
                <label htmlFor="email">Email mới</label>
                <input id="email" name="email" type="email" required />
              </div>
              <button className="button button-primary" type="submit">Gửi xác nhận</button>
            </form>
          </div>

          <div className="panel">
            <h2>Liên kết số điện thoại</h2>
            <form action={requestPhoneLink} className="form-grid">
              <div className="field">
                <label htmlFor="phone">Số điện thoại</label>
                <input id="phone" name="phone" type="tel" placeholder="+84..." required />
              </div>
              <button className="button button-primary" type="submit">Gửi mã xác minh</button>
            </form>

            <div style={{ height: 1, background: "var(--line)", margin: "24px 0" }} />

            <form action={verifyPhoneLink} className="form-grid">
              <div className="field">
                <label htmlFor="verifyPhone">Số điện thoại vừa nhận mã</label>
                <input id="verifyPhone" name="phone" type="tel" placeholder="+84..." required />
              </div>
              <div className="field">
                <label htmlFor="token">Mã 6 số</label>
                <input id="token" name="token" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
              </div>
              <button className="button button-ghost" type="submit">Xác minh số điện thoại</button>
            </form>
          </div>
        </div>

        <aside className="stack">
          <div className="panel">
            <span className="kicker">SỐ DƯ</span>
            <p className="stat-number">{(wallet?.coin_balance ?? 0).toLocaleString("vi-VN")}</p>
            <p className="panel-note">Số dư hiện có trên tài khoản.</p>
            <a className="button button-primary full" href="/top-up">Nạp tiền</a>
          </div>
          <div className="panel">
            <h2>Bảo mật tài khoản</h2>
            <p className="panel-note">Nếu bạn đăng nhập trên thiết bị không còn sử dụng, hãy đăng xuất khỏi tài khoản.</p>
            <form action="/auth/signout" method="post">
              <button className="button button-ghost full" type="submit">Đăng xuất</button>
            </form>
          </div>
        </aside>
      </section>
    </>
  );
}
