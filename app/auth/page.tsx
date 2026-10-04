import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  requestPasswordReset,
  resendVerificationEmail,
  signInWithEmail,
  signUpWithEmail
} from "./actions";

const errorMessages: Record<string, string> = {
  "invalid-registration": "Thông tin đăng ký chưa hợp lệ. Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường và số.",
  "username-taken": "Tên người chơi này đã được sử dụng.",
  "registration-failed": "Không thể tạo tài khoản vào lúc này. Vui lòng thử lại.",
  "invalid-login": "Vui lòng nhập đầy đủ email và mật khẩu.",
  "invalid-credentials": "Email hoặc mật khẩu không đúng.",
  "email-not-confirmed": "Email chưa được xác minh. Hãy kiểm tra hộp thư của bạn.",
  "invalid-email": "Địa chỉ email không hợp lệ.",
  "resend-failed": "Không thể gửi lại email xác minh vào lúc này.",
  "invalid-verification-link": "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
  "verification-failed": "Không thể xác minh email. Hãy yêu cầu một email xác minh mới.",
  "recovery-session-expired": "Phiên khôi phục mật khẩu đã hết hạn. Hãy yêu cầu email mới.",
  "oauth": "Không thể bắt đầu đăng nhập Google.",
  "callback": "Không thể hoàn tất đăng nhập Google."
};

