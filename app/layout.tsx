import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { siteConfig } from "@/lib/site";
import { AccountNav } from "@/components/account-nav";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: "%s | Musical Survival Official"
  },
  description: siteConfig.description,
  applicationName: siteConfig.title,
  alternates: {
    canonical: "/"
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: siteConfig.title,
    title: siteConfig.title,
    description: siteConfig.description
  },
  twitter: {
    card: "summary",
    title: siteConfig.title,
    description: siteConfig.description
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0d",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
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
            <div className="nav-divider" aria-hidden="true" />
            <nav className="nav-links" aria-label="Điều hướng chính">
              <Link href="/">Trang chủ</Link>
              <Link href="/news">Tin tức</Link>
              <Link href="/events">Sự kiện</Link>
              <Link href="/store">Cửa hàng</Link>
              <Link href="/top-up">Nạp tiền</Link>
              <AccountNav />
            </nav>
          </div>
        </header>
        <nav className="mobile-nav" aria-label="Điều hướng di động">
          <Link href="/">Trang chủ</Link>
          <Link href="/news">Tin tức</Link>
          <Link href="/events">Sự kiện</Link>
          <Link href="/store">Cửa hàng</Link>
          <Link href="/account">Tài khoản</Link>
        </nav>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="shell footer-grid">
            <div className="footer-brand">
              <span className="footer-mark">MS</span>
              <div>
                <strong>MUSICAL SURVIVAL</strong>
                <p>Kênh thông tin chính thức và cổng tài khoản dành cho người chơi.</p>
              </div>
            </div>
            <div className="footer-links">
              <Link href="/news">Tin tức</Link>
              <Link href="/events">Sự kiện</Link>
              <Link href="/store">Cửa hàng</Link>
              <Link href="/support">Hỗ trợ</Link>
              <Link href="/status">Trạng thái</Link>
              <Link href="/legal/privacy">Quyền riêng tư</Link>
              <Link href="/legal/terms">Điều khoản</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
