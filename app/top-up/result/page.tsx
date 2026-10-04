import { Suspense } from "react";
import { PaymentResultLive } from "@/components/payment-result-live";

export default function PaymentResultPage() {
  return (
    <section className="narrow-page shell">
      <Suspense
        fallback={
          <div className="panel auth-panel">
            <span className="kicker">MUSICAL SURVIVAL</span>
            <h1>Đang xác nhận</h1>
            <p>Đang kiểm tra trạng thái giao dịch...</p>
          </div>
        }
      >
        <PaymentResultLive />
      </Suspense>
    </section>
  );
}