const statusMessages: Record<string, string> = {
  "verification-sent": "Tài khoản đã được tạo. Hãy mở email và xác minh địa chỉ email để kích hoạt tài khoản.",
  "verification-resent": "Email xác minh mới đã được gửi.",
  "reset-sent": "Nếu email này thuộc một tài khoản Musical Survival, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.",
  "account-deleted": "Tài khoản Musical Survival đã được xóa vĩnh viễn."
};

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<{
    mode?: string;
    error?: string;
    status?: string;
    email?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user) {
    return (
      <section className="narrow-page shell">
        <div className="panel auth-panel">
          <span className="kicker">MUSICAL SURVIVAL ACCOUNT</span>
          <h1>Bạn đã đăng nhập</h1>
          <p>Tài khoản này được sử dụng chung trên website và trong Musical Survival.</p>
          <Link className="button button-primary full" href="/account">
            Mở hồ sơ người chơi
          </Link>
        </div>
      </section>
    );
  }

  const mode = ["register", "verify", "forgot"].includes(params.mode || "")
    ? params.mode
    : "login";
  const error = params.error ? errorMessages[params.error] : undefined;
  const status = params.status ? statusMessages[params.status] : undefined;
  const email = params.email || "";

  return (
    <section className="auth-page shell">
      <div className="auth-intro">
        <span className="kicker">MUSICAL SURVIVAL ACCOUNT</span>
        <h1>Một tài khoản.<br />Website và game.</h1>
        <p>
          Tạo tài khoản Musical Survival tại đây hoặc trong game. Cả hai sử dụng cùng một
          hồ sơ người chơi, tiến trình, vật phẩm và số dư được liên kết với tài khoản của bạn.
        </p>
        <div className="auth-points">
          <span>✓ Email được xác minh khi đăng ký</span>
          <span>✓ Có thể liên kết Google vào cùng tài khoản</span>
          <span>✓ Dùng chung danh tính người chơi trên website và game</span>
        </div>
      </div>

      <div className="panel auth-panel auth-panel-wide">
        <div className="auth-tabs">
          <Link className={mode === "login" ? "active" : ""} href="/auth?mode=login">
            Đăng nhập
          </Link>
          <Link className={mode === "register" ? "active" : ""} href="/auth?mode=register">
            Đăng ký
          </Link>
        </div>

        {error ? <div className="notice notice-error">{error}</div> : null}
        {status ? <div className="notice notice-success">{status}</div> : null}

        {mode === "register" ? (
          <>
            <div className="auth-heading">
              <h2>Tạo tài khoản Musical Survival</h2>
              <p>Email sẽ phải được xác minh trước khi tài khoản được kích hoạt.</p>
            </div>

            <form action={signUpWithEmail} className="form-grid auth-form">
              <div className="field">
                <label htmlFor="displayName">Tên hiển thị</label>
                <input id="displayName" name="displayName" minLength={1} maxLength={32} autoComplete="name" required />
              </div>
              <div className="field">
                <label htmlFor="username">Tên người chơi</label>
                <input id="username" name="username" minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" autoComplete="username" required />
                <small>3–20 ký tự, chỉ gồm chữ, số và dấu gạch dưới.</small>
              </div>
              <div className="field">
                <label htmlFor="registerEmail">Email</label>
                <input id="registerEmail" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="field">
                <label htmlFor="registerPassword">Mật khẩu</label>
                <input id="registerPassword" name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" required />
                <small>Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</small>
              </div>
              <div className="field">
                <label htmlFor="confirmPassword">Nhập lại mật khẩu</label>
                <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" required />
              </div>
              <label className="check-row terms-check">
                <input name="terms" type="checkbox" required />
                <span>
                  Tôi đồng ý với <Link href="/legal/terms">Điều khoản</Link> và{" "}
                  <Link href="/legal/privacy">Chính sách quyền riêng tư</Link>.
                </span>
              </label>
              <button className="button button-primary full" type="submit">
                Tạo tài khoản
              </button>
            </form>

            <div className="auth-divider"><span>hoặc</span></div>
            <a className="button button-google full" href="/auth/google?intent=register">
              <span className="google-g">G</span>
              Đăng ký bằng Google
            </a>
          </>
        ) : mode === "verify" ? (
          <>
            <div className="auth-heading">
              <h2>Xác minh email</h2>
              <p>
                Mở email Musical Survival vừa gửi và bấm nút xác minh. Sau khi xác minh,
                tài khoản sẽ dùng được trên cả website và game.
              </p>
            </div>
            <form action={resendVerificationEmail} className="form-grid auth-form">
              <div className="field">
                <label htmlFor="verifyEmail">Email tài khoản</label>
                <input id="verifyEmail" name="email" type="email" defaultValue={email} required />
              </div>
              <button className="button button-primary full" type="submit">
                Gửi lại email xác minh
              </button>
            </form>
            <Link className="text-link auth-back-link" href="/auth?mode=login">
              ← Quay lại đăng nhập
            </Link>
          </>
        ) : mode === "forgot" ? (
          <>
            <div className="auth-heading">
              <h2>Khôi phục mật khẩu</h2>
              <p>Nhập email đã liên kết với tài khoản Musical Survival.</p>
            </div>
            <form action={requestPasswordReset} className="form-grid auth-form">
              <div className="field">
                <label htmlFor="recoveryEmail">Email</label>
                <input id="recoveryEmail" name="email" type="email" autoComplete="email" required />
              </div>
              <button className="button button-primary full" type="submit">
                Gửi email khôi phục
              </button>
            </form>
            <Link className="text-link auth-back-link" href="/auth?mode=login">
              ← Quay lại đăng nhập
            </Link>
          </>
        ) : (
          <>
            <div className="auth-heading">
              <h2>Đăng nhập</h2>
              <p>Tiếp tục bằng tài khoản Musical Survival của bạn.</p>
            </div>
            <form action={signInWithEmail} className="form-grid auth-form">
              <div className="field">
                <label htmlFor="loginEmail">Email</label>
                <input id="loginEmail" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="field">
                <label htmlFor="loginPassword">Mật khẩu</label>
                <input id="loginPassword" name="password" type="password" autoComplete="current-password" required />
              </div>
              <div className="auth-form-links">
                <Link href="/auth?mode=forgot">Quên mật khẩu?</Link>
              </div>
              <button className="button button-primary full" type="submit">
                Đăng nhập
              </button>
            </form>

            <div className="auth-divider"><span>hoặc</span></div>
            <a className="button button-google full" href="/auth/google?intent=login">
              <span className="google-g">G</span>
              Tiếp tục với Google
            </a>

            <p className="fine-print">
              Chưa có tài khoản? <Link href="/auth?mode=register">Đăng ký Musical Survival</Link>.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
