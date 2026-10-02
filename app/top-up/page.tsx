import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TopUpPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const [{ data: packages }, params] = await Promise.all([
    supabase
      .from("topup_packages")
      .select("id,name,vnd_amount,coin_amount")
      .eq("active", true)
      .order("vnd_amount", { ascending: true }),
    searchParams
  ]);

  return (
    <>
      <section className="page-head shell">
        <span className="kicker">MUSICAL SURVIVAL</span>
        <h1>Nạp tiền</h1>
        <p>Chọn gói nạp đang được phát hành cho tài khoản Musical Survival của bạn.</p>
      </section>

      <section className="section shell" style={{ paddingTop: 10 }}>
        {params.error ? (
          <div className="notice notice-error" style={{ marginBottom: 18 }}>
            Không thể bắt đầu thanh toán. Vui lòng thử lại sau.
          </div>
        ) : null}

        {packages && packages.length > 0 ? (
          <div className="news-grid">
            {packages.map((item) => (
              <div className="news-card" key={item.id}>
                <div className="news-meta">GÓI NẠP</div>
                <h3>{item.name}</h3>
                <p className="stat-number" style={{ margin: "8px 0" }}>
                  {Number(item.coin_amount).toLocaleString("vi-VN")}
                </p>
                <p>{Number(item.vnd_amount).toLocaleString("vi-VN")} ₫</p>
                <form action="/api/payments/momo/create" method="post" style={{ marginTop: "auto" }}>
                  <input type="hidden" name="packageId" value={item.id} />
                  <button className="button button-primary full" type="submit">
                    Thanh toán
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <span className="empty-icon">♪</span>
            <div>
              <h3>Chưa có gói nạp được công bố</h3>
              <p>Các gói nạp chính thức sẽ xuất hiện tại đây khi sẵn sàng.</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
