import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";

export const metadata: Metadata = {
  title: "Cửa hàng",
  description: "Cửa hàng vật phẩm chính thức của Musical Survival.",
  alternates: { canonical: "/store" },
  openGraph: {
    title: "Cửa hàng | Musical Survival Official",
    description: "Cửa hàng vật phẩm chính thức của Musical Survival.",
    url: "/store"
  }
};
export default function StorePage() {
  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Cửa hàng</h1>
        <p>Vật phẩm được công bố chính thức và giao dịch trực tiếp với tài khoản Musical Survival.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        <Storefront />
      </section>
    </>
  );
}
