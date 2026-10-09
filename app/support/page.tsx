import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hỗ trợ",
  description: "Trung tâm hỗ trợ tài khoản và dịch vụ Musical Survival.",
  alternates: { canonical: "/support" },
  openGraph: {
    title: "Hỗ trợ | Musical Survival Official",
    description: "Trung tâm hỗ trợ tài khoản và dịch vụ Musical Survival.",
    url: "/support"
  }
};
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

export default function SupportPage() {
  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL SUPPORT</span>
        <h1>Trung tâm hỗ trợ</h1>
        <p>
          Các công cụ tự phục vụ dành cho tài khoản, bảo mật, giao dịch và dữ liệu Musical Survival.
        </p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <div className="support-grid">
          <div className="panel">
            <span className="kicker">TÀI KHOẢN</span>
            <h2>Không đăng nhập được?</h2>
            <p className="panel-note">
              Đặt lại mật khẩu, gửi lại email xác minh hoặc đăng nhập bằng phương thức đã liên kết.
            </p>
            <div className="stack">
              <Link className="button button-primary full" href="/auth?mode=forgot">Khôi phục mật khẩu</Link>
              <Link className="button button-ghost full" href="/auth?mode=verify">Gửi lại email xác minh</Link>
            </div>
          </div>

          <div className="panel">
            <span className="kicker">BẢO MẬT</span>
            <h2>Tài khoản có dấu hiệu bất thường?</h2>
            <p className="panel-note">
              Vào hồ sơ để đổi mật khẩu, kiểm tra phương thức đăng nhập và đăng xuất khỏi tất cả thiết bị.
            </p>
            <Link className="button button-primary full" href="/account">Mở bảo mật tài khoản</Link>
          </div>

          <div className="panel">
            <span className="kicker">GIAO DỊCH</span>
            <h2>Kiểm tra giao dịch</h2>
            <p className="panel-note">
              Lịch sử nạp và số dư được hiển thị trong hồ sơ. Khi cần đối soát, hãy giữ lại mã giao dịch.
            </p>
            <Link className="button button-ghost full" href="/account">Xem lịch sử giao dịch</Link>
          </div>

          <div className="panel">
            <span className="kicker">DỮ LIỆU</span>
            <h2>Dữ liệu tài khoản</h2>
            <p className="panel-note">
              Bạn có thể tải bản sao dữ liệu hoặc yêu cầu xóa vĩnh viễn tài khoản ngay trong hồ sơ.
            </p>
            <Link className="button button-ghost full" href="/account">Quản lý dữ liệu</Link>
          </div>
        </div>

        <div className="panel support-contact">
          <div>
            <span className="kicker">LIÊN HỆ HỖ TRỢ</span>
            <h2>Vẫn cần trợ giúp?</h2>
            {supportEmail ? (
              <p className="panel-note">
                Gửi email từ địa chỉ đang liên kết với tài khoản và kèm Player ID / mã giao dịch nếu liên quan.
              </p>
            ) : (
              <p className="panel-note">
                Kênh email hỗ trợ trực tiếp chưa được công bố. Các công cụ tự phục vụ phía trên vẫn hoạt động bình thường.
              </p>
            )}
          </div>
          {supportEmail ? (
            <a className="button button-primary" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          ) : null}
        </div>
      </section>
    </>
  );
}
