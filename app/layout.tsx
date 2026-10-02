import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { siteConfig } from "@/lib/site";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: "%s | Musical Survival Official"
  },
  description: siteConfig.description,
  applicationName: siteConfig.title,
  robots: {
    index: true,
    follow: true
  }
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  let isAdmin = false;

  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  }

  return (
    <html lang="vi">
      <body>
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <header className="site-header">
          <div className="shell nav-shell">
            <Link className="brand" href="/" aria-label="Musical Survival">
              <span className="brand-mark">MS</span>
              <span className="brand-copy">
                <strong>MUSICAL SURVIVAL</strong>
                <small>OFFICIAL</small>
              </span>
            </Link>
            <nav className="nav-links" aria-label="Điều hướng chính">
              <Link href="/">Trang chủ</Link>
              <Link href="/news">Tin tức</Link>
              <Link href="/events">Sự kiện</Link>
              <Link href="/top-up">Nạp tiền</Link>
              {isAdmin ? <Link href="/admin">Quản trị</Link> : null}
              {user ? (
                <Link className="nav-account" href="/account">Tài khoản</Link>
              ) : (
                <Link className="nav-account" href="/auth?mode=login">Đăng nhập / Đăng ký</Link>
              )}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="shell footer-grid">
            <div>
              <strong>Musical Survival</strong>
              <p>Kênh thông tin chính thức và cổng tài khoản dành cho người chơi.</p>
            </div>
            <div className="footer-links">
              <Link href="/news">Tin tức</Link>
              <Link href="/events">Sự kiện</Link>
              <Link href="/legal/privacy">Quyền riêng tư</Link>
              <Link href="/legal/terms">Điều khoản</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
