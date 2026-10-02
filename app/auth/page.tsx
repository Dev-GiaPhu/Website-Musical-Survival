import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user) {
    return (
      <section className="narrow-page shell">
        <div className="panel auth-panel">
          <span className="kicker">TÀI KHOẢN</span>
          <h1>Bạn đã đăng nhập</h1>
          <p>Tiếp tục đến trang tài khoản Musical Survival.</p>
          <Link className="button button-primary full" href="/account">
            Mở tài khoản
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="narrow-page shell">
      <div className="panel auth-panel">
        <span className="kicker">MUSICAL SURVIVAL ACCOUNT</span>
        <h1>Đăng nhập</h1>
        <p>Sử dụng tài khoản Google để tiếp tục.</p>
        {params.error ? (
          <div className="notice notice-error">Không thể hoàn tất đăng nhập. Vui lòng thử lại.</div>
        ) : null}
        <a className="button button-google full" href="/auth/google">
          <span className="google-g">G</span>
          Tiếp tục với Google
        </a>
        <p className="fine-print">
          Khi tiếp tục, bạn đồng ý với <Link href="/legal/terms">Điều khoản</Link> và{" "}
          <Link href="/legal/privacy">Chính sách quyền riêng tư</Link>.
        </p>
      </div>
    </section>
  );
}
