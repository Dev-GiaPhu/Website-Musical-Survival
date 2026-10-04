import { Suspense } from "react";
import { TopUpPanel } from "@/components/top-up-panel";

export default function TopUpPage() {
  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Nạp tiền</h1>
        <p>Chọn gói nạp chính thức cho tài khoản Musical Survival của bạn.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <Suspense
          fallback={
            <div className="empty-panel">
              <span className="empty-icon">♪</span>
              <div><h3>Đang tải gói nạp</h3><p>Đang đồng bộ thông tin thanh toán.</p></div>
            </div>
          }
        >
          <TopUpPanel />
        </Suspense>
      </section>
    </>
  );
}
