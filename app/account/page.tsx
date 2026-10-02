import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  updateDisplayName,
  changeUsername,
  requestEmailChange,
  requestPhoneLink,
  verifyPhoneLink,
  unlinkGoogleIdentity
} from "./actions";

const statusMessages: Record<string, { kind: "success" | "error"; text: string }> = {
  "welcome": { kind: "success", text: "Tài khoản Musical Survival đã sẵn sàng." },
  "profile-updated": { kind: "success", text: "Tên hiển thị đã được cập nhật." },
  "username-updated": { kind: "success", text: "Tên người chơi đã được cập nhật." },
  "email-sent": {
    kind: "success",
    text: "Yêu cầu đổi email đã được gửi. Vì lý do bảo mật, hãy hoàn tất các bước xác nhận được gửi đến email hiện tại và email mới."
  },
  "email-confirmed-one": {
    kind: "success",
    text: "Một bước xác nhận đã hoàn tất. Nếu email mới vẫn đang chờ, hãy mở email xác nhận còn lại."
  },
  "email-changed": { kind: "success", text: "Email đăng nhập đã được thay đổi thành công." },
  "email-same": { kind: "error", text: "Email mới đang giống email hiện tại." },
  "password-updated": { kind: "success", text: "Mật khẩu mới đã được lưu." },
  "phone-sent": { kind: "success", text: "Mã xác minh đã được gửi đến số điện thoại." },
  "phone-verified": { kind: "success", text: "Số điện thoại đã được liên kết." },
  "google-linked": { kind: "success", text: "Tài khoản Google mới đã được liên kết." },
  "google-unlinked": { kind: "success", text: "Tài khoản Google đã được gỡ liên kết." },
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
  "phone-unavailable": { kind: "error", text: "Xác minh số điện thoại hiện chưa sẵn sàng." },
  "google-link-error": { kind: "error", text: "Không thể liên kết tài khoản Google mới." },
  "google-unlink-error": { kind: "error", text: "Không thể gỡ tài khoản Google này." },
  "google-unlink-last": { kind: "error", text: "Cần giữ lại ít nhất một phương thức đăng nhập." }
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

  if (!profile?.username) {
    redirect("/account/onboarding");
  }

  const message = params.status ? statusMessages[params.status] : undefined;
  const googleIdentities = (user.identities ?? []).filter(
    (identity) => identity.provider === "google"
  );
  const phoneVerificationEnabled =
    process.env.NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED === "true";
  const pendingEmail = (user as typeof user & { new_email?: string }).new_email;
  const emailVerified = Boolean(user.email_confirmed_at);
  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const canBootstrapAdmin =
    Boolean(bootstrapEmail) &&
    Boolean(user.email) &&
    user.email?.toLowerCase() === bootstrapEmail &&
    profile?.role !== "admin" &&
    profile?.role !== "super_admin";

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">TÀI KHOẢN MUSICAL SURVIVAL</span>
        <h1>{profile?.display_name || profile?.username || "Người chơi"}</h1>
        <p>
          Đây là tài khoản dùng chung trên website và trong Musical Survival.
          Hồ sơ, danh tính đăng nhập và dữ liệu được liên kết với cùng một Player ID.
        </p>
      </section>

      <section className="content-grid shell">
        <div className="stack">
          {message ? (
            <div className={`notice notice-${message.kind}`}>{message.text}</div>
          ) : null}

          {pendingEmail ? (
            <div className="notice notice-warning">
              <strong>Đang chờ đổi email sang {pendingEmail}</strong>
              <span>
                Hãy hoàn tất các email xác nhận được gửi bởi Musical Survival. Email hiện tại
                sẽ chỉ thay đổi sau khi quy trình bảo mật hoàn tất.
              </span>
            </div>
          ) : null}

          <div className="panel">
            <div className="panel-title-row">
              <h2>Hồ sơ người chơi</h2>
              <span className="badge badge-online">Đang trực tuyến</span>
            </div>
            <div className="profile-row">
              <span>Player ID</span>
              <strong>{user.id}</strong>
            </div>
            <div className="profile-row">
              <span>Tên người chơi</span>
              <strong>{profile?.username || "Chưa đặt"}</strong>
            </div>
            <div className="profile-row">
              <span>Email đăng nhập</span>
              <strong>
                {user.email || "Chưa liên kết"}
                {user.email ? (
                  <small className={emailVerified ? "verified-text" : "pending-text"}>
                    {emailVerified ? "Đã xác minh" : "Chưa xác minh"}
                  </small>
                ) : null}
              </strong>
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
                  pattern="[A-Za-z0-9_]+"
                  autoComplete="off"
                  required
                />
              </div>
              <p className="panel-note">Sau khi đổi tên, bạn cần chờ 30 ngày trước khi đổi lại.</p>
              <button className="button button-primary" type="submit">Đổi tên người chơi</button>
            </form>
          </div>

          <div className="panel">
            <h2>Phương thức đăng nhập Google</h2>
            <p className="panel-note">
              Liên kết Google vào cùng Player ID để có thêm một cách đăng nhập mà không tạo tài khoản game mới.
            </p>
            <div className="stack">
              {googleIdentities.length > 0 ? googleIdentities.map((identity) => {
                const identityEmail =
                  (identity.identity_data as { email?: string } | undefined)?.email || "Tài khoản Google";

                return (
                  <div className="profile-row" key={identity.id}>
                    <span>Google</span>
                    <div className="identity-actions">
                      <strong>{identityEmail}</strong>
                      {googleIdentities.length > 1 || (user.identities?.length ?? 0) > 1 ? (
                        <form action={unlinkGoogleIdentity}>
                          <input type="hidden" name="identityId" value={identity.id} />
                          <button className="text-button" type="submit">Gỡ liên kết</button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                );
              }) : <p className="panel-note">Chưa có tài khoản Google được liên kết.</p>}
            </div>
            <a className="button button-ghost full" href="/account/google/link" style={{ marginTop: 16 }}>
              Liên kết tài khoản Google khác
            </a>
          </div>

          <div className="panel">
            <h2>Thay đổi email đăng nhập</h2>
            <p className="panel-note">
              Email mới phải được xác minh. Với chế độ bảo mật hiện tại, hệ thống có thể yêu cầu
              xác nhận ở cả email hiện tại và email mới trước khi hoàn tất thay đổi.
            </p>
            <form action={requestEmailChange} className="form-grid">
              <div className="field">
                <label htmlFor="email">Email mới</label>
                <input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <button className="button button-primary" type="submit">Gửi email xác nhận</button>
            </form>
          </div>

          <div className="panel">
            <h2>Liên kết số điện thoại</h2>
            {phoneVerificationEnabled ? (
              <>
                <form action={requestPhoneLink} className="form-grid">
                  <div className="field">
                    <label htmlFor="phone">Số điện thoại</label>
                    <input id="phone" name="phone" type="tel" placeholder="+84..." required />
                  </div>
                  <button className="button button-primary" type="submit">Gửi mã xác minh</button>
                </form>

                <div className="panel-divider" />

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
              </>
            ) : (
              <p className="panel-note">
                Liên kết số điện thoại sẽ được mở sau khi dịch vụ gửi OTP chính thức sẵn sàng.
              </p>
            )}
          </div>
        </div>

        <aside className="stack">
          <div className="panel">
            <span className="kicker">SỐ DƯ</span>
            <p className="stat-number">{(wallet?.coin_balance ?? 0).toLocaleString("vi-VN")}</p>
            <p className="panel-note">Số dư được dùng chung với Musical Survival.</p>
            <a className="button button-primary full" href="/top-up">Nạp tiền</a>
          </div>

          {canBootstrapAdmin ? (
            <div className="panel admin-access-card">
              <span className="kicker">PUBLISHER CONSOLE</span>
              <h2>Kích hoạt quản trị</h2>
              <p className="panel-note">
                Email này được cấu hình là tài khoản chủ dự án.
              </p>
              <Link className="button button-primary full" href="/admin/bootstrap">
                Kích hoạt Super Admin
              </Link>
            </div>
          ) : null}

          {profile?.role === "admin" || profile?.role === "super_admin" ? (
            <div className="panel admin-access-card">
              <span className="kicker">QUẢN TRỊ</span>
              <h2>Publisher Console</h2>
              <p className="panel-note">Quản lý người chơi, nội dung, thông báo và sự kiện.</p>
              <Link className="button button-ghost full" href="/admin">Mở trang quản trị</Link>
            </div>
          ) : null}

          <div className="panel">
            <h2>Bảo mật tài khoản</h2>
            <p className="panel-note">
              Có thể kết thúc phiên hiện tại, đăng xuất khỏi mọi thiết bị hoặc yêu cầu đổi mật khẩu.
            </p>
            <div className="stack" style={{ marginTop: 16 }}>
              <Link className="button button-ghost full" href="/auth?mode=forgot">
                Đổi / khôi phục mật khẩu
              </Link>
              <form action="/auth/signout" method="post">
                <button className="button button-ghost full" type="submit">
                  Đăng xuất thiết bị này
                </button>
              </form>
              <form action="/auth/signout-all" method="post">
                <button className="button button-ghost full" type="submit">
                  Đăng xuất tất cả thiết bị
                </button>
              </form>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
