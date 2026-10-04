import { Suspense } from "react";
import { AccountPortal } from "@/components/account-portal";

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <section className="narrow-page shell">
          <div className="panel auth-panel">
            <span className="kicker">TÀI KHOẢN MUSICAL SURVIVAL</span>
            <h1>Đang tải hồ sơ</h1>
            <p>Đang đồng bộ Player ID và dữ liệu tài khoản...</p>
          </div>
        </section>
      }
    >
      <AccountPortal />
    </Suspense>
  );
}
