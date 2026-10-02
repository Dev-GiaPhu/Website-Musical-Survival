import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { updateRecoveredPassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    return (
      <section className="narrow-page shell">
        <div className="panel auth-panel">
          <span className="kicker">BẢO MẬT TÀI KHOẢN</span>
          <h1>Liên kết đã hết hạn</h1>
          <p>Hãy yêu cầu một email khôi phục mật khẩu mới.</p>
          <Link className="button button-primary full" href="/auth?mode=forgot">
            Gửi lại email khôi phục
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="narrow-page shell">
      <div className="panel auth-panel">
        <span className="kicker">BẢO MẬT TÀI KHOẢN</span>
        <h1>Đặt mật khẩu mới</h1>
        <p>Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường và số.</p>

        {params.error ? (
          <div className="notice notice-error">
            Không thể cập nhật mật khẩu. Hãy kiểm tra lại thông tin.
          </div>
        ) : null}

        <form action={updateRecoveredPassword} className="form-grid auth-form">
          <div className="field">
            <label htmlFor="password">Mật khẩu mới</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Nhập lại mật khẩu</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </div>

          <button className="button button-primary full" type="submit">
            Lưu mật khẩu mới
          </button>
        </form>
      </div>
    </section>
  );
}
