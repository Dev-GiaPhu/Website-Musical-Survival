import type { Metadata } from "next";
import { ServiceStatus } from "@/components/service-status";

export const metadata: Metadata = {
  title: "Trạng thái dịch vụ",
  description: "Trạng thái hệ thống và dịch vụ Musical Survival.",
  alternates: { canonical: "/status" },
  openGraph: {
    title: "Trạng thái dịch vụ | Musical Survival Official",
    description: "Trạng thái hệ thống và dịch vụ Musical Survival.",
    url: "/status"
  }
};
export default function StatusPage() {
  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Trạng thái dịch vụ</h1>
        <p>Kiểm tra khả năng truy cập website, database và các dịch vụ nội dung chính.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <ServiceStatus />
      </section>
    </>
  );
}
