import { Suspense } from "react";
import { AuthPortal } from "@/components/auth-portal";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <section className="narrow-page shell">
          <div className="panel auth-panel">
            <span className="kicker">MUSICAL SURVIVAL ACCOUNT</span>
            <h1>Đang tải</h1>
            <p>Đang kiểm tra phiên đăng nhập...</p>
          </div>
        </section>
      }
    >
      <AuthPortal />
    </Suspense>
  );
}
